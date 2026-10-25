// Original scalar models. Inputs have already been validated and converted to SI.
function fromLog(logValue) {
  const value = Math.exp(logValue);
  if (!Number.isFinite(value) || value === 0) throw new Error('결과가 계산 가능한 수치 범위를 벗어납니다. 입력 크기와 단위를 확인하세요.');
  return value;
}

function logAdd(a, b) {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  const hi = Math.max(a, b);
  return hi + Math.log1p(Math.exp(Math.min(a, b) - hi));
}

function logOnePlusExp(x) {
  return x > 0 ? x + Math.log1p(Math.exp(-x)) : Math.log1p(Math.exp(x));
}

function sum(values) {
  let total = 0;
  let correction = 0;
  for (const value of values) {
    const adjusted = value - correction;
    const next = total + adjusted;
    correction = (next - total) - adjusted;
    total = next;
  }
  return total;
}

export function evaluateModel(id, x, C) {
  switch (id) {
    case 'E151': {
      if (x.hot < x.cold) throw new Error('고온측 입구온도는 저온측 입구온도 이상이어야 합니다.');
      if (x.ua === 0 || x.hot === x.cold) return 0;
      const small = Math.min(x.ch, x.cc);
      const large = Math.max(x.ch, x.cc);
      const ratio = small / large;
      const logNtu = Math.log(x.ua) - Math.log(small);
      let logEffectiveness;
      if (ratio === 1) {
        // The balanced-flow limit is NTU/(1+NTU), evaluated without infinity/infinity.
        logEffectiveness = -logOnePlusExp(-logNtu);
      } else {
        const difference = 1 - ratio;
        const logZ = logNtu + Math.log(difference);
        // 1-exp(-z) ~ z when z is far below floating-point resolution.
        const logNumerator = logZ < -36 ? logZ : Math.log(-Math.expm1(-Math.exp(logZ)));
        const logDenominator = logAdd(Math.log(difference), ratio === 0 ? -Infinity : Math.log(ratio) + logNumerator);
        logEffectiveness = logNumerator - logDenominator;
      }
      return fromLog(Math.log(small) + Math.log(x.hot - x.cold) + logEffectiveness);
    }
    case 'E152': {
      if (x.h === 0 || x.length === 0) return 1;
      const logZ = Math.log(x.length) + (Math.log(x.h) + Math.log(x.perimeter) - Math.log(x.k) - Math.log(x.area)) / 2;
      if (logZ < Math.log(0.001)) {
        const squared = Math.exp(2 * logZ);
        return 1 - squared / 3 + 2 * squared * squared / 15 - 17 * squared ** 3 / 315;
      }
      if (logZ > Math.log(20)) return fromLog(-logZ);
      const z = Math.exp(logZ);
      return Math.tanh(z) / z;
    }
    case 'E153': {
      if (x.generation === 0) return x.surface;
      const logRise = Math.log(x.generation) + 2 * Math.log(x.half) - Math.LN2 - Math.log(x.k);
      const rise = Math.exp(logRise);
      if (!Number.isFinite(rise)) throw new Error('중심 온도 상승이 계산 가능한 수치 범위를 벗어납니다.');
      return x.surface + rise;
    }
    case 'E154': {
      const amounts = x.components.map(row => row.n).filter(n => n > 0);
      if (amounts.length === 0) throw new Error('적어도 한 기체의 몰수가 0보다 커야 합니다.');
      if (amounts.length === 1) return 0;
      const contributions = amounts.map((n, index) => {
        const other = amounts.filter((_, j) => j !== index);
        const scale = Math.max(...other);
        const logOther = Math.log(scale) + Math.log(sum(other.map(value => value / scale)));
        const logRatio = logOther - Math.log(n);
        const logLog = logRatio < -36 ? logRatio : Math.log(logOnePlusExp(logRatio));
        return fromLog(Math.log(C.R) + Math.log(n) + logLog);
      });
      return sum(contributions);
    }
    case 'E155': {
      if (x.gibbs === 0) return 1;
      return fromLog(-(x.gibbs / x.temperature) / C.R);
    }
    case 'E156': {
      const total = sum(x.components.map(row => row.x));
      if (!(total > 0) || Math.abs(total - 1) > 1e-10) throw new Error('액상 몰분율의 합은 1이어야 합니다. 허용 오차는 1e-10입니다.');
      const active = x.components.filter(row => row.x > 0 && row.psat > 0);
      if (active.length === 0) return 0;
      const scale = Math.max(...active.map(row => row.psat));
      const weighted = sum(active.map(row => Math.exp(Math.log(row.x) + Math.log(row.psat) - Math.log(scale))));
      const result = scale * (weighted / total);
      if (result === 0) throw new Error('기포점 압력이 계산 가능한 수치 범위를 벗어납니다.');
      return result;
    }
    case 'E157': {
      if (x.current === 0 || x.duration === 0 || x.efficiency === 0) return 0;
      return fromLog(Math.log(x.current) + Math.log(x.duration) + Math.log(x.molar) + Math.log(x.efficiency) - Math.log(x.electrons) - Math.log(C.F));
    }
    case 'E158': {
      if (x.k === 0) return 0;
      const logDa = Math.log(x.k) + Math.log(x.volume) - Math.log(x.flow);
      if (logDa >= 0) return 1 / (1 + Math.exp(-logDa));
      const da = fromLog(logDa);
      return da / (1 + da);
    }
    case 'E159': {
      if (x.voltage === 0 || x.current === 0 || x.efficiency === 0) return 0;
      return fromLog(Math.log(x.voltage) + Math.log(x.current) + Math.log(x.efficiency) - Math.log(x.speed));
    }
    case 'E160': {
      if (x.angle > Math.PI) throw new Error('절곡각은 재료가 회전한 각도로 0~180° 범위여야 합니다.');
      if (x.angle === 0) return 0;
      const logRadius = logAdd(Math.log(x.radius), x.factor === 0 ? -Infinity : Math.log(x.factor) + Math.log(x.thickness));
      return fromLog(Math.log(x.angle) + logRadius);
    }
    default:
      return undefined;
  }
}

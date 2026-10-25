// Original implementation of ten electronic and RF models. All inputs are SI,
// except decibel quantities, which remain logarithmic by definition.
const LN10 = Math.LN10;
const DB = LN10 / 10;
const LOG2PI = Math.log(2 * Math.PI);

function positiveFromLog(logValue) {
  if (!Number.isFinite(logValue)) throw new Error('결과의 크기가 수치 표현 범위를 벗어납니다.');
  const value = Math.exp(logValue);
  if (!Number.isFinite(value)) throw new Error('결과의 크기가 수치 표현 범위를 벗어납니다.');
  if (value === 0) throw new Error('0이 아닌 결과가 수치 표현의 최소 크기보다 작습니다.');
  return value;
}

function logAddExp(a, b) {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  const high = Math.max(a, b);
  return high + Math.log1p(Math.exp(Math.min(a, b) - high));
}

function logExcessNoise(nf) {
  if (nf === 0) return -Infinity;
  const a = nf * DB;
  // Even a finite positive dB input can be smaller than the minimum
  // representable natural-log increment after multiplication by DB.
  if (a < 1e-5) {
    const correction = a === 0 ? 0 : Math.log(Math.expm1(a) / a);
    return Math.log(nf) + Math.log(DB) + correction;
  }
  return a < Math.LN2 ? Math.log(Math.expm1(a)) : a + Math.log1p(-Math.exp(-a));
}

export function evaluateModel(id, x, C) {
  switch (id) {
    case 'E141': {
      if (x.b === 0) return 0;
      return positiveFromLog((Math.log(4 * C.kB) + Math.log(x.t) + Math.log(x.r) + Math.log(x.b)) / 2);
    }
    case 'E142': {
      // Computing a logarithm avoids overflowing 2**bits before division.
      return positiveFromLog(Math.log(x.span) - x.bits * Math.LN2 - Math.log(12) / 2);
    }
    case 'E143': {
      const logPhase = LOG2PI + Math.log(x.f) + Math.log(x.jitter);
      if (logPhase > Math.log(0.1) + 16 * Number.EPSILON) {
        throw new Error('작은 지터 근사를 위해 2πfσt가 0.1 rad 이하여야 합니다.');
      }
      return -20 * logPhase / LN10;
    }
    case 'E144': {
      if (x.f / x.fs > 2 ** 32) {
        throw new Error('입력 주파수와 샘플링 주파수의 비가 2³²를 넘으면 접힘 위치의 수치 정밀도가 부족합니다.');
      }
      const remainder = x.f % x.fs;
      return Math.min(remainder, x.fs - remainder);
    }
    case 'E145': {
      const a = x.snr * DB;
      // log(log(1+exp(a))) remains usable when exp(a) over/underflows.
      let logSoftplus;
      if (a < -36) logSoftplus = a;
      else if (a > 36) logSoftplus = Math.log(a + Math.log1p(Math.exp(-a)));
      else logSoftplus = Math.log(Math.log1p(Math.exp(a)));
      return positiveFromLog(Math.log(x.b) + logSoftplus - Math.log(Math.LN2));
    }
    case 'E146': {
      let logExcess = -Infinity;
      let precedingGain = 0;
      for (let index = 0; index < x.stages.length; index += 1) {
        const stage = x.stages[index];
        const logTerm = logExcessNoise(stage.nf) - precedingGain;
        if (logTerm !== -Infinity && !Number.isFinite(logTerm)) {
          throw new Error('이득과 잡음지수의 조합이 수치 표현 범위를 벗어납니다.');
        }
        logExcess = logAddExp(logExcess, logTerm);
        precedingGain += stage.gain * DB;
        if (index < x.stages.length - 1 && !Number.isFinite(precedingGain)) {
          throw new Error('누적 이득이 수치 표현 범위를 벗어납니다.');
        }
      }
      if (logExcess === -Infinity) return 0;
      // Convert 1+excess to dB, retaining tiny nonzero noise figures too.
      if (logExcess < -36) return positiveFromLog(logExcess + Math.log(10 / LN10));
      const logFactor = logExcess > 36 ? logExcess + Math.log1p(Math.exp(-logExcess)) : Math.log1p(Math.exp(logExcess));
      // Division first preserves finite dB outputs even for very large factors.
      return (logFactor / LN10) * 10;
    }
    case 'E147': {
      const logWavelengthRatio = Math.log(x.d) + Math.log(x.f) - Math.log(C.c);
      if (logWavelengthRatio < -16 * Number.EPSILON) {
        throw new Error('이 도구는 거리가 최소 한 파장 이상인 경우만 계산합니다. 안테나 원거리장 조건도 별도로 확인하세요.');
      }
      return (20 / LN10) * (Math.log(4 * Math.PI) + logWavelengthRatio);
    }
    case 'E148': {
      if (x.b <= x.a) throw new Error('외부 도체의 안쪽 반지름은 내부 도체 반지름보다 커야 합니다.');
      const gapRatio = (x.b - x.a) / x.a;
      const logRatio = Number.isFinite(gapRatio) ? Math.log1p(gapRatio) : Math.log(x.b) - Math.log(x.a);
      const logZ = (Math.log(C.mu0) + Math.log(x.mur) - Math.log(C.epsilon0) - Math.log(x.er)) / 2 - LOG2PI + Math.log(logRatio);
      return positiveFromLog(logZ);
    }
    case 'E149': {
      if (x.r === 0) {
        return {kind: 'no-result', message: '완전 반사 조건으로 정재파비가 무한대입니다.'};
      }
      if (x.r === x.z0 && x.reactance === 0) return 1;
      const scale = Math.max(x.r, x.z0, Math.abs(x.reactance));
      const r = x.r / scale;
      const z = x.z0 / scale;
      const j = x.reactance / scale;
      const sum = Math.hypot(r + z, j) + Math.hypot(r - z, j);
      // (a+b)/(a-b) = (a+b)^2/(4 R Z0). This avoids subtracting
      // nearly equal magnitudes for highly reflective passive loads.
      const logRatio = 2 * Math.log(sum) + 2 * Math.log(scale) - Math.log(4) - Math.log(x.r) - Math.log(x.z0);
      return Math.max(1, positiveFromLog(logRatio));
    }
    case 'E150': {
      if (x.i === 0 || x.b === 0) return 0;
      const sign = Math.sign(x.i) * Math.sign(x.b) * Math.sign(x.q);
      const magnitude = positiveFromLog(Math.log(Math.abs(x.i)) + Math.log(Math.abs(x.b)) - Math.log(x.n) - Math.log(Math.abs(x.q)) - Math.log(x.t));
      return sign * magnitude;
    }
    default:
      return undefined;
  }
}

// Original E121–E130 models. SI inputs are validated by the shared dispatcher.
const RANGE_ERROR = '입력 크기로 인해 유한한 비영 결과를 표현할 수 없습니다. 단위와 입력 범위를 확인하세요.';
function fromLog(logValue) {
  const value = Math.exp(logValue);
  if (!(value > 0) || !Number.isFinite(value)) throw new Error(RANGE_ERROR);
  return value;
}
function productRatio(numerators, denominators = []) {
  let value = 1, subnormal = false;
  for (const v of numerators) { value *= v; if (value < 2.2250738585072014e-308) subnormal = true; }
  for (const v of denominators) { value /= v; if (value < 2.2250738585072014e-308) subnormal = true; }
  if (!subnormal && value > 0 && Number.isFinite(value)) return value;
  return fromLog(numerators.reduce((s, v) => s + Math.log(v), 0) - denominators.reduce((s, v) => s + Math.log(v), 0));
}
function sumPositive(values) {
  let sum = 0, correction = 0;
  for (const v of values) {
    const next = sum + v;
    correction += Math.abs(sum) >= Math.abs(v) ? (sum - next) + v : (v - next) + sum;
    sum = next;
  }
  return sum + correction;
}
function logSum(logs) {
  const high = Math.max(...logs);
  return high + Math.log(sumPositive(logs.map(v => Math.exp(v - high))));
}
function checked(value, nonzero = false) {
  if (!Number.isFinite(value) || (nonzero && value === 0)) throw new Error(RANGE_ERROR);
  return value === 0 ? 0 : value;
}
function onePlusExpLog(q) {
  return q > 0 ? q + Math.log1p(Math.exp(-q)) : Math.log1p(Math.exp(q));
}
function listPositiveSum(rows, term, termLog, active) {
  const selected = rows.filter(active);
  if (!selected.length) return 0;
  const values = selected.map(term);
  const direct = sumPositive(values);
  if (values.every(v => v >= 2.2250738585072014e-308 && Number.isFinite(v)) && direct > 0 && Number.isFinite(direct)) return direct;
  return fromLog(logSum(selected.map(termLog)));
}

export function evaluateModel(id, x, C) {
  switch (id) {
    case 'E121': {
      const {mone, mtwo, uone, utwo, restitution: e} = x;
      if (uone < utwo) throw new Error('첫 물체가 둘째 물체에 접근하도록 u₁ ≥ u₂로 입력하세요.');
      if (uone === utwo) return uone;
      const scale = Math.max(mone, mtwo);
      const a = mone / scale, b = mtwo / scale, total = a + b;
      if (a === 0 || b === 0) throw new Error('질량비가 너무 커서 충돌 속도를 신뢰할 수 없습니다. 입력 범위를 줄이세요.');
      const coefficientOne = ((mone - e * mtwo) / scale) / total;
      const coefficientTwo = (1 + e) * b / total;
      const first = coefficientOne === 0 || uone === 0 ? 0 : Math.sign(coefficientOne) * Math.sign(uone) * productRatio([Math.abs(coefficientOne), Math.abs(uone)]);
      const second = utwo === 0 ? 0 : Math.sign(utwo) * productRatio([coefficientTwo, Math.abs(utwo)]);
      return checked(first + second);
    }
    case 'E122': {
      const {mass, radius, inertia, angle, gravity} = x;
      if (angle >= Math.PI / 2) throw new Error('접촉을 유지하는 순수 구름 모델에는 경사각 θ < 90°가 필요합니다.');
      if (angle === 0) return 0;
      const sine = Math.sin(angle);
      if (inertia === 0) return productRatio([gravity, sine]);
      const q = Math.log(inertia) - Math.log(mass) - 2 * Math.log(radius);
      const first = inertia / mass, second = first / radius;
      const rawRatio = second / radius;
      const direct = gravity * sine / (1 + rawRatio);
      if (direct > 0 && Number.isFinite(direct) && [first, second, rawRatio].every(v => v >= 2.2250738585072014e-308 && Number.isFinite(v))) return direct;
      return fromLog(Math.log(gravity) + Math.log(sine) - onePlusExpLog(q));
    }
    case 'E123': {
      const {mass, gravity, lever, inertia, spin} = x;
      if (lever === 0) return 0;
      const value = productRatio([mass, gravity, lever], [inertia, spin]);
      if (Math.log(value) - Math.log(spin) > Math.log(0.1) + 8 * Number.EPSILON) throw new Error('느린 세차 근사에는 Ω/ω ≤ 0.1이 필요합니다. 자전속도와 입력 조건을 확인하세요.');
      return value;
    }
    case 'E124': {
      const {rotation, latitude, speed} = x;
      if (Math.abs(latitude) > Math.PI / 2) throw new Error('위도는 −90°부터 90°까지 입력하세요.');
      if (rotation === 0 || latitude === 0 || speed === 0) return 0;
      return productRatio([2, rotation, speed, Math.abs(Math.sin(latitude))]);
    }
    case 'E125': {
      const {tension, friction, wrap} = x;
      if (tension === 0) return 0;
      if (friction === 0 || wrap === 0) return tension;
      const exponent = friction * wrap;
      if (!Number.isFinite(exponent)) throw new Error(RANGE_ERROR);
      const direct = tension * Math.exp(exponent);
      return direct > 0 && Number.isFinite(direct) ? direct : fromLog(Math.log(tension) + exponent);
    }
    case 'E126': {
      const {mone, mtwo, inertia, radius, gravity} = x;
      if (mone === mtwo) return 0;
      const difference = mtwo - mone;
      const scale = Math.max(mone, mtwo);
      const first = inertia / scale, second = first / radius;
      const inertiaTerm = inertia === 0 ? 0 : second / radius;
      const direct = (difference / scale) * gravity / ((mone / scale) + (mtwo / scale) + inertiaTerm);
      if (direct !== 0 && Number.isFinite(direct) && (inertia === 0 || [first, second, inertiaTerm].every(v => v >= 2.2250738585072014e-308 && Number.isFinite(v)))) return direct;
      const denominatorLogs = [Math.log(mone), Math.log(mtwo)];
      if (inertia > 0) denominatorLogs.push(Math.log(inertia) - 2 * Math.log(radius));
      return Math.sign(difference) * fromLog(Math.log(Math.abs(difference)) + Math.log(gravity) - logSum(denominatorLogs));
    }
    case 'E127': {
      const {diameterone: d1, diametertwo: d2, centers} = x;
      if (centers <= d1 / 2 + d2 / 2) throw new Error('풀리 피치원이 겹치지 않도록 중심거리 C > (D₁ + D₂)/2로 입력하세요.');
      const difference = Math.abs(d1 - d2), q = (difference / centers) / 2;
      const tangent = 2 * centers * Math.sqrt((1 - q) * (1 + q));
      const arcs = Math.PI * (d1 / 2 + d2 / 2) + difference * Math.asin(q);
      return checked(tangent + arcs, true);
    }
    case 'E128':
      return listPositiveSum(x.points, row => row.m * row.r * row.r, row => Math.log(row.m) + 2 * Math.log(row.r), row => row.r > 0);
    case 'E129':
      return listPositiveSum(x.loads, row => row.n / row.total, row => Math.log(row.n) - Math.log(row.total), row => row.n > 0);
    case 'E130': {
      const {mass, stiffness, damping, force, frequency} = x;
      if (force === 0) return 0;
      if (frequency === 0) return productRatio([force], [stiffness]);
      const inertia = mass * frequency * frequency, dissipation = damping * frequency;
      let denominator = Math.hypot(stiffness - inertia, dissipation);
      if (denominator === 0) throw new Error('감쇠 없는 공진에서는 유한한 정상 진폭이 없습니다.');
      if (damping === 0 && Number.isFinite(inertia) && Math.abs(stiffness - inertia) <= 8 * Number.EPSILON * Math.max(stiffness, inertia)) throw new Error('공진에 너무 가까워 부동소수점 정밀도로 정상 진폭을 신뢰할 수 없습니다.');
      if (inertia >= 2.2250738585072014e-308 && Number.isFinite(inertia) && (dissipation === 0 || dissipation >= 2.2250738585072014e-308) && Number.isFinite(dissipation) && Number.isFinite(denominator)) return productRatio([force], [denominator]);
      const lk = Math.log(stiffness), li = Math.log(mass) + 2 * Math.log(frequency);
      const ld = damping === 0 ? -Infinity : Math.log(damping) + Math.log(frequency);
      const high = Math.max(lk, li, ld);
      denominator = Math.hypot(Math.exp(lk - high) - Math.exp(li - high), Math.exp(ld - high));
      if (denominator === 0) throw new Error('감쇠 없는 공진에서는 유한한 정상 진폭이 없습니다.');
      return fromLog(Math.log(force) - high - Math.log(denominator));
    }
    default: return undefined;
  }
}

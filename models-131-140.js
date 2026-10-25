// Original implementations of ten fluid-mechanics models.
// Scalar input constraints are validated by the common dispatcher.

function rangeError() {
  throw new Error('이 입력 범위에서는 유한한 0이 아닌 결과를 표현할 수 없습니다. 입력의 크기를 조정하세요.');
}

// Products are accumulated in log space when direct arithmetic would create
// artificial intermediate overflow or underflow. Physical zeros stay exact.
function product(numerator, denominator = []) {
  if (numerator.some(v => v === 0)) return 0;
  if (numerator.some(v => !Number.isFinite(v)) || denominator.some(v => !Number.isFinite(v) || v === 0)) rangeError();
  let sign = 1;
  let log = 0;
  for (const v of numerator) { sign *= Math.sign(v); log += Math.log(Math.abs(v)); }
  for (const v of denominator) { sign *= Math.sign(v); log -= Math.log(Math.abs(v)); }
  const result = sign * Math.exp(log);
  if (!Number.isFinite(result) || result === 0) rangeError();
  return result;
}

function checkedExp(log) {
  const result = Math.exp(log);
  if (!Number.isFinite(result) || result === 0) rangeError();
  return result;
}

function froude(v, g, depth) {
  if (v === 0) return 0;
  return checkedExp(Math.log(v) - 0.5 * (Math.log(g) + Math.log(depth)));
}

function wavelength(period, depth, g) {
  const twoPi = 2 * Math.PI;
  const logMu = 2 * Math.log(twoPi) - 2 * Math.log(period) + Math.log(depth) - Math.log(g);
  // mu = omega^2 h/g. Solving y*tanh(y)=mu, y=kh, is strictly monotonic.
  // In very shallow water the first omitted relative correction is O(mu^2).
  if (logMu < -36) {
    const mu = Math.exp(logMu);
    return checkedExp(Math.log(period) + 0.5 * (Math.log(g) + Math.log(depth)) - mu / 6);
  }
  // tanh(y) differs from 1 by less than 9e-18 for y>=20.
  if (logMu > Math.log(20)) {
    return checkedExp(Math.log(g) + 2 * Math.log(period) - Math.log(twoPi));
  }
  const mu = Math.exp(logMu);
  let low = Math.max(mu, Math.sqrt(mu));
  let high = mu + Math.sqrt(mu);
  for (let i = 0; i < 100; i++) {
    const mid = low + (high - low) / 2;
    if (mid === low || mid === high) break;
    if (mid * Math.tanh(mid) < mu) low = mid;
    else high = mid;
  }
  const y = low + (high - low) / 2;
  return product([twoPi, depth], [y]);
}

export function evaluateModel(id, x, C) {
  switch (id) {
    case 'E131':
      return froude(x.v, x.g, x.depth);
    case 'E132':
      return product([x.rho, x.v, x.v, x.length], [x.sigma]);
    case 'E133':
      return product([Math.abs(x.rhoa - x.rhob), x.g, x.length, x.length], [x.sigma]);
    case 'E134':
      if (x.p < x.pv) throw new Error('기준 절대압은 증기압 이상이어야 합니다. 증기압 미만에는 단상 액체 기준을 적용할 수 없습니다.');
      return product([2, x.p - x.pv], [x.rho, x.v, x.v]);
    case 'E135': {
      const logFr = Math.log(x.v) - 0.5 * (Math.log(x.g) + Math.log(x.depth));
      if (!(logFr > 0)) throw new Error('도수 전 프루드수 Fr₁은 1보다 커야 합니다. Fr₁ ≤ 1인 흐름에는 이 도수 공액수심 모델을 적용하지 않습니다.');
      // Work with log(Fr) so even an unrepresentably large intermediate Fr
      // can yield a finite sequent depth when the initial depth is tiny.
      const logMultiplier = logFr > 350
        ? logFr + 0.5 * Math.log(2)
        : Math.log((Math.hypot(1, Math.sqrt(8) * Math.exp(logFr)) - 1) / 2);
      return checkedExp(Math.log(x.depth) + logMultiplier);
    }
    case 'E136':
      return product([x.rho, x.a, x.reduction]);
    case 'E137':
      return product([x.mu, x.area, x.v], [x.gap]);
    case 'E138': {
      if (x.omega === 0 || x.rfirst === x.rsecond) return 0;
      const larger = Math.max(x.rfirst, x.rsecond);
      const smaller = Math.min(x.rfirst, x.rsecond);
      // (r2-r1)*(r2+r1), with the sum factor represented without overflow.
      return product([x.omega, x.omega, x.rsecond - x.rfirst, larger, 1 + smaller / larger], [2, x.g]);
    }
    case 'E139':
      return product([x.rho, x.v, x.circulation]);
    case 'E140':
      return wavelength(x.period, x.depth, x.g);
    default:
      return undefined;
  }
}

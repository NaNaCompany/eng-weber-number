/* Original scalar astronomy models. Inputs and outputs use SI units. */
function positiveLog(logValue) {
  const value = Math.exp(logValue);
  if (!Number.isFinite(value) || value === 0) throw new Error('결과가 계산 가능한 수치 범위를 벗어났습니다.');
  return value;
}
function logSchwarzschild(m, C) { return Math.log(2 * C.G / C.c / C.c) + Math.log(m); }
function weakExterior(m, radius, C) {
  if (logSchwarzschild(m, C) - Math.log(radius) > Math.log(0.01)) {
    throw new Error('뉴턴 근사의 적용 범위 r_s/r≤0.01을 벗어났습니다.');
  }
}
function signedProduct(a, b) {
  if (a === 0 || b === 0) return 0;
  const direct = a * b;
  if (Number.isFinite(direct) && direct !== 0) return direct;
  return Math.sign(a) * Math.sign(b) * positiveLog(Math.log(Math.abs(a)) + Math.log(Math.abs(b)));
}
function productWithError(a, b) {
  if (a === 0 || b === 0) return [0, 0];
  const value = signedProduct(a, b);
  // Split power-of-two-normalized factors; multiplying the original large
  // factors by the Dekker splitter can overflow and erase a cancellation residual.
  const ae = Math.max(-1022, Math.min(1023, Math.floor(Math.log2(Math.abs(a)))));
  const be = Math.max(-1022, Math.min(1023, Math.floor(Math.log2(Math.abs(b)))));
  const am = a / 2 ** ae, bm = b / 2 ** be;
  const product = am * bm;
  const ac = 134217729 * am, bc = 134217729 * bm;
  const ah = ac - (ac - am), al = am - ah;
  const bh = bc - (bc - bm), bl = bm - bh;
  const error = ((ah * bh - product) + ah * bl + al * bh) + al * bl;
  const exponent = ae + be;
  const normalizedRounded = scalePowerOfTwo(value, -exponent);
  const residual = (product - normalizedRounded) + error;
  const scaledResidual = scalePowerOfTwo(residual, exponent);
  if (residual !== 0 && scaledResidual === 0) throw new Error('결과가 계산 가능한 수치 범위를 벗어났습니다.');
  return [value, scaledResidual];
}
function scalePowerOfTwo(value, exponent) {
  let result = value;
  while (exponent > 1023) { result *= 2 ** 1023; exponent -= 1023; }
  while (exponent < -1022) { result *= 2 ** -1022; exponent += 1022; }
  return result * 2 ** exponent;
}
function expansionSum(values) {
  let expansion = [];
  for (const value of values) {
    let q = value;
    const next = [];
    for (const component of expansion) {
      const sum = q + component;
      if (!Number.isFinite(sum)) throw new Error('결과가 계산 가능한 수치 범위를 벗어났습니다.');
      const virtual = sum - q;
      const error = (q - (sum - virtual)) + (component - virtual);
      if (error !== 0) next.push(error);
      q = sum;
    }
    if (q !== 0) next.push(q);
    expansion = next;
  }
  return expansion.reduce((sum, value) => sum + value, 0);
}

export function evaluateModel(id, x, C) {
  switch (id) {
    case 'E101': {
      if (x.initial < x.final) throw new Error('초기 질량은 최종 질량 이상이어야 합니다.');
      if (x.exhaust >= C.c) throw new Error('배기속도는 광속보다 작아야 합니다.');
      if (x.initial === x.final) return 0;
      const relative = (x.initial - x.final) / x.final;
      const logRatio = relative < 0.5 ? Math.log1p(relative) : Math.log(x.initial) - Math.log(x.final);
      const value = signedProduct(x.exhaust, logRatio);
      if (value >= C.c) throw new Error('고전 로켓식의 계산 속도 변화량이 광속 이상입니다.');
      return value;
    }
    case 'E102': {
      if (x.exhaust >= C.c) throw new Error('배기속도는 광속보다 작아야 합니다.');
      const [momentum, me] = productWithError(x.flow, x.exhaust);
      const difference = x.exit - x.ambient;
      const virtual = difference - x.exit;
      const differenceError = (x.exit - (difference - virtual)) + (-x.ambient - virtual);
      const [pressure, pe] = productWithError(difference, x.area);
      const [pressureResidual, pre] = productWithError(differenceError, x.area);
      const value = expansionSum([momentum, pressure, me, pe, pressureResidual, pre]);
      if (!Number.isFinite(value)) throw new Error('결과가 계산 가능한 수치 범위를 벗어났습니다.');
      return value;
    }
    case 'E103': {
      if (x.far < x.near) throw new Error('먼 끝의 중심거리는 가까운 끝의 중심거리 이상이어야 합니다.');
      weakExterior(x.mass, x.near, C);
      if (x.near === x.far) return 0;
      // Factor the inverse-square difference to retain close endpoint precision.
      return positiveLog(Math.log(C.G) + Math.log(x.mass) - 2 * Math.log(x.near)
        + Math.log(x.far - x.near) - Math.log(x.far) + Math.log1p(x.near / x.far));
    }
    case 'E104': {
      if (Math.log(x.secondary) - Math.log(x.primary) > Math.log(0.01) + 1e-14) {
        throw new Error('힐 근사의 질량비 적용 범위 m/M≤0.01을 벗어났습니다.');
      }
      weakExterior(x.primary, x.orbit, C);
      return positiveLog(Math.log(x.orbit) + (Math.log(x.secondary) - Math.log(x.primary) - Math.log(3)) / 3);
    }
    case 'E105': {
      const logCompactness = Math.log(8 * Math.PI * C.G / (3 * C.c * C.c))
        + Math.log(x.primarydensity) + 2 * Math.log(x.radius);
      if (logCompactness > Math.log(0.01)) throw new Error('뉴턴 근사의 적용 범위 r_s/R≤0.01을 벗어났습니다.');
      const factorLog = Math.log(2.44) + (Math.log(x.primarydensity) - Math.log(x.satellitedensity)) / 3;
      if (factorLog < 0) return {kind:'no-result', message:'계산된 유체 로슈 한계가 주천체 표면 안쪽이므로 외부 궤도 한계가 없습니다.'};
      return positiveLog(Math.log(x.radius) + factorLog);
    }
    case 'E106': {
      if (x.source <= x.lens) throw new Error('광원 거리는 렌즈 거리보다 커야 합니다.');
      const logRs = logSchwarzschild(x.mass, C);
      const logAngle = 0.5 * (Math.log(2) + logRs + Math.log(x.source - x.lens) - Math.log(x.lens) - Math.log(x.source));
      const logImpact = Math.log(x.lens) + logAngle;
      if (logAngle > Math.log(0.1) || logImpact - logRs < Math.log(100)) {
        throw new Error('작은각·약한장 적용 범위 θ≤0.1 rad 및 b/r_s≥100을 벗어났습니다.');
      }
      return positiveLog(logAngle);
    }
    case 'E107':
      return positiveLog(Math.log(4 * Math.PI * C.G * C.c) + Math.log(x.mass) - Math.log(x.opacity));
    case 'E108': {
      if (x.sound >= C.c) throw new Error('음속은 광속보다 작아야 합니다.');
      // Mass in a sphere of diameter λ_J = c_s sqrt(π/(Gρ)).
      return positiveLog(2.5 * Math.log(Math.PI) - Math.log(6) + 3 * Math.log(x.sound)
        - 1.5 * Math.log(C.G) - 0.5 * Math.log(x.density));
    }
    case 'E109': {
      const logRs = logSchwarzschild(x.mass, C);
      const u = Math.exp(logRs - Math.log(x.emitter));
      const v = Math.exp(logRs - Math.log(x.receiver));
      if (u >= 1 || v >= 1) throw new Error('방출자와 수신자는 모두 슈바르츠실트 반지름 바깥에 있어야 합니다.');
      if (x.emitter === x.receiver) return 0;
      if (1 - u < 0.01 || 1 - v < 0.01) {
        throw new Error('지평선에 너무 가까워 부동소수점 정밀도로 적색편이를 신뢰할 수 없습니다. 반지름을 늘리세요.');
      }
      const sign = Math.sign(x.receiver - x.emitter);
      const logAbsT = logRs + Math.log(Math.abs(x.receiver - x.emitter))
        - Math.log(x.emitter) - Math.log(x.receiver) - Math.log1p(-u);
      let logRatio;
      if (logAbsT < Math.log(0.5)) {
        const t = sign * positiveLog(logAbsT);
        logRatio = 0.5 * Math.log1p(t);
      } else {
        logRatio = 0.5 * (Math.log1p(-v) - Math.log1p(-u));
      }
      const value = Math.expm1(logRatio);
      if (!Number.isFinite(value) || value === 0) throw new Error('결과가 계산 가능한 수치 범위를 벗어났습니다.');
      return value;
    }
    case 'E110': {
      if (x.planet > x.star) throw new Error('행성 반지름은 항성 반지름 이하여야 합니다.');
      if (x.planet === 0) return 0;
      if (x.planet === x.star) return 1;
      return positiveLog(2 * (Math.log(x.planet) - Math.log(x.star)));
    }
    default: return undefined;
  }
}

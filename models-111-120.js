/* Original quantum and optical models. Inputs are validated SI quantities. */
const LOG_MAX = Math.log(Number.MAX_VALUE);
const LOG_NR_LIMIT = Math.log(0.01);
const MIN_NORMAL = 2.2250738585072014e-308;

function positiveFromLog(logValue) {
  if (!Number.isFinite(logValue) || logValue > LOG_MAX) {
    throw new Error('결과가 수치 표현 범위를 벗어납니다. 입력 크기를 조정하세요.');
  }
  const value = Math.exp(logValue);
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new Error('양의 결과가 수치 표현 범위보다 작습니다. 입력 크기를 조정하세요.');
  }
  return value;
}

function finiteResult(value, nonzeroExpected = false) {
  if (!Number.isFinite(value)) {
    throw new Error('결과가 수치 표현 범위를 벗어납니다. 입력 크기를 조정하세요.');
  }
  if (nonzeroExpected && value === 0) {
    throw new Error('0이 아닌 결과가 수치 표현 범위보다 작습니다. 입력 크기를 조정하세요.');
  }
  return Object.is(value, -0) ? 0 : value;
}

function nonrelativistic(energy, mass, C) {
  if (Math.log(energy) - Math.log(mass) - 2 * Math.log(C.c) > LOG_NR_LIMIT + 2e-14) {
    throw new Error('비상대론 근사 범위 E/(mc²)≤0.01을 벗어납니다.');
  }
}

function integerAtLeast(value, minimum) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error('양자수 또는 개수는 지정 범위의 안전한 정수여야 합니다.');
  }
}

function inverseOnePlusExp(logTerm) {
  if (logTerm === -Infinity) return 1;
  const result = logTerm >= 0
    ? Math.exp(-logTerm) / (1 + Math.exp(-logTerm))
    : 1 / (1 + Math.exp(logTerm));
  if (!(result > 0) || !Number.isFinite(result)) {
    throw new Error('양의 투과확률이 수치 표현 범위보다 작습니다. 장벽 폭이나 높이를 줄이세요.');
  }
  return Math.min(1, result);
}

function logSinhc(z) {
  if (z < 1e-4) {
    const square = z * z;
    return Math.log1p(square / 6 + square * square / 120);
  }
  if (z > 20) return z - Math.LN2 + Math.log1p(-Math.exp(-2 * z)) - Math.log(z);
  return Math.log(Math.sinh(z) / z);
}

function barrierPhase(mass, difference, width, hbar) {
  // Favor direct arithmetic: log/exp can add a large absolute phase error.
  const square = 2 * mass * difference;
  const ratio = width / hbar;
  let phase = Math.sqrt(square) * ratio;
  if (square >= MIN_NORMAL && Number.isFinite(square)
      && ratio >= MIN_NORMAL && Number.isFinite(ratio)
      && phase >= MIN_NORMAL && Number.isFinite(phase)) return phase;
  // Binary scaling keeps all intermediate mantissas normal, including when
  // 2*m*ΔE is a nonzero subnormal. Do not sqrt that rounded subnormal product.
  const split = value => {
    const exponent = Math.max(-1074, Math.min(1023, Math.floor(Math.log2(value))));
    return [value / (2 ** exponent), exponent];
  };
  const [massMantissa, massExponent] = split(mass);
  const [differenceMantissa, differenceExponent] = split(difference);
  const [widthMantissa, widthExponent] = split(width);
  const [hbarMantissa, hbarExponent] = split(hbar);
  const radicandExponent = massExponent + differenceExponent + 1;
  const rootExponent = Math.floor(radicandExponent / 2);
  const oddPower = radicandExponent - 2 * rootExponent;
  const root = Math.sqrt(massMantissa * differenceMantissa * (2 ** oddPower));
  const mantissa = root * (widthMantissa / hbarMantissa);
  const exponent = rootExponent + widthExponent - hbarExponent;
  const firstExponent = Math.max(-1022, Math.min(1023, exponent));
  phase = (mantissa * (2 ** (exponent - firstExponent))) * (2 ** firstExponent);
  return phase;
}

function stableAboveBarrier(logAmplitude, phase) {
  const sine = Math.abs(Math.sin(phase));
  const probability = s => s === 0 ? 1 : inverseOnePlusExp(logAmplitude + 2 * Math.log(s));
  const result = probability(sine);
  // sin is 1-Lipschitz. Account for rounded input differences, products,
  // square roots and scaled fallback, then bound the probability variation.
  const phaseError = 128 * Number.EPSILON * Math.max(phase, 1);
  const lower = probability(Math.min(1, sine + phaseError));
  const upper = probability(Math.max(0, sine - phaseError));
  if (upper - lower > 1e-10 * result) {
    throw new Error('계산 중 언더플로 또는 정밀도 손실이 발생했습니다. 입력 크기를 확인하세요.');
  }
  return result;
}

function twoProduct(a, b) {
  const product = a * b;
  finiteResult(product, a !== 0 && b !== 0);
  if (a === 0 || b === 0) return [product, 0];
  // Integer b is at most 2^53−1. Normalize a before Dekker splitting so
  // splitter*a cannot overflow or erase a subnormal significand.
  let exponent = Math.floor(Math.log2(Math.abs(a)));
  exponent = Math.max(-1022, Math.min(1023, exponent));
  const scale = 2 ** exponent;
  const normalized = a / scale;
  const splitter = 134217729;
  const splitA = splitter * normalized;
  const highA = splitA - (splitA - normalized);
  const lowA = normalized - highA;
  const splitB = splitter * b;
  const highB = splitB - (splitB - b);
  const lowB = b - highB;
  const normalizedProduct = normalized * b;
  const residual = ((highA * highB - normalizedProduct) + highA * lowB + lowA * highB) + lowA * lowB;
  const high = normalizedProduct * scale;
  // high normally equals product. Include the difference if scaling rounded
  // into the subnormal range; a nonzero discarded tail cannot become Q=0.
  const low = residual * scale + (high - product);
  if ((residual !== 0 && residual * scale === 0) || !Number.isFinite(high)) {
    throw new Error('계산 중 언더플로 또는 정밀도 손실이 발생했습니다. 입력 크기를 확인하세요.');
  }
  return [product, low];
}

function compensatedSum(values) {
  let sum = 0;
  let correction = 0;
  for (const value of values) {
    const next = sum + value;
    if (!Number.isFinite(next)) throw new Error('총 질량이 수치 표현 범위를 벗어납니다.');
    correction += Math.abs(sum) >= Math.abs(value)
      ? (sum - next) + value
      : (value - next) + sum;
    sum = next;
  }
  return finiteResult(sum + correction);
}

export function evaluateModel(id, x, C) {
  switch (id) {
    case 'E111': {
      integerAtLeast(x.level, 1);
      const logEnergy = 2 * (Math.log(x.level) + Math.log(C.h) - Math.log(x.width))
        - Math.log(8) - Math.log(x.mass);
      if (logEnergy - Math.log(x.mass) - 2 * Math.log(C.c) > LOG_NR_LIMIT + 2e-14) {
        throw new Error('비상대론 근사 범위 E/(mc²)≤0.01을 벗어납니다.');
      }
      return positiveFromLog(logEnergy);
    }
    case 'E112': {
      nonrelativistic(Math.max(x.energy, x.barrier), x.mass, C);
      if (x.width === 0 || x.barrier === 0) return 1;
      // Pull out a² and use sinh(z)/z or sin(z)/z. This has a finite E=U limit.
      const logCoefficient = Math.log(x.mass) + 2 * Math.log(x.barrier)
        + 2 * Math.log(x.width) - Math.LN2 - Math.log(x.energy) - 2 * Math.log(C.hbar);
      const difference = x.barrier - x.energy;
      if (difference === 0) return inverseOnePlusExp(logCoefficient);
      const phase = barrierPhase(x.mass, Math.abs(difference), x.width, C.hbar);
      if (difference < 0 && phase > 1e12) {
        throw new Error('장벽 위 위상 qa가 10¹²를 넘습니다. 수치 정확도를 위해 입력을 줄이세요.');
      }
      if (!Number.isFinite(phase)) {
        throw new Error('양의 투과확률이 수치 표현 범위보다 작습니다. 장벽 폭이나 높이를 줄이세요.');
      }
      if (difference > 0) {
        return inverseOnePlusExp(logCoefficient + 2 * logSinhc(phase));
      }
      if (phase < 1e-4) {
        const square = phase * phase;
        const logSinc = Math.log1p(-square / 6 + square * square / 120);
        return inverseOnePlusExp(logCoefficient + 2 * logSinc);
      }
      const logAmplitude = 2 * Math.log(x.barrier) - Math.log(4)
        - Math.log(x.energy) - Math.log(-difference);
      return stableAboveBarrier(logAmplitude, phase);
    }
    case 'E113': {
      integerAtLeast(x.upper, 1);
      integerAtLeast(x.lower, 1);
      if (x.upper <= x.lower) throw new Error('방출 전이에는 높은 양자수 nᵢ가 낮은 양자수 n𝒻보다 커야 합니다.');
      // Difference of inverse squares is factored to retain adjacent-level differences.
      const differenceFraction = (x.upper - x.lower) / x.upper;
      const sumFraction = 1 + x.lower / x.upper;
      return positiveFromLog(2 * Math.log(x.lower) - Math.log(x.rydberg)
        - Math.log(differenceFraction) - Math.log(sumFraction));
    }
    case 'E114': {
      integerAtLeast(x.level, 0);
      return positiveFromLog(Math.log(C.hbar) + Math.log(x.omega) + Math.log(x.level + 0.5));
    }
    case 'E115': {
      if (x.theta < 0 || x.theta > Math.PI) throw new Error('산란각 θ는 0~180° 범위여야 합니다.');
      if (x.theta === 0) return 0;
      const sine = Math.sin(x.theta / 2);
      return positiveFromLog(Math.LN2 + Math.log(C.h) - Math.log(x.mass)
        - Math.log(C.c) + 2 * Math.log(sine));
    }
    case 'E116': {
      const photon = (C.h * C.c) / x.wavelength;
      finiteResult(photon, true);
      if (photon < x.work) {
        return {kind: 'no-result', message: '광자 에너지가 일함수보다 작아 이 모델에서는 광전자가 방출되지 않습니다.'};
      }
      const excess = photon - x.work;
      if (excess === 0) return 0;
      return finiteResult(excess / C.e, true);
    }
    case 'E117': {
      const terms = [];
      for (const [key, sign] of [['reactants', 1], ['products', -1]]) {
        if (!Array.isArray(x[key]) || x[key].length < 1 || x[key].length > 100) {
          throw new Error('반응 전과 후에 각각 1~100개 질량 항을 입력하세요.');
        }
        for (const row of x[key]) {
          integerAtLeast(row.count, 1);
          if (!Number.isFinite(row.mass) || row.mass < 0) throw new Error('정지질량은 0 이상의 유한한 수여야 합니다.');
          const [product, residual] = twoProduct(row.mass, row.count);
          terms.push(sign * product, sign * residual);
        }
      }
      const difference = compensatedSum(terms);
      if (difference === 0) return 0;
      return finiteResult(difference * C.c * C.c, true);
    }
    case 'E118': {
      const logDivergence = Math.log(x.wavelength) - Math.log(Math.PI)
        - Math.log(x.index) - Math.log(x.waist);
      if (logDivergence > Math.log(0.1) + 2e-14) {
        throw new Error('근축 조건 λ₀/(πnw₀)≤0.1 rad를 벗어납니다.');
      }
      if (x.distance === 0) return x.waist;
      const spreadLog = Math.log(Math.abs(x.distance)) + logDivergence;
      if (spreadLog > LOG_MAX) throw new Error('빔 반지름이 수치 표현 범위를 벗어납니다.');
      // A spread term below the numeric range cannot change the finite positive waist.
      return finiteResult(Math.hypot(x.waist, Math.exp(spreadLog)), true);
    }
    case 'E119': {
      if (x.theta < 0 || x.theta > Math.PI / 2) throw new Error('편광축의 작은 사이각 θ는 0~90° 범위여야 합니다.');
      if (x.intensity === 0 || x.theta === Math.PI / 2) return 0;
      if (x.theta === 0) return x.intensity;
      const cosine = Math.cos(x.theta);
      return positiveFromLog(Math.log(x.intensity) + 2 * Math.log(cosine));
    }
    case 'E120': {
      if (x.verdet === 0 || x.field === 0 || x.length === 0) return 0;
      const sign = Math.sign(x.verdet) * Math.sign(x.field);
      return sign * positiveFromLog(Math.log(Math.abs(x.verdet))
        + Math.log(Math.abs(x.field)) + Math.log(x.length));
    }
    default:
      return undefined;
  }
}

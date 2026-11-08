// Decimal-safe voucher calculations. This domain policy has no persistence or
// transport dependency and can be reused by every voucher use case.
function decimal(value) {
  const [mantissa, exp = '0'] = String(value).toLowerCase().split('e');
  const [whole, fraction = ''] = mantissa.split('.');
  let scale = fraction.length - Number(exp);
  let integer = BigInt(whole + fraction);
  if (scale < 0) {
    integer *= 10n ** BigInt(-scale);
    scale = 0;
  }
  return { integer, scale };
}

function percentageDiscount(total, percent) {
  const a = decimal(total);
  const b = decimal(percent);
  const numerator = a.integer * b.integer;
  const denominator = 10n ** BigInt(a.scale + b.scale);
  return Number((numerator * 2n + denominator) / (denominator * 2n)) / 100;
}

function subtractDiscount(total, discount) {
  const a = decimal(total);
  const b = decimal(discount);
  const scale = Math.max(a.scale, b.scale);
  const difference = a.integer * 10n ** BigInt(scale - a.scale)
    - b.integer * 10n ** BigInt(scale - b.scale);
  return Number(difference) / 10 ** scale;
}

module.exports = { percentageDiscount, subtractDiscount };

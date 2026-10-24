// Java BigDecimal divide(100, 2, HALF_UP), avoiding binary float tie errors.
function decimal(value) {
  const [mantissa, exp = "0"] = String(value).toLowerCase().split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  let scale = fraction.length - Number(exp),
    integer = BigInt(whole + fraction);
  if (scale < 0) {
    integer *= 10n ** BigInt(-scale);
    scale = 0;
  }
  return { integer, scale };
}
function percentageDiscount(total, percent) {
  const a = decimal(total),
    b = decimal(percent),
    n = a.integer * b.integer,
    d = 10n ** BigInt(a.scale + b.scale);
  return Number((n * 2n + d) / (d * 2n)) / 100;
}
function subtractDiscount(total, discount) {
  const a = decimal(total),
    b = decimal(discount);
  const scale = Math.max(a.scale, b.scale);
  const difference =
    a.integer * 10n ** BigInt(scale - a.scale) -
    b.integer * 10n ** BigInt(scale - b.scale);
  return Number(difference) / 10 ** scale;
}
module.exports = { percentageDiscount, subtractDiscount };

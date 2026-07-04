export type Currency = {
  code: string; // ISO 4217, e.g. "USD"
  symbol: string; // e.g. "$"
  name: string;
};

/** Common currencies. `symbol` is what the invoice prepends to amounts. */
export const currencies: Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "CN¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "CHF", symbol: "CHF ", name: "Swiss Franc" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
  { code: "KES", symbol: "KSh ", name: "Kenyan Shilling" },
  { code: "AED", symbol: "AED ", name: "UAE Dirham" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "SEK", symbol: "kr ", name: "Swedish Krona" },
];

export function symbolForCode(code: string): string {
  return currencies.find((c) => c.code === code)?.symbol ?? "$";
}

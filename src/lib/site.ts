export const SITE = {
  name: "FA Course Institute",
  tagline: "Knowledge is Power",
  since: "2023",
  whatsapp: "https://whatsapp.com/channel/0029VaDVwyD7T8bQTsUGwN1f",
};

export function formatPrice(price: number | null | undefined, isFree?: boolean) {
  if (isFree || !price) return "Free";
  return `PKR ${Number(price).toLocaleString("en-PK")}`;
}

export function statusLabel(status: string) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending review";
}

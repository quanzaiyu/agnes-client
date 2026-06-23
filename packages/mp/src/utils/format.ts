export const formatPoints = (n: number) => n.toLocaleString('zh-CN');
export const formatDate = (d: string | Date) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return d as string;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
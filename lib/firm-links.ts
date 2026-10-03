import partners from './partner-links.json';
export function partnerDetails(id:string):{affiliateURL:string|null;promoCode:string}|null {
  return (partners as Record<string,{affiliateURL:string|null;promoCode:string}>)[id]||null;
}
export function firmDestination(firm:{id:string;partner:boolean;officialURL:string|null}) {
  const partner=firm.partner?partnerDetails(firm.id):null;
  const destination=partner?.affiliateURL||firm.officialURL;
  if(!destination)return null;
  try {const url=new URL(destination);if(url.protocol!=='https:'||url.username||url.password||/(^|\.)propfirm(match|map)\.com$/i.test(url.hostname))return null;return url.href;}catch{return null;}
}

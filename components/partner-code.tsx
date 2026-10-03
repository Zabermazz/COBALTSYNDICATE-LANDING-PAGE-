'use client';
import {useState} from 'react';
import {Copy,Check} from 'lucide-react';
import {partnerDetails} from '@/lib/firm-links';
export function PartnerCode({firmId}:{firmId:string}) {
  const [copied,setCopied]=useState(false),[error,setError]=useState(false);const partner=partnerDetails(firmId);
  if(!partner)return null;
  async function copy(){try{await navigator.clipboard.writeText(partner!.promoCode);setCopied(true);setError(false);setTimeout(()=>setCopied(false),2500);}catch{setError(true);}}
  return <div style={{margin:'16px 0'}}><span className="help" style={{display:'block',marginBottom:6}}>Cobalt partner code</span><button className="code" onClick={copy} aria-label={`Copy ${partner.promoCode} promo code`}><span>{partner.promoCode}</span>{copied?<Check size={16}/>:<Copy size={16}/>}</button><span role="status" className="help" style={{display:'block',marginTop:6}}>{error?`Select and copy ${partner.promoCode} manually.`:copied?'Code copied.':'Confirm code eligibility and savings at checkout.'}</span></div>;
}

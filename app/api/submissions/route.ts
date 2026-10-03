import {contact} from '@/lib/contact';
const response=()=>Response.json({error:'Enquiries are collected in Google Forms.',form:contact.form},{status:410});
export const GET=response;export const POST=response;export const PATCH=response;

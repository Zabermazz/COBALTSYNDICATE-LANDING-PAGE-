import {redirect} from 'next/navigation';
export default async function Course({params}:{params:Promise<{courseSlug:string}>}){redirect(`/course/${(await params).courseSlug}`);}

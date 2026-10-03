import {LearningShell,Hero} from '@/components/education/ui';
import {CourseEditor} from '@/components/education/editor';
export const metadata={title:'Course editor',robots:{index:false,follow:false}};
export default function Editor(){return <LearningShell><Hero tag="Cobalt team" title="Course editor"><p>Create drafts, publish lessons and manage learning resources.</p></Hero><CourseEditor/></LearningShell>;}

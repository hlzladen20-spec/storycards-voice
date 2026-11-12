import {courseText} from './language-courses.js';

export function applyCourseLabels(root,course){
 const header=root.querySelector('.app > header .eyebrow');
 if(header)header.textContent=`${course.flag} ${course.name}${course.beta?' · Beta':''}`;
 const brand=root.querySelector('.home-brand');
 if(brand){const label=root.createElement('small');label.className='home-course-label';label.textContent=`${course.flag} ${course.name}${course.beta?' · Beta':''}`;brand.append(label);}
 for(const element of root.querySelectorAll('.home-card > p:not(.home-today), #speakPrompt'))element.textContent=courseText(element.textContent,course);
 const avatar=root.querySelector('#emmaAvatar');
 if(avatar)avatar.alt=`Emma, deine virtuelle Trainerin für ${course.name}`;
}

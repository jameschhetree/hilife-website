const applicationForm=document.querySelector('#team-application');
const applicationStatus=document.querySelector('#application-status');
const submitButton=applicationForm.querySelector('button[type="submit"]');
let requestId=crypto.randomUUID();
applicationForm.addEventListener('submit',async event=>{
 event.preventDefault();if(!applicationForm.reportValidity()||submitButton.disabled)return;
 const values=Object.fromEntries(new FormData(applicationForm));
 values.consent=applicationForm.elements.consent.checked;values.requestId=requestId;
 submitButton.disabled=true;submitButton.textContent='Sending…';applicationStatus.textContent='Sending your application to HiLife…';
 try{
  const response=await fetch('/api/studio?action=team-application',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});
  const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Unable to confirm delivery. Please contact hilife3nt@gmail.com.');
  applicationForm.reset();applicationForm.hidden=true;applicationStatus.textContent='Thank you. Your application has been emailed to the HiLife team. We’ll contact you if there’s a fit.';
 }catch(error){applicationStatus.textContent=error.message==='Failed to fetch'?'Connection interrupted. Your answers are still here. Try again to check your submission, or contact hilife3nt@gmail.com.':error.message;submitButton.disabled=false;submitButton.textContent='Submit application →'}
});

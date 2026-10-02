(function(){"use strict";self.onmessage=async o=>{const{id:s,bytes:n,settings:a,importerVersion:c,platform:i}=o.data;try{const t=await crypto.subtle.digest("SHA-256",n),r=[...new Uint8Array(t)].map(e=>e.toString(16).padStart(2,"0")).join(""),p=new TextEncoder().encode(`${r}
${c}
${i}
${a}`),g=await crypto.subtle.digest("SHA-256",p),y=[...new Uint8Array(g)].map(e=>e.toString(16).padStart(2,"0")).join("");self.postMessage({id:s,sourceHash:r,cacheKey:y})}catch(t){self.postMessage({id:s,error:t instanceof Error?t.message:String(t)})}}})();

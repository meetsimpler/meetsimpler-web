import {loadAuth, authData, authErrorMessage, providers, callbackError, accessRequest, createAuthOperations} from './auth-client.js';
import {showAuthResult, watchFieldValidation} from './auth-view.js';
const status=document.getElementById('status');
const operations=createAuthOperations();
watchFieldValidation('consent', 'Please accept the Terms first.');
const buttons=Object.keys(providers).map(provider=>document.getElementById(provider));
function disableButtons(disabled) {for(const button of buttons) button.disabled=disabled;}
const storageKey='meetsimpler-browser-auth';
const pairKey='meetsimpler-pairing';
const fragment=new URLSearchParams(location.hash.slice(1));
const query=new URLSearchParams(location.search);
const code=query.get('code');
const oauthError=callbackError();
history.replaceState(null,'',location.pathname);
if(code || oauthError) {
  document.getElementById('signin-form').hidden=true;
  status.textContent='Finishing sign-in and connecting your Windows app…';
}
function showResult(success, message) {
  document.getElementById('signin-form').hidden=true;
  showAuthResult({success, message,
    title: success ? 'Sign-in successful' : 'Sign-in could not be completed',
    next: success
    ?'Switch back to the MeetSimpler Windows app. It will finish signing you in and check your account access. You can close this browser tab.'
    :'Return to the MeetSimpler Windows app. If it is still waiting, choose Cancel browser sign-in. Then choose Continue with Google or Continue with GitHub again to start a fresh sign-in. Complete it within five minutes in the browser tab opened by the app.',
    note: success
    ?'If the app is still waiting, give it a moment. If it reports an error or the sign-in has timed out, start sign-in again from the app.'
    :'If you cancelled at the provider, approve sign-in on your next attempt. If the problem continues, check your internet connection or contact support.',
  });
}
function clearBrowserSession() {
  sessionStorage.removeItem(storageKey);
  sessionStorage.removeItem(storageKey+'-code-verifier');
  sessionStorage.removeItem(pairKey);
}
try {
  if(fragment.has('secret')) {
    clearBrowserSession();
    sessionStorage.setItem(pairKey,JSON.stringify({secret:fragment.get('secret'),device:fragment.get('device'),provider:fragment.get('provider'),started:Date.now(),accepted:false}));
  }
  if(oauthError) throw new Error('Browser sign-in was not completed. Start again in the app.');
  const pair=JSON.parse(sessionStorage.getItem(pairKey)||'null');
  if(!pair || !/^[A-Za-z0-9_-]{43}$/.test(pair.secret||'') || !/^[0-9a-f-]{36}$/i.test(pair.device||'') || Date.now()-pair.started>300000) throw new Error('Start sign-in from the Windows app. Pairing lasts five minutes.');
  await operations.run(async call=>{
    const {auth, config}=await loadAuth({storage:sessionStorage,storageKey,flowType:'pkce',persistSession:true},operations);
    document.getElementById('device').textContent='Device: '+pair.device.slice(0,8)+'...';
    if(code) {
      if(!pair.accepted) throw new Error('Accept the Terms before signing in.');
      const data=authData(await call(()=>auth.exchangeCodeForSession(code)));
      if(!data.session) throw new Error('Sign-in expired. Start again from the Windows app.');
      const session=data.session;
      await call(()=>accessRequest(config,'pairComplete',{
        secret:pair.secret,device:pair.device,terms:'2026-10-12',refreshToken:session.refresh_token},session.access_token,operations.signal));
      // Do not revoke the session handed to the desktop by calling signOut.
      clearBrowserSession();
      showResult(true,'Connected. Your sign-in has been sent securely to MeetSimpler.');
    } else {
      status.textContent='Sign in to activate this device. Seven-day access is granted if your account is eligible.';
      disableButtons(false);
      if(Object.hasOwn(providers,pair.provider)) document.getElementById(pair.provider).focus();
      for(const [provider,label] of Object.entries(providers)) {
        document.getElementById(provider).onclick=async()=>{
          if(document.getElementById(provider).disabled) return;
          if(Date.now()-pair.started>300000) {
            clearBrowserSession();disableButtons(true);
            showResult(false,'Sign-in expired. Start again from the Windows app.');
            return;
          }
          if(!document.getElementById('consent').reportValidity()) return;
          disableButtons(true);
          pair.provider=provider;pair.accepted=true;sessionStorage.setItem(pairKey,JSON.stringify(pair));
          try {
            await operations.run(async call=>{
              authData(await call(()=>auth.signInWithOAuth({provider,options:{redirectTo:location.origin+location.pathname}})));
            });
          } catch (error) {
            if(operations.stopped) {
              clearBrowserSession();showResult(false,error.message);return;
            }
            pair.accepted=false;sessionStorage.setItem(pairKey,JSON.stringify(pair));
            status.textContent=label+' sign-in could not start. Try again.';disableButtons(false);
          }
        };
      }
    }
  });
} catch(error) {clearBrowserSession();disableButtons(true);showResult(false,authErrorMessage(error, 'Unable to connect your app. Please start sign-in again.'));}

import{o as Go,d as Ha}from"./vendor-DMA0cjBn.js";const Sy=()=>{};var Ph={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $f=function(n){const e=[];let t=0;for(let r=0;r<n.length;r++){let s=n.charCodeAt(r);s<128?e[t++]=s:s<2048?(e[t++]=s>>6|192,e[t++]=s&63|128):(s&64512)===55296&&r+1<n.length&&(n.charCodeAt(r+1)&64512)===56320?(s=65536+((s&1023)<<10)+(n.charCodeAt(++r)&1023),e[t++]=s>>18|240,e[t++]=s>>12&63|128,e[t++]=s>>6&63|128,e[t++]=s&63|128):(e[t++]=s>>12|224,e[t++]=s>>6&63|128,e[t++]=s&63|128)}return e},Py=function(n){const e=[];let t=0,r=0;for(;t<n.length;){const s=n[t++];if(s<128)e[r++]=String.fromCharCode(s);else if(s>191&&s<224){const i=n[t++];e[r++]=String.fromCharCode((s&31)<<6|i&63)}else if(s>239&&s<365){const i=n[t++],o=n[t++],c=n[t++],u=((s&7)<<18|(i&63)<<12|(o&63)<<6|c&63)-65536;e[r++]=String.fromCharCode(55296+(u>>10)),e[r++]=String.fromCharCode(56320+(u&1023))}else{const i=n[t++],o=n[t++];e[r++]=String.fromCharCode((s&15)<<12|(i&63)<<6|o&63)}}return e.join("")},jf={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,e){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let s=0;s<n.length;s+=3){const i=n[s],o=s+1<n.length,c=o?n[s+1]:0,u=s+2<n.length,l=u?n[s+2]:0,f=i>>2,p=(i&3)<<4|c>>4;let g=(c&15)<<2|l>>6,v=l&63;u||(v=64,o||(g=64)),r.push(t[f],t[p],t[g],t[v])}return r.join("")},encodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(n):this.encodeByteArray($f(n),e)},decodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(n):Py(this.decodeStringToByteArray(n,e))},decodeStringToByteArray(n,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let s=0;s<n.length;){const i=t[n.charAt(s++)],c=s<n.length?t[n.charAt(s)]:0;++s;const l=s<n.length?t[n.charAt(s)]:64;++s;const p=s<n.length?t[n.charAt(s)]:64;if(++s,i==null||c==null||l==null||p==null)throw new Cy;const g=i<<2|c>>4;if(r.push(g),l!==64){const v=c<<4&240|l>>2;if(r.push(v),p!==64){const C=l<<6&192|p;r.push(C)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}};class Cy extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const ky=function(n){const e=$f(n);return jf.encodeByteArray(e,!0)},_o=function(n){return ky(n).replace(/\./g,"")},zf=function(n){try{return jf.decodeString(n,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Kf(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Dy=()=>Kf().__FIREBASE_DEFAULTS__,Vy=()=>{if(typeof process>"u"||typeof Ph>"u")return;const n=Ph.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},Ny=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=n&&zf(n[1]);return e&&JSON.parse(e)},Ho=()=>{try{return Sy()||Dy()||Vy()||Ny()}catch(n){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${n}`);return}},Gf=n=>{var e,t;return(t=(e=Ho())==null?void 0:e.emulatorHosts)==null?void 0:t[n]},Xc=n=>{const e=Gf(n);if(!e)return;const t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const r=parseInt(e.substring(t+1),10);return e[0]==="["?[e.substring(1,t-1),r]:[e.substring(0,t),r]},Hf=()=>{var n;return(n=Ho())==null?void 0:n.config},Wf=n=>{var e;return(e=Ho())==null?void 0:e[`_${n}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oy{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,r)=>{t?this.reject(t):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,r))}}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Qf(n,e){if(n.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},r=e||"demo-project",s=n.iat||0,i=n.sub||n.user_id;if(!i)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o={iss:`https://securetoken.google.com/${r}`,aud:r,iat:s,exp:s+3600,auth_time:s,sub:i,user_id:i,firebase:{sign_in_provider:"custom",identities:{}},...n};return[_o(JSON.stringify(t)),_o(JSON.stringify(o)),""].join(".")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Te(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function xy(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(Te())}function Jf(){var e;const n=(e=Ho())==null?void 0:e.forceEnvironment;if(n==="node")return!0;if(n==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function My(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function Ly(){const n=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof n=="object"&&n.id!==void 0}function Fy(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function Uy(){const n=Te();return n.indexOf("MSIE ")>=0||n.indexOf("Trident/")>=0}function Yf(){return!Jf()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function Xf(){return!Jf()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function Zc(){try{return typeof indexedDB=="object"}catch{return!1}}function Zf(){return new Promise((n,e)=>{try{let t=!0;const r="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(r);s.onsuccess=()=>{s.result.close(),t||self.indexedDB.deleteDatabase(r),n(!0)},s.onupgradeneeded=()=>{t=!1},s.onerror=()=>{var i;e(((i=s.error)==null?void 0:i.message)||"")}}catch(t){e(t)}})}function By(){return!(typeof navigator>"u"||!navigator.cookieEnabled)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qy="FirebaseError";class tt extends Error{constructor(e,t,r){super(t),this.code=e,this.customData=r,this.name=qy,Object.setPrototypeOf(this,tt.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Xn.prototype.create)}}class Xn{constructor(e,t,r){this.service=e,this.serviceName=t,this.errors=r}create(e,...t){const r=t[0]||{},s=`${this.service}/${e}`,i=this.errors[e],o=i?$y(i,r):"Error",c=`${this.serviceName}: ${o} (${s}).`;return new tt(s,c,r)}}function $y(n,e){return n.replace(jy,(t,r)=>{const s=e[r];return s!=null?String(s):`<${r}?>`})}const jy=/\{\$([^}]+)}/g;function zy(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}function St(n,e){if(n===e)return!0;const t=Object.keys(n),r=Object.keys(e);for(const s of t){if(!r.includes(s))return!1;const i=n[s],o=e[s];if(Ch(i)&&Ch(o)){if(!St(i,o))return!1}else if(i!==o)return!1}for(const s of r)if(!t.includes(s))return!1;return!0}function Ch(n){return n!==null&&typeof n=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ui(n){const e=[];for(const[t,r]of Object.entries(n))Array.isArray(r)?r.forEach(s=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(s))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function bs(n){const e={};return n.replace(/^\?/,"").split("&").forEach(r=>{if(r){const[s,i]=r.split("=");e[decodeURIComponent(s)]=decodeURIComponent(i)}}),e}function Rs(n){const e=n.indexOf("?");if(!e)return"";const t=n.indexOf("#",e);return n.substring(e,t>0?t:void 0)}function Ky(n,e){const t=new Gy(n,e);return t.subscribe.bind(t)}class Gy{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,r){let s;if(e===void 0&&t===void 0&&r===void 0)throw new Error("Missing Observer.");Hy(e,["next","error","complete"])?s=e:s={next:e,error:t,complete:r},s.next===void 0&&(s.next=Wa),s.error===void 0&&(s.error=Wa),s.complete===void 0&&(s.complete=Wa);const i=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?s.error(this.finalError):s.complete()}catch{}}),this.observers.push(s),i}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function Hy(n,e){if(typeof n!="object"||n===null)return!1;for(const t of e)if(t in n&&typeof n[t]=="function")return!0;return!1}function Wa(){}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Z(n){return n&&n._delegate?n._delegate:n}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function It(n){try{return(n.startsWith("http://")||n.startsWith("https://")?new URL(n).hostname:n).endsWith(".cloudworkstations.dev")}catch{return!1}}async function li(n){return(await fetch(n,{credentials:"include"})).ok}class Je{constructor(e,t,r){this.name=e,this.instanceFactory=t,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rn="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wy{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const r=new Oy;if(this.instancesDeferred.set(t,r),this.isInitialized(t)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:t});s&&r.resolve(s)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),r=(e==null?void 0:e.optional)??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(s){if(r)return null;throw s}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(Jy(e))try{this.getOrInitializeService({instanceIdentifier:Rn})}catch{}for(const[t,r]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(t);try{const i=this.getOrInitializeService({instanceIdentifier:s});r.resolve(i)}catch{}}}}clearInstance(e=Rn){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=Rn){return this.instances.has(e)}getOptions(e=Rn){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:r,options:t});for(const[i,o]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(i);r===c&&o.resolve(s)}return s}onInit(e,t){const r=this.normalizeInstanceIdentifier(t),s=this.onInitCallbacks.get(r)??new Set;s.add(e),this.onInitCallbacks.set(r,s);const i=this.instances.get(r);return i&&e(i,r),()=>{s.delete(e)}}invokeOnInitCallbacks(e,t){const r=this.onInitCallbacks.get(t);if(r)for(const s of r)try{s(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:Qy(e),options:t}),this.instances.set(e,r),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=Rn){return this.component?this.component.multipleInstances?e:Rn:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function Qy(n){return n===Rn?void 0:n}function Jy(n){return n.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yy{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new Wy(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var J;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(J||(J={}));const Xy={debug:J.DEBUG,verbose:J.VERBOSE,info:J.INFO,warn:J.WARN,error:J.ERROR,silent:J.SILENT},Zy=J.INFO,eI={[J.DEBUG]:"log",[J.VERBOSE]:"log",[J.INFO]:"info",[J.WARN]:"warn",[J.ERROR]:"error"},tI=(n,e,...t)=>{if(e<n.logLevel)return;const r=new Date().toISOString(),s=eI[e];if(s)console[s](`[${r}]  ${n.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class eu{constructor(e){this.name=e,this._logLevel=Zy,this._logHandler=tI,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in J))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?Xy[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,J.DEBUG,...e),this._logHandler(this,J.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,J.VERBOSE,...e),this._logHandler(this,J.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,J.INFO,...e),this._logHandler(this,J.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,J.WARN,...e),this._logHandler(this,J.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,J.ERROR,...e),this._logHandler(this,J.ERROR,...e)}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nI{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(rI(t)){const r=t.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(t=>t).join(" ")}}function rI(n){const e=n.getComponent();return(e==null?void 0:e.type)==="VERSION"}const mc="@firebase/app",kh="0.14.12";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pt=new eu("@firebase/app"),sI="@firebase/app-compat",iI="@firebase/analytics-compat",oI="@firebase/analytics",aI="@firebase/app-check-compat",cI="@firebase/app-check",uI="@firebase/auth",lI="@firebase/auth-compat",hI="@firebase/database",dI="@firebase/data-connect",fI="@firebase/database-compat",pI="@firebase/functions",mI="@firebase/functions-compat",gI="@firebase/installations",_I="@firebase/installations-compat",yI="@firebase/messaging",II="@firebase/messaging-compat",TI="@firebase/performance",EI="@firebase/performance-compat",wI="@firebase/remote-config",vI="@firebase/remote-config-compat",AI="@firebase/storage",bI="@firebase/storage-compat",RI="@firebase/firestore",SI="@firebase/ai",PI="@firebase/firestore-compat",CI="firebase",kI="12.13.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gc="[DEFAULT]",DI={[mc]:"fire-core",[sI]:"fire-core-compat",[oI]:"fire-analytics",[iI]:"fire-analytics-compat",[cI]:"fire-app-check",[aI]:"fire-app-check-compat",[uI]:"fire-auth",[lI]:"fire-auth-compat",[hI]:"fire-rtdb",[dI]:"fire-data-connect",[fI]:"fire-rtdb-compat",[pI]:"fire-fn",[mI]:"fire-fn-compat",[gI]:"fire-iid",[_I]:"fire-iid-compat",[yI]:"fire-fcm",[II]:"fire-fcm-compat",[TI]:"fire-perf",[EI]:"fire-perf-compat",[wI]:"fire-rc",[vI]:"fire-rc-compat",[AI]:"fire-gcs",[bI]:"fire-gcs-compat",[RI]:"fire-fst",[PI]:"fire-fst-compat",[SI]:"fire-vertex","fire-js":"fire-js",[CI]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $s=new Map,VI=new Map,_c=new Map;function Dh(n,e){try{n.container.addComponent(e)}catch(t){Pt.debug(`Component ${e.name} failed to register with FirebaseApp ${n.name}`,t)}}function Ze(n){const e=n.name;if(_c.has(e))return Pt.debug(`There were multiple attempts to register component ${e}.`),!1;_c.set(e,n);for(const t of $s.values())Dh(t,n);for(const t of VI.values())Dh(t,n);return!0}function Nt(n,e){const t=n.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),n.container.getProvider(e)}function Be(n){return n==null?!1:n.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const NI={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},sn=new Xn("app","Firebase",NI);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class OI{constructor(e,t,r){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new Je("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw sn.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Zn=kI;function xI(n,e={}){let t=n;typeof e!="object"&&(e={name:e});const r={name:gc,automaticDataCollectionEnabled:!0,...e},s=r.name;if(typeof s!="string"||!s)throw sn.create("bad-app-name",{appName:String(s)});if(t||(t=Hf()),!t)throw sn.create("no-options");const i=$s.get(s);if(i){if(St(t,i.options)&&St(r,i.config))return i;throw sn.create("duplicate-app",{appName:s})}const o=new Yy(s);for(const u of _c.values())o.addComponent(u);const c=new OI(t,r,o);return $s.set(s,c),c}function hi(n=gc){const e=$s.get(n);if(!e&&n===gc&&Hf())return xI();if(!e)throw sn.create("no-app",{appName:n});return e}function aC(){return Array.from($s.values())}function Ve(n,e,t){let r=DI[n]??n;t&&(r+=`-${t}`);const s=r.match(/\s|\//),i=e.match(/\s|\//);if(s||i){const o=[`Unable to register library "${r}" with version "${e}":`];s&&o.push(`library name "${r}" contains illegal characters (whitespace or "/")`),s&&i&&o.push("and"),i&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Pt.warn(o.join(" "));return}Ze(new Je(`${r}-version`,()=>({library:r,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const MI="firebase-heartbeat-database",LI=1,js="firebase-heartbeat-store";let Qa=null;function ep(){return Qa||(Qa=Go(MI,LI,{upgrade:(n,e)=>{switch(e){case 0:try{n.createObjectStore(js)}catch(t){console.warn(t)}}}}).catch(n=>{throw sn.create("idb-open",{originalErrorMessage:n.message})})),Qa}async function FI(n){try{const t=(await ep()).transaction(js),r=await t.objectStore(js).get(tp(n));return await t.done,r}catch(e){if(e instanceof tt)Pt.warn(e.message);else{const t=sn.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});Pt.warn(t.message)}}}async function Vh(n,e){try{const r=(await ep()).transaction(js,"readwrite");await r.objectStore(js).put(e,tp(n)),await r.done}catch(t){if(t instanceof tt)Pt.warn(t.message);else{const r=sn.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});Pt.warn(r.message)}}}function tp(n){return`${n.name}!${n.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const UI=1024,BI=30;class qI{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new jI(t),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,t;try{const s=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),i=Nh();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===i||this._heartbeatsCache.heartbeats.some(o=>o.date===i))return;if(this._heartbeatsCache.heartbeats.push({date:i,agent:s}),this._heartbeatsCache.heartbeats.length>BI){const o=zI(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(r){Pt.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=Nh(),{heartbeatsToSend:r,unsentEntries:s}=$I(this._heartbeatsCache.heartbeats),i=_o(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=t,s.length>0?(this._heartbeatsCache.heartbeats=s,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),i}catch(t){return Pt.warn(t),""}}}function Nh(){return new Date().toISOString().substring(0,10)}function $I(n,e=UI){const t=[];let r=n.slice();for(const s of n){const i=t.find(o=>o.agent===s.agent);if(i){if(i.dates.push(s.date),Oh(t)>e){i.dates.pop();break}}else if(t.push({agent:s.agent,dates:[s.date]}),Oh(t)>e){t.pop();break}r=r.slice(1)}return{heartbeatsToSend:t,unsentEntries:r}}class jI{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Zc()?Zf().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await FI(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return Vh(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return Vh(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...e.heartbeats]})}else return}}function Oh(n){return _o(JSON.stringify({version:2,heartbeats:n})).length}function zI(n){if(n.length===0)return-1;let e=0,t=n[0].date;for(let r=1;r<n.length;r++)n[r].date<t&&(t=n[r].date,e=r);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function KI(n){Ze(new Je("platform-logger",e=>new nI(e),"PRIVATE")),Ze(new Je("heartbeat",e=>new qI(e),"PRIVATE")),Ve(mc,kh,n),Ve(mc,kh,"esm2020"),Ve("fire-js","")}KI("");function np(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const GI=np,rp=new Xn("auth","Firebase",np());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yo=new eu("@firebase/auth");function HI(n,...e){yo.logLevel<=J.WARN&&yo.warn(`Auth (${Zn}): ${n}`,...e)}function eo(n,...e){yo.logLevel<=J.ERROR&&yo.error(`Auth (${Zn}): ${n}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function it(n,...e){throw tu(n,...e)}function pt(n,...e){return tu(n,...e)}function sp(n,e,t){const r={...GI(),[e]:t};return new Xn("auth","Firebase",r).create(e,{appName:n.name})}function At(n){return sp(n,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function tu(n,...e){if(typeof n!="string"){const t=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=n.name),n._errorFactory.create(t,...r)}return rp.create(n,...e)}function j(n,e,...t){if(!n)throw tu(e,...t)}function wt(n){const e="INTERNAL ASSERTION FAILED: "+n;throw eo(e),new Error(e)}function Ct(n,e){n||wt(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yc(){var n;return typeof self<"u"&&((n=self.location)==null?void 0:n.href)||""}function WI(){return xh()==="http:"||xh()==="https:"}function xh(){var n;return typeof self<"u"&&((n=self.location)==null?void 0:n.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function QI(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(WI()||Ly()||"connection"in navigator)?navigator.onLine:!0}function JI(){if(typeof navigator>"u")return null;const n=navigator;return n.languages&&n.languages[0]||n.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class di{constructor(e,t){this.shortDelay=e,this.longDelay=t,Ct(t>e,"Short delay should be less than long delay!"),this.isMobile=xy()||Fy()}get(){return QI()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nu(n,e){Ct(n.emulator,"Emulator should always be set here");const{url:t}=n.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ip{static initialize(e,t,r){this.fetchImpl=e,t&&(this.headersImpl=t),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;wt("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;wt("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;wt("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const YI={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const XI=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],ZI=new di(3e4,6e4);function Ot(n,e){return n.tenantId&&!e.tenantId?{...e,tenantId:n.tenantId}:e}async function xt(n,e,t,r,s={}){return op(n,s,async()=>{let i={},o={};r&&(e==="GET"?o=r:i={body:JSON.stringify(r)});const c=ui({key:n.config.apiKey,...o}).slice(1),u=await n._getAdditionalHeaders();u["Content-Type"]="application/json",n.languageCode&&(u["X-Firebase-Locale"]=n.languageCode);const l={method:e,headers:u,...i};return My()||(l.referrerPolicy="no-referrer"),n.emulatorConfig&&It(n.emulatorConfig.host)&&(l.credentials="include"),ip.fetch()(await ap(n,n.config.apiHost,t,c),l)})}async function op(n,e,t){n._canInitEmulator=!1;const r={...YI,...e};try{const s=new tT(n),i=await Promise.race([t(),s.promise]);s.clearNetworkTimeout();const o=await i.json();if("needConfirmation"in o)throw zi(n,"account-exists-with-different-credential",o);if(i.ok&&!("errorMessage"in o))return o;{const c=i.ok?o.errorMessage:o.error.message,[u,l]=c.split(" : ");if(u==="FEDERATED_USER_ID_ALREADY_LINKED")throw zi(n,"credential-already-in-use",o);if(u==="EMAIL_EXISTS")throw zi(n,"email-already-in-use",o);if(u==="USER_DISABLED")throw zi(n,"user-disabled",o);const f=r[u]||u.toLowerCase().replace(/[_\s]+/g,"-");if(l)throw sp(n,f,l);it(n,f)}}catch(s){if(s instanceof tt)throw s;it(n,"network-request-failed",{message:String(s)})}}async function fi(n,e,t,r,s={}){const i=await xt(n,e,t,r,s);return"mfaPendingCredential"in i&&it(n,"multi-factor-auth-required",{_serverResponse:i}),i}async function ap(n,e,t,r){const s=`${e}${t}?${r}`,i=n,o=i.config.emulator?nu(n.config,s):`${n.config.apiScheme}://${s}`;return XI.includes(t)&&(await i._persistenceManagerAvailable,i._getPersistenceType()==="COOKIE")?i._getPersistence()._getFinalTarget(o).toString():o}function eT(n){switch(n){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class tT{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,r)=>{this.timer=setTimeout(()=>r(pt(this.auth,"network-request-failed")),ZI.get())})}}function zi(n,e,t){const r={appName:n.name};t.email&&(r.email=t.email),t.phoneNumber&&(r.phoneNumber=t.phoneNumber);const s=pt(n,e,r);return s.customData._tokenResponse=t,s}function Mh(n){return n!==void 0&&n.enterprise!==void 0}class nT{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return eT(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}async function rT(n,e){return xt(n,"GET","/v2/recaptchaConfig",Ot(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function sT(n,e){return xt(n,"POST","/v1/accounts:delete",e)}async function Io(n,e){return xt(n,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ds(n){if(n)try{const e=new Date(Number(n));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function iT(n,e=!1){const t=Z(n),r=await t.getIdToken(e),s=ru(r);j(s&&s.exp&&s.auth_time&&s.iat,t.auth,"internal-error");const i=typeof s.firebase=="object"?s.firebase:void 0,o=i==null?void 0:i.sign_in_provider;return{claims:s,token:r,authTime:Ds(Ja(s.auth_time)),issuedAtTime:Ds(Ja(s.iat)),expirationTime:Ds(Ja(s.exp)),signInProvider:o||null,signInSecondFactor:(i==null?void 0:i.sign_in_second_factor)||null}}function Ja(n){return Number(n)*1e3}function ru(n){const[e,t,r]=n.split(".");if(e===void 0||t===void 0||r===void 0)return eo("JWT malformed, contained fewer than 3 sections"),null;try{const s=zf(t);return s?JSON.parse(s):(eo("Failed to decode base64 JWT payload"),null)}catch(s){return eo("Caught error parsing JWT payload as JSON",s==null?void 0:s.toString()),null}}function Lh(n){const e=ru(n);return j(e,"internal-error"),j(typeof e.exp<"u","internal-error"),j(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function zs(n,e,t=!1){if(t)return e;try{return await e}catch(r){throw r instanceof tt&&oT(r)&&n.auth.currentUser===n&&await n.auth.signOut(),r}}function oT({code:n}){return n==="auth/user-disabled"||n==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class aT{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const r=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,r)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ic{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=Ds(this.lastLoginAt),this.creationTime=Ds(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function To(n){var p;const e=n.auth,t=await n.getIdToken(),r=await zs(n,Io(e,{idToken:t}));j(r==null?void 0:r.users.length,e,"internal-error");const s=r.users[0];n._notifyReloadListener(s);const i=(p=s.providerUserInfo)!=null&&p.length?cp(s.providerUserInfo):[],o=uT(n.providerData,i),c=n.isAnonymous,u=!(n.email&&s.passwordHash)&&!(o!=null&&o.length),l=c?u:!1,f={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:o,metadata:new Ic(s.createdAt,s.lastLoginAt),isAnonymous:l};Object.assign(n,f)}async function cT(n){const e=Z(n);await To(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function uT(n,e){return[...n.filter(r=>!e.some(s=>s.providerId===r.providerId)),...e]}function cp(n){return n.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function lT(n,e){const t=await op(n,{},async()=>{const r=ui({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:s,apiKey:i}=n.config,o=await ap(n,s,"/v1/token",`key=${i}`),c=await n._getAdditionalHeaders();c["Content-Type"]="application/x-www-form-urlencoded";const u={method:"POST",headers:c,body:r};return n.emulatorConfig&&It(n.emulatorConfig.host)&&(u.credentials="include"),ip.fetch()(o,u)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function hT(n,e){return xt(n,"POST","/v2/accounts:revokeToken",Ot(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ir{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){j(e.idToken,"internal-error"),j(typeof e.idToken<"u","internal-error"),j(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):Lh(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){j(e.length!==0,"internal-error");const t=Lh(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(j(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:r,refreshToken:s,expiresIn:i}=await lT(e,t);this.updateTokensAndExpiration(r,s,Number(i))}updateTokensAndExpiration(e,t,r){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,t){const{refreshToken:r,accessToken:s,expirationTime:i}=t,o=new Ir;return r&&(j(typeof r=="string","internal-error",{appName:e}),o.refreshToken=r),s&&(j(typeof s=="string","internal-error",{appName:e}),o.accessToken=s),i&&(j(typeof i=="number","internal-error",{appName:e}),o.expirationTime=i),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new Ir,this.toJSON())}_performRefresh(){return wt("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Kt(n,e){j(typeof n=="string"||typeof n>"u","internal-error",{appName:e})}class rt{constructor({uid:e,auth:t,stsTokenManager:r,...s}){this.providerId="firebase",this.proactiveRefresh=new aT(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=r,this.accessToken=r.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new Ic(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const t=await zs(this,this.stsTokenManager.getToken(this.auth,e));return j(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return iT(this,e)}reload(){return cT(this)}_assign(e){this!==e&&(j(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new rt({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){j(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),t&&await To(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(Be(this.auth.app))return Promise.reject(At(this.auth));const e=await this.getIdToken();return await zs(this,sT(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const r=t.displayName??void 0,s=t.email??void 0,i=t.phoneNumber??void 0,o=t.photoURL??void 0,c=t.tenantId??void 0,u=t._redirectEventId??void 0,l=t.createdAt??void 0,f=t.lastLoginAt??void 0,{uid:p,emailVerified:g,isAnonymous:v,providerData:C,stsTokenManager:V}=t;j(p&&V,e,"internal-error");const k=Ir.fromJSON(this.name,V);j(typeof p=="string",e,"internal-error"),Kt(r,e.name),Kt(s,e.name),j(typeof g=="boolean",e,"internal-error"),j(typeof v=="boolean",e,"internal-error"),Kt(i,e.name),Kt(o,e.name),Kt(c,e.name),Kt(u,e.name),Kt(l,e.name),Kt(f,e.name);const $=new rt({uid:p,auth:e,email:s,emailVerified:g,displayName:r,isAnonymous:v,photoURL:o,phoneNumber:i,tenantId:c,stsTokenManager:k,createdAt:l,lastLoginAt:f});return C&&Array.isArray(C)&&($.providerData=C.map(q=>({...q}))),u&&($._redirectEventId=u),$}static async _fromIdTokenResponse(e,t,r=!1){const s=new Ir;s.updateFromServerResponse(t);const i=new rt({uid:t.localId,auth:e,stsTokenManager:s,isAnonymous:r});return await To(i),i}static async _fromGetAccountInfoResponse(e,t,r){const s=t.users[0];j(s.localId!==void 0,"internal-error");const i=s.providerUserInfo!==void 0?cp(s.providerUserInfo):[],o=!(s.email&&s.passwordHash)&&!(i!=null&&i.length),c=new Ir;c.updateFromIdToken(r);const u=new rt({uid:s.localId,auth:e,stsTokenManager:c,isAnonymous:o}),l={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:i,metadata:new Ic(s.createdAt,s.lastLoginAt),isAnonymous:!(s.email&&s.passwordHash)&&!(i!=null&&i.length)};return Object.assign(u,l),u}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fh=new Map;function vt(n){Ct(n instanceof Function,"Expected a class definition");let e=Fh.get(n);return e?(Ct(e instanceof n,"Instance stored in cache mismatched with class"),e):(e=new n,Fh.set(n,e),e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class up{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}up.type="NONE";const Uh=up;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function to(n,e,t){return`firebase:${n}:${e}:${t}`}class Tr{constructor(e,t,r){this.persistence=e,this.auth=t,this.userKey=r;const{config:s,name:i}=this.auth;this.fullUserKey=to(this.userKey,s.apiKey,i),this.fullPersistenceKey=to("persistence",s.apiKey,i),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await Io(this.auth,{idToken:e}).catch(()=>{});return t?rt._fromGetAccountInfoResponse(this.auth,t,e):null}return rt._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,r="authUser"){if(!t.length)return new Tr(vt(Uh),e,r);const s=(await Promise.all(t.map(async l=>{if(await l._isAvailable())return l}))).filter(l=>l);let i=s[0]||vt(Uh);const o=to(r,e.config.apiKey,e.name);let c=null;for(const l of t)try{const f=await l._get(o);if(f){let p;if(typeof f=="string"){const g=await Io(e,{idToken:f}).catch(()=>{});if(!g)break;p=await rt._fromGetAccountInfoResponse(e,g,f)}else p=rt._fromJSON(e,f);l!==i&&(c=p),i=l;break}}catch{}const u=s.filter(l=>l._shouldAllowMigration);return!i._shouldAllowMigration||!u.length?new Tr(i,e,r):(i=u[0],c&&await i._set(o,c.toJSON()),await Promise.all(t.map(async l=>{if(l!==i)try{await l._remove(o)}catch{}})),new Tr(i,e,r))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Bh(n){const e=n.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(fp(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(lp(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(mp(e))return"Blackberry";if(gp(e))return"Webos";if(hp(e))return"Safari";if((e.includes("chrome/")||dp(e))&&!e.includes("edge/"))return"Chrome";if(pp(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=n.match(t);if((r==null?void 0:r.length)===2)return r[1]}return"Other"}function lp(n=Te()){return/firefox\//i.test(n)}function hp(n=Te()){const e=n.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function dp(n=Te()){return/crios\//i.test(n)}function fp(n=Te()){return/iemobile/i.test(n)}function pp(n=Te()){return/android/i.test(n)}function mp(n=Te()){return/blackberry/i.test(n)}function gp(n=Te()){return/webos/i.test(n)}function su(n=Te()){return/iphone|ipad|ipod/i.test(n)||/macintosh/i.test(n)&&/mobile/i.test(n)}function dT(n=Te()){var e;return su(n)&&!!((e=window.navigator)!=null&&e.standalone)}function fT(){return Uy()&&document.documentMode===10}function _p(n=Te()){return su(n)||pp(n)||gp(n)||mp(n)||/windows phone/i.test(n)||fp(n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yp(n,e=[]){let t;switch(n){case"Browser":t=Bh(Te());break;case"Worker":t=`${Bh(Te())}-${n}`;break;default:t=n}const r=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${Zn}/${r}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pT{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const r=i=>new Promise((o,c)=>{try{const u=e(i);o(u)}catch(u){c(u)}});r.onAbort=t,this.queue.push(r);const s=this.queue.length-1;return()=>{this.queue[s]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const r of this.queue)await r(e),r.onAbort&&t.push(r.onAbort)}catch(r){t.reverse();for(const s of t)try{s()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r==null?void 0:r.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function mT(n,e={}){return xt(n,"GET","/v2/passwordPolicy",Ot(n,e))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gT=6;class _T{constructor(e){var r;const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??gT,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((r=e.allowedNonAlphanumericCharacters)==null?void 0:r.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const r=this.customStrengthOptions.minPasswordLength,s=this.customStrengthOptions.maxPasswordLength;r&&(t.meetsMinPasswordLength=e.length>=r),s&&(t.meetsMaxPasswordLength=e.length<=s)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let r;for(let s=0;s<e.length;s++)r=e.charAt(s),this.updatePasswordCharacterOptionsStatuses(t,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,t,r,s,i){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=s)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=i))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yT{constructor(e,t,r,s){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=r,this.config=s,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new qh(this),this.idTokenSubscription=new qh(this),this.beforeStateQueue=new pT(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=rp,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=s.sdkClientVersion,this._persistenceManagerAvailable=new Promise(i=>this._resolvePersistenceManagerAvailable=i)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=vt(t)),this._initializationPromise=this.queue(async()=>{var r,s,i;if(!this._deleted&&(this.persistenceManager=await Tr.create(this,e),(r=this._resolvePersistenceManagerAvailable)==null||r.call(this),!this._deleted)){if((s=this._popupRedirectResolver)!=null&&s._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((i=this.currentUser)==null?void 0:i.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await Io(this,{idToken:e}),r=await rt._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(r)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var i;if(Be(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(c=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(c,c))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let r=t,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(i=this.redirectUser)==null?void 0:i._redirectEventId,c=r==null?void 0:r._redirectEventId,u=await this.tryRedirectSignIn(e);(!o||o===c)&&(u!=null&&u.user)&&(r=u.user,s=!0)}if(!r)return this.directlySetCurrentUser(null);if(!r._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(r)}catch(o){r=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return r?this.reloadAndSetCurrentUserOrClear(r):this.directlySetCurrentUser(null)}return j(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===r._redirectEventId?this.directlySetCurrentUser(r):this.reloadAndSetCurrentUserOrClear(r)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await To(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=JI()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(Be(this.app))return Promise.reject(At(this));const t=e?Z(e):null;return t&&j(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&j(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return Be(this.app)?Promise.reject(At(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return Be(this.app)?Promise.reject(At(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(vt(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await mT(this),t=new _T(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new Xn("auth","Firebase",e())}onAuthStateChanged(e,t,r){return this.registerStateListener(this.authStateSubscription,e,t,r)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,r){return this.registerStateListener(this.idTokenSubscription,e,t,r)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const r=this.onAuthStateChanged(()=>{r(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(r.tenantId=this.tenantId),await hT(this,r)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,t){const r=await this.getOrInitRedirectPersistenceManager(t);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&vt(e)||this._popupRedirectResolver;j(t,this,"argument-error"),this.redirectPersistenceManager=await Tr.create(this,[vt(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,r;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)==null?void 0:t._redirectEventId)===e?this._currentUser:((r=this.redirectUser)==null?void 0:r._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((t=this.currentUser)==null?void 0:t.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,r,s){if(this._deleted)return()=>{};const i=typeof t=="function"?t:t.next.bind(t);let o=!1;const c=this._isInitialized?Promise.resolve():this._initializationPromise;if(j(c,this,"internal-error"),c.then(()=>{o||i(this.currentUser)}),typeof t=="function"){const u=e.addObserver(t,r,s);return()=>{o=!0,u()}}else{const u=e.addObserver(t);return()=>{o=!0,u()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return j(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=yp(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var s;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await((s=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:s.getHeartbeatsHeader());t&&(e["X-Firebase-Client"]=t);const r=await this._getAppCheckToken();return r&&(e["X-Firebase-AppCheck"]=r),e}async _getAppCheckToken(){var t;if(Be(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((t=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:t.getToken());return e!=null&&e.error&&HI(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function pn(n){return Z(n)}class qh{constructor(e){this.auth=e,this.observer=null,this.addObserver=Ky(t=>this.observer=t)}get next(){return j(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Wo={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function IT(n){Wo=n}function Ip(n){return Wo.loadJS(n)}function TT(){return Wo.recaptchaEnterpriseScript}function ET(){return Wo.gapiScript}function wT(n){return`__${n}${Math.floor(Math.random()*1e6)}`}class vT{constructor(){this.enterprise=new AT}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class AT{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}const bT="recaptcha-enterprise",Tp="NO_RECAPTCHA";class RT{constructor(e){this.type=bT,this.auth=pn(e)}async verify(e="verify",t=!1){async function r(i){if(!t){if(i.tenantId==null&&i._agentRecaptchaConfig!=null)return i._agentRecaptchaConfig.siteKey;if(i.tenantId!=null&&i._tenantRecaptchaConfigs[i.tenantId]!==void 0)return i._tenantRecaptchaConfigs[i.tenantId].siteKey}return new Promise(async(o,c)=>{rT(i,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(u=>{if(u.recaptchaKey===void 0)c(new Error("recaptcha Enterprise site key undefined"));else{const l=new nT(u);return i.tenantId==null?i._agentRecaptchaConfig=l:i._tenantRecaptchaConfigs[i.tenantId]=l,o(l.siteKey)}}).catch(u=>{c(u)})})}function s(i,o,c){const u=window.grecaptcha;Mh(u)?u.enterprise.ready(()=>{u.enterprise.execute(i,{action:e}).then(l=>{o(l)}).catch(()=>{o(Tp)})}):c(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new vT().execute("siteKey",{action:"verify"}):new Promise((i,o)=>{r(this.auth).then(c=>{if(!t&&Mh(window.grecaptcha))s(c,i,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let u=TT();u.length!==0&&(u+=c),Ip(u).then(()=>{s(c,i,o)}).catch(l=>{o(l)})}}).catch(c=>{o(c)})})}}async function $h(n,e,t,r=!1,s=!1){const i=new RT(n);let o;if(s)o=Tp;else try{o=await i.verify(t)}catch{o=await i.verify(t,!0)}const c={...e};if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in c){const u=c.phoneEnrollmentInfo.phoneNumber,l=c.phoneEnrollmentInfo.recaptchaToken;Object.assign(c,{phoneEnrollmentInfo:{phoneNumber:u,recaptchaToken:l,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in c){const u=c.phoneSignInInfo.recaptchaToken;Object.assign(c,{phoneSignInInfo:{recaptchaToken:u,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return c}return r?Object.assign(c,{captchaResp:o}):Object.assign(c,{captchaResponse:o}),Object.assign(c,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(c,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),c}async function Tc(n,e,t,r,s){var i;if((i=n._getRecaptchaConfig())!=null&&i.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const o=await $h(n,e,t,t==="getOobCode");return r(n,o)}else return r(n,e).catch(async o=>{if(o.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const c=await $h(n,e,t,t==="getOobCode");return r(n,c)}else return Promise.reject(o)})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ST(n,e){const t=Nt(n,"auth");if(t.isInitialized()){const s=t.getImmediate(),i=t.getOptions();if(St(i,e??{}))return s;it(s,"already-initialized")}return t.initialize({options:e})}function PT(n,e){const t=(e==null?void 0:e.persistence)||[],r=(Array.isArray(t)?t:[t]).map(vt);e!=null&&e.errorMap&&n._updateErrorMap(e.errorMap),n._initializeWithPersistence(r,e==null?void 0:e.popupRedirectResolver)}function CT(n,e,t){const r=pn(n);j(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");const s=!1,i=Ep(e),{host:o,port:c}=kT(e),u=c===null?"":`:${c}`,l={url:`${i}//${o}${u}/`},f=Object.freeze({host:o,port:c,protocol:i.replace(":",""),options:Object.freeze({disableWarnings:s})});if(!r._canInitEmulator){j(r.config.emulator&&r.emulatorConfig,r,"emulator-config-failed"),j(St(l,r.config.emulator)&&St(f,r.emulatorConfig),r,"emulator-config-failed");return}r.config.emulator=l,r.emulatorConfig=f,r.settings.appVerificationDisabledForTesting=!0,It(o)?li(`${i}//${o}${u}`):DT()}function Ep(n){const e=n.indexOf(":");return e<0?"":n.substr(0,e+1)}function kT(n){const e=Ep(n),t=/(\/\/)?([^?#/]+)/.exec(n.substr(e.length));if(!t)return{host:"",port:null};const r=t[2].split("@").pop()||"",s=/^(\[[^\]]+\])(:|$)/.exec(r);if(s){const i=s[1];return{host:i,port:jh(r.substr(i.length+1))}}else{const[i,o]=r.split(":");return{host:i,port:jh(o)}}}function jh(n){if(!n)return null;const e=Number(n);return isNaN(e)?null:e}function DT(){function n(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",n):n())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iu{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return wt("not implemented")}_getIdTokenResponse(e){return wt("not implemented")}_linkToIdToken(e,t){return wt("not implemented")}_getReauthenticationResolver(e){return wt("not implemented")}}async function VT(n,e){return xt(n,"POST","/v1/accounts:signUp",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function NT(n,e){return fi(n,"POST","/v1/accounts:signInWithPassword",Ot(n,e))}async function OT(n,e){return xt(n,"POST","/v1/accounts:sendOobCode",Ot(n,e))}async function xT(n,e){return OT(n,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function MT(n,e){return fi(n,"POST","/v1/accounts:signInWithEmailLink",Ot(n,e))}async function LT(n,e){return fi(n,"POST","/v1/accounts:signInWithEmailLink",Ot(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ks extends iu{constructor(e,t,r,s=null){super("password",r),this._email=e,this._password=t,this._tenantId=s}static _fromEmailAndPassword(e,t){return new Ks(e,t,"password")}static _fromEmailAndCode(e,t,r=null){return new Ks(e,t,"emailLink",r)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;if(t!=null&&t.email&&(t!=null&&t.password)){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return Tc(e,t,"signInWithPassword",NT);case"emailLink":return MT(e,{email:this._email,oobCode:this._password});default:it(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":const r={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return Tc(e,r,"signUpPassword",VT);case"emailLink":return LT(e,{idToken:t,email:this._email,oobCode:this._password});default:it(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Er(n,e){return fi(n,"POST","/v1/accounts:signInWithIdp",Ot(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const FT="http://localhost";class Un extends iu{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new Un(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):it("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:s,...i}=t;if(!r||!s)return null;const o=new Un(r,s);return o.idToken=i.idToken||void 0,o.accessToken=i.accessToken||void 0,o.secret=i.secret,o.nonce=i.nonce,o.pendingToken=i.pendingToken||null,o}_getIdTokenResponse(e){const t=this.buildRequest();return Er(e,t)}_linkToIdToken(e,t){const r=this.buildRequest();return r.idToken=t,Er(e,r)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,Er(e,t)}buildRequest(){const e={requestUri:FT,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=ui(t)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function UT(n){switch(n){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function BT(n){const e=bs(Rs(n)).link,t=e?bs(Rs(e)).deep_link_id:null,r=bs(Rs(n)).deep_link_id;return(r?bs(Rs(r)).link:null)||r||t||e||n}class ou{constructor(e){const t=bs(Rs(e)),r=t.apiKey??null,s=t.oobCode??null,i=UT(t.mode??null);j(r&&s&&i,"argument-error"),this.apiKey=r,this.operation=i,this.code=s,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){const t=BT(e);try{return new ou(t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jr{constructor(){this.providerId=jr.PROVIDER_ID}static credential(e,t){return Ks._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const r=ou.parseLink(t);return j(r,"argument-error"),Ks._fromEmailAndCode(e,r.code,r.tenantId)}}jr.PROVIDER_ID="password";jr.EMAIL_PASSWORD_SIGN_IN_METHOD="password";jr.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wp{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pi extends wp{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qt extends pi{constructor(){super("facebook.com")}static credential(e){return Un._fromParams({providerId:Qt.PROVIDER_ID,signInMethod:Qt.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Qt.credentialFromTaggedObject(e)}static credentialFromError(e){return Qt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Qt.credential(e.oauthAccessToken)}catch{return null}}}Qt.FACEBOOK_SIGN_IN_METHOD="facebook.com";Qt.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jt extends pi{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Un._fromParams({providerId:Jt.PROVIDER_ID,signInMethod:Jt.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return Jt.credentialFromTaggedObject(e)}static credentialFromError(e){return Jt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:r}=e;if(!t&&!r)return null;try{return Jt.credential(t,r)}catch{return null}}}Jt.GOOGLE_SIGN_IN_METHOD="google.com";Jt.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yt extends pi{constructor(){super("github.com")}static credential(e){return Un._fromParams({providerId:Yt.PROVIDER_ID,signInMethod:Yt.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Yt.credentialFromTaggedObject(e)}static credentialFromError(e){return Yt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Yt.credential(e.oauthAccessToken)}catch{return null}}}Yt.GITHUB_SIGN_IN_METHOD="github.com";Yt.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xt extends pi{constructor(){super("twitter.com")}static credential(e,t){return Un._fromParams({providerId:Xt.PROVIDER_ID,signInMethod:Xt.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return Xt.credentialFromTaggedObject(e)}static credentialFromError(e){return Xt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:r}=e;if(!t||!r)return null;try{return Xt.credential(t,r)}catch{return null}}}Xt.TWITTER_SIGN_IN_METHOD="twitter.com";Xt.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bn{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,r,s=!1){const i=await rt._fromIdTokenResponse(e,r,s),o=zh(r);return new Bn({user:i,providerId:o,_tokenResponse:r,operationType:t})}static async _forOperation(e,t,r){await e._updateTokensIfNecessary(r,!0);const s=zh(r);return new Bn({user:e,providerId:s,_tokenResponse:r,operationType:t})}}function zh(n){return n.providerId?n.providerId:"phoneNumber"in n?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Eo extends tt{constructor(e,t,r,s){super(t.code,t.message),this.operationType=r,this.user=s,Object.setPrototypeOf(this,Eo.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,t,r,s){return new Eo(e,t,r,s)}}function vp(n,e,t,r){return(e==="reauthenticate"?t._getReauthenticationResolver(n):t._getIdTokenResponse(n)).catch(i=>{throw i.code==="auth/multi-factor-auth-required"?Eo._fromErrorAndOperation(n,i,e,r):i})}async function qT(n,e,t=!1){const r=await zs(n,e._linkToIdToken(n.auth,await n.getIdToken()),t);return Bn._forOperation(n,"link",r)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function $T(n,e,t=!1){const{auth:r}=n;if(Be(r.app))return Promise.reject(At(r));const s="reauthenticate";try{const i=await zs(n,vp(r,s,e,n),t);j(i.idToken,r,"internal-error");const o=ru(i.idToken);j(o,r,"internal-error");const{sub:c}=o;return j(n.uid===c,r,"user-mismatch"),Bn._forOperation(n,s,i)}catch(i){throw(i==null?void 0:i.code)==="auth/user-not-found"&&it(r,"user-mismatch"),i}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ap(n,e,t=!1){if(Be(n.app))return Promise.reject(At(n));const r="signIn",s=await vp(n,r,e),i=await Bn._fromIdTokenResponse(n,r,s);return t||await n._updateCurrentUser(i.user),i}async function jT(n,e){return Ap(pn(n),e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function zT(n,e){return fi(n,"POST","/v1/accounts:signInWithCustomToken",Ot(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function cC(n,e){if(Be(n.app))return Promise.reject(At(n));const t=pn(n),r=await zT(t,{token:e,returnSecureToken:!0}),s=await Bn._fromIdTokenResponse(t,"signIn",r);return await t._updateCurrentUser(s.user),s}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function KT(n){const e=pn(n);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function uC(n,e,t){const r=pn(n);await Tc(r,{requestType:"PASSWORD_RESET",email:e,clientType:"CLIENT_TYPE_WEB"},"getOobCode",xT)}function lC(n,e,t){return Be(n.app)?Promise.reject(At(n)):jT(Z(n),jr.credential(e,t)).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&KT(n),r})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hC(n,e){return Z(n).setPersistence(e)}function GT(n,e,t,r){return Z(n).onIdTokenChanged(e,t,r)}function HT(n,e,t){return Z(n).beforeAuthStateChanged(e,t)}function dC(n,e,t,r){return Z(n).onAuthStateChanged(e,t,r)}function fC(n){return Z(n).signOut()}const wo="__sak";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bp{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(wo,"1"),this.storage.removeItem(wo),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const WT=1e3,QT=10;class Rp extends bp{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=_p(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const r=this.storage.getItem(t),s=this.localCache[t];r!==s&&e(t,s,r)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,c,u)=>{this.notifyListeners(o,u)});return}const r=e.key;t?this.detachListener():this.stopPolling();const s=()=>{const o=this.storage.getItem(r);!t&&this.localCache[r]===o||this.notifyListeners(r,o)},i=this.storage.getItem(r);fT()&&i!==e.newValue&&e.newValue!==e.oldValue?setTimeout(s,QT):s()}notifyListeners(e,t){this.localCache[e]=t;const r=this.listeners[e];if(r)for(const s of Array.from(r))s(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:r}),!0)})},WT)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}Rp.type="LOCAL";const JT=Rp;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sp extends bp{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}Sp.type="SESSION";const Pp=Sp;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function YT(n){return Promise.all(n.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qo{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(s=>s.isListeningto(e));if(t)return t;const r=new Qo(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:r,eventType:s,data:i}=t.data,o=this.handlersMap[s];if(!(o!=null&&o.size))return;t.ports[0].postMessage({status:"ack",eventId:r,eventType:s});const c=Array.from(o).map(async l=>l(t.origin,i)),u=await YT(c);t.ports[0].postMessage({status:"done",eventId:r,eventType:s,response:u})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Qo.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function au(n="",e=10){let t="";for(let r=0;r<e;r++)t+=Math.floor(Math.random()*10);return n+t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class XT{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,r=50){const s=typeof MessageChannel<"u"?new MessageChannel:null;if(!s)throw new Error("connection_unavailable");let i,o;return new Promise((c,u)=>{const l=au("",20);s.port1.start();const f=setTimeout(()=>{u(new Error("unsupported_event"))},r);o={messageChannel:s,onMessage(p){const g=p;if(g.data.eventId===l)switch(g.data.status){case"ack":clearTimeout(f),i=setTimeout(()=>{u(new Error("timeout"))},3e3);break;case"done":clearTimeout(i),c(g.data.response);break;default:clearTimeout(f),clearTimeout(i),u(new Error("invalid_response"));break}}},this.handlers.add(o),s.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:l,data:t},[s.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mt(){return window}function ZT(n){mt().location.href=n}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Cp(){return typeof mt().WorkerGlobalScope<"u"&&typeof mt().importScripts=="function"}async function eE(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function tE(){var n;return((n=navigator==null?void 0:navigator.serviceWorker)==null?void 0:n.controller)||null}function nE(){return Cp()?self:null}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kp="firebaseLocalStorageDb",rE=1,vo="firebaseLocalStorage",Dp="fbase_key";class mi{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function Jo(n,e){return n.transaction([vo],e?"readwrite":"readonly").objectStore(vo)}function sE(){const n=indexedDB.deleteDatabase(kp);return new mi(n).toPromise()}function Ec(){const n=indexedDB.open(kp,rE);return new Promise((e,t)=>{n.addEventListener("error",()=>{t(n.error)}),n.addEventListener("upgradeneeded",()=>{const r=n.result;try{r.createObjectStore(vo,{keyPath:Dp})}catch(s){t(s)}}),n.addEventListener("success",async()=>{const r=n.result;r.objectStoreNames.contains(vo)?e(r):(r.close(),await sE(),e(await Ec()))})})}async function Kh(n,e,t){const r=Jo(n,!0).put({[Dp]:e,value:t});return new mi(r).toPromise()}async function iE(n,e){const t=Jo(n,!1).get(e),r=await new mi(t).toPromise();return r===void 0?null:r.value}function Gh(n,e){const t=Jo(n,!0).delete(e);return new mi(t).toPromise()}const oE=800,aE=3;class Vp{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await Ec(),this.db)}async _withRetries(e){let t=0;for(;;)try{const r=await this._openDb();return await e(r)}catch(r){if(t++>aE)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Cp()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Qo._getInstance(nE()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var t,r;if(this.activeServiceWorker=await eE(),!this.activeServiceWorker)return;this.sender=new XT(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(t=e[0])!=null&&t.fulfilled&&(r=e[0])!=null&&r.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||tE()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await Ec();return await Kh(e,wo,"1"),await Gh(e,wo),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(r=>Kh(r,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(r=>iE(r,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>Gh(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(s=>{const i=Jo(s,!1).getAll();return new mi(i).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],r=new Set;if(e.length!==0)for(const{fbase_key:s,value:i}of e)r.add(s),JSON.stringify(this.localCache[s])!==JSON.stringify(i)&&(this.notifyListeners(s,i),t.push(s));for(const s of Object.keys(this.localCache))this.localCache[s]&&!r.has(s)&&(this.notifyListeners(s,null),t.push(s));return t}notifyListeners(e,t){this.localCache[e]=t;const r=this.listeners[e];if(r)for(const s of Array.from(r))s(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),oE)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}Vp.type="LOCAL";const cE=Vp;new di(3e4,6e4);/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function uE(n,e){return e?vt(e):(j(n._popupRedirectResolver,n,"argument-error"),n._popupRedirectResolver)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cu extends iu{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return Er(e,this._buildIdpRequest())}_linkToIdToken(e,t){return Er(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return Er(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function lE(n){return Ap(n.auth,new cu(n),n.bypassAuthState)}function hE(n){const{auth:e,user:t}=n;return j(t,e,"internal-error"),$T(t,new cu(n),n.bypassAuthState)}async function dE(n){const{auth:e,user:t}=n;return j(t,e,"internal-error"),qT(t,new cu(n),n.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Np{constructor(e,t,r,s,i=!1){this.auth=e,this.resolver=r,this.user=s,this.bypassAuthState=i,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:r,postBody:s,tenantId:i,error:o,type:c}=e;if(o){this.reject(o);return}const u={auth:this.auth,requestUri:t,sessionId:r,tenantId:i||void 0,postBody:s||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(c)(u))}catch(l){this.reject(l)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return lE;case"linkViaPopup":case"linkViaRedirect":return dE;case"reauthViaPopup":case"reauthViaRedirect":return hE;default:it(this.auth,"internal-error")}}resolve(e){Ct(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){Ct(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fE=new di(2e3,1e4);class _r extends Np{constructor(e,t,r,s,i){super(e,t,s,i),this.provider=r,this.authWindow=null,this.pollId=null,_r.currentPopupAction&&_r.currentPopupAction.cancel(),_r.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return j(e,this.auth,"internal-error"),e}async onExecution(){Ct(this.filter.length===1,"Popup operations only handle one event");const e=au();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(pt(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(pt(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,_r.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,r;if((r=(t=this.authWindow)==null?void 0:t.window)!=null&&r.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(pt(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,fE.get())};e()}}_r.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pE="pendingRedirect",no=new Map;class mE extends Np{constructor(e,t,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,r),this.eventId=null}async execute(){let e=no.get(this.auth._key());if(!e){try{const r=await gE(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(t){e=()=>Promise.reject(t)}no.set(this.auth._key(),e)}return this.bypassAuthState||no.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function gE(n,e){const t=IE(e),r=yE(n);if(!await r._isAvailable())return!1;const s=await r._get(t)==="true";return await r._remove(t),s}function _E(n,e){no.set(n._key(),e)}function yE(n){return vt(n._redirectPersistence)}function IE(n){return to(pE,n.config.apiKey,n.name)}async function TE(n,e,t=!1){if(Be(n.app))return Promise.reject(At(n));const r=pn(n),s=uE(r,e),o=await new mE(r,s,t).execute();return o&&!t&&(delete o.user._redirectEventId,await r._persistUserIfCurrent(o.user),await r._setRedirectUser(null,e)),o}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const EE=10*60*1e3;class wE{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(t=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!vE(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var r;if(e.error&&!Op(e)){const s=((r=e.error.code)==null?void 0:r.split("auth/")[1])||"internal-error";t.onError(pt(this.auth,s))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const r=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=EE&&this.cachedEventUids.clear(),this.cachedEventUids.has(Hh(e))}saveEventToCache(e){this.cachedEventUids.add(Hh(e)),this.lastProcessedEventTime=Date.now()}}function Hh(n){return[n.type,n.eventId,n.sessionId,n.tenantId].filter(e=>e).join("-")}function Op({type:n,error:e}){return n==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function vE(n){switch(n.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return Op(n);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function AE(n,e={}){return xt(n,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bE=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,RE=/^https?/;async function SE(n){if(n.config.emulator)return;const{authorizedDomains:e}=await AE(n);for(const t of e)try{if(PE(t))return}catch{}it(n,"unauthorized-domain")}function PE(n){const e=yc(),{protocol:t,hostname:r}=new URL(e);if(n.startsWith("chrome-extension://")){const o=new URL(n);return o.hostname===""&&r===""?t==="chrome-extension:"&&n.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===r}if(!RE.test(t))return!1;if(bE.test(n))return r===n;const s=n.replace(/\./g,"\\.");return new RegExp("^(.+\\."+s+"|"+s+")$","i").test(r)}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const CE=new di(3e4,6e4);function Wh(){const n=mt().___jsl;if(n!=null&&n.H){for(const e of Object.keys(n.H))if(n.H[e].r=n.H[e].r||[],n.H[e].L=n.H[e].L||[],n.H[e].r=[...n.H[e].L],n.CP)for(let t=0;t<n.CP.length;t++)n.CP[t]=null}}function kE(n){return new Promise((e,t)=>{var s,i,o;function r(){Wh(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{Wh(),t(pt(n,"network-request-failed"))},timeout:CE.get()})}if((i=(s=mt().gapi)==null?void 0:s.iframes)!=null&&i.Iframe)e(gapi.iframes.getContext());else if((o=mt().gapi)!=null&&o.load)r();else{const c=wT("iframefcb");return mt()[c]=()=>{gapi.load?r():t(pt(n,"network-request-failed"))},Ip(`${ET()}?onload=${c}`).catch(u=>t(u))}}).catch(e=>{throw ro=null,e})}let ro=null;function DE(n){return ro=ro||kE(n),ro}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const VE=new di(5e3,15e3),NE="__/auth/iframe",OE="emulator/auth/iframe",xE={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},ME=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function LE(n){const e=n.config;j(e.authDomain,n,"auth-domain-config-required");const t=e.emulator?nu(e,OE):`https://${n.config.authDomain}/${NE}`,r={apiKey:e.apiKey,appName:n.name,v:Zn},s=ME.get(n.config.apiHost);s&&(r.eid=s);const i=n._getFrameworks();return i.length&&(r.fw=i.join(",")),`${t}?${ui(r).slice(1)}`}async function FE(n){const e=await DE(n),t=mt().gapi;return j(t,n,"internal-error"),e.open({where:document.body,url:LE(n),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:xE,dontclear:!0},r=>new Promise(async(s,i)=>{await r.restyle({setHideOnLeave:!1});const o=pt(n,"network-request-failed"),c=mt().setTimeout(()=>{i(o)},VE.get());function u(){mt().clearTimeout(c),s(r)}r.ping(u).then(u,()=>{i(o)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const UE={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},BE=500,qE=600,$E="_blank",jE="http://localhost";class Qh{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function zE(n,e,t,r=BE,s=qE){const i=Math.max((window.screen.availHeight-s)/2,0).toString(),o=Math.max((window.screen.availWidth-r)/2,0).toString();let c="";const u={...UE,width:r.toString(),height:s.toString(),top:i,left:o},l=Te().toLowerCase();t&&(c=dp(l)?$E:t),lp(l)&&(e=e||jE,u.scrollbars="yes");const f=Object.entries(u).reduce((g,[v,C])=>`${g}${v}=${C},`,"");if(dT(l)&&c!=="_self")return KE(e||"",c),new Qh(null);const p=window.open(e||"",c,f);j(p,n,"popup-blocked");try{p.focus()}catch{}return new Qh(p)}function KE(n,e){const t=document.createElement("a");t.href=n,t.target=e;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(r)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const GE="__/auth/handler",HE="emulator/auth/handler",WE=encodeURIComponent("fac");async function Jh(n,e,t,r,s,i){j(n.config.authDomain,n,"auth-domain-config-required"),j(n.config.apiKey,n,"invalid-api-key");const o={apiKey:n.config.apiKey,appName:n.name,authType:t,redirectUrl:r,v:Zn,eventId:s};if(e instanceof wp){e.setDefaultLanguage(n.languageCode),o.providerId=e.providerId||"",zy(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[f,p]of Object.entries({}))o[f]=p}if(e instanceof pi){const f=e.getScopes().filter(p=>p!=="");f.length>0&&(o.scopes=f.join(","))}n.tenantId&&(o.tid=n.tenantId);const c=o;for(const f of Object.keys(c))c[f]===void 0&&delete c[f];const u=await n._getAppCheckToken(),l=u?`#${WE}=${encodeURIComponent(u)}`:"";return`${QE(n)}?${ui(c).slice(1)}${l}`}function QE({config:n}){return n.emulator?nu(n,HE):`https://${n.authDomain}/${GE}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ya="webStorageSupport";class JE{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=Pp,this._completeRedirectFn=TE,this._overrideRedirectResult=_E}async _openPopup(e,t,r,s){var o;Ct((o=this.eventManagers[e._key()])==null?void 0:o.manager,"_initialize() not called before _openPopup()");const i=await Jh(e,t,r,yc(),s);return zE(e,i,au())}async _openRedirect(e,t,r,s){await this._originValidation(e);const i=await Jh(e,t,r,yc(),s);return ZT(i),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:s,promise:i}=this.eventManagers[t];return s?Promise.resolve(s):(Ct(i,"If manager is not set, promise should be"),i)}const r=this.initAndGetManager(e);return this.eventManagers[t]={promise:r},r.catch(()=>{delete this.eventManagers[t]}),r}async initAndGetManager(e){const t=await FE(e),r=new wE(e);return t.register("authEvent",s=>(j(s==null?void 0:s.authEvent,e,"invalid-auth-event"),{status:r.onEvent(s.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=t,r}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(Ya,{type:Ya},s=>{var o;const i=(o=s==null?void 0:s[0])==null?void 0:o[Ya];i!==void 0&&t(!!i),it(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=SE(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return _p()||hp()||su()}}const YE=JE;var Yh="@firebase/auth",Xh="1.13.1";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class XE{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(r=>{e((r==null?void 0:r.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){j(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ZE(n){switch(n){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function ew(n){Ze(new Je("auth",(e,{options:t})=>{const r=e.getProvider("app").getImmediate(),s=e.getProvider("heartbeat"),i=e.getProvider("app-check-internal"),{apiKey:o,authDomain:c}=r.options;j(o&&!o.includes(":"),"invalid-api-key",{appName:r.name});const u={apiKey:o,authDomain:c,clientPlatform:n,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:yp(n)},l=new yT(r,s,i,u);return PT(l,t),l},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,r)=>{e.getProvider("auth-internal").initialize()})),Ze(new Je("auth-internal",e=>{const t=pn(e.getProvider("auth").getImmediate());return(r=>new XE(r))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),Ve(Yh,Xh,ZE(n)),Ve(Yh,Xh,"esm2020")}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tw=5*60,nw=Wf("authIdTokenMaxAge")||tw;let Zh=null;const rw=n=>async e=>{const t=e&&await e.getIdTokenResult(),r=t&&(new Date().getTime()-Date.parse(t.issuedAtTime))/1e3;if(r&&r>nw)return;const s=t==null?void 0:t.token;Zh!==s&&(Zh=s,await fetch(n,{method:s?"POST":"DELETE",headers:s?{Authorization:`Bearer ${s}`}:{}}))};function pC(n=hi()){const e=Nt(n,"auth");if(e.isInitialized())return e.getImmediate();const t=ST(n,{popupRedirectResolver:YE,persistence:[cE,JT,Pp]}),r=Wf("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){const i=new URL(r,location.origin);if(location.origin===i.origin){const o=rw(i.toString());HT(t,o,()=>o(t.currentUser)),GT(t,c=>o(c))}}const s=Gf("auth");return s&&CT(t,`http://${s}`),t}function sw(){var n;return((n=document.getElementsByTagName("head"))==null?void 0:n[0])??document}IT({loadJS(n){return new Promise((e,t)=>{const r=document.createElement("script");r.setAttribute("src",n),r.onload=e,r.onerror=s=>{const i=pt("internal-error");i.customData=s,t(i)},r.type="text/javascript",r.charset="UTF-8",sw().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});ew("Browser");var ed=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var on,xp;(function(){var n;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(T,_){function I(){}I.prototype=_.prototype,T.F=_.prototype,T.prototype=new I,T.prototype.constructor=T,T.D=function(w,E,R){for(var y=Array(arguments.length-2),Fe=2;Fe<arguments.length;Fe++)y[Fe-2]=arguments[Fe];return _.prototype[E].apply(w,y)}}function t(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(r,t),r.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function s(T,_,I){I||(I=0);const w=Array(16);if(typeof _=="string")for(var E=0;E<16;++E)w[E]=_.charCodeAt(I++)|_.charCodeAt(I++)<<8|_.charCodeAt(I++)<<16|_.charCodeAt(I++)<<24;else for(E=0;E<16;++E)w[E]=_[I++]|_[I++]<<8|_[I++]<<16|_[I++]<<24;_=T.g[0],I=T.g[1],E=T.g[2];let R=T.g[3],y;y=_+(R^I&(E^R))+w[0]+3614090360&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(E^_&(I^E))+w[1]+3905402710&4294967295,R=_+(y<<12&4294967295|y>>>20),y=E+(I^R&(_^I))+w[2]+606105819&4294967295,E=R+(y<<17&4294967295|y>>>15),y=I+(_^E&(R^_))+w[3]+3250441966&4294967295,I=E+(y<<22&4294967295|y>>>10),y=_+(R^I&(E^R))+w[4]+4118548399&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(E^_&(I^E))+w[5]+1200080426&4294967295,R=_+(y<<12&4294967295|y>>>20),y=E+(I^R&(_^I))+w[6]+2821735955&4294967295,E=R+(y<<17&4294967295|y>>>15),y=I+(_^E&(R^_))+w[7]+4249261313&4294967295,I=E+(y<<22&4294967295|y>>>10),y=_+(R^I&(E^R))+w[8]+1770035416&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(E^_&(I^E))+w[9]+2336552879&4294967295,R=_+(y<<12&4294967295|y>>>20),y=E+(I^R&(_^I))+w[10]+4294925233&4294967295,E=R+(y<<17&4294967295|y>>>15),y=I+(_^E&(R^_))+w[11]+2304563134&4294967295,I=E+(y<<22&4294967295|y>>>10),y=_+(R^I&(E^R))+w[12]+1804603682&4294967295,_=I+(y<<7&4294967295|y>>>25),y=R+(E^_&(I^E))+w[13]+4254626195&4294967295,R=_+(y<<12&4294967295|y>>>20),y=E+(I^R&(_^I))+w[14]+2792965006&4294967295,E=R+(y<<17&4294967295|y>>>15),y=I+(_^E&(R^_))+w[15]+1236535329&4294967295,I=E+(y<<22&4294967295|y>>>10),y=_+(E^R&(I^E))+w[1]+4129170786&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^E&(_^I))+w[6]+3225465664&4294967295,R=_+(y<<9&4294967295|y>>>23),y=E+(_^I&(R^_))+w[11]+643717713&4294967295,E=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(E^R))+w[0]+3921069994&4294967295,I=E+(y<<20&4294967295|y>>>12),y=_+(E^R&(I^E))+w[5]+3593408605&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^E&(_^I))+w[10]+38016083&4294967295,R=_+(y<<9&4294967295|y>>>23),y=E+(_^I&(R^_))+w[15]+3634488961&4294967295,E=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(E^R))+w[4]+3889429448&4294967295,I=E+(y<<20&4294967295|y>>>12),y=_+(E^R&(I^E))+w[9]+568446438&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^E&(_^I))+w[14]+3275163606&4294967295,R=_+(y<<9&4294967295|y>>>23),y=E+(_^I&(R^_))+w[3]+4107603335&4294967295,E=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(E^R))+w[8]+1163531501&4294967295,I=E+(y<<20&4294967295|y>>>12),y=_+(E^R&(I^E))+w[13]+2850285829&4294967295,_=I+(y<<5&4294967295|y>>>27),y=R+(I^E&(_^I))+w[2]+4243563512&4294967295,R=_+(y<<9&4294967295|y>>>23),y=E+(_^I&(R^_))+w[7]+1735328473&4294967295,E=R+(y<<14&4294967295|y>>>18),y=I+(R^_&(E^R))+w[12]+2368359562&4294967295,I=E+(y<<20&4294967295|y>>>12),y=_+(I^E^R)+w[5]+4294588738&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^E)+w[8]+2272392833&4294967295,R=_+(y<<11&4294967295|y>>>21),y=E+(R^_^I)+w[11]+1839030562&4294967295,E=R+(y<<16&4294967295|y>>>16),y=I+(E^R^_)+w[14]+4259657740&4294967295,I=E+(y<<23&4294967295|y>>>9),y=_+(I^E^R)+w[1]+2763975236&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^E)+w[4]+1272893353&4294967295,R=_+(y<<11&4294967295|y>>>21),y=E+(R^_^I)+w[7]+4139469664&4294967295,E=R+(y<<16&4294967295|y>>>16),y=I+(E^R^_)+w[10]+3200236656&4294967295,I=E+(y<<23&4294967295|y>>>9),y=_+(I^E^R)+w[13]+681279174&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^E)+w[0]+3936430074&4294967295,R=_+(y<<11&4294967295|y>>>21),y=E+(R^_^I)+w[3]+3572445317&4294967295,E=R+(y<<16&4294967295|y>>>16),y=I+(E^R^_)+w[6]+76029189&4294967295,I=E+(y<<23&4294967295|y>>>9),y=_+(I^E^R)+w[9]+3654602809&4294967295,_=I+(y<<4&4294967295|y>>>28),y=R+(_^I^E)+w[12]+3873151461&4294967295,R=_+(y<<11&4294967295|y>>>21),y=E+(R^_^I)+w[15]+530742520&4294967295,E=R+(y<<16&4294967295|y>>>16),y=I+(E^R^_)+w[2]+3299628645&4294967295,I=E+(y<<23&4294967295|y>>>9),y=_+(E^(I|~R))+w[0]+4096336452&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~E))+w[7]+1126891415&4294967295,R=_+(y<<10&4294967295|y>>>22),y=E+(_^(R|~I))+w[14]+2878612391&4294967295,E=R+(y<<15&4294967295|y>>>17),y=I+(R^(E|~_))+w[5]+4237533241&4294967295,I=E+(y<<21&4294967295|y>>>11),y=_+(E^(I|~R))+w[12]+1700485571&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~E))+w[3]+2399980690&4294967295,R=_+(y<<10&4294967295|y>>>22),y=E+(_^(R|~I))+w[10]+4293915773&4294967295,E=R+(y<<15&4294967295|y>>>17),y=I+(R^(E|~_))+w[1]+2240044497&4294967295,I=E+(y<<21&4294967295|y>>>11),y=_+(E^(I|~R))+w[8]+1873313359&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~E))+w[15]+4264355552&4294967295,R=_+(y<<10&4294967295|y>>>22),y=E+(_^(R|~I))+w[6]+2734768916&4294967295,E=R+(y<<15&4294967295|y>>>17),y=I+(R^(E|~_))+w[13]+1309151649&4294967295,I=E+(y<<21&4294967295|y>>>11),y=_+(E^(I|~R))+w[4]+4149444226&4294967295,_=I+(y<<6&4294967295|y>>>26),y=R+(I^(_|~E))+w[11]+3174756917&4294967295,R=_+(y<<10&4294967295|y>>>22),y=E+(_^(R|~I))+w[2]+718787259&4294967295,E=R+(y<<15&4294967295|y>>>17),y=I+(R^(E|~_))+w[9]+3951481745&4294967295,T.g[0]=T.g[0]+_&4294967295,T.g[1]=T.g[1]+(E+(y<<21&4294967295|y>>>11))&4294967295,T.g[2]=T.g[2]+E&4294967295,T.g[3]=T.g[3]+R&4294967295}r.prototype.v=function(T,_){_===void 0&&(_=T.length);const I=_-this.blockSize,w=this.C;let E=this.h,R=0;for(;R<_;){if(E==0)for(;R<=I;)s(this,T,R),R+=this.blockSize;if(typeof T=="string"){for(;R<_;)if(w[E++]=T.charCodeAt(R++),E==this.blockSize){s(this,w),E=0;break}}else for(;R<_;)if(w[E++]=T[R++],E==this.blockSize){s(this,w),E=0;break}}this.h=E,this.o+=_},r.prototype.A=function(){var T=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);T[0]=128;for(var _=1;_<T.length-8;++_)T[_]=0;_=this.o*8;for(var I=T.length-8;I<T.length;++I)T[I]=_&255,_/=256;for(this.v(T),T=Array(16),_=0,I=0;I<4;++I)for(let w=0;w<32;w+=8)T[_++]=this.g[I]>>>w&255;return T};function i(T,_){var I=c;return Object.prototype.hasOwnProperty.call(I,T)?I[T]:I[T]=_(T)}function o(T,_){this.h=_;const I=[];let w=!0;for(let E=T.length-1;E>=0;E--){const R=T[E]|0;w&&R==_||(I[E]=R,w=!1)}this.g=I}var c={};function u(T){return-128<=T&&T<128?i(T,function(_){return new o([_|0],_<0?-1:0)}):new o([T|0],T<0?-1:0)}function l(T){if(isNaN(T)||!isFinite(T))return p;if(T<0)return k(l(-T));const _=[];let I=1;for(let w=0;T>=I;w++)_[w]=T/I|0,I*=4294967296;return new o(_,0)}function f(T,_){if(T.length==0)throw Error("number format error: empty string");if(_=_||10,_<2||36<_)throw Error("radix out of range: "+_);if(T.charAt(0)=="-")return k(f(T.substring(1),_));if(T.indexOf("-")>=0)throw Error('number format error: interior "-" character');const I=l(Math.pow(_,8));let w=p;for(let R=0;R<T.length;R+=8){var E=Math.min(8,T.length-R);const y=parseInt(T.substring(R,R+E),_);E<8?(E=l(Math.pow(_,E)),w=w.j(E).add(l(y))):(w=w.j(I),w=w.add(l(y)))}return w}var p=u(0),g=u(1),v=u(16777216);n=o.prototype,n.m=function(){if(V(this))return-k(this).m();let T=0,_=1;for(let I=0;I<this.g.length;I++){const w=this.i(I);T+=(w>=0?w:4294967296+w)*_,_*=4294967296}return T},n.toString=function(T){if(T=T||10,T<2||36<T)throw Error("radix out of range: "+T);if(C(this))return"0";if(V(this))return"-"+k(this).toString(T);const _=l(Math.pow(T,6));var I=this;let w="";for(;;){const E=K(I,_).g;I=$(I,E.j(_));let R=((I.g.length>0?I.g[0]:I.h)>>>0).toString(T);if(I=E,C(I))return R+w;for(;R.length<6;)R="0"+R;w=R+w}},n.i=function(T){return T<0?0:T<this.g.length?this.g[T]:this.h};function C(T){if(T.h!=0)return!1;for(let _=0;_<T.g.length;_++)if(T.g[_]!=0)return!1;return!0}function V(T){return T.h==-1}n.l=function(T){return T=$(this,T),V(T)?-1:C(T)?0:1};function k(T){const _=T.g.length,I=[];for(let w=0;w<_;w++)I[w]=~T.g[w];return new o(I,~T.h).add(g)}n.abs=function(){return V(this)?k(this):this},n.add=function(T){const _=Math.max(this.g.length,T.g.length),I=[];let w=0;for(let E=0;E<=_;E++){let R=w+(this.i(E)&65535)+(T.i(E)&65535),y=(R>>>16)+(this.i(E)>>>16)+(T.i(E)>>>16);w=y>>>16,R&=65535,y&=65535,I[E]=y<<16|R}return new o(I,I[I.length-1]&-2147483648?-1:0)};function $(T,_){return T.add(k(_))}n.j=function(T){if(C(this)||C(T))return p;if(V(this))return V(T)?k(this).j(k(T)):k(k(this).j(T));if(V(T))return k(this.j(k(T)));if(this.l(v)<0&&T.l(v)<0)return l(this.m()*T.m());const _=this.g.length+T.g.length,I=[];for(var w=0;w<2*_;w++)I[w]=0;for(w=0;w<this.g.length;w++)for(let E=0;E<T.g.length;E++){const R=this.i(w)>>>16,y=this.i(w)&65535,Fe=T.i(E)>>>16,In=T.i(E)&65535;I[2*w+2*E]+=y*In,q(I,2*w+2*E),I[2*w+2*E+1]+=R*In,q(I,2*w+2*E+1),I[2*w+2*E+1]+=y*Fe,q(I,2*w+2*E+1),I[2*w+2*E+2]+=R*Fe,q(I,2*w+2*E+2)}for(T=0;T<_;T++)I[T]=I[2*T+1]<<16|I[2*T];for(T=_;T<2*_;T++)I[T]=0;return new o(I,0)};function q(T,_){for(;(T[_]&65535)!=T[_];)T[_+1]+=T[_]>>>16,T[_]&=65535,_++}function U(T,_){this.g=T,this.h=_}function K(T,_){if(C(_))throw Error("division by zero");if(C(T))return new U(p,p);if(V(T))return _=K(k(T),_),new U(k(_.g),k(_.h));if(V(_))return _=K(T,k(_)),new U(k(_.g),_.h);if(T.g.length>30){if(V(T)||V(_))throw Error("slowDivide_ only works with positive integers.");for(var I=g,w=_;w.l(T)<=0;)I=G(I),w=G(w);var E=Q(I,1),R=Q(w,1);for(w=Q(w,2),I=Q(I,2);!C(w);){var y=R.add(w);y.l(T)<=0&&(E=E.add(I),R=y),w=Q(w,1),I=Q(I,1)}return _=$(T,E.j(_)),new U(E,_)}for(E=p;T.l(_)>=0;){for(I=Math.max(1,Math.floor(T.m()/_.m())),w=Math.ceil(Math.log(I)/Math.LN2),w=w<=48?1:Math.pow(2,w-48),R=l(I),y=R.j(_);V(y)||y.l(T)>0;)I-=w,R=l(I),y=R.j(_);C(R)&&(R=g),E=E.add(R),T=$(T,y)}return new U(E,T)}n.B=function(T){return K(this,T).h},n.and=function(T){const _=Math.max(this.g.length,T.g.length),I=[];for(let w=0;w<_;w++)I[w]=this.i(w)&T.i(w);return new o(I,this.h&T.h)},n.or=function(T){const _=Math.max(this.g.length,T.g.length),I=[];for(let w=0;w<_;w++)I[w]=this.i(w)|T.i(w);return new o(I,this.h|T.h)},n.xor=function(T){const _=Math.max(this.g.length,T.g.length),I=[];for(let w=0;w<_;w++)I[w]=this.i(w)^T.i(w);return new o(I,this.h^T.h)};function G(T){const _=T.g.length+1,I=[];for(let w=0;w<_;w++)I[w]=T.i(w)<<1|T.i(w-1)>>>31;return new o(I,T.h)}function Q(T,_){const I=_>>5;_%=32;const w=T.g.length-I,E=[];for(let R=0;R<w;R++)E[R]=_>0?T.i(R+I)>>>_|T.i(R+I+1)<<32-_:T.i(R+I);return new o(E,T.h)}r.prototype.digest=r.prototype.A,r.prototype.reset=r.prototype.u,r.prototype.update=r.prototype.v,xp=r,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=l,o.fromString=f,on=o}).apply(typeof ed<"u"?ed:typeof self<"u"?self:typeof window<"u"?window:{});var Ki=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Mp,Ss,Lp,so,wc,Fp,Up,Bp;(function(){var n,e=Object.defineProperty;function t(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof Ki=="object"&&Ki];for(var h=0;h<a.length;++h){var d=a[h];if(d&&d.Math==Math)return d}throw Error("Cannot find global object")}var r=t(this);function s(a,h){if(h)e:{var d=r;a=a.split(".");for(var m=0;m<a.length-1;m++){var b=a[m];if(!(b in d))break e;d=d[b]}a=a[a.length-1],m=d[a],h=h(m),h!=m&&h!=null&&e(d,a,{configurable:!0,writable:!0,value:h})}}s("Symbol.dispose",function(a){return a||Symbol("Symbol.dispose")}),s("Array.prototype.values",function(a){return a||function(){return this[Symbol.iterator]()}}),s("Object.entries",function(a){return a||function(h){var d=[],m;for(m in h)Object.prototype.hasOwnProperty.call(h,m)&&d.push([m,h[m]]);return d}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var i=i||{},o=this||self;function c(a){var h=typeof a;return h=="object"&&a!=null||h=="function"}function u(a,h,d){return a.call.apply(a.bind,arguments)}function l(a,h,d){return l=u,l.apply(null,arguments)}function f(a,h){var d=Array.prototype.slice.call(arguments,1);return function(){var m=d.slice();return m.push.apply(m,arguments),a.apply(this,m)}}function p(a,h){function d(){}d.prototype=h.prototype,a.Z=h.prototype,a.prototype=new d,a.prototype.constructor=a,a.Ob=function(m,b,S){for(var O=Array(arguments.length-2),H=2;H<arguments.length;H++)O[H-2]=arguments[H];return h.prototype[b].apply(m,O)}}var g=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?a=>a&&AsyncContext.Snapshot.wrap(a):a=>a;function v(a){const h=a.length;if(h>0){const d=Array(h);for(let m=0;m<h;m++)d[m]=a[m];return d}return[]}function C(a,h){for(let m=1;m<arguments.length;m++){const b=arguments[m];var d=typeof b;if(d=d!="object"?d:b?Array.isArray(b)?"array":d:"null",d=="array"||d=="object"&&typeof b.length=="number"){d=a.length||0;const S=b.length||0;a.length=d+S;for(let O=0;O<S;O++)a[d+O]=b[O]}else a.push(b)}}class V{constructor(h,d){this.i=h,this.j=d,this.h=0,this.g=null}get(){let h;return this.h>0?(this.h--,h=this.g,this.g=h.next,h.next=null):h=this.i(),h}}function k(a){o.setTimeout(()=>{throw a},0)}function $(){var a=T;let h=null;return a.g&&(h=a.g,a.g=a.g.next,a.g||(a.h=null),h.next=null),h}class q{constructor(){this.h=this.g=null}add(h,d){const m=U.get();m.set(h,d),this.h?this.h.next=m:this.g=m,this.h=m}}var U=new V(()=>new K,a=>a.reset());class K{constructor(){this.next=this.g=this.h=null}set(h,d){this.h=h,this.g=d,this.next=null}reset(){this.next=this.g=this.h=null}}let G,Q=!1,T=new q,_=()=>{const a=Promise.resolve(void 0);G=()=>{a.then(I)}};function I(){for(var a;a=$();){try{a.h.call(a.g)}catch(d){k(d)}var h=U;h.j(a),h.h<100&&(h.h++,a.next=h.g,h.g=a)}Q=!1}function w(){this.u=this.u,this.C=this.C}w.prototype.u=!1,w.prototype.dispose=function(){this.u||(this.u=!0,this.N())},w.prototype[Symbol.dispose]=function(){this.dispose()},w.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function E(a,h){this.type=a,this.g=this.target=h,this.defaultPrevented=!1}E.prototype.h=function(){this.defaultPrevented=!0};var R=function(){if(!o.addEventListener||!Object.defineProperty)return!1;var a=!1,h=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const d=()=>{};o.addEventListener("test",d,h),o.removeEventListener("test",d,h)}catch{}return a}();function y(a){return/^[\s\xa0]*$/.test(a)}function Fe(a,h){E.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a&&this.init(a,h)}p(Fe,E),Fe.prototype.init=function(a,h){const d=this.type=a.type,m=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement,this.g=h,h=a.relatedTarget,h||(d=="mouseover"?h=a.fromElement:d=="mouseout"&&(h=a.toElement)),this.relatedTarget=h,m?(this.clientX=m.clientX!==void 0?m.clientX:m.pageX,this.clientY=m.clientY!==void 0?m.clientY:m.pageY,this.screenX=m.screenX||0,this.screenY=m.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=a.pointerType,this.state=a.state,this.i=a,a.defaultPrevented&&Fe.Z.h.call(this)},Fe.prototype.h=function(){Fe.Z.h.call(this);const a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var In="closure_listenable_"+(Math.random()*1e6|0),Q_=0;function J_(a,h,d,m,b){this.listener=a,this.proxy=null,this.src=h,this.type=d,this.capture=!!m,this.ha=b,this.key=++Q_,this.da=this.fa=!1}function Ci(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function ki(a,h,d){for(const m in a)h.call(d,a[m],m,a)}function Y_(a,h){for(const d in a)h.call(void 0,a[d],d,a)}function Sl(a){const h={};for(const d in a)h[d]=a[d];return h}const Pl="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function Cl(a,h){let d,m;for(let b=1;b<arguments.length;b++){m=arguments[b];for(d in m)a[d]=m[d];for(let S=0;S<Pl.length;S++)d=Pl[S],Object.prototype.hasOwnProperty.call(m,d)&&(a[d]=m[d])}}function Di(a){this.src=a,this.g={},this.h=0}Di.prototype.add=function(a,h,d,m,b){const S=a.toString();a=this.g[S],a||(a=this.g[S]=[],this.h++);const O=Aa(a,h,m,b);return O>-1?(h=a[O],d||(h.fa=!1)):(h=new J_(h,this.src,S,!!m,b),h.fa=d,a.push(h)),h};function va(a,h){const d=h.type;if(d in a.g){var m=a.g[d],b=Array.prototype.indexOf.call(m,h,void 0),S;(S=b>=0)&&Array.prototype.splice.call(m,b,1),S&&(Ci(h),a.g[d].length==0&&(delete a.g[d],a.h--))}}function Aa(a,h,d,m){for(let b=0;b<a.length;++b){const S=a[b];if(!S.da&&S.listener==h&&S.capture==!!d&&S.ha==m)return b}return-1}var ba="closure_lm_"+(Math.random()*1e6|0),Ra={};function kl(a,h,d,m,b){if(Array.isArray(h)){for(let S=0;S<h.length;S++)kl(a,h[S],d,m,b);return null}return d=Nl(d),a&&a[In]?a.J(h,d,c(m)?!!m.capture:!1,b):X_(a,h,d,!1,m,b)}function X_(a,h,d,m,b,S){if(!h)throw Error("Invalid event type");const O=c(b)?!!b.capture:!!b;let H=Pa(a);if(H||(a[ba]=H=new Di(a)),d=H.add(h,d,m,O,S),d.proxy)return d;if(m=Z_(),d.proxy=m,m.src=a,m.listener=d,a.addEventListener)R||(b=O),b===void 0&&(b=!1),a.addEventListener(h.toString(),m,b);else if(a.attachEvent)a.attachEvent(Vl(h.toString()),m);else if(a.addListener&&a.removeListener)a.addListener(m);else throw Error("addEventListener and attachEvent are unavailable.");return d}function Z_(){function a(d){return h.call(a.src,a.listener,d)}const h=ey;return a}function Dl(a,h,d,m,b){if(Array.isArray(h))for(var S=0;S<h.length;S++)Dl(a,h[S],d,m,b);else m=c(m)?!!m.capture:!!m,d=Nl(d),a&&a[In]?(a=a.i,S=String(h).toString(),S in a.g&&(h=a.g[S],d=Aa(h,d,m,b),d>-1&&(Ci(h[d]),Array.prototype.splice.call(h,d,1),h.length==0&&(delete a.g[S],a.h--)))):a&&(a=Pa(a))&&(h=a.g[h.toString()],a=-1,h&&(a=Aa(h,d,m,b)),(d=a>-1?h[a]:null)&&Sa(d))}function Sa(a){if(typeof a!="number"&&a&&!a.da){var h=a.src;if(h&&h[In])va(h.i,a);else{var d=a.type,m=a.proxy;h.removeEventListener?h.removeEventListener(d,m,a.capture):h.detachEvent?h.detachEvent(Vl(d),m):h.addListener&&h.removeListener&&h.removeListener(m),(d=Pa(h))?(va(d,a),d.h==0&&(d.src=null,h[ba]=null)):Ci(a)}}}function Vl(a){return a in Ra?Ra[a]:Ra[a]="on"+a}function ey(a,h){if(a.da)a=!0;else{h=new Fe(h,this);const d=a.listener,m=a.ha||a.src;a.fa&&Sa(a),a=d.call(m,h)}return a}function Pa(a){return a=a[ba],a instanceof Di?a:null}var Ca="__closure_events_fn_"+(Math.random()*1e9>>>0);function Nl(a){return typeof a=="function"?a:(a[Ca]||(a[Ca]=function(h){return a.handleEvent(h)}),a[Ca])}function Ce(){w.call(this),this.i=new Di(this),this.M=this,this.G=null}p(Ce,w),Ce.prototype[In]=!0,Ce.prototype.removeEventListener=function(a,h,d,m){Dl(this,a,h,d,m)};function Oe(a,h){var d,m=a.G;if(m)for(d=[];m;m=m.G)d.push(m);if(a=a.M,m=h.type||h,typeof h=="string")h=new E(h,a);else if(h instanceof E)h.target=h.target||a;else{var b=h;h=new E(m,a),Cl(h,b)}b=!0;let S,O;if(d)for(O=d.length-1;O>=0;O--)S=h.g=d[O],b=Vi(S,m,!0,h)&&b;if(S=h.g=a,b=Vi(S,m,!0,h)&&b,b=Vi(S,m,!1,h)&&b,d)for(O=0;O<d.length;O++)S=h.g=d[O],b=Vi(S,m,!1,h)&&b}Ce.prototype.N=function(){if(Ce.Z.N.call(this),this.i){var a=this.i;for(const h in a.g){const d=a.g[h];for(let m=0;m<d.length;m++)Ci(d[m]);delete a.g[h],a.h--}}this.G=null},Ce.prototype.J=function(a,h,d,m){return this.i.add(String(a),h,!1,d,m)},Ce.prototype.K=function(a,h,d,m){return this.i.add(String(a),h,!0,d,m)};function Vi(a,h,d,m){if(h=a.i.g[String(h)],!h)return!0;h=h.concat();let b=!0;for(let S=0;S<h.length;++S){const O=h[S];if(O&&!O.da&&O.capture==d){const H=O.listener,Ie=O.ha||O.src;O.fa&&va(a.i,O),b=H.call(Ie,m)!==!1&&b}}return b&&!m.defaultPrevented}function ty(a,h){if(typeof a!="function")if(a&&typeof a.handleEvent=="function")a=l(a.handleEvent,a);else throw Error("Invalid listener argument");return Number(h)>2147483647?-1:o.setTimeout(a,h||0)}function Ol(a){a.g=ty(()=>{a.g=null,a.i&&(a.i=!1,Ol(a))},a.l);const h=a.h;a.h=null,a.m.apply(null,h)}class ny extends w{constructor(h,d){super(),this.m=h,this.l=d,this.h=null,this.i=!1,this.g=null}j(h){this.h=arguments,this.g?this.i=!0:Ol(this)}N(){super.N(),this.g&&(o.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function ns(a){w.call(this),this.h=a,this.g={}}p(ns,w);var xl=[];function Ml(a){ki(a.g,function(h,d){this.g.hasOwnProperty(d)&&Sa(h)},a),a.g={}}ns.prototype.N=function(){ns.Z.N.call(this),Ml(this)},ns.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var ka=o.JSON.stringify,ry=o.JSON.parse,sy=class{stringify(a){return o.JSON.stringify(a,void 0)}parse(a){return o.JSON.parse(a,void 0)}};function Ll(){}function Fl(){}var rs={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function Da(){E.call(this,"d")}p(Da,E);function Va(){E.call(this,"c")}p(Va,E);var Tn={},Ul=null;function Ni(){return Ul=Ul||new Ce}Tn.Ia="serverreachability";function Bl(a){E.call(this,Tn.Ia,a)}p(Bl,E);function ss(a){const h=Ni();Oe(h,new Bl(h))}Tn.STAT_EVENT="statevent";function ql(a,h){E.call(this,Tn.STAT_EVENT,a),this.stat=h}p(ql,E);function xe(a){const h=Ni();Oe(h,new ql(h,a))}Tn.Ja="timingevent";function $l(a,h){E.call(this,Tn.Ja,a),this.size=h}p($l,E);function is(a,h){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return o.setTimeout(function(){a()},h)}function os(){this.g=!0}os.prototype.ua=function(){this.g=!1};function iy(a,h,d,m,b,S){a.info(function(){if(a.g)if(S){var O="",H=S.split("&");for(let se=0;se<H.length;se++){var Ie=H[se].split("=");if(Ie.length>1){const we=Ie[0];Ie=Ie[1];const at=we.split("_");O=at.length>=2&&at[1]=="type"?O+(we+"="+Ie+"&"):O+(we+"=redacted&")}}}else O=null;else O=S;return"XMLHTTP REQ ("+m+") [attempt "+b+"]: "+h+`
`+d+`
`+O})}function oy(a,h,d,m,b,S,O){a.info(function(){return"XMLHTTP RESP ("+m+") [ attempt "+b+"]: "+h+`
`+d+`
`+S+" "+O})}function rr(a,h,d,m){a.info(function(){return"XMLHTTP TEXT ("+h+"): "+cy(a,d)+(m?" "+m:"")})}function ay(a,h){a.info(function(){return"TIMEOUT: "+h})}os.prototype.info=function(){};function cy(a,h){if(!a.g)return h;if(!h)return null;try{const S=JSON.parse(h);if(S){for(a=0;a<S.length;a++)if(Array.isArray(S[a])){var d=S[a];if(!(d.length<2)){var m=d[1];if(Array.isArray(m)&&!(m.length<1)){var b=m[0];if(b!="noop"&&b!="stop"&&b!="close")for(let O=1;O<m.length;O++)m[O]=""}}}}return ka(S)}catch{return h}}var Oi={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},jl={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},zl;function Na(){}p(Na,Ll),Na.prototype.g=function(){return new XMLHttpRequest},zl=new Na;function as(a){return encodeURIComponent(String(a))}function uy(a){var h=1;a=a.split(":");const d=[];for(;h>0&&a.length;)d.push(a.shift()),h--;return a.length&&d.push(a.join(":")),d}function Ut(a,h,d,m){this.j=a,this.i=h,this.l=d,this.S=m||1,this.V=new ns(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new Kl}function Kl(){this.i=null,this.g="",this.h=!1}var Gl={},Oa={};function xa(a,h,d){a.M=1,a.A=Mi(ot(h)),a.u=d,a.R=!0,Hl(a,null)}function Hl(a,h){a.F=Date.now(),xi(a),a.B=ot(a.A);var d=a.B,m=a.S;Array.isArray(m)||(m=[String(m)]),oh(d.i,"t",m),a.C=0,d=a.j.L,a.h=new Kl,a.g=Ah(a.j,d?h:null,!a.u),a.P>0&&(a.O=new ny(l(a.Y,a,a.g),a.P)),h=a.V,d=a.g,m=a.ba;var b="readystatechange";Array.isArray(b)||(b&&(xl[0]=b.toString()),b=xl);for(let S=0;S<b.length;S++){const O=kl(d,b[S],m||h.handleEvent,!1,h.h||h);if(!O)break;h.g[O.key]=O}h=a.J?Sl(a.J):{},a.u?(a.v||(a.v="POST"),h["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.B,a.v,a.u,h)):(a.v="GET",a.g.ea(a.B,a.v,null,h)),ss(),iy(a.i,a.v,a.B,a.l,a.S,a.u)}Ut.prototype.ba=function(a){a=a.target;const h=this.O;h&&$t(a)==3?h.j():this.Y(a)},Ut.prototype.Y=function(a){try{if(a==this.g)e:{const H=$t(this.g),Ie=this.g.ya(),se=this.g.ca();if(!(H<3)&&(H!=3||this.g&&(this.h.h||this.g.la()||fh(this.g)))){this.K||H!=4||Ie==7||(Ie==8||se<=0?ss(3):ss(2)),Ma(this);var h=this.g.ca();this.X=h;var d=ly(this);if(this.o=h==200,oy(this.i,this.v,this.B,this.l,this.S,H,h),this.o){if(this.U&&!this.L){t:{if(this.g){var m,b=this.g;if((m=b.g?b.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!y(m)){var S=m;break t}}S=null}if(a=S)rr(this.i,this.l,a,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,La(this,a);else{this.o=!1,this.m=3,xe(12),En(this),cs(this);break e}}if(this.R){a=!0;let we;for(;!this.K&&this.C<d.length;)if(we=hy(this,d),we==Oa){H==4&&(this.m=4,xe(14),a=!1),rr(this.i,this.l,null,"[Incomplete Response]");break}else if(we==Gl){this.m=4,xe(15),rr(this.i,this.l,d,"[Invalid Chunk]"),a=!1;break}else rr(this.i,this.l,we,null),La(this,we);if(Wl(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),H!=4||d.length!=0||this.h.h||(this.m=1,xe(16),a=!1),this.o=this.o&&a,!a)rr(this.i,this.l,d,"[Invalid Chunked Response]"),En(this),cs(this);else if(d.length>0&&!this.W){this.W=!0;var O=this.j;O.g==this&&O.aa&&!O.P&&(O.j.info("Great, no buffering proxy detected. Bytes received: "+d.length),Ka(O),O.P=!0,xe(11))}}else rr(this.i,this.l,d,null),La(this,d);H==4&&En(this),this.o&&!this.K&&(H==4?Th(this.j,this):(this.o=!1,xi(this)))}else by(this.g),h==400&&d.indexOf("Unknown SID")>0?(this.m=3,xe(12)):(this.m=0,xe(13)),En(this),cs(this)}}}catch{}finally{}};function ly(a){if(!Wl(a))return a.g.la();const h=fh(a.g);if(h==="")return"";let d="";const m=h.length,b=$t(a.g)==4;if(!a.h.i){if(typeof TextDecoder>"u")return En(a),cs(a),"";a.h.i=new o.TextDecoder}for(let S=0;S<m;S++)a.h.h=!0,d+=a.h.i.decode(h[S],{stream:!(b&&S==m-1)});return h.length=0,a.h.g+=d,a.C=0,a.h.g}function Wl(a){return a.g?a.v=="GET"&&a.M!=2&&a.j.Aa:!1}function hy(a,h){var d=a.C,m=h.indexOf(`
`,d);return m==-1?Oa:(d=Number(h.substring(d,m)),isNaN(d)?Gl:(m+=1,m+d>h.length?Oa:(h=h.slice(m,m+d),a.C=m+d,h)))}Ut.prototype.cancel=function(){this.K=!0,En(this)};function xi(a){a.T=Date.now()+a.H,Ql(a,a.H)}function Ql(a,h){if(a.D!=null)throw Error("WatchDog timer not null");a.D=is(l(a.aa,a),h)}function Ma(a){a.D&&(o.clearTimeout(a.D),a.D=null)}Ut.prototype.aa=function(){this.D=null;const a=Date.now();a-this.T>=0?(ay(this.i,this.B),this.M!=2&&(ss(),xe(17)),En(this),this.m=2,cs(this)):Ql(this,this.T-a)};function cs(a){a.j.I==0||a.K||Th(a.j,a)}function En(a){Ma(a);var h=a.O;h&&typeof h.dispose=="function"&&h.dispose(),a.O=null,Ml(a.V),a.g&&(h=a.g,a.g=null,h.abort(),h.dispose())}function La(a,h){try{var d=a.j;if(d.I!=0&&(d.g==a||Fa(d.h,a))){if(!a.L&&Fa(d.h,a)&&d.I==3){try{var m=d.Ba.g.parse(h)}catch{m=null}if(Array.isArray(m)&&m.length==3){var b=m;if(b[0]==0){e:if(!d.v){if(d.g)if(d.g.F+3e3<a.F)qi(d),Ui(d);else break e;za(d),xe(18)}}else d.xa=b[1],0<d.xa-d.K&&b[2]<37500&&d.F&&d.A==0&&!d.C&&(d.C=is(l(d.Va,d),6e3));Xl(d.h)<=1&&d.ta&&(d.ta=void 0)}else vn(d,11)}else if((a.L||d.g==a)&&qi(d),!y(h))for(b=d.Ba.g.parse(h),h=0;h<b.length;h++){let se=b[h];const we=se[0];if(!(we<=d.K))if(d.K=we,se=se[1],d.I==2)if(se[0]=="c"){d.M=se[1],d.ba=se[2];const at=se[3];at!=null&&(d.ka=at,d.j.info("VER="+d.ka));const An=se[4];An!=null&&(d.za=An,d.j.info("SVER="+d.za));const jt=se[5];jt!=null&&typeof jt=="number"&&jt>0&&(m=1.5*jt,d.O=m,d.j.info("backChannelRequestTimeoutMs_="+m)),m=d;const zt=a.g;if(zt){const ji=zt.g?zt.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(ji){var S=m.h;S.g||ji.indexOf("spdy")==-1&&ji.indexOf("quic")==-1&&ji.indexOf("h2")==-1||(S.j=S.l,S.g=new Set,S.h&&(Ua(S,S.h),S.h=null))}if(m.G){const Ga=zt.g?zt.g.getResponseHeader("X-HTTP-Session-Id"):null;Ga&&(m.wa=Ga,oe(m.J,m.G,Ga))}}d.I=3,d.l&&d.l.ra(),d.aa&&(d.T=Date.now()-a.F,d.j.info("Handshake RTT: "+d.T+"ms")),m=d;var O=a;if(m.na=vh(m,m.L?m.ba:null,m.W),O.L){Zl(m.h,O);var H=O,Ie=m.O;Ie&&(H.H=Ie),H.D&&(Ma(H),xi(H)),m.g=O}else yh(m);d.i.length>0&&Bi(d)}else se[0]!="stop"&&se[0]!="close"||vn(d,7);else d.I==3&&(se[0]=="stop"||se[0]=="close"?se[0]=="stop"?vn(d,7):ja(d):se[0]!="noop"&&d.l&&d.l.qa(se),d.A=0)}}ss(4)}catch{}}var dy=class{constructor(a,h){this.g=a,this.map=h}};function Jl(a){this.l=a||10,o.PerformanceNavigationTiming?(a=o.performance.getEntriesByType("navigation"),a=a.length>0&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(o.chrome&&o.chrome.loadTimes&&o.chrome.loadTimes()&&o.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function Yl(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function Xl(a){return a.h?1:a.g?a.g.size:0}function Fa(a,h){return a.h?a.h==h:a.g?a.g.has(h):!1}function Ua(a,h){a.g?a.g.add(h):a.h=h}function Zl(a,h){a.h&&a.h==h?a.h=null:a.g&&a.g.has(h)&&a.g.delete(h)}Jl.prototype.cancel=function(){if(this.i=eh(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function eh(a){if(a.h!=null)return a.i.concat(a.h.G);if(a.g!=null&&a.g.size!==0){let h=a.i;for(const d of a.g.values())h=h.concat(d.G);return h}return v(a.i)}var th=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function fy(a,h){if(a){a=a.split("&");for(let d=0;d<a.length;d++){const m=a[d].indexOf("=");let b,S=null;m>=0?(b=a[d].substring(0,m),S=a[d].substring(m+1)):b=a[d],h(b,S?decodeURIComponent(S.replace(/\+/g," ")):"")}}}function Bt(a){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let h;a instanceof Bt?(this.l=a.l,us(this,a.j),this.o=a.o,this.g=a.g,ls(this,a.u),this.h=a.h,Ba(this,ah(a.i)),this.m=a.m):a&&(h=String(a).match(th))?(this.l=!1,us(this,h[1]||"",!0),this.o=hs(h[2]||""),this.g=hs(h[3]||"",!0),ls(this,h[4]),this.h=hs(h[5]||"",!0),Ba(this,h[6]||"",!0),this.m=hs(h[7]||"")):(this.l=!1,this.i=new fs(null,this.l))}Bt.prototype.toString=function(){const a=[];var h=this.j;h&&a.push(ds(h,nh,!0),":");var d=this.g;return(d||h=="file")&&(a.push("//"),(h=this.o)&&a.push(ds(h,nh,!0),"@"),a.push(as(d).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),d=this.u,d!=null&&a.push(":",String(d))),(d=this.h)&&(this.g&&d.charAt(0)!="/"&&a.push("/"),a.push(ds(d,d.charAt(0)=="/"?gy:my,!0))),(d=this.i.toString())&&a.push("?",d),(d=this.m)&&a.push("#",ds(d,yy)),a.join("")},Bt.prototype.resolve=function(a){const h=ot(this);let d=!!a.j;d?us(h,a.j):d=!!a.o,d?h.o=a.o:d=!!a.g,d?h.g=a.g:d=a.u!=null;var m=a.h;if(d)ls(h,a.u);else if(d=!!a.h){if(m.charAt(0)!="/")if(this.g&&!this.h)m="/"+m;else{var b=h.h.lastIndexOf("/");b!=-1&&(m=h.h.slice(0,b+1)+m)}if(b=m,b==".."||b==".")m="";else if(b.indexOf("./")!=-1||b.indexOf("/.")!=-1){m=b.lastIndexOf("/",0)==0,b=b.split("/");const S=[];for(let O=0;O<b.length;){const H=b[O++];H=="."?m&&O==b.length&&S.push(""):H==".."?((S.length>1||S.length==1&&S[0]!="")&&S.pop(),m&&O==b.length&&S.push("")):(S.push(H),m=!0)}m=S.join("/")}else m=b}return d?h.h=m:d=a.i.toString()!=="",d?Ba(h,ah(a.i)):d=!!a.m,d&&(h.m=a.m),h};function ot(a){return new Bt(a)}function us(a,h,d){a.j=d?hs(h,!0):h,a.j&&(a.j=a.j.replace(/:$/,""))}function ls(a,h){if(h){if(h=Number(h),isNaN(h)||h<0)throw Error("Bad port number "+h);a.u=h}else a.u=null}function Ba(a,h,d){h instanceof fs?(a.i=h,Iy(a.i,a.l)):(d||(h=ds(h,_y)),a.i=new fs(h,a.l))}function oe(a,h,d){a.i.set(h,d)}function Mi(a){return oe(a,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),a}function hs(a,h){return a?h?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function ds(a,h,d){return typeof a=="string"?(a=encodeURI(a).replace(h,py),d&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function py(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var nh=/[#\/\?@]/g,my=/[#\?:]/g,gy=/[#\?]/g,_y=/[#\?@]/g,yy=/#/g;function fs(a,h){this.h=this.g=null,this.i=a||null,this.j=!!h}function wn(a){a.g||(a.g=new Map,a.h=0,a.i&&fy(a.i,function(h,d){a.add(decodeURIComponent(h.replace(/\+/g," ")),d)}))}n=fs.prototype,n.add=function(a,h){wn(this),this.i=null,a=sr(this,a);let d=this.g.get(a);return d||this.g.set(a,d=[]),d.push(h),this.h+=1,this};function rh(a,h){wn(a),h=sr(a,h),a.g.has(h)&&(a.i=null,a.h-=a.g.get(h).length,a.g.delete(h))}function sh(a,h){return wn(a),h=sr(a,h),a.g.has(h)}n.forEach=function(a,h){wn(this),this.g.forEach(function(d,m){d.forEach(function(b){a.call(h,b,m,this)},this)},this)};function ih(a,h){wn(a);let d=[];if(typeof h=="string")sh(a,h)&&(d=d.concat(a.g.get(sr(a,h))));else for(a=Array.from(a.g.values()),h=0;h<a.length;h++)d=d.concat(a[h]);return d}n.set=function(a,h){return wn(this),this.i=null,a=sr(this,a),sh(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[h]),this.h+=1,this},n.get=function(a,h){return a?(a=ih(this,a),a.length>0?String(a[0]):h):h};function oh(a,h,d){rh(a,h),d.length>0&&(a.i=null,a.g.set(sr(a,h),v(d)),a.h+=d.length)}n.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],h=Array.from(this.g.keys());for(let m=0;m<h.length;m++){var d=h[m];const b=as(d);d=ih(this,d);for(let S=0;S<d.length;S++){let O=b;d[S]!==""&&(O+="="+as(d[S])),a.push(O)}}return this.i=a.join("&")};function ah(a){const h=new fs;return h.i=a.i,a.g&&(h.g=new Map(a.g),h.h=a.h),h}function sr(a,h){return h=String(h),a.j&&(h=h.toLowerCase()),h}function Iy(a,h){h&&!a.j&&(wn(a),a.i=null,a.g.forEach(function(d,m){const b=m.toLowerCase();m!=b&&(rh(this,m),oh(this,b,d))},a)),a.j=h}function Ty(a,h){const d=new os;if(o.Image){const m=new Image;m.onload=f(qt,d,"TestLoadImage: loaded",!0,h,m),m.onerror=f(qt,d,"TestLoadImage: error",!1,h,m),m.onabort=f(qt,d,"TestLoadImage: abort",!1,h,m),m.ontimeout=f(qt,d,"TestLoadImage: timeout",!1,h,m),o.setTimeout(function(){m.ontimeout&&m.ontimeout()},1e4),m.src=a}else h(!1)}function Ey(a,h){const d=new os,m=new AbortController,b=setTimeout(()=>{m.abort(),qt(d,"TestPingServer: timeout",!1,h)},1e4);fetch(a,{signal:m.signal}).then(S=>{clearTimeout(b),S.ok?qt(d,"TestPingServer: ok",!0,h):qt(d,"TestPingServer: server error",!1,h)}).catch(()=>{clearTimeout(b),qt(d,"TestPingServer: error",!1,h)})}function qt(a,h,d,m,b){try{b&&(b.onload=null,b.onerror=null,b.onabort=null,b.ontimeout=null),m(d)}catch{}}function wy(){this.g=new sy}function qa(a){this.i=a.Sb||null,this.h=a.ab||!1}p(qa,Ll),qa.prototype.g=function(){return new Li(this.i,this.h)};function Li(a,h){Ce.call(this),this.H=a,this.o=h,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}p(Li,Ce),n=Li.prototype,n.open=function(a,h){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=a,this.D=h,this.readyState=1,ms(this)},n.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const h={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};a&&(h.body=a),(this.H||o).fetch(new Request(this.D,h)).then(this.Pa.bind(this),this.ga.bind(this))},n.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,ps(this)),this.readyState=0},n.Pa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,ms(this)),this.g&&(this.readyState=3,ms(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof o.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;ch(this)}else a.text().then(this.Oa.bind(this),this.ga.bind(this))};function ch(a){a.j.read().then(a.Ma.bind(a)).catch(a.ga.bind(a))}n.Ma=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var h=a.value?a.value:new Uint8Array(0);(h=this.B.decode(h,{stream:!a.done}))&&(this.response=this.responseText+=h)}a.done?ps(this):ms(this),this.readyState==3&&ch(this)}},n.Oa=function(a){this.g&&(this.response=this.responseText=a,ps(this))},n.Na=function(a){this.g&&(this.response=a,ps(this))},n.ga=function(){this.g&&ps(this)};function ps(a){a.readyState=4,a.l=null,a.j=null,a.B=null,ms(a)}n.setRequestHeader=function(a,h){this.A.append(a,h)},n.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},n.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],h=this.h.entries();for(var d=h.next();!d.done;)d=d.value,a.push(d[0]+": "+d[1]),d=h.next();return a.join(`\r
`)};function ms(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(Li.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function uh(a){let h="";return ki(a,function(d,m){h+=m,h+=":",h+=d,h+=`\r
`}),h}function $a(a,h,d){e:{for(m in d){var m=!1;break e}m=!0}m||(d=uh(d),typeof a=="string"?d!=null&&as(d):oe(a,h,d))}function pe(a){Ce.call(this),this.headers=new Map,this.L=a||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}p(pe,Ce);var vy=/^https?$/i,Ay=["POST","PUT"];n=pe.prototype,n.Fa=function(a){this.H=a},n.ea=function(a,h,d,m){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);h=h?h.toUpperCase():"GET",this.D=a,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():zl.g(),this.g.onreadystatechange=g(l(this.Ca,this));try{this.B=!0,this.g.open(h,String(a),!0),this.B=!1}catch(S){lh(this,S);return}if(a=d||"",d=new Map(this.headers),m)if(Object.getPrototypeOf(m)===Object.prototype)for(var b in m)d.set(b,m[b]);else if(typeof m.keys=="function"&&typeof m.get=="function")for(const S of m.keys())d.set(S,m.get(S));else throw Error("Unknown input type for opt_headers: "+String(m));m=Array.from(d.keys()).find(S=>S.toLowerCase()=="content-type"),b=o.FormData&&a instanceof o.FormData,!(Array.prototype.indexOf.call(Ay,h,void 0)>=0)||m||b||d.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[S,O]of d)this.g.setRequestHeader(S,O);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(a),this.v=!1}catch(S){lh(this,S)}};function lh(a,h){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=h,a.o=5,hh(a),Fi(a)}function hh(a){a.A||(a.A=!0,Oe(a,"complete"),Oe(a,"error"))}n.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=a||7,Oe(this,"complete"),Oe(this,"abort"),Fi(this))},n.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Fi(this,!0)),pe.Z.N.call(this)},n.Ca=function(){this.u||(this.B||this.v||this.j?dh(this):this.Xa())},n.Xa=function(){dh(this)};function dh(a){if(a.h&&typeof i<"u"){if(a.v&&$t(a)==4)setTimeout(a.Ca.bind(a),0);else if(Oe(a,"readystatechange"),$t(a)==4){a.h=!1;try{const S=a.ca();e:switch(S){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var h=!0;break e;default:h=!1}var d;if(!(d=h)){var m;if(m=S===0){let O=String(a.D).match(th)[1]||null;!O&&o.self&&o.self.location&&(O=o.self.location.protocol.slice(0,-1)),m=!vy.test(O?O.toLowerCase():"")}d=m}if(d)Oe(a,"complete"),Oe(a,"success");else{a.o=6;try{var b=$t(a)>2?a.g.statusText:""}catch{b=""}a.l=b+" ["+a.ca()+"]",hh(a)}}finally{Fi(a)}}}}function Fi(a,h){if(a.g){a.m&&(clearTimeout(a.m),a.m=null);const d=a.g;a.g=null,h||Oe(a,"ready");try{d.onreadystatechange=null}catch{}}}n.isActive=function(){return!!this.g};function $t(a){return a.g?a.g.readyState:0}n.ca=function(){try{return $t(this)>2?this.g.status:-1}catch{return-1}},n.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},n.La=function(a){if(this.g){var h=this.g.responseText;return a&&h.indexOf(a)==0&&(h=h.substring(a.length)),ry(h)}};function fh(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.F){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function by(a){const h={};a=(a.g&&$t(a)>=2&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let m=0;m<a.length;m++){if(y(a[m]))continue;var d=uy(a[m]);const b=d[0];if(d=d[1],typeof d!="string")continue;d=d.trim();const S=h[b]||[];h[b]=S,S.push(d)}Y_(h,function(m){return m.join(", ")})}n.ya=function(){return this.o},n.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function gs(a,h,d){return d&&d.internalChannelParams&&d.internalChannelParams[a]||h}function ph(a){this.za=0,this.i=[],this.j=new os,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=gs("failFast",!1,a),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=gs("baseRetryDelayMs",5e3,a),this.Za=gs("retryDelaySeedMs",1e4,a),this.Ta=gs("forwardChannelMaxRetries",2,a),this.va=gs("forwardChannelRequestTimeoutMs",2e4,a),this.ma=a&&a.xmlHttpFactory||void 0,this.Ua=a&&a.Rb||void 0,this.Aa=a&&a.useFetchStreams||!1,this.O=void 0,this.L=a&&a.supportsCrossDomainXhr||!1,this.M="",this.h=new Jl(a&&a.concurrentRequestLimit),this.Ba=new wy,this.S=a&&a.fastHandshake||!1,this.R=a&&a.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=a&&a.Pb||!1,a&&a.ua&&this.j.ua(),a&&a.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&a&&a.detectBufferingProxy||!1,this.ia=void 0,a&&a.longPollingTimeout&&a.longPollingTimeout>0&&(this.ia=a.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}n=ph.prototype,n.ka=8,n.I=1,n.connect=function(a,h,d,m){xe(0),this.W=a,this.H=h||{},d&&m!==void 0&&(this.H.OSID=d,this.H.OAID=m),this.F=this.X,this.J=vh(this,null,this.W),Bi(this)};function ja(a){if(mh(a),a.I==3){var h=a.V++,d=ot(a.J);if(oe(d,"SID",a.M),oe(d,"RID",h),oe(d,"TYPE","terminate"),_s(a,d),h=new Ut(a,a.j,h),h.M=2,h.A=Mi(ot(d)),d=!1,o.navigator&&o.navigator.sendBeacon)try{d=o.navigator.sendBeacon(h.A.toString(),"")}catch{}!d&&o.Image&&(new Image().src=h.A,d=!0),d||(h.g=Ah(h.j,null),h.g.ea(h.A)),h.F=Date.now(),xi(h)}wh(a)}function Ui(a){a.g&&(Ka(a),a.g.cancel(),a.g=null)}function mh(a){Ui(a),a.v&&(o.clearTimeout(a.v),a.v=null),qi(a),a.h.cancel(),a.m&&(typeof a.m=="number"&&o.clearTimeout(a.m),a.m=null)}function Bi(a){if(!Yl(a.h)&&!a.m){a.m=!0;var h=a.Ea;G||_(),Q||(G(),Q=!0),T.add(h,a),a.D=0}}function Ry(a,h){return Xl(a.h)>=a.h.j-(a.m?1:0)?!1:a.m?(a.i=h.G.concat(a.i),!0):a.I==1||a.I==2||a.D>=(a.Sa?0:a.Ta)?!1:(a.m=is(l(a.Ea,a,h),Eh(a,a.D)),a.D++,!0)}n.Ea=function(a){if(this.m)if(this.m=null,this.I==1){if(!a){this.V=Math.floor(Math.random()*1e5),a=this.V++;const b=new Ut(this,this.j,a);let S=this.o;if(this.U&&(S?(S=Sl(S),Cl(S,this.U)):S=this.U),this.u!==null||this.R||(b.J=S,S=null),this.S)e:{for(var h=0,d=0;d<this.i.length;d++){t:{var m=this.i[d];if("__data__"in m.map&&(m=m.map.__data__,typeof m=="string")){m=m.length;break t}m=void 0}if(m===void 0)break;if(h+=m,h>4096){h=d;break e}if(h===4096||d===this.i.length-1){h=d+1;break e}}h=1e3}else h=1e3;h=_h(this,b,h),d=ot(this.J),oe(d,"RID",a),oe(d,"CVER",22),this.G&&oe(d,"X-HTTP-Session-Id",this.G),_s(this,d),S&&(this.R?h="headers="+as(uh(S))+"&"+h:this.u&&$a(d,this.u,S)),Ua(this.h,b),this.Ra&&oe(d,"TYPE","init"),this.S?(oe(d,"$req",h),oe(d,"SID","null"),b.U=!0,xa(b,d,null)):xa(b,d,h),this.I=2}}else this.I==3&&(a?gh(this,a):this.i.length==0||Yl(this.h)||gh(this))};function gh(a,h){var d;h?d=h.l:d=a.V++;const m=ot(a.J);oe(m,"SID",a.M),oe(m,"RID",d),oe(m,"AID",a.K),_s(a,m),a.u&&a.o&&$a(m,a.u,a.o),d=new Ut(a,a.j,d,a.D+1),a.u===null&&(d.J=a.o),h&&(a.i=h.G.concat(a.i)),h=_h(a,d,1e3),d.H=Math.round(a.va*.5)+Math.round(a.va*.5*Math.random()),Ua(a.h,d),xa(d,m,h)}function _s(a,h){a.H&&ki(a.H,function(d,m){oe(h,m,d)}),a.l&&ki({},function(d,m){oe(h,m,d)})}function _h(a,h,d){d=Math.min(a.i.length,d);const m=a.l?l(a.l.Ka,a.l,a):null;e:{var b=a.i;let H=-1;for(;;){const Ie=["count="+d];H==-1?d>0?(H=b[0].g,Ie.push("ofs="+H)):H=0:Ie.push("ofs="+H);let se=!0;for(let we=0;we<d;we++){var S=b[we].g;const at=b[we].map;if(S-=H,S<0)H=Math.max(0,b[we].g-100),se=!1;else try{S="req"+S+"_"||"";try{var O=at instanceof Map?at:Object.entries(at);for(const[An,jt]of O){let zt=jt;c(jt)&&(zt=ka(jt)),Ie.push(S+An+"="+encodeURIComponent(zt))}}catch(An){throw Ie.push(S+"type="+encodeURIComponent("_badmap")),An}}catch{m&&m(at)}}if(se){O=Ie.join("&");break e}}O=void 0}return a=a.i.splice(0,d),h.G=a,O}function yh(a){if(!a.g&&!a.v){a.Y=1;var h=a.Da;G||_(),Q||(G(),Q=!0),T.add(h,a),a.A=0}}function za(a){return a.g||a.v||a.A>=3?!1:(a.Y++,a.v=is(l(a.Da,a),Eh(a,a.A)),a.A++,!0)}n.Da=function(){if(this.v=null,Ih(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var a=4*this.T;this.j.info("BP detection timer enabled: "+a),this.B=is(l(this.Wa,this),a)}},n.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,xe(10),Ui(this),Ih(this))};function Ka(a){a.B!=null&&(o.clearTimeout(a.B),a.B=null)}function Ih(a){a.g=new Ut(a,a.j,"rpc",a.Y),a.u===null&&(a.g.J=a.o),a.g.P=0;var h=ot(a.na);oe(h,"RID","rpc"),oe(h,"SID",a.M),oe(h,"AID",a.K),oe(h,"CI",a.F?"0":"1"),!a.F&&a.ia&&oe(h,"TO",a.ia),oe(h,"TYPE","xmlhttp"),_s(a,h),a.u&&a.o&&$a(h,a.u,a.o),a.O&&(a.g.H=a.O);var d=a.g;a=a.ba,d.M=1,d.A=Mi(ot(h)),d.u=null,d.R=!0,Hl(d,a)}n.Va=function(){this.C!=null&&(this.C=null,Ui(this),za(this),xe(19))};function qi(a){a.C!=null&&(o.clearTimeout(a.C),a.C=null)}function Th(a,h){var d=null;if(a.g==h){qi(a),Ka(a),a.g=null;var m=2}else if(Fa(a.h,h))d=h.G,Zl(a.h,h),m=1;else return;if(a.I!=0){if(h.o)if(m==1){d=h.u?h.u.length:0,h=Date.now()-h.F;var b=a.D;m=Ni(),Oe(m,new $l(m,d)),Bi(a)}else yh(a);else if(b=h.m,b==3||b==0&&h.X>0||!(m==1&&Ry(a,h)||m==2&&za(a)))switch(d&&d.length>0&&(h=a.h,h.i=h.i.concat(d)),b){case 1:vn(a,5);break;case 4:vn(a,10);break;case 3:vn(a,6);break;default:vn(a,2)}}}function Eh(a,h){let d=a.Qa+Math.floor(Math.random()*a.Za);return a.isActive()||(d*=2),d*h}function vn(a,h){if(a.j.info("Error code "+h),h==2){var d=l(a.bb,a),m=a.Ua;const b=!m;m=new Bt(m||"//www.google.com/images/cleardot.gif"),o.location&&o.location.protocol=="http"||us(m,"https"),Mi(m),b?Ty(m.toString(),d):Ey(m.toString(),d)}else xe(2);a.I=0,a.l&&a.l.pa(h),wh(a),mh(a)}n.bb=function(a){a?(this.j.info("Successfully pinged google.com"),xe(2)):(this.j.info("Failed to ping google.com"),xe(1))};function wh(a){if(a.I=0,a.ja=[],a.l){const h=eh(a.h);(h.length!=0||a.i.length!=0)&&(C(a.ja,h),C(a.ja,a.i),a.h.i.length=0,v(a.i),a.i.length=0),a.l.oa()}}function vh(a,h,d){var m=d instanceof Bt?ot(d):new Bt(d);if(m.g!="")h&&(m.g=h+"."+m.g),ls(m,m.u);else{var b=o.location;m=b.protocol,h=h?h+"."+b.hostname:b.hostname,b=+b.port;const S=new Bt(null);m&&us(S,m),h&&(S.g=h),b&&ls(S,b),d&&(S.h=d),m=S}return d=a.G,h=a.wa,d&&h&&oe(m,d,h),oe(m,"VER",a.ka),_s(a,m),m}function Ah(a,h,d){if(h&&!a.L)throw Error("Can't create secondary domain capable XhrIo object.");return h=a.Aa&&!a.ma?new pe(new qa({ab:d})):new pe(a.ma),h.Fa(a.L),h}n.isActive=function(){return!!this.l&&this.l.isActive(this)};function bh(){}n=bh.prototype,n.ra=function(){},n.qa=function(){},n.pa=function(){},n.oa=function(){},n.isActive=function(){return!0},n.Ka=function(){};function $i(){}$i.prototype.g=function(a,h){return new ze(a,h)};function ze(a,h){Ce.call(this),this.g=new ph(h),this.l=a,this.h=h&&h.messageUrlParams||null,a=h&&h.messageHeaders||null,h&&h.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=h&&h.initMessageHeaders||null,h&&h.messageContentType&&(a?a["X-WebChannel-Content-Type"]=h.messageContentType:a={"X-WebChannel-Content-Type":h.messageContentType}),h&&h.sa&&(a?a["X-WebChannel-Client-Profile"]=h.sa:a={"X-WebChannel-Client-Profile":h.sa}),this.g.U=a,(a=h&&h.Qb)&&!y(a)&&(this.g.u=a),this.A=h&&h.supportsCrossDomainXhr||!1,this.v=h&&h.sendRawJson||!1,(h=h&&h.httpSessionIdParam)&&!y(h)&&(this.g.G=h,a=this.h,a!==null&&h in a&&(a=this.h,h in a&&delete a[h])),this.j=new ir(this)}p(ze,Ce),ze.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},ze.prototype.close=function(){ja(this.g)},ze.prototype.o=function(a){var h=this.g;if(typeof a=="string"){var d={};d.__data__=a,a=d}else this.v&&(d={},d.__data__=ka(a),a=d);h.i.push(new dy(h.Ya++,a)),h.I==3&&Bi(h)},ze.prototype.N=function(){this.g.l=null,delete this.j,ja(this.g),delete this.g,ze.Z.N.call(this)};function Rh(a){Da.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var h=a.__sm__;if(h){e:{for(const d in h){a=d;break e}a=void 0}(this.i=a)&&(a=this.i,h=h!==null&&a in h?h[a]:void 0),this.data=h}else this.data=a}p(Rh,Da);function Sh(){Va.call(this),this.status=1}p(Sh,Va);function ir(a){this.g=a}p(ir,bh),ir.prototype.ra=function(){Oe(this.g,"a")},ir.prototype.qa=function(a){Oe(this.g,new Rh(a))},ir.prototype.pa=function(a){Oe(this.g,new Sh)},ir.prototype.oa=function(){Oe(this.g,"b")},$i.prototype.createWebChannel=$i.prototype.g,ze.prototype.send=ze.prototype.o,ze.prototype.open=ze.prototype.m,ze.prototype.close=ze.prototype.close,Bp=function(){return new $i},Up=function(){return Ni()},Fp=Tn,wc={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},Oi.NO_ERROR=0,Oi.TIMEOUT=8,Oi.HTTP_ERROR=6,so=Oi,jl.COMPLETE="complete",Lp=jl,Fl.EventType=rs,rs.OPEN="a",rs.CLOSE="b",rs.ERROR="c",rs.MESSAGE="d",Ce.prototype.listen=Ce.prototype.J,Ss=Fl,pe.prototype.listenOnce=pe.prototype.K,pe.prototype.getLastError=pe.prototype.Ha,pe.prototype.getLastErrorCode=pe.prototype.ya,pe.prototype.getStatus=pe.prototype.ca,pe.prototype.getResponseJson=pe.prototype.La,pe.prototype.getResponseText=pe.prototype.la,pe.prototype.send=pe.prototype.ea,pe.prototype.setWithCredentials=pe.prototype.Fa,Mp=pe}).apply(typeof Ki<"u"?Ki:typeof self<"u"?self:typeof window<"u"?window:{});/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ae{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}Ae.UNAUTHENTICATED=new Ae(null),Ae.GOOGLE_CREDENTIALS=new Ae("google-credentials-uid"),Ae.FIRST_PARTY=new Ae("first-party-uid"),Ae.MOCK_USER=new Ae("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let zr="12.13.0";function iw(n){zr=n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qn=new eu("@firebase/firestore");function fr(){return qn.logLevel}function D(n,...e){if(qn.logLevel<=J.DEBUG){const t=e.map(uu);qn.debug(`Firestore (${zr}): ${n}`,...t)}}function me(n,...e){if(qn.logLevel<=J.ERROR){const t=e.map(uu);qn.error(`Firestore (${zr}): ${n}`,...t)}}function $n(n,...e){if(qn.logLevel<=J.WARN){const t=e.map(uu);qn.warn(`Firestore (${zr}): ${n}`,...t)}}function uu(n){if(typeof n=="string")return n;try{return function(t){return JSON.stringify(t)}(n)}catch{return n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function M(n,e,t){let r="Unexpected state";typeof e=="string"?r=e:t=e,qp(n,r,t)}function qp(n,e,t){let r=`FIRESTORE (${zr}) INTERNAL ASSERTION FAILED: ${e} (ID: ${n.toString(16)})`;if(t!==void 0)try{r+=" CONTEXT: "+JSON.stringify(t)}catch{r+=" CONTEXT: "+t}throw me(r),new Error(r)}function F(n,e,t,r){let s="Unexpected state";typeof t=="string"?s=t:r=t,n||qp(e,s,r)}function L(n,e){return n}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const P={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class N extends tt{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xe{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $p{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class ow{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(Ae.UNAUTHENTICATED))}shutdown(){}}class aw{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable(()=>t(this.token.user))}shutdown(){this.changeListener=null}}class cw{constructor(e){this.t=e,this.currentUser=Ae.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){F(this.o===void 0,42304);let r=this.i;const s=u=>this.i!==r?(r=this.i,t(u)):Promise.resolve();let i=new Xe;this.o=()=>{this.i++,this.currentUser=this.u(),i.resolve(),i=new Xe,e.enqueueRetryable(()=>s(this.currentUser))};const o=()=>{const u=i;e.enqueueRetryable(async()=>{await u.promise,await s(this.currentUser)})},c=u=>{D("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=u,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(u=>c(u)),setTimeout(()=>{if(!this.auth){const u=this.t.getImmediate({optional:!0});u?c(u):(D("FirebaseAuthCredentialsProvider","Auth not yet detected"),i.resolve(),i=new Xe)}},0),o()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(r=>this.i!==e?(D("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(F(typeof r.accessToken=="string",31837,{l:r}),new $p(r.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return F(e===null||typeof e=="string",2055,{h:e}),new Ae(e)}}class uw{constructor(e,t,r){this.P=e,this.T=t,this.I=r,this.type="FirstParty",this.user=Ae.FIRST_PARTY,this.R=new Map}A(){return this.I?this.I():null}get headers(){this.R.set("X-Goog-AuthUser",this.P);const e=this.A();return e&&this.R.set("Authorization",e),this.T&&this.R.set("X-Goog-Iam-Authorization-Token",this.T),this.R}}class lw{constructor(e,t,r){this.P=e,this.T=t,this.I=r}getToken(){return Promise.resolve(new uw(this.P,this.T,this.I))}start(e,t){e.enqueueRetryable(()=>t(Ae.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class td{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class hw{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,Be(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,t){F(this.o===void 0,3512);const r=i=>{i.error!=null&&D("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${i.error.message}`);const o=i.token!==this.m;return this.m=i.token,D("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?t(i.token):Promise.resolve()};this.o=i=>{e.enqueueRetryable(()=>r(i))};const s=i=>{D("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=i,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit(i=>s(i)),setTimeout(()=>{if(!this.appCheck){const i=this.V.getImmediate({optional:!0});i?s(i):D("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.p)return Promise.resolve(new td(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(t=>t?(F(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new td(t.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dw(n){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(n);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let r=0;r<n;r++)t[r]=Math.floor(256*Math.random());return t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lu{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let r="";for(;r.length<20;){const s=dw(40);for(let i=0;i<s.length;++i)r.length<20&&s[i]<t&&(r+=e.charAt(s[i]%62))}return r}}function z(n,e){return n<e?-1:n>e?1:0}function vc(n,e){const t=Math.min(n.length,e.length);for(let r=0;r<t;r++){const s=n.charAt(r),i=e.charAt(r);if(s!==i)return Xa(s)===Xa(i)?z(s,i):Xa(s)?1:-1}return z(n.length,e.length)}const fw=55296,pw=57343;function Xa(n){const e=n.charCodeAt(0);return e>=fw&&e<=pw}function Ar(n,e,t){return n.length===e.length&&n.every((r,s)=>t(r,e[s]))}function jp(n){return n+"\0"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nd="__name__";class ct{constructor(e,t,r){t===void 0?t=0:t>e.length&&M(637,{offset:t,range:e.length}),r===void 0?r=e.length-t:r>e.length-t&&M(1746,{length:r,range:e.length-t}),this.segments=e,this.offset=t,this.len=r}get length(){return this.len}isEqual(e){return ct.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof ct?e.forEach(r=>{t.push(r)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,r=this.limit();t<r;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const r=Math.min(e.length,t.length);for(let s=0;s<r;s++){const i=ct.compareSegments(e.get(s),t.get(s));if(i!==0)return i}return z(e.length,t.length)}static compareSegments(e,t){const r=ct.isNumericId(e),s=ct.isNumericId(t);return r&&!s?-1:!r&&s?1:r&&s?ct.extractNumericId(e).compare(ct.extractNumericId(t)):vc(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return on.fromString(e.substring(4,e.length-2))}}class ee extends ct{construct(e,t,r){return new ee(e,t,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const r of e){if(r.indexOf("//")>=0)throw new N(P.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);t.push(...r.split("/").filter(s=>s.length>0))}return new ee(t)}static emptyPath(){return new ee([])}}const mw=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class he extends ct{construct(e,t,r){return new he(e,t,r)}static isValidIdentifier(e){return mw.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),he.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===nd}static keyField(){return new he([nd])}static fromServerFormat(e){const t=[];let r="",s=0;const i=()=>{if(r.length===0)throw new N(P.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(r),r=""};let o=!1;for(;s<e.length;){const c=e[s];if(c==="\\"){if(s+1===e.length)throw new N(P.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const u=e[s+1];if(u!=="\\"&&u!=="."&&u!=="`")throw new N(P.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=u,s+=2}else c==="`"?(o=!o,s++):c!=="."||o?(r+=c,s++):(i(),s++)}if(i(),o)throw new N(P.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new he(t)}static emptyPath(){return new he([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class x{constructor(e){this.path=e}static fromPath(e){return new x(ee.fromString(e))}static fromName(e){return new x(ee.fromString(e).popFirst(5))}static empty(){return new x(ee.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&ee.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return ee.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new x(new ee(e.slice()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zp(n,e,t){if(!t)throw new N(P.INVALID_ARGUMENT,`Function ${n}() cannot be called with an empty ${e}.`)}function gw(n,e,t,r){if(e===!0&&r===!0)throw new N(P.INVALID_ARGUMENT,`${n} and ${t} cannot be used together.`)}function rd(n){if(!x.isDocumentKey(n))throw new N(P.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${n} has ${n.length}.`)}function sd(n){if(x.isDocumentKey(n))throw new N(P.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${n} has ${n.length}.`)}function Kp(n){return typeof n=="object"&&n!==null&&(Object.getPrototypeOf(n)===Object.prototype||Object.getPrototypeOf(n)===null)}function Yo(n){if(n===void 0)return"undefined";if(n===null)return"null";if(typeof n=="string")return n.length>20&&(n=`${n.substring(0,20)}...`),JSON.stringify(n);if(typeof n=="number"||typeof n=="boolean")return""+n;if(typeof n=="object"){if(n instanceof Array)return"an array";{const e=function(r){return r.constructor?r.constructor.name:null}(n);return e?`a custom ${e} object`:"an object"}}return typeof n=="function"?"a function":M(12329,{type:typeof n})}function Pe(n,e){if("_delegate"in n&&(n=n._delegate),!(n instanceof e)){if(e.name===n.constructor.name)throw new N(P.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=Yo(n);throw new N(P.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return n}function _w(n,e){if(e<=0)throw new N(P.INVALID_ARGUMENT,`Function ${n}() requires a positive number, but it was: ${e}.`)}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ye(n,e){const t={typeString:n};return e&&(t.value=e),t}function gi(n,e){if(!Kp(n))throw new N(P.INVALID_ARGUMENT,"JSON must be an object");let t;for(const r in e)if(e[r]){const s=e[r].typeString,i="value"in e[r]?{value:e[r].value}:void 0;if(!(r in n)){t=`JSON missing required field: '${r}'`;break}const o=n[r];if(s&&typeof o!==s){t=`JSON field '${r}' must be a ${s}.`;break}if(i!==void 0&&o!==i.value){t=`Expected '${r}' field to equal '${i.value}'`;break}}if(t)throw new N(P.INVALID_ARGUMENT,t);return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const id=-62135596800,od=1e6;class te{static now(){return te.fromMillis(Date.now())}static fromDate(e){return te.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),r=Math.floor((e-1e3*t)*od);return new te(t,r)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new N(P.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new N(P.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<id)throw new N(P.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new N(P.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/od}_compareTo(e){return this.seconds===e.seconds?z(this.nanoseconds,e.nanoseconds):z(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:te._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(gi(e,te._jsonSchema))return new te(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-id;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}te._jsonSchemaVersion="firestore/timestamp/1.0",te._jsonSchema={type:ye("string",te._jsonSchemaVersion),seconds:ye("number"),nanoseconds:ye("number")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class B{static fromTimestamp(e){return new B(e)}static min(){return new B(new te(0,0))}static max(){return new B(new te(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const br=-1;class Ao{constructor(e,t,r,s){this.indexId=e,this.collectionGroup=t,this.fields=r,this.indexState=s}}function Ac(n){return n.fields.find(e=>e.kind===2)}function Sn(n){return n.fields.filter(e=>e.kind!==2)}Ao.UNKNOWN_ID=-1;class io{constructor(e,t){this.fieldPath=e,this.kind=t}}class Gs{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new Gs(0,Ye.min())}}function Gp(n,e){const t=n.toTimestamp().seconds,r=n.toTimestamp().nanoseconds+1,s=B.fromTimestamp(r===1e9?new te(t+1,0):new te(t,r));return new Ye(s,x.empty(),e)}function Hp(n){return new Ye(n.readTime,n.key,br)}class Ye{constructor(e,t,r){this.readTime=e,this.documentKey=t,this.largestBatchId=r}static min(){return new Ye(B.min(),x.empty(),br)}static max(){return new Ye(B.max(),x.empty(),br)}}function hu(n,e){let t=n.readTime.compareTo(e.readTime);return t!==0?t:(t=x.comparator(n.documentKey,e.documentKey),t!==0?t:z(n.largestBatchId,e.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Wp="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Qp{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function mn(n){if(n.code!==P.FAILED_PRECONDITION||n.message!==Wp)throw n;D("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class A{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)},t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)})}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&M(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new A((r,s)=>{this.nextCallback=i=>{this.wrapSuccess(e,i).next(r,s)},this.catchCallback=i=>{this.wrapFailure(t,i).next(r,s)}})}toPromise(){return new Promise((e,t)=>{this.next(e,t)})}wrapUserFunction(e){try{const t=e();return t instanceof A?t:A.resolve(t)}catch(t){return A.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction(()=>e(t)):A.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction(()=>e(t)):A.reject(t)}static resolve(e){return new A((t,r)=>{t(e)})}static reject(e){return new A((t,r)=>{r(e)})}static waitFor(e){return new A((t,r)=>{let s=0,i=0,o=!1;e.forEach(c=>{++s,c.next(()=>{++i,o&&i===s&&t()},u=>r(u))}),o=!0,i===s&&t()})}static or(e){let t=A.resolve(!1);for(const r of e)t=t.next(s=>s?A.resolve(s):r());return t}static forEach(e,t){const r=[];return e.forEach((s,i)=>{r.push(t.call(this,s,i))}),this.waitFor(r)}static mapArray(e,t){return new A((r,s)=>{const i=e.length,o=new Array(i);let c=0;for(let u=0;u<i;u++){const l=u;t(e[l]).next(f=>{o[l]=f,++c,c===i&&r(o)},f=>s(f))}})}static doWhile(e,t){return new A((r,s)=>{const i=()=>{e()===!0?t().next(()=>{i()},s):r()};i()})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ke="SimpleDb";class Xo{static open(e,t,r,s){try{return new Xo(t,e.transaction(s,r))}catch(i){throw new Vs(t,i)}}constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.S=new Xe,this.transaction.oncomplete=()=>{this.S.resolve()},this.transaction.onabort=()=>{t.error?this.S.reject(new Vs(e,t.error)):this.S.resolve()},this.transaction.onerror=r=>{const s=du(r.target.error);this.S.reject(new Vs(e,s))}}get D(){return this.S.promise}abort(e){e&&this.S.reject(e),this.aborted||(D(Ke,"Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}C(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new Iw(t)}}class an{static delete(e){return D(Ke,"Removing database:",e),Cn(Kf().indexedDB.deleteDatabase(e)).toPromise()}static v(){if(!Zc())return!1;if(an.F())return!0;const e=Te(),t=an.M(e),r=0<t&&t<10,s=Jp(e),i=0<s&&s<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||r||i)}static F(){var e;return typeof process<"u"&&((e=process.__PRIVATE_env)==null?void 0:e.__PRIVATE_USE_MOCK_PERSISTENCE)==="YES"}static O(e,t){return e.store(t)}static M(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),r=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(r)}constructor(e,t,r){this.name=e,this.version=t,this.N=r,this.B=null,an.M(Te())===12.2&&me("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async L(e){return this.db||(D(Ke,"Opening database:",this.name),this.db=await new Promise((t,r)=>{const s=indexedDB.open(this.name,this.version);s.onsuccess=i=>{const o=i.target.result;t(o)},s.onblocked=()=>{r(new Vs(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},s.onerror=i=>{const o=i.target.error;o.name==="VersionError"?r(new N(P.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?r(new N(P.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):r(new Vs(e,o))},s.onupgradeneeded=i=>{D(Ke,'Database "'+this.name+'" requires upgrade from version:',i.oldVersion);const o=i.target.result;this.N.k(o,s.transaction,i.oldVersion,this.version).next(()=>{D(Ke,"Database upgrade to version "+this.version+" complete")})}})),this.K&&(this.db.onversionchange=t=>this.K(t)),this.db}q(e){this.K=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,r,s){const i=t==="readonly";let o=0;for(;;){++o;try{this.db=await this.L(e);const c=Xo.open(this.db,e,i?"readonly":"readwrite",r),u=s(c).next(l=>(c.C(),l)).catch(l=>(c.abort(l),A.reject(l))).toPromise();return u.catch(()=>{}),await c.D,u}catch(c){const u=c,l=u.name!=="FirebaseError"&&o<3;if(D(Ke,"Transaction failed with error:",u.message,"Retrying:",l),this.close(),!l)return Promise.reject(u)}}}close(){this.db&&this.db.close(),this.db=void 0}}function Jp(n){const e=n.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class yw{constructor(e){this.U=e,this.$=!1,this.W=null}get isDone(){return this.$}get G(){return this.W}set cursor(e){this.U=e}done(){this.$=!0}j(e){this.W=e}delete(){return Cn(this.U.delete())}}class Vs extends N{constructor(e,t){super(P.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function gn(n){return n.name==="IndexedDbTransactionError"}class Iw{constructor(e){this.store=e}put(e,t){let r;return t!==void 0?(D(Ke,"PUT",this.store.name,e,t),r=this.store.put(t,e)):(D(Ke,"PUT",this.store.name,"<auto-key>",e),r=this.store.put(e)),Cn(r)}add(e){return D(Ke,"ADD",this.store.name,e,e),Cn(this.store.add(e))}get(e){return Cn(this.store.get(e)).next(t=>(t===void 0&&(t=null),D(Ke,"GET",this.store.name,e,t),t))}delete(e){return D(Ke,"DELETE",this.store.name,e),Cn(this.store.delete(e))}count(){return D(Ke,"COUNT",this.store.name),Cn(this.store.count())}J(e,t){const r=this.options(e,t),s=r.index?this.store.index(r.index):this.store;if(typeof s.getAll=="function"){const i=s.getAll(r.range);return new A((o,c)=>{i.onerror=u=>{c(u.target.error)},i.onsuccess=u=>{o(u.target.result)}})}{const i=this.cursor(r),o=[];return this.H(i,(c,u)=>{o.push(u)}).next(()=>o)}}Z(e,t){const r=this.store.getAll(e,t===null?void 0:t);return new A((s,i)=>{r.onerror=o=>{i(o.target.error)},r.onsuccess=o=>{s(o.target.result)}})}X(e,t){D(Ke,"DELETE ALL",this.store.name);const r=this.options(e,t);r.Y=!1;const s=this.cursor(r);return this.H(s,(i,o,c)=>c.delete())}ee(e,t){let r;t?r=e:(r={},t=e);const s=this.cursor(r);return this.H(s,t)}te(e){const t=this.cursor({});return new A((r,s)=>{t.onerror=i=>{const o=du(i.target.error);s(o)},t.onsuccess=i=>{const o=i.target.result;o?e(o.primaryKey,o.value).next(c=>{c?o.continue():r()}):r()}})}H(e,t){const r=[];return new A((s,i)=>{e.onerror=o=>{i(o.target.error)},e.onsuccess=o=>{const c=o.target.result;if(!c)return void s();const u=new yw(c),l=t(c.primaryKey,c.value,u);if(l instanceof A){const f=l.catch(p=>(u.done(),A.reject(p)));r.push(f)}u.isDone?s():u.G===null?c.continue():c.continue(u.G)}}).next(()=>A.waitFor(r))}options(e,t){let r;return e!==void 0&&(typeof e=="string"?r=e:t=e),{index:r,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const r=this.store.index(e.index);return e.Y?r.openKeyCursor(e.range,t):r.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function Cn(n){return new A((e,t)=>{n.onsuccess=r=>{const s=r.target.result;e(s)},n.onerror=r=>{const s=du(r.target.error);t(s)}})}let ad=!1;function du(n){const e=an.M(Te());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(n.message.indexOf(t)>=0){const r=new N("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return ad||(ad=!0,setTimeout(()=>{throw r},0)),r}}return n}const Ns="IndexBackfiller";class Tw{constructor(e,t){this.asyncQueue=e,this.ne=t,this.task=null}start(){this.re(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}re(e){D(Ns,`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,async()=>{this.task=null;try{const t=await this.ne.ie();D(Ns,`Documents written: ${t}`)}catch(t){gn(t)?D(Ns,"Ignoring IndexedDB error during index backfill: ",t):await mn(t)}await this.re(6e4)})}}class Ew{constructor(e,t){this.localStore=e,this.persistence=t}async ie(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",t=>this.se(t,e))}se(e,t){const r=new Set;let s=t,i=!0;return A.doWhile(()=>i===!0&&s>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next(o=>{if(o!==null&&!r.has(o))return D(Ns,`Processing collection: ${o}`),this.oe(e,o,s).next(c=>{s-=c,r.add(o)});i=!1})).next(()=>t-s)}oe(e,t,r){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next(s=>this.localStore.localDocuments.getNextDocuments(e,t,s,r).next(i=>{const o=i.changes;return this.localStore.indexManager.updateIndexEntries(e,o).next(()=>this._e(s,i)).next(c=>(D(Ns,`Updating offset: ${c}`),this.localStore.indexManager.updateCollectionGroup(e,t,c))).next(()=>o.size)}))}_e(e,t){let r=e;return t.changes.forEach((s,i)=>{const o=Hp(i);hu(o,r)>0&&(r=o)}),new Ye(r.readTime,r.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qe{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=r=>this.ae(r),this.ue=r=>t.writeSequenceNumber(r))}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ue&&this.ue(e),e}}qe.ce=-1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xn=-1;function _i(n){return n==null}function Hs(n){return n===0&&1/n==-1/0}function Yp(n){return typeof n=="number"&&Number.isInteger(n)&&!Hs(n)&&n<=Number.MAX_SAFE_INTEGER&&n>=Number.MIN_SAFE_INTEGER}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bo="";function Ne(n){let e="";for(let t=0;t<n.length;t++)e.length>0&&(e=cd(e)),e=ww(n.get(t),e);return cd(e)}function ww(n,e){let t=e;const r=n.length;for(let s=0;s<r;s++){const i=n.charAt(s);switch(i){case"\0":t+="";break;case bo:t+="";break;default:t+=i}}return t}function cd(n){return n+bo+""}function lt(n){const e=n.length;if(F(e>=2,64408,{path:n}),e===2)return F(n.charAt(0)===bo&&n.charAt(1)==="",56145,{path:n}),ee.emptyPath();const t=e-2,r=[];let s="";for(let i=0;i<e;){const o=n.indexOf(bo,i);switch((o<0||o>t)&&M(50515,{path:n}),n.charAt(o+1)){case"":const c=n.substring(i,o);let u;s.length===0?u=c:(s+=c,u=s,s=""),r.push(u);break;case"":s+=n.substring(i,o),s+="\0";break;case"":s+=n.substring(i,o+1);break;default:M(61167,{path:n})}i=o+2}return new ee(r)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pn="remoteDocuments",yi="owner",or="owner",Ws="mutationQueues",vw="userId",nt="mutations",ud="batchId",Nn="userMutationsIndex",ld=["userId","batchId"];/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function oo(n,e){return[n,Ne(e)]}function Xp(n,e,t){return[n,Ne(e),t]}const Aw={},Rr="documentMutations",Ro="remoteDocumentsV14",bw=["prefixPath","collectionGroup","readTime","documentId"],ao="documentKeyIndex",Rw=["prefixPath","collectionGroup","documentId"],Zp="collectionGroupIndex",Sw=["collectionGroup","readTime","prefixPath","documentId"],Qs="remoteDocumentGlobal",bc="remoteDocumentGlobalKey",Sr="targets",em="queryTargetsIndex",Pw=["canonicalId","targetId"],Pr="targetDocuments",Cw=["targetId","path"],fu="documentTargetsIndex",kw=["path","targetId"],So="targetGlobalKey",Mn="targetGlobal",Js="collectionParents",Dw=["collectionId","parent"],Cr="clientMetadata",Vw="clientId",Zo="bundles",Nw="bundleId",ea="namedQueries",Ow="name",pu="indexConfiguration",xw="indexId",Rc="collectionGroupIndex",Mw="collectionGroup",Os="indexState",Lw=["indexId","uid"],tm="sequenceNumberIndex",Fw=["uid","sequenceNumber"],xs="indexEntries",Uw=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],nm="documentKeyIndex",Bw=["indexId","uid","orderedDocumentKey"],ta="documentOverlays",qw=["userId","collectionPath","documentId"],Sc="collectionPathOverlayIndex",$w=["userId","collectionPath","largestBatchId"],rm="collectionGroupOverlayIndex",jw=["userId","collectionGroup","largestBatchId"],mu="globals",zw="name",sm=[Ws,nt,Rr,Pn,Sr,yi,Mn,Pr,Cr,Qs,Js,Zo,ea],Kw=[...sm,ta],im=[Ws,nt,Rr,Ro,Sr,yi,Mn,Pr,Cr,Qs,Js,Zo,ea,ta],om=im,gu=[...om,pu,Os,xs],Gw=gu,am=[...gu,mu],Hw=am;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pc extends Qp{constructor(e,t){super(),this.le=e,this.currentSequenceNumber=t}}function Ee(n,e){const t=L(n);return an.O(t.le,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hd(n){let e=0;for(const t in n)Object.prototype.hasOwnProperty.call(n,t)&&e++;return e}function _n(n,e){for(const t in n)Object.prototype.hasOwnProperty.call(n,t)&&e(t,n[t])}function Ww(n,e){const t=[];for(const r in n)Object.prototype.hasOwnProperty.call(n,r)&&t.push(e(n[r],r,n));return t}function cm(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ie{constructor(e,t){this.comparator=e,this.root=t||Se.EMPTY}insert(e,t){return new ie(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,Se.BLACK,null,null))}remove(e){return new ie(this.comparator,this.root.remove(e,this.comparator).copy(null,null,Se.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const r=this.comparator(e,t.key);if(r===0)return t.value;r<0?t=t.left:r>0&&(t=t.right)}return null}indexOf(e){let t=0,r=this.root;for(;!r.isEmpty();){const s=this.comparator(e,r.key);if(s===0)return t+r.left.size;s<0?r=r.left:(t+=r.left.size+1,r=r.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,r)=>(e(t,r),!1))}toString(){const e=[];return this.inorderTraversal((t,r)=>(e.push(`${t}:${r}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new Gi(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new Gi(this.root,e,this.comparator,!1)}getReverseIterator(){return new Gi(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new Gi(this.root,e,this.comparator,!0)}}class Gi{constructor(e,t,r,s){this.isReverse=s,this.nodeStack=[];let i=1;for(;!e.isEmpty();)if(i=t?r(e.key,t):1,t&&s&&(i*=-1),i<0)e=this.isReverse?e.left:e.right;else{if(i===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class Se{constructor(e,t,r,s,i){this.key=e,this.value=t,this.color=r??Se.RED,this.left=s??Se.EMPTY,this.right=i??Se.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,r,s,i){return new Se(e??this.key,t??this.value,r??this.color,s??this.left,i??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,r){let s=this;const i=r(e,s.key);return s=i<0?s.copy(null,null,null,s.left.insert(e,t,r),null):i===0?s.copy(null,t,null,null,null):s.copy(null,null,null,null,s.right.insert(e,t,r)),s.fixUp()}removeMin(){if(this.left.isEmpty())return Se.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let r,s=this;if(t(e,s.key)<0)s.left.isEmpty()||s.left.isRed()||s.left.left.isRed()||(s=s.moveRedLeft()),s=s.copy(null,null,null,s.left.remove(e,t),null);else{if(s.left.isRed()&&(s=s.rotateRight()),s.right.isEmpty()||s.right.isRed()||s.right.left.isRed()||(s=s.moveRedRight()),t(e,s.key)===0){if(s.right.isEmpty())return Se.EMPTY;r=s.right.min(),s=s.copy(r.key,r.value,null,null,s.right.removeMin())}s=s.copy(null,null,null,null,s.right.remove(e,t))}return s.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,Se.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,Se.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw M(43730,{key:this.key,value:this.value});if(this.right.isRed())throw M(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw M(27949);return e+(this.isRed()?0:1)}}Se.EMPTY=null,Se.RED=!0,Se.BLACK=!1;Se.EMPTY=new class{constructor(){this.size=0}get key(){throw M(57766)}get value(){throw M(16141)}get color(){throw M(16727)}get left(){throw M(29726)}get right(){throw M(36894)}copy(e,t,r,s,i){return this}insert(e,t,r){return new Se(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class re{constructor(e){this.comparator=e,this.data=new ie(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,r)=>(e(t),!1))}forEachInRange(e,t){const r=this.data.getIteratorFrom(e[0]);for(;r.hasNext();){const s=r.getNext();if(this.comparator(s.key,e[1])>=0)return;t(s.key)}}forEachWhile(e,t){let r;for(r=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();r.hasNext();)if(!e(r.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new dd(this.data.getIterator())}getIteratorFrom(e){return new dd(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(r=>{t=t.add(r)}),t}isEqual(e){if(!(e instanceof re)||this.size!==e.size)return!1;const t=this.data.getIterator(),r=e.data.getIterator();for(;t.hasNext();){const s=t.getNext().key,i=r.getNext().key;if(this.comparator(s,i)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(t=>{e.push(t)}),e}toString(){const e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){const t=new re(this.comparator);return t.data=e,t}}class dd{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function ar(n){return n.hasNext()?n.getNext():void 0}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $e{constructor(e){this.fields=e,e.sort(he.comparator)}static empty(){return new $e([])}unionWith(e){let t=new re(he.comparator);for(const r of this.fields)t=t.add(r);for(const r of e)t=t.add(r);return new $e(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return Ar(this.fields,e.fields,(t,r)=>t.isEqual(r))}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class um extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ge{constructor(e){this.binaryString=e}static fromBase64String(e){const t=function(s){try{return atob(s)}catch(i){throw typeof DOMException<"u"&&i instanceof DOMException?new um("Invalid base64 string: "+i):i}}(e);return new ge(t)}static fromUint8Array(e){const t=function(s){let i="";for(let o=0;o<s.length;++o)i+=String.fromCharCode(s[o]);return i}(e);return new ge(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(t){return btoa(t)}(this.binaryString)}toUint8Array(){return function(t){const r=new Uint8Array(t.length);for(let s=0;s<t.length;s++)r[s]=t.charCodeAt(s);return r}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return z(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}ge.EMPTY_BYTE_STRING=new ge("");const Qw=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function kt(n){if(F(!!n,39018),typeof n=="string"){let e=0;const t=Qw.exec(n);if(F(!!t,46558,{timestamp:n}),t[1]){let s=t[1];s=(s+"000000000").substr(0,9),e=Number(s)}const r=new Date(n);return{seconds:Math.floor(r.getTime()/1e3),nanos:e}}return{seconds:ce(n.seconds),nanos:ce(n.nanos)}}function ce(n){return typeof n=="number"?n:typeof n=="string"?Number(n):0}function Dt(n){return typeof n=="string"?ge.fromBase64String(n):ge.fromUint8Array(n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lm="server_timestamp",hm="__type__",dm="__previous_value__",fm="__local_write_time__";function _u(n){var t,r;return((r=(((t=n==null?void 0:n.mapValue)==null?void 0:t.fields)||{})[hm])==null?void 0:r.stringValue)===lm}function na(n){const e=n.mapValue.fields[dm];return _u(e)?na(e):e}function Ys(n){const e=kt(n.mapValue.fields[fm].timestampValue);return new te(e.seconds,e.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jw{constructor(e,t,r,s,i,o,c,u,l,f,p){this.databaseId=e,this.appId=t,this.persistenceKey=r,this.host=s,this.ssl=i,this.forceLongPolling=o,this.autoDetectLongPolling=c,this.longPollingOptions=u,this.useFetchStreams=l,this.isUsingEmulator=f,this.apiKey=p}}const Xs="(default)";class jn{constructor(e,t){this.projectId=e,this.database=t||Xs}static empty(){return new jn("","")}get isDefaultDatabase(){return this.database===Xs}isEqual(e){return e instanceof jn&&e.projectId===this.projectId&&e.database===this.database}}function Yw(n,e){if(!Object.prototype.hasOwnProperty.apply(n.options,["projectId"]))throw new N(P.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new jn(n.options.projectId,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yu="__type__",pm="__max__",nn={mapValue:{fields:{__type__:{stringValue:pm}}}},Iu="__vector__",kr="value",co={nullValue:"NULL_VALUE"};function ln(n){return"nullValue"in n?0:"booleanValue"in n?1:"integerValue"in n||"doubleValue"in n?2:"timestampValue"in n?3:"stringValue"in n?5:"bytesValue"in n?6:"referenceValue"in n?7:"geoPointValue"in n?8:"arrayValue"in n?9:"mapValue"in n?_u(n)?4:mm(n)?9007199254740991:ra(n)?10:11:M(28295,{value:n})}function _t(n,e){if(n===e)return!0;const t=ln(n);if(t!==ln(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return n.booleanValue===e.booleanValue;case 4:return Ys(n).isEqual(Ys(e));case 3:return function(s,i){if(typeof s.timestampValue=="string"&&typeof i.timestampValue=="string"&&s.timestampValue.length===i.timestampValue.length)return s.timestampValue===i.timestampValue;const o=kt(s.timestampValue),c=kt(i.timestampValue);return o.seconds===c.seconds&&o.nanos===c.nanos}(n,e);case 5:return n.stringValue===e.stringValue;case 6:return function(s,i){return Dt(s.bytesValue).isEqual(Dt(i.bytesValue))}(n,e);case 7:return n.referenceValue===e.referenceValue;case 8:return function(s,i){return ce(s.geoPointValue.latitude)===ce(i.geoPointValue.latitude)&&ce(s.geoPointValue.longitude)===ce(i.geoPointValue.longitude)}(n,e);case 2:return function(s,i){if("integerValue"in s&&"integerValue"in i)return ce(s.integerValue)===ce(i.integerValue);if("doubleValue"in s&&"doubleValue"in i){const o=ce(s.doubleValue),c=ce(i.doubleValue);return o===c?Hs(o)===Hs(c):isNaN(o)&&isNaN(c)}return!1}(n,e);case 9:return Ar(n.arrayValue.values||[],e.arrayValue.values||[],_t);case 10:case 11:return function(s,i){const o=s.mapValue.fields||{},c=i.mapValue.fields||{};if(hd(o)!==hd(c))return!1;for(const u in o)if(o.hasOwnProperty(u)&&(c[u]===void 0||!_t(o[u],c[u])))return!1;return!0}(n,e);default:return M(52216,{left:n})}}function Zs(n,e){return(n.values||[]).find(t=>_t(t,e))!==void 0}function hn(n,e){if(n===e)return 0;const t=ln(n),r=ln(e);if(t!==r)return z(t,r);switch(t){case 0:case 9007199254740991:return 0;case 1:return z(n.booleanValue,e.booleanValue);case 2:return function(i,o){const c=ce(i.integerValue||i.doubleValue),u=ce(o.integerValue||o.doubleValue);return c<u?-1:c>u?1:c===u?0:isNaN(c)?isNaN(u)?0:-1:1}(n,e);case 3:return fd(n.timestampValue,e.timestampValue);case 4:return fd(Ys(n),Ys(e));case 5:return vc(n.stringValue,e.stringValue);case 6:return function(i,o){const c=Dt(i),u=Dt(o);return c.compareTo(u)}(n.bytesValue,e.bytesValue);case 7:return function(i,o){const c=i.split("/"),u=o.split("/");for(let l=0;l<c.length&&l<u.length;l++){const f=z(c[l],u[l]);if(f!==0)return f}return z(c.length,u.length)}(n.referenceValue,e.referenceValue);case 8:return function(i,o){const c=z(ce(i.latitude),ce(o.latitude));return c!==0?c:z(ce(i.longitude),ce(o.longitude))}(n.geoPointValue,e.geoPointValue);case 9:return pd(n.arrayValue,e.arrayValue);case 10:return function(i,o){var g,v,C,V;const c=i.fields||{},u=o.fields||{},l=(g=c[kr])==null?void 0:g.arrayValue,f=(v=u[kr])==null?void 0:v.arrayValue,p=z(((C=l==null?void 0:l.values)==null?void 0:C.length)||0,((V=f==null?void 0:f.values)==null?void 0:V.length)||0);return p!==0?p:pd(l,f)}(n.mapValue,e.mapValue);case 11:return function(i,o){if(i===nn.mapValue&&o===nn.mapValue)return 0;if(i===nn.mapValue)return 1;if(o===nn.mapValue)return-1;const c=i.fields||{},u=Object.keys(c),l=o.fields||{},f=Object.keys(l);u.sort(),f.sort();for(let p=0;p<u.length&&p<f.length;++p){const g=vc(u[p],f[p]);if(g!==0)return g;const v=hn(c[u[p]],l[f[p]]);if(v!==0)return v}return z(u.length,f.length)}(n.mapValue,e.mapValue);default:throw M(23264,{he:t})}}function fd(n,e){if(typeof n=="string"&&typeof e=="string"&&n.length===e.length)return z(n,e);const t=kt(n),r=kt(e),s=z(t.seconds,r.seconds);return s!==0?s:z(t.nanos,r.nanos)}function pd(n,e){const t=n.values||[],r=e.values||[];for(let s=0;s<t.length&&s<r.length;++s){const i=hn(t[s],r[s]);if(i)return i}return z(t.length,r.length)}function Dr(n){return Cc(n)}function Cc(n){return"nullValue"in n?"null":"booleanValue"in n?""+n.booleanValue:"integerValue"in n?""+n.integerValue:"doubleValue"in n?""+n.doubleValue:"timestampValue"in n?function(t){const r=kt(t);return`time(${r.seconds},${r.nanos})`}(n.timestampValue):"stringValue"in n?n.stringValue:"bytesValue"in n?function(t){return Dt(t).toBase64()}(n.bytesValue):"referenceValue"in n?function(t){return x.fromName(t).toString()}(n.referenceValue):"geoPointValue"in n?function(t){return`geo(${t.latitude},${t.longitude})`}(n.geoPointValue):"arrayValue"in n?function(t){let r="[",s=!0;for(const i of t.values||[])s?s=!1:r+=",",r+=Cc(i);return r+"]"}(n.arrayValue):"mapValue"in n?function(t){const r=Object.keys(t.fields||{}).sort();let s="{",i=!0;for(const o of r)i?i=!1:s+=",",s+=`${o}:${Cc(t.fields[o])}`;return s+"}"}(n.mapValue):M(61005,{value:n})}function uo(n){switch(ln(n)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=na(n);return e?16+uo(e):16;case 5:return 2*n.stringValue.length;case 6:return Dt(n.bytesValue).approximateByteSize();case 7:return n.referenceValue.length;case 9:return function(r){return(r.values||[]).reduce((s,i)=>s+uo(i),0)}(n.arrayValue);case 10:case 11:return function(r){let s=0;return _n(r.fields,(i,o)=>{s+=i.length+uo(o)}),s}(n.mapValue);default:throw M(13486,{value:n})}}function ei(n,e){return{referenceValue:`projects/${n.projectId}/databases/${n.database}/documents/${e.path.canonicalString()}`}}function kc(n){return!!n&&"integerValue"in n}function ti(n){return!!n&&"arrayValue"in n}function md(n){return!!n&&"nullValue"in n}function gd(n){return!!n&&"doubleValue"in n&&isNaN(Number(n.doubleValue))}function lo(n){return!!n&&"mapValue"in n}function ra(n){var t,r;return((r=(((t=n==null?void 0:n.mapValue)==null?void 0:t.fields)||{})[yu])==null?void 0:r.stringValue)===Iu}function Ms(n){if(n.geoPointValue)return{geoPointValue:{...n.geoPointValue}};if(n.timestampValue&&typeof n.timestampValue=="object")return{timestampValue:{...n.timestampValue}};if(n.mapValue){const e={mapValue:{fields:{}}};return _n(n.mapValue.fields,(t,r)=>e.mapValue.fields[t]=Ms(r)),e}if(n.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(n.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=Ms(n.arrayValue.values[t]);return e}return{...n}}function mm(n){return(((n.mapValue||{}).fields||{}).__type__||{}).stringValue===pm}const gm={mapValue:{fields:{[yu]:{stringValue:Iu},[kr]:{arrayValue:{}}}}};function Xw(n){return"nullValue"in n?co:"booleanValue"in n?{booleanValue:!1}:"integerValue"in n||"doubleValue"in n?{doubleValue:NaN}:"timestampValue"in n?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in n?{stringValue:""}:"bytesValue"in n?{bytesValue:""}:"referenceValue"in n?ei(jn.empty(),x.empty()):"geoPointValue"in n?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in n?{arrayValue:{}}:"mapValue"in n?ra(n)?gm:{mapValue:{}}:M(35942,{value:n})}function Zw(n){return"nullValue"in n?{booleanValue:!1}:"booleanValue"in n?{doubleValue:NaN}:"integerValue"in n||"doubleValue"in n?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in n?{stringValue:""}:"stringValue"in n?{bytesValue:""}:"bytesValue"in n?ei(jn.empty(),x.empty()):"referenceValue"in n?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in n?{arrayValue:{}}:"arrayValue"in n?gm:"mapValue"in n?ra(n)?{mapValue:{}}:nn:M(61959,{value:n})}function _d(n,e){const t=hn(n.value,e.value);return t!==0?t:n.inclusive&&!e.inclusive?-1:!n.inclusive&&e.inclusive?1:0}function yd(n,e){const t=hn(n.value,e.value);return t!==0?t:n.inclusive&&!e.inclusive?1:!n.inclusive&&e.inclusive?-1:0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class be{constructor(e){this.value=e}static empty(){return new be({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let r=0;r<e.length-1;++r)if(t=(t.mapValue.fields||{})[e.get(r)],!lo(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=Ms(t)}setAll(e){let t=he.emptyPath(),r={},s=[];e.forEach((o,c)=>{if(!t.isImmediateParentOf(c)){const u=this.getFieldsMap(t);this.applyChanges(u,r,s),r={},s=[],t=c.popLast()}o?r[c.lastSegment()]=Ms(o):s.push(c.lastSegment())});const i=this.getFieldsMap(t);this.applyChanges(i,r,s)}delete(e){const t=this.field(e.popLast());lo(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return _t(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let r=0;r<e.length;++r){let s=t.mapValue.fields[e.get(r)];lo(s)&&s.mapValue.fields||(s={mapValue:{fields:{}}},t.mapValue.fields[e.get(r)]=s),t=s}return t.mapValue.fields}applyChanges(e,t,r){_n(t,(s,i)=>e[s]=i);for(const s of r)delete e[s]}clone(){return new be(Ms(this.value))}}function _m(n){const e=[];return _n(n.fields,(t,r)=>{const s=new he([t]);if(lo(r)){const i=_m(r.mapValue).fields;if(i.length===0)e.push(s);else for(const o of i)e.push(s.child(o))}else e.push(s)}),new $e(e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ue{constructor(e,t,r,s,i,o,c){this.key=e,this.documentType=t,this.version=r,this.readTime=s,this.createTime=i,this.data=o,this.documentState=c}static newInvalidDocument(e){return new ue(e,0,B.min(),B.min(),B.min(),be.empty(),0)}static newFoundDocument(e,t,r,s){return new ue(e,1,t,B.min(),r,s,0)}static newNoDocument(e,t){return new ue(e,2,t,B.min(),B.min(),be.empty(),0)}static newUnknownDocument(e,t){return new ue(e,3,t,B.min(),B.min(),be.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(B.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=be.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=be.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=B.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof ue&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new ue(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vr{constructor(e,t){this.position=e,this.inclusive=t}}function Id(n,e,t){let r=0;for(let s=0;s<n.position.length;s++){const i=e[s],o=n.position[s];if(i.field.isKeyField()?r=x.comparator(x.fromName(o.referenceValue),t.key):r=hn(o,t.data.field(i.field)),i.dir==="desc"&&(r*=-1),r!==0)break}return r}function Td(n,e){if(n===null)return e===null;if(e===null||n.inclusive!==e.inclusive||n.position.length!==e.position.length)return!1;for(let t=0;t<n.position.length;t++)if(!_t(n.position[t],e.position[t]))return!1;return!0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ni{constructor(e,t="asc"){this.field=e,this.dir=t}}function ev(n,e){return n.dir===e.dir&&n.field.isEqual(e.field)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ym{}class Y extends ym{constructor(e,t,r){super(),this.field=e,this.op=t,this.value=r}static create(e,t,r){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,r):new tv(e,t,r):t==="array-contains"?new sv(e,r):t==="in"?new Am(e,r):t==="not-in"?new iv(e,r):t==="array-contains-any"?new ov(e,r):new Y(e,t,r)}static createKeyFieldInFilter(e,t,r){return t==="in"?new nv(e,r):new rv(e,r)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(hn(t,this.value)):t!==null&&ln(this.value)===ln(t)&&this.matchesComparison(hn(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return M(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class ne extends ym{constructor(e,t){super(),this.filters=e,this.op=t,this.Pe=null}static create(e,t){return new ne(e,t)}matches(e){return Nr(this)?this.filters.find(t=>!t.matches(e))===void 0:this.filters.find(t=>t.matches(e))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function Nr(n){return n.op==="and"}function Dc(n){return n.op==="or"}function Tu(n){return Im(n)&&Nr(n)}function Im(n){for(const e of n.filters)if(e instanceof ne)return!1;return!0}function Vc(n){if(n instanceof Y)return n.field.canonicalString()+n.op.toString()+Dr(n.value);if(Tu(n))return n.filters.map(e=>Vc(e)).join(",");{const e=n.filters.map(t=>Vc(t)).join(",");return`${n.op}(${e})`}}function Tm(n,e){return n instanceof Y?function(r,s){return s instanceof Y&&r.op===s.op&&r.field.isEqual(s.field)&&_t(r.value,s.value)}(n,e):n instanceof ne?function(r,s){return s instanceof ne&&r.op===s.op&&r.filters.length===s.filters.length?r.filters.reduce((i,o,c)=>i&&Tm(o,s.filters[c]),!0):!1}(n,e):void M(19439)}function Em(n,e){const t=n.filters.concat(e);return ne.create(t,n.op)}function wm(n){return n instanceof Y?function(t){return`${t.field.canonicalString()} ${t.op} ${Dr(t.value)}`}(n):n instanceof ne?function(t){return t.op.toString()+" {"+t.getFilters().map(wm).join(" ,")+"}"}(n):"Filter"}class tv extends Y{constructor(e,t,r){super(e,t,r),this.key=x.fromName(r.referenceValue)}matches(e){const t=x.comparator(e.key,this.key);return this.matchesComparison(t)}}class nv extends Y{constructor(e,t){super(e,"in",t),this.keys=vm("in",t)}matches(e){return this.keys.some(t=>t.isEqual(e.key))}}class rv extends Y{constructor(e,t){super(e,"not-in",t),this.keys=vm("not-in",t)}matches(e){return!this.keys.some(t=>t.isEqual(e.key))}}function vm(n,e){var t;return(((t=e.arrayValue)==null?void 0:t.values)||[]).map(r=>x.fromName(r.referenceValue))}class sv extends Y{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return ti(t)&&Zs(t.arrayValue,this.value)}}class Am extends Y{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&Zs(this.value.arrayValue,t)}}class iv extends Y{constructor(e,t){super(e,"not-in",t)}matches(e){if(Zs(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!Zs(this.value.arrayValue,t)}}class ov extends Y{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!ti(t)||!t.arrayValue.values)&&t.arrayValue.values.some(r=>Zs(this.value.arrayValue,r))}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class av{constructor(e,t=null,r=[],s=[],i=null,o=null,c=null){this.path=e,this.collectionGroup=t,this.orderBy=r,this.filters=s,this.limit=i,this.startAt=o,this.endAt=c,this.Te=null}}function Nc(n,e=null,t=[],r=[],s=null,i=null,o=null){return new av(n,e,t,r,s,i,o)}function zn(n){const e=L(n);if(e.Te===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map(r=>Vc(r)).join(","),t+="|ob:",t+=e.orderBy.map(r=>function(i){return i.field.canonicalString()+i.dir}(r)).join(","),_i(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map(r=>Dr(r)).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map(r=>Dr(r)).join(",")),e.Te=t}return e.Te}function Ii(n,e){if(n.limit!==e.limit||n.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<n.orderBy.length;t++)if(!ev(n.orderBy[t],e.orderBy[t]))return!1;if(n.filters.length!==e.filters.length)return!1;for(let t=0;t<n.filters.length;t++)if(!Tm(n.filters[t],e.filters[t]))return!1;return n.collectionGroup===e.collectionGroup&&!!n.path.isEqual(e.path)&&!!Td(n.startAt,e.startAt)&&Td(n.endAt,e.endAt)}function Po(n){return x.isDocumentKey(n.path)&&n.collectionGroup===null&&n.filters.length===0}function Co(n,e){return n.filters.filter(t=>t instanceof Y&&t.field.isEqual(e))}function Ed(n,e,t){let r=co,s=!0;for(const i of Co(n,e)){let o=co,c=!0;switch(i.op){case"<":case"<=":o=Xw(i.value);break;case"==":case"in":case">=":o=i.value;break;case">":o=i.value,c=!1;break;case"!=":case"not-in":o=co}_d({value:r,inclusive:s},{value:o,inclusive:c})<0&&(r=o,s=c)}if(t!==null){for(let i=0;i<n.orderBy.length;++i)if(n.orderBy[i].field.isEqual(e)){const o=t.position[i];_d({value:r,inclusive:s},{value:o,inclusive:t.inclusive})<0&&(r=o,s=t.inclusive);break}}return{value:r,inclusive:s}}function wd(n,e,t){let r=nn,s=!0;for(const i of Co(n,e)){let o=nn,c=!0;switch(i.op){case">=":case">":o=Zw(i.value),c=!1;break;case"==":case"in":case"<=":o=i.value;break;case"<":o=i.value,c=!1;break;case"!=":case"not-in":o=nn}yd({value:r,inclusive:s},{value:o,inclusive:c})>0&&(r=o,s=c)}if(t!==null){for(let i=0;i<n.orderBy.length;++i)if(n.orderBy[i].field.isEqual(e)){const o=t.position[i];yd({value:r,inclusive:s},{value:o,inclusive:t.inclusive})>0&&(r=o,s=t.inclusive);break}}return{value:r,inclusive:s}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kr{constructor(e,t=null,r=[],s=[],i=null,o="F",c=null,u=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=r,this.filters=s,this.limit=i,this.limitType=o,this.startAt=c,this.endAt=u,this.Ie=null,this.Ee=null,this.Re=null,this.startAt,this.endAt}}function bm(n,e,t,r,s,i,o,c){return new Kr(n,e,t,r,s,i,o,c)}function Ti(n){return new Kr(n)}function vd(n){return n.filters.length===0&&n.limit===null&&n.startAt==null&&n.endAt==null&&(n.explicitOrderBy.length===0||n.explicitOrderBy.length===1&&n.explicitOrderBy[0].field.isKeyField())}function cv(n){return x.isDocumentKey(n.path)&&n.collectionGroup===null&&n.filters.length===0}function Rm(n){return n.collectionGroup!==null}function Ls(n){const e=L(n);if(e.Ie===null){e.Ie=[];const t=new Set;for(const i of e.explicitOrderBy)e.Ie.push(i),t.add(i.field.canonicalString());const r=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let c=new re(he.comparator);return o.filters.forEach(u=>{u.getFlattenedFilters().forEach(l=>{l.isInequality()&&(c=c.add(l.field))})}),c})(e).forEach(i=>{t.has(i.canonicalString())||i.isKeyField()||e.Ie.push(new ni(i,r))}),t.has(he.keyField().canonicalString())||e.Ie.push(new ni(he.keyField(),r))}return e.Ie}function Qe(n){const e=L(n);return e.Ee||(e.Ee=Sm(e,Ls(n))),e.Ee}function uv(n){const e=L(n);return e.Re||(e.Re=Sm(e,n.explicitOrderBy)),e.Re}function Sm(n,e){if(n.limitType==="F")return Nc(n.path,n.collectionGroup,e,n.filters,n.limit,n.startAt,n.endAt);{e=e.map(s=>{const i=s.dir==="desc"?"asc":"desc";return new ni(s.field,i)});const t=n.endAt?new Vr(n.endAt.position,n.endAt.inclusive):null,r=n.startAt?new Vr(n.startAt.position,n.startAt.inclusive):null;return Nc(n.path,n.collectionGroup,e,n.filters,n.limit,t,r)}}function Oc(n,e){const t=n.filters.concat([e]);return new Kr(n.path,n.collectionGroup,n.explicitOrderBy.slice(),t,n.limit,n.limitType,n.startAt,n.endAt)}function lv(n,e){const t=n.explicitOrderBy.concat([e]);return new Kr(n.path,n.collectionGroup,t,n.filters.slice(),n.limit,n.limitType,n.startAt,n.endAt)}function ko(n,e,t){return new Kr(n.path,n.collectionGroup,n.explicitOrderBy.slice(),n.filters.slice(),e,t,n.startAt,n.endAt)}function sa(n,e){return Ii(Qe(n),Qe(e))&&n.limitType===e.limitType}function Pm(n){return`${zn(Qe(n))}|lt:${n.limitType}`}function pr(n){return`Query(target=${function(t){let r=t.path.canonicalString();return t.collectionGroup!==null&&(r+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(r+=`, filters: [${t.filters.map(s=>wm(s)).join(", ")}]`),_i(t.limit)||(r+=", limit: "+t.limit),t.orderBy.length>0&&(r+=`, orderBy: [${t.orderBy.map(s=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(s)).join(", ")}]`),t.startAt&&(r+=", startAt: ",r+=t.startAt.inclusive?"b:":"a:",r+=t.startAt.position.map(s=>Dr(s)).join(",")),t.endAt&&(r+=", endAt: ",r+=t.endAt.inclusive?"a:":"b:",r+=t.endAt.position.map(s=>Dr(s)).join(",")),`Target(${r})`}(Qe(n))}; limitType=${n.limitType})`}function Ei(n,e){return e.isFoundDocument()&&function(r,s){const i=s.key.path;return r.collectionGroup!==null?s.key.hasCollectionId(r.collectionGroup)&&r.path.isPrefixOf(i):x.isDocumentKey(r.path)?r.path.isEqual(i):r.path.isImmediateParentOf(i)}(n,e)&&function(r,s){for(const i of Ls(r))if(!i.field.isKeyField()&&s.data.field(i.field)===null)return!1;return!0}(n,e)&&function(r,s){for(const i of r.filters)if(!i.matches(s))return!1;return!0}(n,e)&&function(r,s){return!(r.startAt&&!function(o,c,u){const l=Id(o,c,u);return o.inclusive?l<=0:l<0}(r.startAt,Ls(r),s)||r.endAt&&!function(o,c,u){const l=Id(o,c,u);return o.inclusive?l>=0:l>0}(r.endAt,Ls(r),s))}(n,e)}function Cm(n){return n.collectionGroup||(n.path.length%2==1?n.path.lastSegment():n.path.get(n.path.length-2))}function km(n){return(e,t)=>{let r=!1;for(const s of Ls(n)){const i=hv(s,e,t);if(i!==0)return i;r=r||s.field.isKeyField()}return 0}}function hv(n,e,t){const r=n.field.isKeyField()?x.comparator(e.key,t.key):function(i,o,c){const u=o.data.field(i),l=c.data.field(i);return u!==null&&l!==null?hn(u,l):M(42886)}(n.field,e,t);switch(n.dir){case"asc":return r;case"desc":return-1*r;default:return M(19790,{direction:n.dir})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mt{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),r=this.inner[t];if(r!==void 0){for(const[s,i]of r)if(this.equalsFn(s,e))return i}}has(e){return this.get(e)!==void 0}set(e,t){const r=this.mapKeyFn(e),s=this.inner[r];if(s===void 0)return this.inner[r]=[[e,t]],void this.innerSize++;for(let i=0;i<s.length;i++)if(this.equalsFn(s[i][0],e))return void(s[i]=[e,t]);s.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),r=this.inner[t];if(r===void 0)return!1;for(let s=0;s<r.length;s++)if(this.equalsFn(r[s][0],e))return r.length===1?delete this.inner[t]:r.splice(s,1),this.innerSize--,!0;return!1}forEach(e){_n(this.inner,(t,r)=>{for(const[s,i]of r)e(s,i)})}isEmpty(){return cm(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dv=new ie(x.comparator);function He(){return dv}const Dm=new ie(x.comparator);function Ps(...n){let e=Dm;for(const t of n)e=e.insert(t.key,t);return e}function Vm(n){let e=Dm;return n.forEach((t,r)=>e=e.insert(t,r.overlayedDocument)),e}function ht(){return Fs()}function Nm(){return Fs()}function Fs(){return new Mt(n=>n.toString(),(n,e)=>n.isEqual(e))}const fv=new ie(x.comparator),pv=new re(x.comparator);function W(...n){let e=pv;for(const t of n)e=e.add(t);return e}const mv=new re(z);function Eu(){return mv}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wu(n,e){if(n.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:Hs(e)?"-0":e}}function Om(n){return{integerValue:""+n}}function xm(n,e){return Yp(e)?Om(e):wu(n,e)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ia{constructor(){this._=void 0}}function gv(n,e,t){return n instanceof Or?function(s,i){const o={fields:{[hm]:{stringValue:lm},[fm]:{timestampValue:{seconds:s.seconds,nanos:s.nanoseconds}}}};return i&&_u(i)&&(i=na(i)),i&&(o.fields[dm]=i),{mapValue:o}}(t,e):n instanceof Kn?Lm(n,e):n instanceof xr?Fm(n,e):function(s,i){const o=Mm(s,i),c=Ad(o)+Ad(s.Ae);return kc(o)&&kc(s.Ae)?Om(c):wu(s.serializer,c)}(n,e)}function _v(n,e,t){return n instanceof Kn?Lm(n,e):n instanceof xr?Fm(n,e):t}function Mm(n,e){return n instanceof Mr?function(r){return kc(r)||function(i){return!!i&&"doubleValue"in i}(r)}(e)?e:{integerValue:0}:null}class Or extends ia{}class Kn extends ia{constructor(e){super(),this.elements=e}}function Lm(n,e){const t=Um(e);for(const r of n.elements)t.some(s=>_t(s,r))||t.push(r);return{arrayValue:{values:t}}}class xr extends ia{constructor(e){super(),this.elements=e}}function Fm(n,e){let t=Um(e);for(const r of n.elements)t=t.filter(s=>!_t(s,r));return{arrayValue:{values:t}}}class Mr extends ia{constructor(e,t){super(),this.serializer=e,this.Ae=t}}function Ad(n){return ce(n.integerValue||n.doubleValue)}function Um(n){return ti(n)&&n.arrayValue.values?n.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oa{constructor(e,t){this.field=e,this.transform=t}}function yv(n,e){return n.field.isEqual(e.field)&&function(r,s){return r instanceof Kn&&s instanceof Kn||r instanceof xr&&s instanceof xr?Ar(r.elements,s.elements,_t):r instanceof Mr&&s instanceof Mr?_t(r.Ae,s.Ae):r instanceof Or&&s instanceof Or}(n.transform,e.transform)}class Iv{constructor(e,t){this.version=e,this.transformResults=t}}class le{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new le}static exists(e){return new le(void 0,e)}static updateTime(e){return new le(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function ho(n,e){return n.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(n.updateTime):n.exists===void 0||n.exists===e.isFoundDocument()}class aa{}function Bm(n,e){if(!n.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return n.isNoDocument()?new Hr(n.key,le.none()):new Gr(n.key,n.data,le.none());{const t=n.data,r=be.empty();let s=new re(he.comparator);for(let i of e.fields)if(!s.has(i)){let o=t.field(i);o===null&&i.length>1&&(i=i.popLast(),o=t.field(i)),o===null?r.delete(i):r.set(i,o),s=s.add(i)}return new Lt(n.key,r,new $e(s.toArray()),le.none())}}function Tv(n,e,t){n instanceof Gr?function(s,i,o){const c=s.value.clone(),u=Rd(s.fieldTransforms,i,o.transformResults);c.setAll(u),i.convertToFoundDocument(o.version,c).setHasCommittedMutations()}(n,e,t):n instanceof Lt?function(s,i,o){if(!ho(s.precondition,i))return void i.convertToUnknownDocument(o.version);const c=Rd(s.fieldTransforms,i,o.transformResults),u=i.data;u.setAll(qm(s)),u.setAll(c),i.convertToFoundDocument(o.version,u).setHasCommittedMutations()}(n,e,t):function(s,i,o){i.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,t)}function Us(n,e,t,r){return n instanceof Gr?function(i,o,c,u){if(!ho(i.precondition,o))return c;const l=i.value.clone(),f=Sd(i.fieldTransforms,u,o);return l.setAll(f),o.convertToFoundDocument(o.version,l).setHasLocalMutations(),null}(n,e,t,r):n instanceof Lt?function(i,o,c,u){if(!ho(i.precondition,o))return c;const l=Sd(i.fieldTransforms,u,o),f=o.data;return f.setAll(qm(i)),f.setAll(l),o.convertToFoundDocument(o.version,f).setHasLocalMutations(),c===null?null:c.unionWith(i.fieldMask.fields).unionWith(i.fieldTransforms.map(p=>p.field))}(n,e,t,r):function(i,o,c){return ho(i.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):c}(n,e,t)}function Ev(n,e){let t=null;for(const r of n.fieldTransforms){const s=e.data.field(r.field),i=Mm(r.transform,s||null);i!=null&&(t===null&&(t=be.empty()),t.set(r.field,i))}return t||null}function bd(n,e){return n.type===e.type&&!!n.key.isEqual(e.key)&&!!n.precondition.isEqual(e.precondition)&&!!function(r,s){return r===void 0&&s===void 0||!(!r||!s)&&Ar(r,s,(i,o)=>yv(i,o))}(n.fieldTransforms,e.fieldTransforms)&&(n.type===0?n.value.isEqual(e.value):n.type!==1||n.data.isEqual(e.data)&&n.fieldMask.isEqual(e.fieldMask))}class Gr extends aa{constructor(e,t,r,s=[]){super(),this.key=e,this.value=t,this.precondition=r,this.fieldTransforms=s,this.type=0}getFieldMask(){return null}}class Lt extends aa{constructor(e,t,r,s,i=[]){super(),this.key=e,this.data=t,this.fieldMask=r,this.precondition=s,this.fieldTransforms=i,this.type=1}getFieldMask(){return this.fieldMask}}function qm(n){const e=new Map;return n.fieldMask.fields.forEach(t=>{if(!t.isEmpty()){const r=n.data.field(t);e.set(t,r)}}),e}function Rd(n,e,t){const r=new Map;F(n.length===t.length,32656,{Ve:t.length,de:n.length});for(let s=0;s<t.length;s++){const i=n[s],o=i.transform,c=e.data.field(i.field);r.set(i.field,_v(o,c,t[s]))}return r}function Sd(n,e,t){const r=new Map;for(const s of n){const i=s.transform,o=t.data.field(s.field);r.set(s.field,gv(i,o,e))}return r}class Hr extends aa{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class vu extends aa{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Au{constructor(e,t,r,s){this.batchId=e,this.localWriteTime=t,this.baseMutations=r,this.mutations=s}applyToRemoteDocument(e,t){const r=t.mutationResults;for(let s=0;s<this.mutations.length;s++){const i=this.mutations[s];i.key.isEqual(e.key)&&Tv(i,e,r[s])}}applyToLocalView(e,t){for(const r of this.baseMutations)r.key.isEqual(e.key)&&(t=Us(r,e,t,this.localWriteTime));for(const r of this.mutations)r.key.isEqual(e.key)&&(t=Us(r,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const r=Nm();return this.mutations.forEach(s=>{const i=e.get(s.key),o=i.overlayedDocument;let c=this.applyToLocalView(o,i.mutatedFields);c=t.has(s.key)?null:c;const u=Bm(o,c);u!==null&&r.set(s.key,u),o.isValidDocument()||o.convertToNoDocument(B.min())}),r}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),W())}isEqual(e){return this.batchId===e.batchId&&Ar(this.mutations,e.mutations,(t,r)=>bd(t,r))&&Ar(this.baseMutations,e.baseMutations,(t,r)=>bd(t,r))}}class bu{constructor(e,t,r,s){this.batch=e,this.commitVersion=t,this.mutationResults=r,this.docVersions=s}static from(e,t,r){F(e.mutations.length===r.length,58842,{me:e.mutations.length,fe:r.length});let s=function(){return fv}();const i=e.mutations;for(let o=0;o<i.length;o++)s=s.insert(i[o].key,r[o].version);return new bu(e,t,r,s)}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ru{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wv{constructor(e,t,r){this.alias=e,this.aggregateType=t,this.fieldPath=r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vv{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var _e,X;function $m(n){switch(n){case P.OK:return M(64938);case P.CANCELLED:case P.UNKNOWN:case P.DEADLINE_EXCEEDED:case P.RESOURCE_EXHAUSTED:case P.INTERNAL:case P.UNAVAILABLE:case P.UNAUTHENTICATED:return!1;case P.INVALID_ARGUMENT:case P.NOT_FOUND:case P.ALREADY_EXISTS:case P.PERMISSION_DENIED:case P.FAILED_PRECONDITION:case P.ABORTED:case P.OUT_OF_RANGE:case P.UNIMPLEMENTED:case P.DATA_LOSS:return!0;default:return M(15467,{code:n})}}function jm(n){if(n===void 0)return me("GRPC error has no .code"),P.UNKNOWN;switch(n){case _e.OK:return P.OK;case _e.CANCELLED:return P.CANCELLED;case _e.UNKNOWN:return P.UNKNOWN;case _e.DEADLINE_EXCEEDED:return P.DEADLINE_EXCEEDED;case _e.RESOURCE_EXHAUSTED:return P.RESOURCE_EXHAUSTED;case _e.INTERNAL:return P.INTERNAL;case _e.UNAVAILABLE:return P.UNAVAILABLE;case _e.UNAUTHENTICATED:return P.UNAUTHENTICATED;case _e.INVALID_ARGUMENT:return P.INVALID_ARGUMENT;case _e.NOT_FOUND:return P.NOT_FOUND;case _e.ALREADY_EXISTS:return P.ALREADY_EXISTS;case _e.PERMISSION_DENIED:return P.PERMISSION_DENIED;case _e.FAILED_PRECONDITION:return P.FAILED_PRECONDITION;case _e.ABORTED:return P.ABORTED;case _e.OUT_OF_RANGE:return P.OUT_OF_RANGE;case _e.UNIMPLEMENTED:return P.UNIMPLEMENTED;case _e.DATA_LOSS:return P.DATA_LOSS;default:return M(39323,{code:n})}}(X=_e||(_e={}))[X.OK=0]="OK",X[X.CANCELLED=1]="CANCELLED",X[X.UNKNOWN=2]="UNKNOWN",X[X.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",X[X.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",X[X.NOT_FOUND=5]="NOT_FOUND",X[X.ALREADY_EXISTS=6]="ALREADY_EXISTS",X[X.PERMISSION_DENIED=7]="PERMISSION_DENIED",X[X.UNAUTHENTICATED=16]="UNAUTHENTICATED",X[X.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",X[X.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",X[X.ABORTED=10]="ABORTED",X[X.OUT_OF_RANGE=11]="OUT_OF_RANGE",X[X.UNIMPLEMENTED=12]="UNIMPLEMENTED",X[X.INTERNAL=13]="INTERNAL",X[X.UNAVAILABLE=14]="UNAVAILABLE",X[X.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Av(){return new TextEncoder}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bv=new on([4294967295,4294967295],0);function Pd(n){const e=Av().encode(n),t=new xp;return t.update(e),new Uint8Array(t.digest())}function Cd(n){const e=new DataView(n.buffer),t=e.getUint32(0,!0),r=e.getUint32(4,!0),s=e.getUint32(8,!0),i=e.getUint32(12,!0);return[new on([t,r],0),new on([s,i],0)]}class Su{constructor(e,t,r){if(this.bitmap=e,this.padding=t,this.hashCount=r,t<0||t>=8)throw new Cs(`Invalid padding: ${t}`);if(r<0)throw new Cs(`Invalid hash count: ${r}`);if(e.length>0&&this.hashCount===0)throw new Cs(`Invalid hash count: ${r}`);if(e.length===0&&t!==0)throw new Cs(`Invalid padding when bitmap length is 0: ${t}`);this.ge=8*e.length-t,this.pe=on.fromNumber(this.ge)}ye(e,t,r){let s=e.add(t.multiply(on.fromNumber(r)));return s.compare(bv)===1&&(s=new on([s.getBits(0),s.getBits(1)],0)),s.modulo(this.pe).toNumber()}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.ge===0)return!1;const t=Pd(e),[r,s]=Cd(t);for(let i=0;i<this.hashCount;i++){const o=this.ye(r,s,i);if(!this.we(o))return!1}return!0}static create(e,t,r){const s=e%8==0?0:8-e%8,i=new Uint8Array(Math.ceil(e/8)),o=new Su(i,s,t);return r.forEach(c=>o.insert(c)),o}insert(e){if(this.ge===0)return;const t=Pd(e),[r,s]=Cd(t);for(let i=0;i<this.hashCount;i++){const o=this.ye(r,s,i);this.Se(o)}}Se(e){const t=Math.floor(e/8),r=e%8;this.bitmap[t]|=1<<r}}class Cs extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wr{constructor(e,t,r,s,i){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=r,this.documentUpdates=s,this.resolvedLimboDocuments=i}static createSynthesizedRemoteEventForCurrentChange(e,t,r){const s=new Map;return s.set(e,wi.createSynthesizedTargetChangeForCurrentChange(e,t,r)),new Wr(B.min(),s,new ie(z),He(),W())}}class wi{constructor(e,t,r,s,i){this.resumeToken=e,this.current=t,this.addedDocuments=r,this.modifiedDocuments=s,this.removedDocuments=i}static createSynthesizedTargetChangeForCurrentChange(e,t,r){return new wi(r,t,W(),W(),W())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fo{constructor(e,t,r,s){this.be=e,this.removedTargetIds=t,this.key=r,this.De=s}}class zm{constructor(e,t){this.targetId=e,this.Ce=t}}class Km{constructor(e,t,r=ge.EMPTY_BYTE_STRING,s=null){this.state=e,this.targetIds=t,this.resumeToken=r,this.cause=s}}class kd{constructor(){this.ve=0,this.Fe=Dd(),this.Me=ge.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e)}ke(){let e=W(),t=W(),r=W();return this.Fe.forEach((s,i)=>{switch(i){case 0:e=e.add(s);break;case 2:t=t.add(s);break;case 1:r=r.add(s);break;default:M(38017,{changeType:i})}}),new wi(this.Me,this.xe,e,t,r)}Ke(){this.Oe=!1,this.Fe=Dd()}qe(e,t){this.Oe=!0,this.Fe=this.Fe.insert(e,t)}Ue(e){this.Oe=!0,this.Fe=this.Fe.remove(e)}$e(){this.ve+=1}We(){this.ve-=1,F(this.ve>=0,3241,{ve:this.ve})}Qe(){this.Oe=!0,this.xe=!0}}class Rv{constructor(e){this.Ge=e,this.ze=new Map,this.je=He(),this.Je=Hi(),this.He=Hi(),this.Ze=new ie(z)}Xe(e){for(const t of e.be)e.De&&e.De.isFoundDocument()?this.Ye(t,e.De):this.et(t,e.key,e.De);for(const t of e.removedTargetIds)this.et(t,e.key,e.De)}tt(e){this.forEachTarget(e,t=>{const r=this.nt(t);switch(e.state){case 0:this.rt(t)&&r.Le(e.resumeToken);break;case 1:r.We(),r.Ne||r.Ke(),r.Le(e.resumeToken);break;case 2:r.We(),r.Ne||this.removeTarget(t);break;case 3:this.rt(t)&&(r.Qe(),r.Le(e.resumeToken));break;case 4:this.rt(t)&&(this.it(t),r.Le(e.resumeToken));break;default:M(56790,{state:e.state})}})}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.ze.forEach((r,s)=>{this.rt(s)&&t(s)})}st(e){const t=e.targetId,r=e.Ce.count,s=this.ot(t);if(s){const i=s.target;if(Po(i))if(r===0){const o=new x(i.path);this.et(t,o,ue.newNoDocument(o,B.min()))}else F(r===1,20013,{expectedCount:r});else{const o=this._t(t);if(o!==r){const c=this.ut(e),u=c?this.ct(c,e,o):1;if(u!==0){this.it(t);const l=u===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ze=this.Ze.insert(t,l)}}}}}ut(e){const t=e.Ce.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:r="",padding:s=0},hashCount:i=0}=t;let o,c;try{o=Dt(r).toUint8Array()}catch(u){if(u instanceof um)return $n("Decoding the base64 bloom filter in existence filter failed ("+u.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw u}try{c=new Su(o,s,i)}catch(u){return $n(u instanceof Cs?"BloomFilter error: ":"Applying bloom filter failed: ",u),null}return c.ge===0?null:c}ct(e,t,r){return t.Ce.count===r-this.Pt(e,t.targetId)?0:2}Pt(e,t){const r=this.Ge.getRemoteKeysForTarget(t);let s=0;return r.forEach(i=>{const o=this.Ge.ht(),c=`projects/${o.projectId}/databases/${o.database}/documents/${i.path.canonicalString()}`;e.mightContain(c)||(this.et(t,i,null),s++)}),s}Tt(e){const t=new Map;this.ze.forEach((i,o)=>{const c=this.ot(o);if(c){if(i.current&&Po(c.target)){const u=new x(c.target.path);this.It(u).has(o)||this.Et(o,u)||this.et(o,u,ue.newNoDocument(u,e))}i.Be&&(t.set(o,i.ke()),i.Ke())}});let r=W();this.He.forEach((i,o)=>{let c=!0;o.forEachWhile(u=>{const l=this.ot(u);return!l||l.purpose==="TargetPurposeLimboResolution"||(c=!1,!1)}),c&&(r=r.add(i))}),this.je.forEach((i,o)=>o.setReadTime(e));const s=new Wr(e,t,this.Ze,this.je,r);return this.je=He(),this.Je=Hi(),this.He=Hi(),this.Ze=new ie(z),s}Ye(e,t){if(!this.rt(e))return;const r=this.Et(e,t.key)?2:0;this.nt(e).qe(t.key,r),this.je=this.je.insert(t.key,t),this.Je=this.Je.insert(t.key,this.It(t.key).add(e)),this.He=this.He.insert(t.key,this.Rt(t.key).add(e))}et(e,t,r){if(!this.rt(e))return;const s=this.nt(e);this.Et(e,t)?s.qe(t,1):s.Ue(t),this.He=this.He.insert(t,this.Rt(t).delete(e)),this.He=this.He.insert(t,this.Rt(t).add(e)),r&&(this.je=this.je.insert(t,r))}removeTarget(e){this.ze.delete(e)}_t(e){const t=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}$e(e){this.nt(e).$e()}nt(e){let t=this.ze.get(e);return t||(t=new kd,this.ze.set(e,t)),t}Rt(e){let t=this.He.get(e);return t||(t=new re(z),this.He=this.He.insert(e,t)),t}It(e){let t=this.Je.get(e);return t||(t=new re(z),this.Je=this.Je.insert(e,t)),t}rt(e){const t=this.ot(e)!==null;return t||D("WatchChangeAggregator","Detected inactive target",e),t}ot(e){const t=this.ze.get(e);return t&&t.Ne?null:this.Ge.At(e)}it(e){this.ze.set(e,new kd),this.Ge.getRemoteKeysForTarget(e).forEach(t=>{this.et(e,t,null)})}Et(e,t){return this.Ge.getRemoteKeysForTarget(e).has(t)}}function Hi(){return new ie(x.comparator)}function Dd(){return new ie(x.comparator)}const Sv={asc:"ASCENDING",desc:"DESCENDING"},Pv={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},Cv={and:"AND",or:"OR"};class kv{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function xc(n,e){return n.useProto3Json||_i(e)?e:{value:e}}function Lr(n,e){return n.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function Gm(n,e){return n.useProto3Json?e.toBase64():e.toUint8Array()}function Dv(n,e){return Lr(n,e.toTimestamp())}function Re(n){return F(!!n,49232),B.fromTimestamp(function(t){const r=kt(t);return new te(r.seconds,r.nanos)}(n))}function Pu(n,e){return Mc(n,e).canonicalString()}function Mc(n,e){const t=function(s){return new ee(["projects",s.projectId,"databases",s.database])}(n).child("documents");return e===void 0?t:t.child(e)}function Hm(n){const e=ee.fromString(n);return F(tg(e),10190,{key:e.toString()}),e}function ri(n,e){return Pu(n.databaseId,e.path)}function bt(n,e){const t=Hm(e);if(t.get(1)!==n.databaseId.projectId)throw new N(P.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+n.databaseId.projectId);if(t.get(3)!==n.databaseId.database)throw new N(P.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+n.databaseId.database);return new x(Jm(t))}function Wm(n,e){return Pu(n.databaseId,e)}function Qm(n){const e=Hm(n);return e.length===4?ee.emptyPath():Jm(e)}function Lc(n){return new ee(["projects",n.databaseId.projectId,"databases",n.databaseId.database]).canonicalString()}function Jm(n){return F(n.length>4&&n.get(4)==="documents",29091,{key:n.toString()}),n.popFirst(5)}function Vd(n,e,t){return{name:ri(n,e),fields:t.value.mapValue.fields}}function Vv(n,e,t){const r=bt(n,e.name),s=Re(e.updateTime),i=e.createTime?Re(e.createTime):B.min(),o=new be({mapValue:{fields:e.fields}}),c=ue.newFoundDocument(r,s,i,o);return t&&c.setHasCommittedMutations(),t?c.setHasCommittedMutations():c}function Nv(n,e){return"found"in e?function(r,s){F(!!s.found,43571),s.found.name,s.found.updateTime;const i=bt(r,s.found.name),o=Re(s.found.updateTime),c=s.found.createTime?Re(s.found.createTime):B.min(),u=new be({mapValue:{fields:s.found.fields}});return ue.newFoundDocument(i,o,c,u)}(n,e):"missing"in e?function(r,s){F(!!s.missing,3894),F(!!s.readTime,22933);const i=bt(r,s.missing),o=Re(s.readTime);return ue.newNoDocument(i,o)}(n,e):M(7234,{result:e})}function Ov(n,e){let t;if("targetChange"in e){e.targetChange;const r=function(l){return l==="NO_CHANGE"?0:l==="ADD"?1:l==="REMOVE"?2:l==="CURRENT"?3:l==="RESET"?4:M(39313,{state:l})}(e.targetChange.targetChangeType||"NO_CHANGE"),s=e.targetChange.targetIds||[],i=function(l,f){return l.useProto3Json?(F(f===void 0||typeof f=="string",58123),ge.fromBase64String(f||"")):(F(f===void 0||f instanceof Buffer||f instanceof Uint8Array,16193),ge.fromUint8Array(f||new Uint8Array))}(n,e.targetChange.resumeToken),o=e.targetChange.cause,c=o&&function(l){const f=l.code===void 0?P.UNKNOWN:jm(l.code);return new N(f,l.message||"")}(o);t=new Km(r,s,i,c||null)}else if("documentChange"in e){e.documentChange;const r=e.documentChange;r.document,r.document.name,r.document.updateTime;const s=bt(n,r.document.name),i=Re(r.document.updateTime),o=r.document.createTime?Re(r.document.createTime):B.min(),c=new be({mapValue:{fields:r.document.fields}}),u=ue.newFoundDocument(s,i,o,c),l=r.targetIds||[],f=r.removedTargetIds||[];t=new fo(l,f,u.key,u)}else if("documentDelete"in e){e.documentDelete;const r=e.documentDelete;r.document;const s=bt(n,r.document),i=r.readTime?Re(r.readTime):B.min(),o=ue.newNoDocument(s,i),c=r.removedTargetIds||[];t=new fo([],c,o.key,o)}else if("documentRemove"in e){e.documentRemove;const r=e.documentRemove;r.document;const s=bt(n,r.document),i=r.removedTargetIds||[];t=new fo([],i,s,null)}else{if(!("filter"in e))return M(11601,{Vt:e});{e.filter;const r=e.filter;r.targetId;const{count:s=0,unchangedNames:i}=r,o=new vv(s,i),c=r.targetId;t=new zm(c,o)}}return t}function si(n,e){let t;if(e instanceof Gr)t={update:Vd(n,e.key,e.value)};else if(e instanceof Hr)t={delete:ri(n,e.key)};else if(e instanceof Lt)t={update:Vd(n,e.key,e.data),updateMask:qv(e.fieldMask)};else{if(!(e instanceof vu))return M(16599,{dt:e.type});t={verify:ri(n,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map(r=>function(i,o){const c=o.transform;if(c instanceof Or)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof Kn)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof xr)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof Mr)return{fieldPath:o.field.canonicalString(),increment:c.Ae};throw M(20930,{transform:o.transform})}(0,r))),e.precondition.isNone||(t.currentDocument=function(s,i){return i.updateTime!==void 0?{updateTime:Dv(s,i.updateTime)}:i.exists!==void 0?{exists:i.exists}:M(27497)}(n,e.precondition)),t}function Fc(n,e){const t=e.currentDocument?function(i){return i.updateTime!==void 0?le.updateTime(Re(i.updateTime)):i.exists!==void 0?le.exists(i.exists):le.none()}(e.currentDocument):le.none(),r=e.updateTransforms?e.updateTransforms.map(s=>function(o,c){let u=null;if("setToServerValue"in c)F(c.setToServerValue==="REQUEST_TIME",16630,{proto:c}),u=new Or;else if("appendMissingElements"in c){const f=c.appendMissingElements.values||[];u=new Kn(f)}else if("removeAllFromArray"in c){const f=c.removeAllFromArray.values||[];u=new xr(f)}else"increment"in c?u=new Mr(o,c.increment):M(16584,{proto:c});const l=he.fromServerFormat(c.fieldPath);return new oa(l,u)}(n,s)):[];if(e.update){e.update.name;const s=bt(n,e.update.name),i=new be({mapValue:{fields:e.update.fields}});if(e.updateMask){const o=function(u){const l=u.fieldPaths||[];return new $e(l.map(f=>he.fromServerFormat(f)))}(e.updateMask);return new Lt(s,i,o,t,r)}return new Gr(s,i,t,r)}if(e.delete){const s=bt(n,e.delete);return new Hr(s,t)}if(e.verify){const s=bt(n,e.verify);return new vu(s,t)}return M(1463,{proto:e})}function xv(n,e){return n&&n.length>0?(F(e!==void 0,14353),n.map(t=>function(s,i){let o=s.updateTime?Re(s.updateTime):Re(i);return o.isEqual(B.min())&&(o=Re(i)),new Iv(o,s.transformResults||[])}(t,e))):[]}function Ym(n,e){return{documents:[Wm(n,e.path)]}}function Cu(n,e){const t={structuredQuery:{}},r=e.path;let s;e.collectionGroup!==null?(s=r,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(s=r.popLast(),t.structuredQuery.from=[{collectionId:r.lastSegment()}]),t.parent=Wm(n,s);const i=function(l){if(l.length!==0)return eg(ne.create(l,"and"))}(e.filters);i&&(t.structuredQuery.where=i);const o=function(l){if(l.length!==0)return l.map(f=>function(g){return{field:Zt(g.field),direction:Fv(g.dir)}}(f))}(e.orderBy);o&&(t.structuredQuery.orderBy=o);const c=xc(n,e.limit);return c!==null&&(t.structuredQuery.limit=c),e.startAt&&(t.structuredQuery.startAt=function(l){return{before:l.inclusive,values:l.position}}(e.startAt)),e.endAt&&(t.structuredQuery.endAt=function(l){return{before:!l.inclusive,values:l.position}}(e.endAt)),{ft:t,parent:s}}function Mv(n,e,t,r){const{ft:s,parent:i}=Cu(n,e),o={},c=[];let u=0;return t.forEach(l=>{const f="aggregate_"+u++;o[f]=l.alias,l.aggregateType==="count"?c.push({alias:f,count:{}}):l.aggregateType==="avg"?c.push({alias:f,avg:{field:Zt(l.fieldPath)}}):l.aggregateType==="sum"&&c.push({alias:f,sum:{field:Zt(l.fieldPath)}})}),{request:{structuredAggregationQuery:{aggregations:c,structuredQuery:s.structuredQuery},parent:s.parent},gt:o,parent:i}}function Xm(n){let e=Qm(n.parent);const t=n.structuredQuery,r=t.from?t.from.length:0;let s=null;if(r>0){F(r===1,65062);const f=t.from[0];f.allDescendants?s=f.collectionId:e=e.child(f.collectionId)}let i=[];t.where&&(i=function(p){const g=Zm(p);return g instanceof ne&&Tu(g)?g.getFilters():[g]}(t.where));let o=[];t.orderBy&&(o=function(p){return p.map(g=>function(C){return new ni(mr(C.field),function(k){switch(k){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(C.direction))}(g))}(t.orderBy));let c=null;t.limit&&(c=function(p){let g;return g=typeof p=="object"?p.value:p,_i(g)?null:g}(t.limit));let u=null;t.startAt&&(u=function(p){const g=!!p.before,v=p.values||[];return new Vr(v,g)}(t.startAt));let l=null;return t.endAt&&(l=function(p){const g=!p.before,v=p.values||[];return new Vr(v,g)}(t.endAt)),bm(e,s,o,i,c,"F",u,l)}function Lv(n,e){const t=function(s){switch(s){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return M(28987,{purpose:s})}}(e.purpose);return t==null?null:{"goog-listen-tags":t}}function Zm(n){return n.unaryFilter!==void 0?function(t){switch(t.unaryFilter.op){case"IS_NAN":const r=mr(t.unaryFilter.field);return Y.create(r,"==",{doubleValue:NaN});case"IS_NULL":const s=mr(t.unaryFilter.field);return Y.create(s,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const i=mr(t.unaryFilter.field);return Y.create(i,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=mr(t.unaryFilter.field);return Y.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return M(61313);default:return M(60726)}}(n):n.fieldFilter!==void 0?function(t){return Y.create(mr(t.fieldFilter.field),function(s){switch(s){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return M(58110);default:return M(50506)}}(t.fieldFilter.op),t.fieldFilter.value)}(n):n.compositeFilter!==void 0?function(t){return ne.create(t.compositeFilter.filters.map(r=>Zm(r)),function(s){switch(s){case"AND":return"and";case"OR":return"or";default:return M(1026)}}(t.compositeFilter.op))}(n):M(30097,{filter:n})}function Fv(n){return Sv[n]}function Uv(n){return Pv[n]}function Bv(n){return Cv[n]}function Zt(n){return{fieldPath:n.canonicalString()}}function mr(n){return he.fromServerFormat(n.fieldPath)}function eg(n){return n instanceof Y?function(t){if(t.op==="=="){if(gd(t.value))return{unaryFilter:{field:Zt(t.field),op:"IS_NAN"}};if(md(t.value))return{unaryFilter:{field:Zt(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(gd(t.value))return{unaryFilter:{field:Zt(t.field),op:"IS_NOT_NAN"}};if(md(t.value))return{unaryFilter:{field:Zt(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:Zt(t.field),op:Uv(t.op),value:t.value}}}(n):n instanceof ne?function(t){const r=t.getFilters().map(s=>eg(s));return r.length===1?r[0]:{compositeFilter:{op:Bv(t.op),filters:r}}}(n):M(54877,{filter:n})}function qv(n){const e=[];return n.fields.forEach(t=>e.push(t.canonicalString())),{fieldPaths:e}}function tg(n){return n.length>=4&&n.get(0)==="projects"&&n.get(2)==="databases"}function ng(n){return!!n&&typeof n._toProto=="function"&&n._protoValueType==="ProtoValue"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dt{constructor(e,t,r,s,i=B.min(),o=B.min(),c=ge.EMPTY_BYTE_STRING,u=null){this.target=e,this.targetId=t,this.purpose=r,this.sequenceNumber=s,this.snapshotVersion=i,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=c,this.expectedCount=u}withSequenceNumber(e){return new dt(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new dt(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new dt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new dt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rg{constructor(e){this.yt=e}}function $v(n,e){let t;if(e.document)t=Vv(n.yt,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const r=x.fromSegments(e.noDocument.path),s=Hn(e.noDocument.readTime);t=ue.newNoDocument(r,s),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return M(56709);{const r=x.fromSegments(e.unknownDocument.path),s=Hn(e.unknownDocument.version);t=ue.newUnknownDocument(r,s)}}return e.readTime&&t.setReadTime(function(s){const i=new te(s[0],s[1]);return B.fromTimestamp(i)}(e.readTime)),t}function Nd(n,e){const t=e.key,r={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:Do(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())r.document=function(i,o){return{name:ri(i,o.key),fields:o.data.value.mapValue.fields,updateTime:Lr(i,o.version.toTimestamp()),createTime:Lr(i,o.createTime.toTimestamp())}}(n.yt,e);else if(e.isNoDocument())r.noDocument={path:t.path.toArray(),readTime:Gn(e.version)};else{if(!e.isUnknownDocument())return M(57904,{document:e});r.unknownDocument={path:t.path.toArray(),version:Gn(e.version)}}return r}function Do(n){const e=n.toTimestamp();return[e.seconds,e.nanoseconds]}function Gn(n){const e=n.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function Hn(n){const e=new te(n.seconds,n.nanoseconds);return B.fromTimestamp(e)}function kn(n,e){const t=(e.baseMutations||[]).map(i=>Fc(n.yt,i));for(let i=0;i<e.mutations.length-1;++i){const o=e.mutations[i];if(i+1<e.mutations.length&&e.mutations[i+1].transform!==void 0){const c=e.mutations[i+1];o.updateTransforms=c.transform.fieldTransforms,e.mutations.splice(i+1,1),++i}}const r=e.mutations.map(i=>Fc(n.yt,i)),s=te.fromMillis(e.localWriteTimeMs);return new Au(e.batchId,s,t,r)}function ks(n){const e=Hn(n.readTime),t=n.lastLimboFreeSnapshotVersion!==void 0?Hn(n.lastLimboFreeSnapshotVersion):B.min();let r;return r=function(i){return i.documents!==void 0}(n.query)?function(i){const o=i.documents.length;return F(o===1,1966,{count:o}),Qe(Ti(Qm(i.documents[0])))}(n.query):function(i){return Qe(Xm(i))}(n.query),new dt(r,n.targetId,"TargetPurposeListen",n.lastListenSequenceNumber,e,t,ge.fromBase64String(n.resumeToken))}function sg(n,e){const t=Gn(e.snapshotVersion),r=Gn(e.lastLimboFreeSnapshotVersion);let s;s=Po(e.target)?Ym(n.yt,e.target):Cu(n.yt,e.target).ft;const i=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:zn(e.target),readTime:t,resumeToken:i,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:r,query:s}}function ig(n){const e=Xm({parent:n.parent,structuredQuery:n.structuredQuery});return n.limitType==="LAST"?ko(e,e.limit,"L"):e}function Za(n,e){return new Ru(e.largestBatchId,Fc(n.yt,e.overlayMutation))}function Od(n,e){const t=e.path.lastSegment();return[n,Ne(e.path.popLast()),t]}function xd(n,e,t,r){return{indexId:n,uid:e,sequenceNumber:t,readTime:Gn(r.readTime),documentKey:Ne(r.documentKey.path),largestBatchId:r.largestBatchId}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jv{getBundleMetadata(e,t){return Md(e).get(t).next(r=>{if(r)return function(i){return{id:i.bundleId,createTime:Hn(i.createTime),version:i.version}}(r)})}saveBundleMetadata(e,t){return Md(e).put(function(s){return{bundleId:s.id,createTime:Gn(Re(s.createTime)),version:s.version}}(t))}getNamedQuery(e,t){return Ld(e).get(t).next(r=>{if(r)return function(i){return{name:i.name,query:ig(i.bundledQuery),readTime:Hn(i.readTime)}}(r)})}saveNamedQuery(e,t){return Ld(e).put(function(s){return{name:s.name,readTime:Gn(Re(s.readTime)),bundledQuery:s.bundledQuery}}(t))}}function Md(n){return Ee(n,Zo)}function Ld(n){return Ee(n,ea)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ca{constructor(e,t){this.serializer=e,this.userId=t}static wt(e,t){const r=t.uid||"";return new ca(e,r)}getOverlay(e,t){return ys(e).get(Od(this.userId,t)).next(r=>r?Za(this.serializer,r):null)}getOverlays(e,t){const r=ht();return A.forEach(t,s=>this.getOverlay(e,s).next(i=>{i!==null&&r.set(s,i)})).next(()=>r)}saveOverlays(e,t,r){const s=[];return r.forEach((i,o)=>{const c=new Ru(t,o);s.push(this.St(e,c))}),A.waitFor(s)}removeOverlaysForBatchId(e,t,r){const s=new Set;t.forEach(o=>s.add(Ne(o.getCollectionPath())));const i=[];return s.forEach(o=>{const c=IDBKeyRange.bound([this.userId,o,r],[this.userId,o,r+1],!1,!0);i.push(ys(e).X(Sc,c))}),A.waitFor(i)}getOverlaysForCollection(e,t,r){const s=ht(),i=Ne(t),o=IDBKeyRange.bound([this.userId,i,r],[this.userId,i,Number.POSITIVE_INFINITY],!0);return ys(e).J(Sc,o).next(c=>{for(const u of c){const l=Za(this.serializer,u);s.set(l.getKey(),l)}return s})}getOverlaysForCollectionGroup(e,t,r,s){const i=ht();let o;const c=IDBKeyRange.bound([this.userId,t,r],[this.userId,t,Number.POSITIVE_INFINITY],!0);return ys(e).ee({index:rm,range:c},(u,l,f)=>{const p=Za(this.serializer,l);i.size()<s||p.largestBatchId===o?(i.set(p.getKey(),p),o=p.largestBatchId):f.done()}).next(()=>i)}St(e,t){return ys(e).put(function(s,i,o){const[c,u,l]=Od(i,o.mutation.key);return{userId:i,collectionPath:u,documentId:l,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:si(s.yt,o.mutation)}}(this.serializer,this.userId,t))}}function ys(n){return Ee(n,ta)}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zv{bt(e){return Ee(e,mu)}getSessionToken(e){return this.bt(e).get("sessionToken").next(t=>{const r=t==null?void 0:t.value;return r?ge.fromUint8Array(r):ge.EMPTY_BYTE_STRING})}setSessionToken(e,t){return this.bt(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dn{constructor(){}Dt(e,t){this.Ct(e,t),t.vt()}Ct(e,t){if("nullValue"in e)this.Ft(t,5);else if("booleanValue"in e)this.Ft(t,10),t.Mt(e.booleanValue?1:0);else if("integerValue"in e)this.Ft(t,15),t.Mt(ce(e.integerValue));else if("doubleValue"in e){const r=ce(e.doubleValue);isNaN(r)?this.Ft(t,13):(this.Ft(t,15),Hs(r)?t.Mt(0):t.Mt(r))}else if("timestampValue"in e){let r=e.timestampValue;this.Ft(t,20),typeof r=="string"&&(r=kt(r)),t.xt(`${r.seconds||""}`),t.Mt(r.nanos||0)}else if("stringValue"in e)this.Ot(e.stringValue,t),this.Nt(t);else if("bytesValue"in e)this.Ft(t,30),t.Bt(Dt(e.bytesValue)),this.Nt(t);else if("referenceValue"in e)this.Lt(e.referenceValue,t);else if("geoPointValue"in e){const r=e.geoPointValue;this.Ft(t,45),t.Mt(r.latitude||0),t.Mt(r.longitude||0)}else"mapValue"in e?mm(e)?this.Ft(t,Number.MAX_SAFE_INTEGER):ra(e)?this.kt(e.mapValue,t):(this.Kt(e.mapValue,t),this.Nt(t)):"arrayValue"in e?(this.qt(e.arrayValue,t),this.Nt(t)):M(19022,{Ut:e})}Ot(e,t){this.Ft(t,25),this.$t(e,t)}$t(e,t){t.xt(e)}Kt(e,t){const r=e.fields||{};this.Ft(t,55);for(const s of Object.keys(r))this.Ot(s,t),this.Ct(r[s],t)}kt(e,t){var o,c;const r=e.fields||{};this.Ft(t,53);const s=kr,i=((c=(o=r[s].arrayValue)==null?void 0:o.values)==null?void 0:c.length)||0;this.Ft(t,15),t.Mt(ce(i)),this.Ot(s,t),this.Ct(r[s],t)}qt(e,t){const r=e.values||[];this.Ft(t,50);for(const s of r)this.Ct(s,t)}Lt(e,t){this.Ft(t,37),x.fromName(e).path.forEach(r=>{this.Ft(t,60),this.$t(r,t)})}Ft(e,t){e.Mt(t)}Nt(e){e.Mt(2)}}Dn.Wt=new Dn;/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law | agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES | CONDITIONS OF ANY KIND, either express | implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cr=255;function Kv(n){if(n===0)return 8;let e=0;return n>>4||(e+=4,n<<=4),n>>6||(e+=2,n<<=2),n>>7||(e+=1),e}function Fd(n){const e=64-function(r){let s=0;for(let i=0;i<8;++i){const o=Kv(255&r[i]);if(s+=o,o!==8)break}return s}(n);return Math.ceil(e/8)}class Gv{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Qt(e){const t=e[Symbol.iterator]();let r=t.next();for(;!r.done;)this.Gt(r.value),r=t.next();this.zt()}jt(e){const t=e[Symbol.iterator]();let r=t.next();for(;!r.done;)this.Jt(r.value),r=t.next();this.Ht()}Zt(e){for(const t of e){const r=t.charCodeAt(0);if(r<128)this.Gt(r);else if(r<2048)this.Gt(960|r>>>6),this.Gt(128|63&r);else if(t<"\uD800"||"\uDBFF"<t)this.Gt(480|r>>>12),this.Gt(128|63&r>>>6),this.Gt(128|63&r);else{const s=t.codePointAt(0);this.Gt(240|s>>>18),this.Gt(128|63&s>>>12),this.Gt(128|63&s>>>6),this.Gt(128|63&s)}}this.zt()}Xt(e){for(const t of e){const r=t.charCodeAt(0);if(r<128)this.Jt(r);else if(r<2048)this.Jt(960|r>>>6),this.Jt(128|63&r);else if(t<"\uD800"||"\uDBFF"<t)this.Jt(480|r>>>12),this.Jt(128|63&r>>>6),this.Jt(128|63&r);else{const s=t.codePointAt(0);this.Jt(240|s>>>18),this.Jt(128|63&s>>>12),this.Jt(128|63&s>>>6),this.Jt(128|63&s)}}this.Ht()}Yt(e){const t=this.en(e),r=Fd(t);this.tn(1+r),this.buffer[this.position++]=255&r;for(let s=t.length-r;s<t.length;++s)this.buffer[this.position++]=255&t[s]}nn(e){const t=this.en(e),r=Fd(t);this.tn(1+r),this.buffer[this.position++]=~(255&r);for(let s=t.length-r;s<t.length;++s)this.buffer[this.position++]=~(255&t[s])}rn(){this.sn(cr),this.sn(255)}_n(){this.an(cr),this.an(255)}reset(){this.position=0}seed(e){this.tn(e.length),this.buffer.set(e,this.position),this.position+=e.length}un(){return this.buffer.slice(0,this.position)}en(e){const t=function(i){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,i,!1),new Uint8Array(o.buffer)}(e),r=!!(128&t[0]);t[0]^=r?255:128;for(let s=1;s<t.length;++s)t[s]^=r?255:0;return t}Gt(e){const t=255&e;t===0?(this.sn(0),this.sn(255)):t===cr?(this.sn(cr),this.sn(0)):this.sn(t)}Jt(e){const t=255&e;t===0?(this.an(0),this.an(255)):t===cr?(this.an(cr),this.an(0)):this.an(e)}zt(){this.sn(0),this.sn(1)}Ht(){this.an(0),this.an(1)}sn(e){this.tn(1),this.buffer[this.position++]=e}an(e){this.tn(1),this.buffer[this.position++]=~e}tn(e){const t=e+this.position;if(t<=this.buffer.length)return;let r=2*this.buffer.length;r<t&&(r=t);const s=new Uint8Array(r);s.set(this.buffer),this.buffer=s}}class Hv{constructor(e){this.cn=e}Bt(e){this.cn.Qt(e)}xt(e){this.cn.Zt(e)}Mt(e){this.cn.Yt(e)}vt(){this.cn.rn()}}class Wv{constructor(e){this.cn=e}Bt(e){this.cn.jt(e)}xt(e){this.cn.Xt(e)}Mt(e){this.cn.nn(e)}vt(){this.cn._n()}}class Is{constructor(){this.cn=new Gv,this.ascending=new Hv(this.cn),this.descending=new Wv(this.cn)}seed(e){this.cn.seed(e)}ln(e){return e===0?this.ascending:this.descending}un(){return this.cn.un()}reset(){this.cn.reset()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vn{constructor(e,t,r,s){this.hn=e,this.Pn=t,this.Tn=r,this.In=s}En(){const e=this.In.length,t=e===0||this.In[e-1]===255?e+1:e,r=new Uint8Array(t);return r.set(this.In,0),t!==e?r.set([0],this.In.length):++r[r.length-1],new Vn(this.hn,this.Pn,this.Tn,r)}Rn(e,t,r){return{indexId:this.hn,uid:e,arrayValue:po(this.Tn),directionalValue:po(this.In),orderedDocumentKey:po(t),documentKey:r.path.toArray()}}An(e,t,r){const s=this.Rn(e,t,r);return[s.indexId,s.uid,s.arrayValue,s.directionalValue,s.orderedDocumentKey,s.documentKey]}}function Gt(n,e){let t=n.hn-e.hn;return t!==0?t:(t=Ud(n.Tn,e.Tn),t!==0?t:(t=Ud(n.In,e.In),t!==0?t:x.comparator(n.Pn,e.Pn)))}function Ud(n,e){for(let t=0;t<n.length&&t<e.length;++t){const r=n[t]-e[t];if(r!==0)return r}return n.length-e.length}function po(n){return Xf()?function(t){let r="";for(let s=0;s<t.length;s++)r+=String.fromCharCode(t[s]);return r}(n):n}function Bd(n){return typeof n!="string"?n:function(t){const r=new Uint8Array(t.length);for(let s=0;s<t.length;s++)r[s]=t.charCodeAt(s);return r}(n)}class qd{constructor(e){this.Vn=new re((t,r)=>he.comparator(t.field,r.field)),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.dn=e.orderBy,this.mn=[];for(const t of e.filters){const r=t;r.isInequality()?this.Vn=this.Vn.add(r):this.mn.push(r)}}get fn(){return this.Vn.size>1}gn(e){if(F(e.collectionGroup===this.collectionId,49279),this.fn)return!1;const t=Ac(e);if(t!==void 0&&!this.pn(t))return!1;const r=Sn(e);let s=new Set,i=0,o=0;for(;i<r.length&&this.pn(r[i]);++i)s=s.add(r[i].fieldPath.canonicalString());if(i===r.length)return!0;if(this.Vn.size>0){const c=this.Vn.getIterator().getNext();if(!s.has(c.field.canonicalString())){const u=r[i];if(!this.yn(c,u)||!this.wn(this.dn[o++],u))return!1}++i}for(;i<r.length;++i){const c=r[i];if(o>=this.dn.length||!this.wn(this.dn[o++],c))return!1}return!0}Sn(){if(this.fn)return null;let e=new re(he.comparator);const t=[];for(const r of this.mn)if(!r.field.isKeyField())if(r.op==="array-contains"||r.op==="array-contains-any")t.push(new io(r.field,2));else{if(e.has(r.field))continue;e=e.add(r.field),t.push(new io(r.field,0))}for(const r of this.dn)r.field.isKeyField()||e.has(r.field)||(e=e.add(r.field),t.push(new io(r.field,r.dir==="asc"?0:1)));return new Ao(Ao.UNKNOWN_ID,this.collectionId,t,Gs.empty())}pn(e){for(const t of this.mn)if(this.yn(t,e))return!0;return!1}yn(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const r=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===r}wn(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function og(n){var t,r;if(F(n instanceof Y||n instanceof ne,20012),n instanceof Y){if(n instanceof Am){const s=((r=(t=n.value.arrayValue)==null?void 0:t.values)==null?void 0:r.map(i=>Y.create(n.field,"==",i)))||[];return ne.create(s,"or")}return n}const e=n.filters.map(s=>og(s));return ne.create(e,n.op)}function Qv(n){if(n.getFilters().length===0)return[];const e=qc(og(n));return F(ag(e),7391),Uc(e)||Bc(e)?[e]:e.getFilters()}function Uc(n){return n instanceof Y}function Bc(n){return n instanceof ne&&Tu(n)}function ag(n){return Uc(n)||Bc(n)||function(t){if(t instanceof ne&&Dc(t)){for(const r of t.getFilters())if(!Uc(r)&&!Bc(r))return!1;return!0}return!1}(n)}function qc(n){if(F(n instanceof Y||n instanceof ne,34018),n instanceof Y)return n;if(n.filters.length===1)return qc(n.filters[0]);const e=n.filters.map(r=>qc(r));let t=ne.create(e,n.op);return t=Vo(t),ag(t)?t:(F(t instanceof ne,64498),F(Nr(t),40251),F(t.filters.length>1,57927),t.filters.reduce((r,s)=>ku(r,s)))}function ku(n,e){let t;return F(n instanceof Y||n instanceof ne,38388),F(e instanceof Y||e instanceof ne,25473),t=n instanceof Y?e instanceof Y?function(s,i){return ne.create([s,i],"and")}(n,e):$d(n,e):e instanceof Y?$d(e,n):function(s,i){if(F(s.filters.length>0&&i.filters.length>0,48005),Nr(s)&&Nr(i))return Em(s,i.getFilters());const o=Dc(s)?s:i,c=Dc(s)?i:s,u=o.filters.map(l=>ku(l,c));return ne.create(u,"or")}(n,e),Vo(t)}function $d(n,e){if(Nr(e))return Em(e,n.getFilters());{const t=e.filters.map(r=>ku(n,r));return ne.create(t,"or")}}function Vo(n){if(F(n instanceof Y||n instanceof ne,11850),n instanceof Y)return n;const e=n.getFilters();if(e.length===1)return Vo(e[0]);if(Im(n))return n;const t=e.map(s=>Vo(s)),r=[];return t.forEach(s=>{s instanceof Y?r.push(s):s instanceof ne&&(s.op===n.op?r.push(...s.filters):r.push(s))}),r.length===1?r[0]:ne.create(r,n.op)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jv{constructor(){this.bn=new Du}addToCollectionParentIndex(e,t){return this.bn.add(t),A.resolve()}getCollectionParents(e,t){return A.resolve(this.bn.getEntries(t))}addFieldIndex(e,t){return A.resolve()}deleteFieldIndex(e,t){return A.resolve()}deleteAllFieldIndexes(e){return A.resolve()}createTargetIndexes(e,t){return A.resolve()}getDocumentsMatchingTarget(e,t){return A.resolve(null)}getIndexType(e,t){return A.resolve(0)}getFieldIndexes(e,t){return A.resolve([])}getNextCollectionGroupToUpdate(e){return A.resolve(null)}getMinOffset(e,t){return A.resolve(Ye.min())}getMinOffsetFromCollectionGroup(e,t){return A.resolve(Ye.min())}updateCollectionGroup(e,t,r){return A.resolve()}updateIndexEntries(e,t){return A.resolve()}}class Du{constructor(){this.index={}}add(e){const t=e.lastSegment(),r=e.popLast(),s=this.index[t]||new re(ee.comparator),i=!s.has(r);return this.index[t]=s.add(r),i}has(e){const t=e.lastSegment(),r=e.popLast(),s=this.index[t];return s&&s.has(r)}getEntries(e){return(this.index[e]||new re(ee.comparator)).toArray()}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const jd="IndexedDbIndexManager",Wi=new Uint8Array(0);class Yv{constructor(e,t){this.databaseId=t,this.Dn=new Du,this.Cn=new Mt(r=>zn(r),(r,s)=>Ii(r,s)),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.Dn.has(t)){const r=t.lastSegment(),s=t.popLast();e.addOnCommittedListener(()=>{this.Dn.add(t)});const i={collectionId:r,parent:Ne(s)};return zd(e).put(i)}return A.resolve()}getCollectionParents(e,t){const r=[],s=IDBKeyRange.bound([t,""],[jp(t),""],!1,!0);return zd(e).J(s).next(i=>{for(const o of i){if(o.collectionId!==t)break;r.push(lt(o.parent))}return r})}addFieldIndex(e,t){const r=Ts(e),s=function(c){return{indexId:c.indexId,collectionGroup:c.collectionGroup,fields:c.fields.map(u=>[u.fieldPath.canonicalString(),u.kind])}}(t);delete s.indexId;const i=r.add(s);if(t.indexState){const o=lr(e);return i.next(c=>{o.put(xd(c,this.uid,t.indexState.sequenceNumber,t.indexState.offset))})}return i.next()}deleteFieldIndex(e,t){const r=Ts(e),s=lr(e),i=ur(e);return r.delete(t.indexId).next(()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))).next(()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))}deleteAllFieldIndexes(e){const t=Ts(e),r=ur(e),s=lr(e);return t.X().next(()=>r.X()).next(()=>s.X())}createTargetIndexes(e,t){return A.forEach(this.vn(t),r=>this.getIndexType(e,r).next(s=>{if(s===0||s===1){const i=new qd(r).Sn();if(i!=null)return this.addFieldIndex(e,i)}}))}getDocumentsMatchingTarget(e,t){const r=ur(e);let s=!0;const i=new Map;return A.forEach(this.vn(t),o=>this.Fn(e,o).next(c=>{s&&(s=!!c),i.set(o,c)})).next(()=>{if(s){let o=W();const c=[];return A.forEach(i,(u,l)=>{D(jd,`Using index ${function(U){return`id=${U.indexId}|cg=${U.collectionGroup}|f=${U.fields.map(K=>`${K.fieldPath}:${K.kind}`).join(",")}`}(u)} to execute ${zn(t)}`);const f=function(U,K){const G=Ac(K);if(G===void 0)return null;for(const Q of Co(U,G.fieldPath))switch(Q.op){case"array-contains-any":return Q.value.arrayValue.values||[];case"array-contains":return[Q.value]}return null}(l,u),p=function(U,K){const G=new Map;for(const Q of Sn(K))for(const T of Co(U,Q.fieldPath))switch(T.op){case"==":case"in":G.set(Q.fieldPath.canonicalString(),T.value);break;case"not-in":case"!=":return G.set(Q.fieldPath.canonicalString(),T.value),Array.from(G.values())}return null}(l,u),g=function(U,K){const G=[];let Q=!0;for(const T of Sn(K)){const _=T.kind===0?Ed(U,T.fieldPath,U.startAt):wd(U,T.fieldPath,U.startAt);G.push(_.value),Q&&(Q=_.inclusive)}return new Vr(G,Q)}(l,u),v=function(U,K){const G=[];let Q=!0;for(const T of Sn(K)){const _=T.kind===0?wd(U,T.fieldPath,U.endAt):Ed(U,T.fieldPath,U.endAt);G.push(_.value),Q&&(Q=_.inclusive)}return new Vr(G,Q)}(l,u),C=this.Mn(u,l,g),V=this.Mn(u,l,v),k=this.xn(u,l,p),$=this.On(u.indexId,f,C,g.inclusive,V,v.inclusive,k);return A.forEach($,q=>r.Z(q,t.limit).next(U=>{U.forEach(K=>{const G=x.fromSegments(K.documentKey);o.has(G)||(o=o.add(G),c.push(G))})}))}).next(()=>c)}return A.resolve(null)})}vn(e){let t=this.Cn.get(e);return t||(e.filters.length===0?t=[e]:t=Qv(ne.create(e.filters,"and")).map(r=>Nc(e.path,e.collectionGroup,e.orderBy,r.getFilters(),e.limit,e.startAt,e.endAt)),this.Cn.set(e,t),t)}On(e,t,r,s,i,o,c){const u=(t!=null?t.length:1)*Math.max(r.length,i.length),l=u/(t!=null?t.length:1),f=[];for(let p=0;p<u;++p){const g=t?this.Nn(t[p/l]):Wi,v=this.Bn(e,g,r[p%l],s),C=this.Ln(e,g,i[p%l],o),V=c.map(k=>this.Bn(e,g,k,!0));f.push(...this.createRange(v,C,V))}return f}Bn(e,t,r,s){const i=new Vn(e,x.empty(),t,r);return s?i:i.En()}Ln(e,t,r,s){const i=new Vn(e,x.empty(),t,r);return s?i.En():i}Fn(e,t){const r=new qd(t),s=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,s).next(i=>{let o=null;for(const c of i)r.gn(c)&&(!o||c.fields.length>o.fields.length)&&(o=c);return o})}getIndexType(e,t){let r=2;const s=this.vn(t);return A.forEach(s,i=>this.Fn(e,i).next(o=>{o?r!==0&&o.fields.length<function(u){let l=new re(he.comparator),f=!1;for(const p of u.filters)for(const g of p.getFlattenedFilters())g.field.isKeyField()||(g.op==="array-contains"||g.op==="array-contains-any"?f=!0:l=l.add(g.field));for(const p of u.orderBy)p.field.isKeyField()||(l=l.add(p.field));return l.size+(f?1:0)}(i)&&(r=1):r=0})).next(()=>function(o){return o.limit!==null}(t)&&s.length>1&&r===2?1:r)}kn(e,t){const r=new Is;for(const s of Sn(e)){const i=t.data.field(s.fieldPath);if(i==null)return null;const o=r.ln(s.kind);Dn.Wt.Dt(i,o)}return r.un()}Nn(e){const t=new Is;return Dn.Wt.Dt(e,t.ln(0)),t.un()}Kn(e,t){const r=new Is;return Dn.Wt.Dt(ei(this.databaseId,t),r.ln(function(i){const o=Sn(i);return o.length===0?0:o[o.length-1].kind}(e))),r.un()}xn(e,t,r){if(r===null)return[];let s=[];s.push(new Is);let i=0;for(const o of Sn(e)){const c=r[i++];for(const u of s)if(this.qn(t,o.fieldPath)&&ti(c))s=this.Un(s,o,c);else{const l=u.ln(o.kind);Dn.Wt.Dt(c,l)}}return this.$n(s)}Mn(e,t,r){return this.xn(e,t,r.position)}$n(e){const t=[];for(let r=0;r<e.length;++r)t[r]=e[r].un();return t}Un(e,t,r){const s=[...e],i=[];for(const o of r.arrayValue.values||[])for(const c of s){const u=new Is;u.seed(c.un()),Dn.Wt.Dt(o,u.ln(t.kind)),i.push(u)}return i}qn(e,t){return!!e.filters.find(r=>r instanceof Y&&r.field.isEqual(t)&&(r.op==="in"||r.op==="not-in"))}getFieldIndexes(e,t){const r=Ts(e),s=lr(e);return(t?r.J(Rc,IDBKeyRange.bound(t,t)):r.J()).next(i=>{const o=[];return A.forEach(i,c=>s.get([c.indexId,this.uid]).next(u=>{o.push(function(f,p){const g=p?new Gs(p.sequenceNumber,new Ye(Hn(p.readTime),new x(lt(p.documentKey)),p.largestBatchId)):Gs.empty(),v=f.fields.map(([C,V])=>new io(he.fromServerFormat(C),V));return new Ao(f.indexId,f.collectionGroup,v,g)}(c,u))})).next(()=>o)})}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next(t=>t.length===0?null:(t.sort((r,s)=>{const i=r.indexState.sequenceNumber-s.indexState.sequenceNumber;return i!==0?i:z(r.collectionGroup,s.collectionGroup)}),t[0].collectionGroup))}updateCollectionGroup(e,t,r){const s=Ts(e),i=lr(e);return this.Wn(e).next(o=>s.J(Rc,IDBKeyRange.bound(t,t)).next(c=>A.forEach(c,u=>i.put(xd(u.indexId,this.uid,o,r)))))}updateIndexEntries(e,t){const r=new Map;return A.forEach(t,(s,i)=>{const o=r.get(s.collectionGroup);return(o?A.resolve(o):this.getFieldIndexes(e,s.collectionGroup)).next(c=>(r.set(s.collectionGroup,c),A.forEach(c,u=>this.Qn(e,s,u).next(l=>{const f=this.Gn(i,u);return l.isEqual(f)?A.resolve():this.zn(e,i,u,l,f)}))))})}jn(e,t,r,s){return ur(e).put(s.Rn(this.uid,this.Kn(r,t.key),t.key))}Jn(e,t,r,s){return ur(e).delete(s.An(this.uid,this.Kn(r,t.key),t.key))}Qn(e,t,r){const s=ur(e);let i=new re(Gt);return s.ee({index:nm,range:IDBKeyRange.only([r.indexId,this.uid,po(this.Kn(r,t))])},(o,c)=>{i=i.add(new Vn(r.indexId,t,Bd(c.arrayValue),Bd(c.directionalValue)))}).next(()=>i)}Gn(e,t){let r=new re(Gt);const s=this.kn(t,e);if(s==null)return r;const i=Ac(t);if(i!=null){const o=e.data.field(i.fieldPath);if(ti(o))for(const c of o.arrayValue.values||[])r=r.add(new Vn(t.indexId,e.key,this.Nn(c),s))}else r=r.add(new Vn(t.indexId,e.key,Wi,s));return r}zn(e,t,r,s,i){D(jd,"Updating index entries for document '%s'",t.key);const o=[];return function(u,l,f,p,g){const v=u.getIterator(),C=l.getIterator();let V=ar(v),k=ar(C);for(;V||k;){let $=!1,q=!1;if(V&&k){const U=f(V,k);U<0?q=!0:U>0&&($=!0)}else V!=null?q=!0:$=!0;$?(p(k),k=ar(C)):q?(g(V),V=ar(v)):(V=ar(v),k=ar(C))}}(s,i,Gt,c=>{o.push(this.jn(e,t,r,c))},c=>{o.push(this.Jn(e,t,r,c))}),A.waitFor(o)}Wn(e){let t=1;return lr(e).ee({index:tm,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(r,s,i)=>{i.done(),t=s.sequenceNumber+1}).next(()=>t)}createRange(e,t,r){r=r.sort((o,c)=>Gt(o,c)).filter((o,c,u)=>!c||Gt(o,u[c-1])!==0);const s=[];s.push(e);for(const o of r){const c=Gt(o,e),u=Gt(o,t);if(c===0)s[0]=e.En();else if(c>0&&u<0)s.push(o),s.push(o.En());else if(u>0)break}s.push(t);const i=[];for(let o=0;o<s.length;o+=2){if(this.Hn(s[o],s[o+1]))return[];const c=s[o].An(this.uid,Wi,x.empty()),u=s[o+1].An(this.uid,Wi,x.empty());i.push(IDBKeyRange.bound(c,u))}return i}Hn(e,t){return Gt(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(Kd)}getMinOffset(e,t){return A.mapArray(this.vn(t),r=>this.Fn(e,r).next(s=>s||M(44426))).next(Kd)}}function zd(n){return Ee(n,Js)}function ur(n){return Ee(n,xs)}function Ts(n){return Ee(n,pu)}function lr(n){return Ee(n,Os)}function Kd(n){F(n.length!==0,28825);let e=n[0].indexState.offset,t=e.largestBatchId;for(let r=1;r<n.length;r++){const s=n[r].indexState.offset;hu(s,e)<0&&(e=s),t<s.largestBatchId&&(t=s.largestBatchId)}return new Ye(e.readTime,e.documentKey,t)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gd={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},cg=41943040;class De{static withCacheSize(e){return new De(e,De.DEFAULT_COLLECTION_PERCENTILE,De.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,r){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=r}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ug(n,e,t){const r=n.store(nt),s=n.store(Rr),i=[],o=IDBKeyRange.only(t.batchId);let c=0;const u=r.ee({range:o},(f,p,g)=>(c++,g.delete()));i.push(u.next(()=>{F(c===1,47070,{batchId:t.batchId})}));const l=[];for(const f of t.mutations){const p=Xp(e,f.key.path,t.batchId);i.push(s.delete(p)),l.push(f.key)}return A.waitFor(i).next(()=>l)}function No(n){if(!n)return 0;let e;if(n.document)e=n.document;else if(n.unknownDocument)e=n.unknownDocument;else{if(!n.noDocument)throw M(14731);e=n.noDocument}return JSON.stringify(e).length}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */De.DEFAULT_COLLECTION_PERCENTILE=10,De.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,De.DEFAULT=new De(cg,De.DEFAULT_COLLECTION_PERCENTILE,De.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),De.DISABLED=new De(-1,0,0);class ua{constructor(e,t,r,s){this.userId=e,this.serializer=t,this.indexManager=r,this.referenceDelegate=s,this.Zn={}}static wt(e,t,r,s){F(e.uid!=="",64387);const i=e.isAuthenticated()?e.uid:"";return new ua(i,t,r,s)}checkEmpty(e){let t=!0;const r=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return Ht(e).ee({index:Nn,range:r},(s,i,o)=>{t=!1,o.done()}).next(()=>t)}addMutationBatch(e,t,r,s){const i=gr(e),o=Ht(e);return o.add({}).next(c=>{F(typeof c=="number",49019);const u=new Au(c,t,r,s),l=function(v,C,V){const k=V.baseMutations.map(q=>si(v.yt,q)),$=V.mutations.map(q=>si(v.yt,q));return{userId:C,batchId:V.batchId,localWriteTimeMs:V.localWriteTime.toMillis(),baseMutations:k,mutations:$}}(this.serializer,this.userId,u),f=[];let p=new re((g,v)=>z(g.canonicalString(),v.canonicalString()));for(const g of s){const v=Xp(this.userId,g.key.path,c);p=p.add(g.key.path.popLast()),f.push(o.put(l)),f.push(i.put(v,Aw))}return p.forEach(g=>{f.push(this.indexManager.addToCollectionParentIndex(e,g))}),e.addOnCommittedListener(()=>{this.Zn[c]=u.keys()}),A.waitFor(f).next(()=>u)})}lookupMutationBatch(e,t){return Ht(e).get(t).next(r=>r?(F(r.userId===this.userId,48,"Unexpected user for mutation batch",{userId:r.userId,batchId:t}),kn(this.serializer,r)):null)}Xn(e,t){return this.Zn[t]?A.resolve(this.Zn[t]):this.lookupMutationBatch(e,t).next(r=>{if(r){const s=r.keys();return this.Zn[t]=s,s}return null})}getNextMutationBatchAfterBatchId(e,t){const r=t+1,s=IDBKeyRange.lowerBound([this.userId,r]);let i=null;return Ht(e).ee({index:Nn,range:s},(o,c,u)=>{c.userId===this.userId&&(F(c.batchId>=r,47524,{Yn:r}),i=kn(this.serializer,c)),u.done()}).next(()=>i)}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let r=xn;return Ht(e).ee({index:Nn,range:t,reverse:!0},(s,i,o)=>{r=i.batchId,o.done()}).next(()=>r)}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,xn],[this.userId,Number.POSITIVE_INFINITY]);return Ht(e).J(Nn,t).next(r=>r.map(s=>kn(this.serializer,s)))}getAllMutationBatchesAffectingDocumentKey(e,t){const r=oo(this.userId,t.path),s=IDBKeyRange.lowerBound(r),i=[];return gr(e).ee({range:s},(o,c,u)=>{const[l,f,p]=o,g=lt(f);if(l===this.userId&&t.path.isEqual(g))return Ht(e).get(p).next(v=>{if(!v)throw M(61480,{er:o,batchId:p});F(v.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:v.userId,batchId:p}),i.push(kn(this.serializer,v))});u.done()}).next(()=>i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let r=new re(z);const s=[];return t.forEach(i=>{const o=oo(this.userId,i.path),c=IDBKeyRange.lowerBound(o),u=gr(e).ee({range:c},(l,f,p)=>{const[g,v,C]=l,V=lt(v);g===this.userId&&i.path.isEqual(V)?r=r.add(C):p.done()});s.push(u)}),A.waitFor(s).next(()=>this.tr(e,r))}getAllMutationBatchesAffectingQuery(e,t){const r=t.path,s=r.length+1,i=oo(this.userId,r),o=IDBKeyRange.lowerBound(i);let c=new re(z);return gr(e).ee({range:o},(u,l,f)=>{const[p,g,v]=u,C=lt(g);p===this.userId&&r.isPrefixOf(C)?C.length===s&&(c=c.add(v)):f.done()}).next(()=>this.tr(e,c))}tr(e,t){const r=[],s=[];return t.forEach(i=>{s.push(Ht(e).get(i).next(o=>{if(o===null)throw M(35274,{batchId:i});F(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:i}),r.push(kn(this.serializer,o))}))}),A.waitFor(s).next(()=>r)}removeMutationBatch(e,t){return ug(e.le,this.userId,t).next(r=>(e.addOnCommittedListener(()=>{this.nr(t.batchId)}),A.forEach(r,s=>this.referenceDelegate.markPotentiallyOrphaned(e,s))))}nr(e){delete this.Zn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next(t=>{if(!t)return A.resolve();const r=IDBKeyRange.lowerBound(function(o){return[o]}(this.userId)),s=[];return gr(e).ee({range:r},(i,o,c)=>{if(i[0]===this.userId){const u=lt(i[1]);s.push(u)}else c.done()}).next(()=>{F(s.length===0,56720,{rr:s.map(i=>i.canonicalString())})})})}containsKey(e,t){return lg(e,this.userId,t)}ir(e){return hg(e).get(this.userId).next(t=>t||{userId:this.userId,lastAcknowledgedBatchId:xn,lastStreamToken:""})}}function lg(n,e,t){const r=oo(e,t.path),s=r[1],i=IDBKeyRange.lowerBound(r);let o=!1;return gr(n).ee({range:i,Y:!0},(c,u,l)=>{const[f,p,g]=c;f===e&&p===s&&(o=!0),l.done()}).next(()=>o)}function Ht(n){return Ee(n,nt)}function gr(n){return Ee(n,Rr)}function hg(n){return Ee(n,Ws)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vt{constructor(e){this.sr=e}next(){return this.sr+=2,this.sr}static _r(){return new Vt(0)}static ar(){return new Vt(-1)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xv{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.ur(e).next(t=>{const r=new Vt(t.highestTargetId);return t.highestTargetId=r.next(),this.cr(e,t).next(()=>t.highestTargetId)})}getLastRemoteSnapshotVersion(e){return this.ur(e).next(t=>B.fromTimestamp(new te(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(e){return this.ur(e).next(t=>t.highestListenSequenceNumber)}setTargetsMetadata(e,t,r){return this.ur(e).next(s=>(s.highestListenSequenceNumber=t,r&&(s.lastRemoteSnapshotVersion=r.toTimestamp()),t>s.highestListenSequenceNumber&&(s.highestListenSequenceNumber=t),this.cr(e,s)))}addTargetData(e,t){return this.lr(e,t).next(()=>this.ur(e).next(r=>(r.targetCount+=1,this.hr(t,r),this.cr(e,r))))}updateTargetData(e,t){return this.lr(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next(()=>hr(e).delete(t.targetId)).next(()=>this.ur(e)).next(r=>(F(r.targetCount>0,8065),r.targetCount-=1,this.cr(e,r)))}removeTargets(e,t,r){let s=0;const i=[];return hr(e).ee((o,c)=>{const u=ks(c);u.sequenceNumber<=t&&r.get(u.targetId)===null&&(s++,i.push(this.removeTargetData(e,u)))}).next(()=>A.waitFor(i)).next(()=>s)}forEachTarget(e,t){return hr(e).ee((r,s)=>{const i=ks(s);t(i)})}ur(e){return Hd(e).get(So).next(t=>(F(t!==null,2888),t))}cr(e,t){return Hd(e).put(So,t)}lr(e,t){return hr(e).put(sg(this.serializer,t))}hr(e,t){let r=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,r=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,r=!0),r}getTargetCount(e){return this.ur(e).next(t=>t.targetCount)}getTargetData(e,t){const r=zn(t),s=IDBKeyRange.bound([r,Number.NEGATIVE_INFINITY],[r,Number.POSITIVE_INFINITY]);let i=null;return hr(e).ee({range:s,index:em},(o,c,u)=>{const l=ks(c);Ii(t,l.target)&&(i=l,u.done())}).next(()=>i)}addMatchingKeys(e,t,r){const s=[],i=en(e);return t.forEach(o=>{const c=Ne(o.path);s.push(i.put({targetId:r,path:c})),s.push(this.referenceDelegate.addReference(e,r,o))}),A.waitFor(s)}removeMatchingKeys(e,t,r){const s=en(e);return A.forEach(t,i=>{const o=Ne(i.path);return A.waitFor([s.delete([r,o]),this.referenceDelegate.removeReference(e,r,i)])})}removeMatchingKeysForTargetId(e,t){const r=en(e),s=IDBKeyRange.bound([t],[t+1],!1,!0);return r.delete(s)}getMatchingKeysForTargetId(e,t){const r=IDBKeyRange.bound([t],[t+1],!1,!0),s=en(e);let i=W();return s.ee({range:r,Y:!0},(o,c,u)=>{const l=lt(o[1]),f=new x(l);i=i.add(f)}).next(()=>i)}containsKey(e,t){const r=Ne(t.path),s=IDBKeyRange.bound([r],[jp(r)],!1,!0);let i=0;return en(e).ee({index:fu,Y:!0,range:s},([o,c],u,l)=>{o!==0&&(i++,l.done())}).next(()=>i>0)}At(e,t){return hr(e).get(t).next(r=>r?ks(r):null)}}function hr(n){return Ee(n,Sr)}function Hd(n){return Ee(n,Mn)}function en(n){return Ee(n,Pr)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Wd="LruGarbageCollector",dg=1048576;function Qd([n,e],[t,r]){const s=z(n,t);return s===0?z(e,r):s}class Zv{constructor(e){this.Pr=e,this.buffer=new re(Qd),this.Tr=0}Ir(){return++this.Tr}Er(e){const t=[e,this.Ir()];if(this.buffer.size<this.Pr)this.buffer=this.buffer.add(t);else{const r=this.buffer.last();Qd(t,r)<0&&(this.buffer=this.buffer.delete(r).add(t))}}get maxValue(){return this.buffer.last()[0]}}class fg{constructor(e,t,r){this.garbageCollector=e,this.asyncQueue=t,this.localStore=r,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Ar(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Ar(e){D(Wd,`Garbage collection scheduled in ${e}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){gn(t)?D(Wd,"Ignoring IndexedDB error during garbage collection: ",t):await mn(t)}await this.Ar(3e5)})}}class eA{constructor(e,t){this.Vr=e,this.params=t}calculateTargetCount(e,t){return this.Vr.dr(e).next(r=>Math.floor(t/100*r))}nthSequenceNumber(e,t){if(t===0)return A.resolve(qe.ce);const r=new Zv(t);return this.Vr.forEachTarget(e,s=>r.Er(s.sequenceNumber)).next(()=>this.Vr.mr(e,s=>r.Er(s))).next(()=>r.maxValue)}removeTargets(e,t,r){return this.Vr.removeTargets(e,t,r)}removeOrphanedDocuments(e,t){return this.Vr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(D("LruGarbageCollector","Garbage collection skipped; disabled"),A.resolve(Gd)):this.getCacheSize(e).next(r=>r<this.params.cacheSizeCollectionThreshold?(D("LruGarbageCollector",`Garbage collection skipped; Cache size ${r} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),Gd):this.gr(e,t))}getCacheSize(e){return this.Vr.getCacheSize(e)}gr(e,t){let r,s,i,o,c,u,l;const f=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(p=>(p>this.params.maximumSequenceNumbersToCollect?(D("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${p}`),s=this.params.maximumSequenceNumbersToCollect):s=p,o=Date.now(),this.nthSequenceNumber(e,s))).next(p=>(r=p,c=Date.now(),this.removeTargets(e,r,t))).next(p=>(i=p,u=Date.now(),this.removeOrphanedDocuments(e,r))).next(p=>(l=Date.now(),fr()<=J.DEBUG&&D("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-f}ms
	Determined least recently used ${s} in `+(c-o)+`ms
	Removed ${i} targets in `+(u-c)+`ms
	Removed ${p} documents in `+(l-u)+`ms
Total Duration: ${l-f}ms`),A.resolve({didRun:!0,sequenceNumbersCollected:s,targetsRemoved:i,documentsRemoved:p})))}}function pg(n,e){return new eA(n,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tA{constructor(e,t){this.db=e,this.garbageCollector=pg(this,t)}dr(e){const t=this.pr(e);return this.db.getTargetCache().getTargetCount(e).next(r=>t.next(s=>r+s))}pr(e){let t=0;return this.mr(e,r=>{t++}).next(()=>t)}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}mr(e,t){return this.yr(e,(r,s)=>t(s))}addReference(e,t,r){return Qi(e,r)}removeReference(e,t,r){return Qi(e,r)}removeTargets(e,t,r){return this.db.getTargetCache().removeTargets(e,t,r)}markPotentiallyOrphaned(e,t){return Qi(e,t)}wr(e,t){return function(s,i){let o=!1;return hg(s).te(c=>lg(s,c,i).next(u=>(u&&(o=!0),A.resolve(!u)))).next(()=>o)}(e,t)}removeOrphanedDocuments(e,t){const r=this.db.getRemoteDocumentCache().newChangeBuffer(),s=[];let i=0;return this.yr(e,(o,c)=>{if(c<=t){const u=this.wr(e,o).next(l=>{if(!l)return i++,r.getEntry(e,o).next(()=>(r.removeEntry(o,B.min()),en(e).delete(function(p){return[0,Ne(p.path)]}(o))))});s.push(u)}}).next(()=>A.waitFor(s)).next(()=>r.apply(e)).next(()=>i)}removeTarget(e,t){const r=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,r)}updateLimboDocument(e,t){return Qi(e,t)}yr(e,t){const r=en(e);let s,i=qe.ce;return r.ee({index:fu},([o,c],{path:u,sequenceNumber:l})=>{o===0?(i!==qe.ce&&t(new x(lt(s)),i),i=l,s=u):i=qe.ce}).next(()=>{i!==qe.ce&&t(new x(lt(s)),i)})}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function Qi(n,e){return en(n).put(function(r,s){return{targetId:0,path:Ne(r.path),sequenceNumber:s}}(e,n.currentSequenceNumber))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mg{constructor(){this.changes=new Mt(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,ue.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const r=this.changes.get(t);return r!==void 0?A.resolve(r):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nA{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,r){return bn(e).put(r)}removeEntry(e,t,r){return bn(e).delete(function(i,o){const c=i.path.toArray();return[c.slice(0,c.length-2),c[c.length-2],Do(o),c[c.length-1]]}(t,r))}updateMetadata(e,t){return this.getMetadata(e).next(r=>(r.byteSize+=t,this.Sr(e,r)))}getEntry(e,t){let r=ue.newInvalidDocument(t);return bn(e).ee({index:ao,range:IDBKeyRange.only(Es(t))},(s,i)=>{r=this.br(t,i)}).next(()=>r)}Dr(e,t){let r={size:0,document:ue.newInvalidDocument(t)};return bn(e).ee({index:ao,range:IDBKeyRange.only(Es(t))},(s,i)=>{r={document:this.br(t,i),size:No(i)}}).next(()=>r)}getEntries(e,t){let r=He();return this.Cr(e,t,(s,i)=>{const o=this.br(s,i);r=r.insert(s,o)}).next(()=>r)}vr(e,t){let r=He(),s=new ie(x.comparator);return this.Cr(e,t,(i,o)=>{const c=this.br(i,o);r=r.insert(i,c),s=s.insert(i,No(o))}).next(()=>({documents:r,Fr:s}))}Cr(e,t,r){if(t.isEmpty())return A.resolve();let s=new re(Xd);t.forEach(u=>s=s.add(u));const i=IDBKeyRange.bound(Es(s.first()),Es(s.last())),o=s.getIterator();let c=o.getNext();return bn(e).ee({index:ao,range:i},(u,l,f)=>{const p=x.fromSegments([...l.prefixPath,l.collectionGroup,l.documentId]);for(;c&&Xd(c,p)<0;)r(c,null),c=o.getNext();c&&c.isEqual(p)&&(r(c,l),c=o.hasNext()?o.getNext():null),c?f.j(Es(c)):f.done()}).next(()=>{for(;c;)r(c,null),c=o.hasNext()?o.getNext():null})}getDocumentsMatchingQuery(e,t,r,s,i){const o=t.path,c=[o.popLast().toArray(),o.lastSegment(),Do(r.readTime),r.documentKey.path.isEmpty()?"":r.documentKey.path.lastSegment()],u=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return bn(e).J(IDBKeyRange.bound(c,u,!0)).next(l=>{i==null||i.incrementDocumentReadCount(l.length);let f=He();for(const p of l){const g=this.br(x.fromSegments(p.prefixPath.concat(p.collectionGroup,p.documentId)),p);g.isFoundDocument()&&(Ei(t,g)||s.has(g.key))&&(f=f.insert(g.key,g))}return f})}getAllFromCollectionGroup(e,t,r,s){let i=He();const o=Yd(t,r),c=Yd(t,Ye.max());return bn(e).ee({index:Zp,range:IDBKeyRange.bound(o,c,!0)},(u,l,f)=>{const p=this.br(x.fromSegments(l.prefixPath.concat(l.collectionGroup,l.documentId)),l);i=i.insert(p.key,p),i.size===s&&f.done()}).next(()=>i)}newChangeBuffer(e){return new rA(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next(t=>t.byteSize)}getMetadata(e){return Jd(e).get(bc).next(t=>(F(!!t,20021),t))}Sr(e,t){return Jd(e).put(bc,t)}br(e,t){if(t){const r=$v(this.serializer,t);if(!(r.isNoDocument()&&r.version.isEqual(B.min())))return r}return ue.newInvalidDocument(e)}}function gg(n){return new nA(n)}class rA extends mg{constructor(e,t){super(),this.Mr=e,this.trackRemovals=t,this.Or=new Mt(r=>r.toString(),(r,s)=>r.isEqual(s))}applyChanges(e){const t=[];let r=0,s=new re((i,o)=>z(i.canonicalString(),o.canonicalString()));return this.changes.forEach((i,o)=>{const c=this.Or.get(i);if(t.push(this.Mr.removeEntry(e,i,c.readTime)),o.isValidDocument()){const u=Nd(this.Mr.serializer,o);s=s.add(i.path.popLast());const l=No(u);r+=l-c.size,t.push(this.Mr.addEntry(e,i,u))}else if(r-=c.size,this.trackRemovals){const u=Nd(this.Mr.serializer,o.convertToNoDocument(B.min()));t.push(this.Mr.addEntry(e,i,u))}}),s.forEach(i=>{t.push(this.Mr.indexManager.addToCollectionParentIndex(e,i))}),t.push(this.Mr.updateMetadata(e,r)),A.waitFor(t)}getFromCache(e,t){return this.Mr.Dr(e,t).next(r=>(this.Or.set(t,{size:r.size,readTime:r.document.readTime}),r.document))}getAllFromCache(e,t){return this.Mr.vr(e,t).next(({documents:r,Fr:s})=>(s.forEach((i,o)=>{this.Or.set(i,{size:o,readTime:r.get(i).readTime})}),r))}}function Jd(n){return Ee(n,Qs)}function bn(n){return Ee(n,Ro)}function Es(n){const e=n.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function Yd(n,e){const t=e.documentKey.path.toArray();return[n,Do(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function Xd(n,e){const t=n.path.toArray(),r=e.path.toArray();let s=0;for(let i=0;i<t.length-2&&i<r.length-2;++i)if(s=z(t[i],r[i]),s)return s;return s=z(t.length,r.length),s||(s=z(t[t.length-2],r[r.length-2]),s||z(t[t.length-1],r[r.length-1]))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sA{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _g{constructor(e,t,r,s){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=r,this.indexManager=s}getDocument(e,t){let r=null;return this.documentOverlayCache.getOverlay(e,t).next(s=>(r=s,this.remoteDocumentCache.getEntry(e,t))).next(s=>(r!==null&&Us(r.mutation,s,$e.empty(),te.now()),s))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(r=>this.getLocalViewOfDocuments(e,r,W()).next(()=>r))}getLocalViewOfDocuments(e,t,r=W()){const s=ht();return this.populateOverlays(e,s,t).next(()=>this.computeViews(e,t,s,r).next(i=>{let o=Ps();return i.forEach((c,u)=>{o=o.insert(c,u.overlayedDocument)}),o}))}getOverlayedDocuments(e,t){const r=ht();return this.populateOverlays(e,r,t).next(()=>this.computeViews(e,t,r,W()))}populateOverlays(e,t,r){const s=[];return r.forEach(i=>{t.has(i)||s.push(i)}),this.documentOverlayCache.getOverlays(e,s).next(i=>{i.forEach((o,c)=>{t.set(o,c)})})}computeViews(e,t,r,s){let i=He();const o=Fs(),c=function(){return Fs()}();return t.forEach((u,l)=>{const f=r.get(l.key);s.has(l.key)&&(f===void 0||f.mutation instanceof Lt)?i=i.insert(l.key,l):f!==void 0?(o.set(l.key,f.mutation.getFieldMask()),Us(f.mutation,l,f.mutation.getFieldMask(),te.now())):o.set(l.key,$e.empty())}),this.recalculateAndSaveOverlays(e,i).next(u=>(u.forEach((l,f)=>o.set(l,f)),t.forEach((l,f)=>c.set(l,new sA(f,o.get(l)??null))),c))}recalculateAndSaveOverlays(e,t){const r=Fs();let s=new ie((o,c)=>o-c),i=W();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(o=>{for(const c of o)c.keys().forEach(u=>{const l=t.get(u);if(l===null)return;let f=r.get(u)||$e.empty();f=c.applyToLocalView(l,f),r.set(u,f);const p=(s.get(c.batchId)||W()).add(u);s=s.insert(c.batchId,p)})}).next(()=>{const o=[],c=s.getReverseIterator();for(;c.hasNext();){const u=c.getNext(),l=u.key,f=u.value,p=Nm();f.forEach(g=>{if(!i.has(g)){const v=Bm(t.get(g),r.get(g));v!==null&&p.set(g,v),i=i.add(g)}}),o.push(this.documentOverlayCache.saveOverlays(e,l,p))}return A.waitFor(o)}).next(()=>r)}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(r=>this.recalculateAndSaveOverlays(e,r))}getDocumentsMatchingQuery(e,t,r,s){return cv(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):Rm(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,r,s):this.getDocumentsMatchingCollectionQuery(e,t,r,s)}getNextDocuments(e,t,r,s){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,r,s).next(i=>{const o=s-i.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,r.largestBatchId,s-i.size):A.resolve(ht());let c=br,u=i;return o.next(l=>A.forEach(l,(f,p)=>(c<p.largestBatchId&&(c=p.largestBatchId),i.get(f)?A.resolve():this.remoteDocumentCache.getEntry(e,f).next(g=>{u=u.insert(f,g)}))).next(()=>this.populateOverlays(e,l,i)).next(()=>this.computeViews(e,u,l,W())).next(f=>({batchId:c,changes:Vm(f)})))})}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new x(t)).next(r=>{let s=Ps();return r.isFoundDocument()&&(s=s.insert(r.key,r)),s})}getDocumentsMatchingCollectionGroupQuery(e,t,r,s){const i=t.collectionGroup;let o=Ps();return this.indexManager.getCollectionParents(e,i).next(c=>A.forEach(c,u=>{const l=function(p,g){return new Kr(g,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt)}(t,u.child(i));return this.getDocumentsMatchingCollectionQuery(e,l,r,s).next(f=>{f.forEach((p,g)=>{o=o.insert(p,g)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,t,r,s){let i;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,r.largestBatchId).next(o=>(i=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,r,i,s))).next(o=>{i.forEach((u,l)=>{const f=l.getKey();o.get(f)===null&&(o=o.insert(f,ue.newInvalidDocument(f)))});let c=Ps();return o.forEach((u,l)=>{const f=i.get(u);f!==void 0&&Us(f.mutation,l,$e.empty(),te.now()),Ei(t,l)&&(c=c.insert(u,l))}),c})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iA{constructor(e){this.serializer=e,this.Nr=new Map,this.Br=new Map}getBundleMetadata(e,t){return A.resolve(this.Nr.get(t))}saveBundleMetadata(e,t){return this.Nr.set(t.id,function(s){return{id:s.id,version:s.version,createTime:Re(s.createTime)}}(t)),A.resolve()}getNamedQuery(e,t){return A.resolve(this.Br.get(t))}saveNamedQuery(e,t){return this.Br.set(t.name,function(s){return{name:s.name,query:ig(s.bundledQuery),readTime:Re(s.readTime)}}(t)),A.resolve()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oA{constructor(){this.overlays=new ie(x.comparator),this.Lr=new Map}getOverlay(e,t){return A.resolve(this.overlays.get(t))}getOverlays(e,t){const r=ht();return A.forEach(t,s=>this.getOverlay(e,s).next(i=>{i!==null&&r.set(s,i)})).next(()=>r)}saveOverlays(e,t,r){return r.forEach((s,i)=>{this.St(e,t,i)}),A.resolve()}removeOverlaysForBatchId(e,t,r){const s=this.Lr.get(r);return s!==void 0&&(s.forEach(i=>this.overlays=this.overlays.remove(i)),this.Lr.delete(r)),A.resolve()}getOverlaysForCollection(e,t,r){const s=ht(),i=t.length+1,o=new x(t.child("")),c=this.overlays.getIteratorFrom(o);for(;c.hasNext();){const u=c.getNext().value,l=u.getKey();if(!t.isPrefixOf(l.path))break;l.path.length===i&&u.largestBatchId>r&&s.set(u.getKey(),u)}return A.resolve(s)}getOverlaysForCollectionGroup(e,t,r,s){let i=new ie((l,f)=>l-f);const o=this.overlays.getIterator();for(;o.hasNext();){const l=o.getNext().value;if(l.getKey().getCollectionGroup()===t&&l.largestBatchId>r){let f=i.get(l.largestBatchId);f===null&&(f=ht(),i=i.insert(l.largestBatchId,f)),f.set(l.getKey(),l)}}const c=ht(),u=i.getIterator();for(;u.hasNext()&&(u.getNext().value.forEach((l,f)=>c.set(l,f)),!(c.size()>=s)););return A.resolve(c)}St(e,t,r){const s=this.overlays.get(r.key);if(s!==null){const o=this.Lr.get(s.largestBatchId).delete(r.key);this.Lr.set(s.largestBatchId,o)}this.overlays=this.overlays.insert(r.key,new Ru(t,r));let i=this.Lr.get(t);i===void 0&&(i=W(),this.Lr.set(t,i)),this.Lr.set(t,i.add(r.key))}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class aA{constructor(){this.sessionToken=ge.EMPTY_BYTE_STRING}getSessionToken(e){return A.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,A.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vu{constructor(){this.kr=new re(ve.Kr),this.qr=new re(ve.Ur)}isEmpty(){return this.kr.isEmpty()}addReference(e,t){const r=new ve(e,t);this.kr=this.kr.add(r),this.qr=this.qr.add(r)}$r(e,t){e.forEach(r=>this.addReference(r,t))}removeReference(e,t){this.Wr(new ve(e,t))}Qr(e,t){e.forEach(r=>this.removeReference(r,t))}Gr(e){const t=new x(new ee([])),r=new ve(t,e),s=new ve(t,e+1),i=[];return this.qr.forEachInRange([r,s],o=>{this.Wr(o),i.push(o.key)}),i}zr(){this.kr.forEach(e=>this.Wr(e))}Wr(e){this.kr=this.kr.delete(e),this.qr=this.qr.delete(e)}jr(e){const t=new x(new ee([])),r=new ve(t,e),s=new ve(t,e+1);let i=W();return this.qr.forEachInRange([r,s],o=>{i=i.add(o.key)}),i}containsKey(e){const t=new ve(e,0),r=this.kr.firstAfterOrEqual(t);return r!==null&&e.isEqual(r.key)}}class ve{constructor(e,t){this.key=e,this.Jr=t}static Kr(e,t){return x.comparator(e.key,t.key)||z(e.Jr,t.Jr)}static Ur(e,t){return z(e.Jr,t.Jr)||x.comparator(e.key,t.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cA{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.Yn=1,this.Hr=new re(ve.Kr)}checkEmpty(e){return A.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,r,s){const i=this.Yn;this.Yn++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new Au(i,t,r,s);this.mutationQueue.push(o);for(const c of s)this.Hr=this.Hr.add(new ve(c.key,i)),this.indexManager.addToCollectionParentIndex(e,c.key.path.popLast());return A.resolve(o)}lookupMutationBatch(e,t){return A.resolve(this.Zr(t))}getNextMutationBatchAfterBatchId(e,t){const r=t+1,s=this.Xr(r),i=s<0?0:s;return A.resolve(this.mutationQueue.length>i?this.mutationQueue[i]:null)}getHighestUnacknowledgedBatchId(){return A.resolve(this.mutationQueue.length===0?xn:this.Yn-1)}getAllMutationBatches(e){return A.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const r=new ve(t,0),s=new ve(t,Number.POSITIVE_INFINITY),i=[];return this.Hr.forEachInRange([r,s],o=>{const c=this.Zr(o.Jr);i.push(c)}),A.resolve(i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let r=new re(z);return t.forEach(s=>{const i=new ve(s,0),o=new ve(s,Number.POSITIVE_INFINITY);this.Hr.forEachInRange([i,o],c=>{r=r.add(c.Jr)})}),A.resolve(this.Yr(r))}getAllMutationBatchesAffectingQuery(e,t){const r=t.path,s=r.length+1;let i=r;x.isDocumentKey(i)||(i=i.child(""));const o=new ve(new x(i),0);let c=new re(z);return this.Hr.forEachWhile(u=>{const l=u.key.path;return!!r.isPrefixOf(l)&&(l.length===s&&(c=c.add(u.Jr)),!0)},o),A.resolve(this.Yr(c))}Yr(e){const t=[];return e.forEach(r=>{const s=this.Zr(r);s!==null&&t.push(s)}),t}removeMutationBatch(e,t){F(this.ei(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let r=this.Hr;return A.forEach(t.mutations,s=>{const i=new ve(s.key,t.batchId);return r=r.delete(i),this.referenceDelegate.markPotentiallyOrphaned(e,s.key)}).next(()=>{this.Hr=r})}nr(e){}containsKey(e,t){const r=new ve(t,0),s=this.Hr.firstAfterOrEqual(r);return A.resolve(t.isEqual(s&&s.key))}performConsistencyCheck(e){return this.mutationQueue.length,A.resolve()}ei(e,t){return this.Xr(e)}Xr(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Zr(e){const t=this.Xr(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uA{constructor(e){this.ti=e,this.docs=function(){return new ie(x.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const r=t.key,s=this.docs.get(r),i=s?s.size:0,o=this.ti(t);return this.docs=this.docs.insert(r,{document:t.mutableCopy(),size:o}),this.size+=o-i,this.indexManager.addToCollectionParentIndex(e,r.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const r=this.docs.get(t);return A.resolve(r?r.document.mutableCopy():ue.newInvalidDocument(t))}getEntries(e,t){let r=He();return t.forEach(s=>{const i=this.docs.get(s);r=r.insert(s,i?i.document.mutableCopy():ue.newInvalidDocument(s))}),A.resolve(r)}getDocumentsMatchingQuery(e,t,r,s){let i=He();const o=t.path,c=new x(o.child("__id-9223372036854775808__")),u=this.docs.getIteratorFrom(c);for(;u.hasNext();){const{key:l,value:{document:f}}=u.getNext();if(!o.isPrefixOf(l.path))break;l.path.length>o.length+1||hu(Hp(f),r)<=0||(s.has(f.key)||Ei(t,f))&&(i=i.insert(f.key,f.mutableCopy()))}return A.resolve(i)}getAllFromCollectionGroup(e,t,r,s){M(9500)}ni(e,t){return A.forEach(this.docs,r=>t(r))}newChangeBuffer(e){return new lA(this)}getSize(e){return A.resolve(this.size)}}class lA extends mg{constructor(e){super(),this.Mr=e}applyChanges(e){const t=[];return this.changes.forEach((r,s)=>{s.isValidDocument()?t.push(this.Mr.addEntry(e,s)):this.Mr.removeEntry(r)}),A.waitFor(t)}getFromCache(e,t){return this.Mr.getEntry(e,t)}getAllFromCache(e,t){return this.Mr.getEntries(e,t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hA{constructor(e){this.persistence=e,this.ri=new Mt(t=>zn(t),Ii),this.lastRemoteSnapshotVersion=B.min(),this.highestTargetId=0,this.ii=0,this.si=new Vu,this.targetCount=0,this.oi=Vt._r()}forEachTarget(e,t){return this.ri.forEach((r,s)=>t(s)),A.resolve()}getLastRemoteSnapshotVersion(e){return A.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return A.resolve(this.ii)}allocateTargetId(e){return this.highestTargetId=this.oi.next(),A.resolve(this.highestTargetId)}setTargetsMetadata(e,t,r){return r&&(this.lastRemoteSnapshotVersion=r),t>this.ii&&(this.ii=t),A.resolve()}lr(e){this.ri.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.oi=new Vt(t),this.highestTargetId=t),e.sequenceNumber>this.ii&&(this.ii=e.sequenceNumber)}addTargetData(e,t){return this.lr(t),this.targetCount+=1,A.resolve()}updateTargetData(e,t){return this.lr(t),A.resolve()}removeTargetData(e,t){return this.ri.delete(t.target),this.si.Gr(t.targetId),this.targetCount-=1,A.resolve()}removeTargets(e,t,r){let s=0;const i=[];return this.ri.forEach((o,c)=>{c.sequenceNumber<=t&&r.get(c.targetId)===null&&(this.ri.delete(o),i.push(this.removeMatchingKeysForTargetId(e,c.targetId)),s++)}),A.waitFor(i).next(()=>s)}getTargetCount(e){return A.resolve(this.targetCount)}getTargetData(e,t){const r=this.ri.get(t)||null;return A.resolve(r)}addMatchingKeys(e,t,r){return this.si.$r(t,r),A.resolve()}removeMatchingKeys(e,t,r){this.si.Qr(t,r);const s=this.persistence.referenceDelegate,i=[];return s&&t.forEach(o=>{i.push(s.markPotentiallyOrphaned(e,o))}),A.waitFor(i)}removeMatchingKeysForTargetId(e,t){return this.si.Gr(t),A.resolve()}getMatchingKeysForTargetId(e,t){const r=this.si.jr(t);return A.resolve(r)}containsKey(e,t){return A.resolve(this.si.containsKey(t))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nu{constructor(e,t){this._i={},this.overlays={},this.ai=new qe(0),this.ui=!1,this.ui=!0,this.ci=new aA,this.referenceDelegate=e(this),this.li=new hA(this),this.indexManager=new Jv,this.remoteDocumentCache=function(s){return new uA(s)}(r=>this.referenceDelegate.hi(r)),this.serializer=new rg(t),this.Pi=new iA(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.ui=!1,Promise.resolve()}get started(){return this.ui}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new oA,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let r=this._i[e.toKey()];return r||(r=new cA(t,this.referenceDelegate),this._i[e.toKey()]=r),r}getGlobalsCache(){return this.ci}getTargetCache(){return this.li}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Pi}runTransaction(e,t,r){D("MemoryPersistence","Starting transaction:",e);const s=new dA(this.ai.next());return this.referenceDelegate.Ti(),r(s).next(i=>this.referenceDelegate.Ii(s).next(()=>i)).toPromise().then(i=>(s.raiseOnCommittedEvent(),i))}Ei(e,t){return A.or(Object.values(this._i).map(r=>()=>r.containsKey(e,t)))}}class dA extends Qp{constructor(e){super(),this.currentSequenceNumber=e}}class la{constructor(e){this.persistence=e,this.Ri=new Vu,this.Ai=null}static Vi(e){return new la(e)}get di(){if(this.Ai)return this.Ai;throw M(60996)}addReference(e,t,r){return this.Ri.addReference(r,t),this.di.delete(r.toString()),A.resolve()}removeReference(e,t,r){return this.Ri.removeReference(r,t),this.di.add(r.toString()),A.resolve()}markPotentiallyOrphaned(e,t){return this.di.add(t.toString()),A.resolve()}removeTarget(e,t){this.Ri.Gr(t.targetId).forEach(s=>this.di.add(s.toString()));const r=this.persistence.getTargetCache();return r.getMatchingKeysForTargetId(e,t.targetId).next(s=>{s.forEach(i=>this.di.add(i.toString()))}).next(()=>r.removeTargetData(e,t))}Ti(){this.Ai=new Set}Ii(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return A.forEach(this.di,r=>{const s=x.fromPath(r);return this.mi(e,s).next(i=>{i||t.removeEntry(s,B.min())})}).next(()=>(this.Ai=null,t.apply(e)))}updateLimboDocument(e,t){return this.mi(e,t).next(r=>{r?this.di.delete(t.toString()):this.di.add(t.toString())})}hi(e){return 0}mi(e,t){return A.or([()=>A.resolve(this.Ri.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Ei(e,t)])}}class Oo{constructor(e,t){this.persistence=e,this.fi=new Mt(r=>Ne(r.path),(r,s)=>r.isEqual(s)),this.garbageCollector=pg(this,t)}static Vi(e,t){return new Oo(e,t)}Ti(){}Ii(e){return A.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}dr(e){const t=this.pr(e);return this.persistence.getTargetCache().getTargetCount(e).next(r=>t.next(s=>r+s))}pr(e){let t=0;return this.mr(e,r=>{t++}).next(()=>t)}mr(e,t){return A.forEach(this.fi,(r,s)=>this.wr(e,r,s).next(i=>i?A.resolve():t(s)))}removeTargets(e,t,r){return this.persistence.getTargetCache().removeTargets(e,t,r)}removeOrphanedDocuments(e,t){let r=0;const s=this.persistence.getRemoteDocumentCache(),i=s.newChangeBuffer();return s.ni(e,o=>this.wr(e,o,t).next(c=>{c||(r++,i.removeEntry(o,B.min()))})).next(()=>i.apply(e)).next(()=>r)}markPotentiallyOrphaned(e,t){return this.fi.set(t,e.currentSequenceNumber),A.resolve()}removeTarget(e,t){const r=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,r)}addReference(e,t,r){return this.fi.set(r,e.currentSequenceNumber),A.resolve()}removeReference(e,t,r){return this.fi.set(r,e.currentSequenceNumber),A.resolve()}updateLimboDocument(e,t){return this.fi.set(t,e.currentSequenceNumber),A.resolve()}hi(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=uo(e.data.value)),t}wr(e,t,r){return A.or([()=>this.persistence.Ei(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const s=this.fi.get(t);return A.resolve(s!==void 0&&s>r)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fA{constructor(e){this.serializer=e}k(e,t,r,s){const i=new Xo("createOrUpgrade",t);r<1&&s>=1&&(function(u){u.createObjectStore(yi)}(e),function(u){u.createObjectStore(Ws,{keyPath:vw}),u.createObjectStore(nt,{keyPath:ud,autoIncrement:!0}).createIndex(Nn,ld,{unique:!0}),u.createObjectStore(Rr)}(e),Zd(e),function(u){u.createObjectStore(Pn)}(e));let o=A.resolve();return r<3&&s>=3&&(r!==0&&(function(u){u.deleteObjectStore(Pr),u.deleteObjectStore(Sr),u.deleteObjectStore(Mn)}(e),Zd(e)),o=o.next(()=>function(u){const l=u.store(Mn),f={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:B.min().toTimestamp(),targetCount:0};return l.put(So,f)}(i))),r<4&&s>=4&&(r!==0&&(o=o.next(()=>function(u,l){return l.store(nt).J().next(p=>{u.deleteObjectStore(nt),u.createObjectStore(nt,{keyPath:ud,autoIncrement:!0}).createIndex(Nn,ld,{unique:!0});const g=l.store(nt),v=p.map(C=>g.put(C));return A.waitFor(v)})}(e,i))),o=o.next(()=>{(function(u){u.createObjectStore(Cr,{keyPath:Vw})})(e)})),r<5&&s>=5&&(o=o.next(()=>this.gi(i))),r<6&&s>=6&&(o=o.next(()=>(function(u){u.createObjectStore(Qs)}(e),this.pi(i)))),r<7&&s>=7&&(o=o.next(()=>this.yi(i))),r<8&&s>=8&&(o=o.next(()=>this.wi(e,i))),r<9&&s>=9&&(o=o.next(()=>{(function(u){u.objectStoreNames.contains("remoteDocumentChanges")&&u.deleteObjectStore("remoteDocumentChanges")})(e)})),r<10&&s>=10&&(o=o.next(()=>this.Si(i))),r<11&&s>=11&&(o=o.next(()=>{(function(u){u.createObjectStore(Zo,{keyPath:Nw})})(e),function(u){u.createObjectStore(ea,{keyPath:Ow})}(e)})),r<12&&s>=12&&(o=o.next(()=>{(function(u){const l=u.createObjectStore(ta,{keyPath:qw});l.createIndex(Sc,$w,{unique:!1}),l.createIndex(rm,jw,{unique:!1})})(e)})),r<13&&s>=13&&(o=o.next(()=>function(u){const l=u.createObjectStore(Ro,{keyPath:bw});l.createIndex(ao,Rw),l.createIndex(Zp,Sw)}(e)).next(()=>this.bi(e,i)).next(()=>e.deleteObjectStore(Pn))),r<14&&s>=14&&(o=o.next(()=>this.Di(e,i))),r<15&&s>=15&&(o=o.next(()=>function(u){u.createObjectStore(pu,{keyPath:xw,autoIncrement:!0}).createIndex(Rc,Mw,{unique:!1}),u.createObjectStore(Os,{keyPath:Lw}).createIndex(tm,Fw,{unique:!1}),u.createObjectStore(xs,{keyPath:Uw}).createIndex(nm,Bw,{unique:!1})}(e))),r<16&&s>=16&&(o=o.next(()=>{t.objectStore(Os).clear()}).next(()=>{t.objectStore(xs).clear()})),r<17&&s>=17&&(o=o.next(()=>{(function(u){u.createObjectStore(mu,{keyPath:zw})})(e)})),r<18&&s>=18&&Xf()&&(o=o.next(()=>{t.objectStore(Os).clear()}).next(()=>{t.objectStore(xs).clear()})),o}pi(e){let t=0;return e.store(Pn).ee((r,s)=>{t+=No(s)}).next(()=>{const r={byteSize:t};return e.store(Qs).put(bc,r)})}gi(e){const t=e.store(Ws),r=e.store(nt);return t.J().next(s=>A.forEach(s,i=>{const o=IDBKeyRange.bound([i.userId,xn],[i.userId,i.lastAcknowledgedBatchId]);return r.J(Nn,o).next(c=>A.forEach(c,u=>{F(u.userId===i.userId,18650,"Cannot process batch from unexpected user",{batchId:u.batchId});const l=kn(this.serializer,u);return ug(e,i.userId,l).next(()=>{})}))}))}yi(e){const t=e.store(Pr),r=e.store(Pn);return e.store(Mn).get(So).next(s=>{const i=[];return r.ee((o,c)=>{const u=new ee(o),l=function(p){return[0,Ne(p)]}(u);i.push(t.get(l).next(f=>f?A.resolve():(p=>t.put({targetId:0,path:Ne(p),sequenceNumber:s.highestListenSequenceNumber}))(u)))}).next(()=>A.waitFor(i))})}wi(e,t){e.createObjectStore(Js,{keyPath:Dw});const r=t.store(Js),s=new Du,i=o=>{if(s.add(o)){const c=o.lastSegment(),u=o.popLast();return r.put({collectionId:c,parent:Ne(u)})}};return t.store(Pn).ee({Y:!0},(o,c)=>{const u=new ee(o);return i(u.popLast())}).next(()=>t.store(Rr).ee({Y:!0},([o,c,u],l)=>{const f=lt(c);return i(f.popLast())}))}Si(e){const t=e.store(Sr);return t.ee((r,s)=>{const i=ks(s),o=sg(this.serializer,i);return t.put(o)})}bi(e,t){const r=t.store(Pn),s=[];return r.ee((i,o)=>{const c=t.store(Ro),u=function(p){return p.document?new x(ee.fromString(p.document.name).popFirst(5)):p.noDocument?x.fromSegments(p.noDocument.path):p.unknownDocument?x.fromSegments(p.unknownDocument.path):M(36783)}(o).path.toArray(),l={prefixPath:u.slice(0,u.length-2),collectionGroup:u[u.length-2],documentId:u[u.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};s.push(c.put(l))}).next(()=>A.waitFor(s))}Di(e,t){const r=t.store(nt),s=gg(this.serializer),i=new Nu(la.Vi,this.serializer.yt);return r.J().next(o=>{const c=new Map;return o.forEach(u=>{let l=c.get(u.userId)??W();kn(this.serializer,u).keys().forEach(f=>l=l.add(f)),c.set(u.userId,l)}),A.forEach(c,(u,l)=>{const f=new Ae(l),p=ca.wt(this.serializer,f),g=i.getIndexManager(f),v=ua.wt(f,this.serializer,g,i.referenceDelegate);return new _g(s,v,p,g).recalculateAndSaveOverlaysForDocumentKeys(new Pc(t,qe.ce),u).next()})})}}function Zd(n){n.createObjectStore(Pr,{keyPath:Cw}).createIndex(fu,kw,{unique:!0}),n.createObjectStore(Sr,{keyPath:"targetId"}).createIndex(em,Pw,{unique:!0}),n.createObjectStore(Mn)}const Wt="IndexedDbPersistence",ec=18e5,tc=5e3,nc="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",pA="main";class Ou{constructor(e,t,r,s,i,o,c,u,l,f,p=18){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=r,this.Ci=i,this.window=o,this.document=c,this.Fi=l,this.Mi=f,this.xi=p,this.ai=null,this.ui=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Oi=null,this.inForeground=!1,this.Ni=null,this.Bi=null,this.Li=Number.NEGATIVE_INFINITY,this.ki=g=>Promise.resolve(),!Ou.v())throw new N(P.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new tA(this,s),this.Ki=t+pA,this.serializer=new rg(u),this.qi=new an(this.Ki,this.xi,new fA(this.serializer)),this.ci=new zv,this.li=new Xv(this.referenceDelegate,this.serializer),this.remoteDocumentCache=gg(this.serializer),this.Pi=new jv,this.window&&this.window.localStorage?this.Ui=this.window.localStorage:(this.Ui=null,f===!1&&me(Wt,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.$i().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new N(P.FAILED_PRECONDITION,nc);return this.Wi(),this.Qi(),this.Gi(),this.runTransaction("getHighestListenSequenceNumber","readonly",e=>this.li.getHighestSequenceNumber(e))}).then(e=>{this.ai=new qe(e,this.Fi)}).then(()=>{this.ui=!0}).catch(e=>(this.qi&&this.qi.close(),Promise.reject(e)))}zi(e){return this.ki=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.qi.q(async t=>{t.newVersion===null&&await e()})}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.Ci.enqueueAndForget(async()=>{this.started&&await this.$i()}))}$i(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",e=>Ji(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.ji(e).next(t=>{t||(this.isPrimary=!1,this.Ci.enqueueRetryable(()=>this.ki(!1)))})}).next(()=>this.Ji(e)).next(t=>this.isPrimary&&!t?this.Hi(e).next(()=>!1):!!t&&this.Zi(e).next(()=>!0))).catch(e=>{if(gn(e))return D(Wt,"Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return D(Wt,"Releasing owner lease after error during lease refresh",e),!1}).then(e=>{this.isPrimary!==e&&this.Ci.enqueueRetryable(()=>this.ki(e)),this.isPrimary=e})}ji(e){return ws(e).get(or).next(t=>A.resolve(this.Xi(t)))}Yi(e){return Ji(e).delete(this.clientId)}async es(){if(this.isPrimary&&!this.ts(this.Li,ec)){this.Li=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",t=>{const r=Ee(t,Cr);return r.J().next(s=>{const i=this.ns(s,ec),o=s.filter(c=>i.indexOf(c)===-1);return A.forEach(o,c=>r.delete(c.clientId)).next(()=>o)})}).catch(()=>[]);if(this.Ui)for(const t of e)this.Ui.removeItem(this.rs(t.clientId))}}Gi(){this.Bi=this.Ci.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.$i().then(()=>this.es()).then(()=>this.Gi()))}Xi(e){return!!e&&e.ownerId===this.clientId}Ji(e){return this.Mi?A.resolve(!0):ws(e).get(or).next(t=>{if(t!==null&&this.ts(t.leaseTimestampMs,tc)&&!this.ss(t.ownerId)){if(this.Xi(t)&&this.networkEnabled)return!0;if(!this.Xi(t)){if(!t.allowTabSynchronization)throw new N(P.FAILED_PRECONDITION,nc);return!1}}return!(!this.networkEnabled||!this.inForeground)||Ji(e).J().next(r=>this.ns(r,tc).find(s=>{if(this.clientId!==s.clientId){const i=!this.networkEnabled&&s.networkEnabled,o=!this.inForeground&&s.inForeground,c=this.networkEnabled===s.networkEnabled;if(i||o&&c)return!0}return!1})===void 0)}).next(t=>(this.isPrimary!==t&&D(Wt,`Client ${t?"is":"is not"} eligible for a primary lease.`),t))}async shutdown(){this.ui=!1,this._s(),this.Bi&&(this.Bi.cancel(),this.Bi=null),this.us(),this.cs(),await this.qi.runTransaction("shutdown","readwrite",[yi,Cr],e=>{const t=new Pc(e,qe.ce);return this.Hi(t).next(()=>this.Yi(t))}),this.qi.close(),this.ls()}ns(e,t){return e.filter(r=>this.ts(r.updateTimeMs,t)&&!this.ss(r.clientId))}hs(){return this.runTransaction("getActiveClients","readonly",e=>Ji(e).J().next(t=>this.ns(t,ec).map(r=>r.clientId)))}get started(){return this.ui}getGlobalsCache(){return this.ci}getMutationQueue(e,t){return ua.wt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.li}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new Yv(e,this.serializer.yt.databaseId)}getDocumentOverlayCache(e){return ca.wt(this.serializer,e)}getBundleCache(){return this.Pi}runTransaction(e,t,r){D(Wt,"Starting transaction:",e);const s=t==="readonly"?"readonly":"readwrite",i=function(u){return u===18?Hw:u===17?am:u===16?Gw:u===15?gu:u===14?om:u===13?im:u===12?Kw:u===11?sm:void M(60245)}(this.xi);let o;return this.qi.runTransaction(e,s,i,c=>(o=new Pc(c,this.ai?this.ai.next():qe.ce),t==="readwrite-primary"?this.ji(o).next(u=>!!u||this.Ji(o)).next(u=>{if(!u)throw me(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.Ci.enqueueRetryable(()=>this.ki(!1)),new N(P.FAILED_PRECONDITION,Wp);return r(o)}).next(u=>this.Zi(o).next(()=>u)):this.Ps(o).next(()=>r(o)))).then(c=>(o.raiseOnCommittedEvent(),c))}Ps(e){return ws(e).get(or).next(t=>{if(t!==null&&this.ts(t.leaseTimestampMs,tc)&&!this.ss(t.ownerId)&&!this.Xi(t)&&!(this.Mi||this.allowTabSynchronization&&t.allowTabSynchronization))throw new N(P.FAILED_PRECONDITION,nc)})}Zi(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return ws(e).put(or,t)}static v(){return an.v()}Hi(e){const t=ws(e);return t.get(or).next(r=>this.Xi(r)?(D(Wt,"Releasing primary lease."),t.delete(or)):A.resolve())}ts(e,t){const r=Date.now();return!(e<r-t)&&(!(e>r)||(me(`Detected an update time that is in the future: ${e} > ${r}`),!1))}Wi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Ni=()=>{this.Ci.enqueueAndForget(()=>(this.inForeground=this.document.visibilityState==="visible",this.$i()))},this.document.addEventListener("visibilitychange",this.Ni),this.inForeground=this.document.visibilityState==="visible")}us(){this.Ni&&(this.document.removeEventListener("visibilitychange",this.Ni),this.Ni=null)}Qi(){var e;typeof((e=this.window)==null?void 0:e.addEventListener)=="function"&&(this.Oi=()=>{this._s();const t=/(?:Version|Mobile)\/1[456]/;Yf()&&(navigator.appVersion.match(t)||navigator.userAgent.match(t))&&this.Ci.enterRestrictedMode(!0),this.Ci.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.Oi))}cs(){this.Oi&&(this.window.removeEventListener("pagehide",this.Oi),this.Oi=null)}ss(e){var t;try{const r=((t=this.Ui)==null?void 0:t.getItem(this.rs(e)))!==null;return D(Wt,`Client '${e}' ${r?"is":"is not"} zombied in LocalStorage`),r}catch(r){return me(Wt,"Failed to get zombied client id.",r),!1}}_s(){if(this.Ui)try{this.Ui.setItem(this.rs(this.clientId),String(Date.now()))}catch(e){me("Failed to set zombie client id.",e)}}ls(){if(this.Ui)try{this.Ui.removeItem(this.rs(this.clientId))}catch{}}rs(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function ws(n){return Ee(n,yi)}function Ji(n){return Ee(n,Cr)}function yg(n,e){let t=n.projectId;return n.isDefaultDatabase||(t+="."+n.database),"firestore/"+e+"/"+t+"/"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xu{constructor(e,t,r,s){this.targetId=e,this.fromCache=t,this.Ts=r,this.Is=s}static Es(e,t){let r=W(),s=W();for(const i of t.docChanges)switch(i.type){case 0:r=r.add(i.doc.key);break;case 1:s=s.add(i.doc.key)}return new xu(e,t.fromCache,r,s)}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mA{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ig{constructor(){this.Rs=!1,this.As=!1,this.Vs=100,this.ds=function(){return Yf()?8:Jp(Te())>0?6:4}()}initialize(e,t){this.fs=e,this.indexManager=t,this.Rs=!0}getDocumentsMatchingQuery(e,t,r,s){const i={result:null};return this.gs(e,t).next(o=>{i.result=o}).next(()=>{if(!i.result)return this.ps(e,t,s,r).next(o=>{i.result=o})}).next(()=>{if(i.result)return;const o=new mA;return this.ys(e,t,o).next(c=>{if(i.result=c,this.As)return this.ws(e,t,o,c.size)})}).next(()=>i.result)}ws(e,t,r,s){return r.documentReadCount<this.Vs?(fr()<=J.DEBUG&&D("QueryEngine","SDK will not create cache indexes for query:",pr(t),"since it only creates cache indexes for collection contains","more than or equal to",this.Vs,"documents"),A.resolve()):(fr()<=J.DEBUG&&D("QueryEngine","Query:",pr(t),"scans",r.documentReadCount,"local documents and returns",s,"documents as results."),r.documentReadCount>this.ds*s?(fr()<=J.DEBUG&&D("QueryEngine","The SDK decides to create cache indexes for query:",pr(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,Qe(t))):A.resolve())}gs(e,t){if(vd(t))return A.resolve(null);let r=Qe(t);return this.indexManager.getIndexType(e,r).next(s=>s===0?null:(t.limit!==null&&s===1&&(t=ko(t,null,"F"),r=Qe(t)),this.indexManager.getDocumentsMatchingTarget(e,r).next(i=>{const o=W(...i);return this.fs.getDocuments(e,o).next(c=>this.indexManager.getMinOffset(e,r).next(u=>{const l=this.Ss(t,c);return this.bs(t,l,o,u.readTime)?this.gs(e,ko(t,null,"F")):this.Ds(e,l,t,u)}))})))}ps(e,t,r,s){return vd(t)||s.isEqual(B.min())?A.resolve(null):this.fs.getDocuments(e,r).next(i=>{const o=this.Ss(t,i);return this.bs(t,o,r,s)?A.resolve(null):(fr()<=J.DEBUG&&D("QueryEngine","Re-using previous result from %s to execute query: %s",s.toString(),pr(t)),this.Ds(e,o,t,Gp(s,br)).next(c=>c))})}Ss(e,t){let r=new re(km(e));return t.forEach((s,i)=>{Ei(e,i)&&(r=r.add(i))}),r}bs(e,t,r,s){if(e.limit===null)return!1;if(r.size!==t.size)return!0;const i=e.limitType==="F"?t.last():t.first();return!!i&&(i.hasPendingWrites||i.version.compareTo(s)>0)}ys(e,t,r){return fr()<=J.DEBUG&&D("QueryEngine","Using full collection scan to execute query:",pr(t)),this.fs.getDocumentsMatchingQuery(e,t,Ye.min(),r)}Ds(e,t,r,s){return this.fs.getDocumentsMatchingQuery(e,r,s).next(i=>(t.forEach(o=>{i=i.insert(o.key,o)}),i))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Mu="LocalStore",gA=3e8;class _A{constructor(e,t,r,s){this.persistence=e,this.Cs=t,this.serializer=s,this.vs=new ie(z),this.Fs=new Mt(i=>zn(i),Ii),this.Ms=new Map,this.xs=e.getRemoteDocumentCache(),this.li=e.getTargetCache(),this.Pi=e.getBundleCache(),this.Os(r)}Os(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new _g(this.xs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.xs.setIndexManager(this.indexManager),this.Cs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.vs))}}function Tg(n,e,t,r){return new _A(n,e,t,r)}async function Eg(n,e){const t=L(n);return await t.persistence.runTransaction("Handle user change","readonly",r=>{let s;return t.mutationQueue.getAllMutationBatches(r).next(i=>(s=i,t.Os(e),t.mutationQueue.getAllMutationBatches(r))).next(i=>{const o=[],c=[];let u=W();for(const l of s){o.push(l.batchId);for(const f of l.mutations)u=u.add(f.key)}for(const l of i){c.push(l.batchId);for(const f of l.mutations)u=u.add(f.key)}return t.localDocuments.getDocuments(r,u).next(l=>({Ns:l,removedBatchIds:o,addedBatchIds:c}))})})}function yA(n,e){const t=L(n);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",r=>{const s=e.batch.keys(),i=t.xs.newChangeBuffer({trackRemovals:!0});return function(c,u,l,f){const p=l.batch,g=p.keys();let v=A.resolve();return g.forEach(C=>{v=v.next(()=>f.getEntry(u,C)).next(V=>{const k=l.docVersions.get(C);F(k!==null,48541),V.version.compareTo(k)<0&&(p.applyToRemoteDocument(V,l),V.isValidDocument()&&(V.setReadTime(l.commitVersion),f.addEntry(V)))})}),v.next(()=>c.mutationQueue.removeMutationBatch(u,p))}(t,r,e,i).next(()=>i.apply(r)).next(()=>t.mutationQueue.performConsistencyCheck(r)).next(()=>t.documentOverlayCache.removeOverlaysForBatchId(r,s,e.batch.batchId)).next(()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(r,function(c){let u=W();for(let l=0;l<c.mutationResults.length;++l)c.mutationResults[l].transformResults.length>0&&(u=u.add(c.batch.mutations[l].key));return u}(e))).next(()=>t.localDocuments.getDocuments(r,s))})}function wg(n){const e=L(n);return e.persistence.runTransaction("Get last remote snapshot version","readonly",t=>e.li.getLastRemoteSnapshotVersion(t))}function IA(n,e){const t=L(n),r=e.snapshotVersion;let s=t.vs;return t.persistence.runTransaction("Apply remote event","readwrite-primary",i=>{const o=t.xs.newChangeBuffer({trackRemovals:!0});s=t.vs;const c=[];e.targetChanges.forEach((f,p)=>{const g=s.get(p);if(!g)return;c.push(t.li.removeMatchingKeys(i,f.removedDocuments,p).next(()=>t.li.addMatchingKeys(i,f.addedDocuments,p)));let v=g.withSequenceNumber(i.currentSequenceNumber);e.targetMismatches.get(p)!==null?v=v.withResumeToken(ge.EMPTY_BYTE_STRING,B.min()).withLastLimboFreeSnapshotVersion(B.min()):f.resumeToken.approximateByteSize()>0&&(v=v.withResumeToken(f.resumeToken,r)),s=s.insert(p,v),function(V,k,$){return V.resumeToken.approximateByteSize()===0||k.snapshotVersion.toMicroseconds()-V.snapshotVersion.toMicroseconds()>=gA?!0:$.addedDocuments.size+$.modifiedDocuments.size+$.removedDocuments.size>0}(g,v,f)&&c.push(t.li.updateTargetData(i,v))});let u=He(),l=W();if(e.documentUpdates.forEach(f=>{e.resolvedLimboDocuments.has(f)&&c.push(t.persistence.referenceDelegate.updateLimboDocument(i,f))}),c.push(TA(i,o,e.documentUpdates).next(f=>{u=f.Bs,l=f.Ls})),!r.isEqual(B.min())){const f=t.li.getLastRemoteSnapshotVersion(i).next(p=>t.li.setTargetsMetadata(i,i.currentSequenceNumber,r));c.push(f)}return A.waitFor(c).next(()=>o.apply(i)).next(()=>t.localDocuments.getLocalViewOfDocuments(i,u,l)).next(()=>u)}).then(i=>(t.vs=s,i))}function TA(n,e,t){let r=W(),s=W();return t.forEach(i=>r=r.add(i)),e.getEntries(n,r).next(i=>{let o=He();return t.forEach((c,u)=>{const l=i.get(c);u.isFoundDocument()!==l.isFoundDocument()&&(s=s.add(c)),u.isNoDocument()&&u.version.isEqual(B.min())?(e.removeEntry(c,u.readTime),o=o.insert(c,u)):!l.isValidDocument()||u.version.compareTo(l.version)>0||u.version.compareTo(l.version)===0&&l.hasPendingWrites?(e.addEntry(u),o=o.insert(c,u)):D(Mu,"Ignoring outdated watch update for ",c,". Current version:",l.version," Watch version:",u.version)}),{Bs:o,Ls:s}})}function EA(n,e){const t=L(n);return t.persistence.runTransaction("Get next mutation batch","readonly",r=>(e===void 0&&(e=xn),t.mutationQueue.getNextMutationBatchAfterBatchId(r,e)))}function xo(n,e){const t=L(n);return t.persistence.runTransaction("Allocate target","readwrite",r=>{let s;return t.li.getTargetData(r,e).next(i=>i?(s=i,A.resolve(s)):t.li.allocateTargetId(r).next(o=>(s=new dt(e,o,"TargetPurposeListen",r.currentSequenceNumber),t.li.addTargetData(r,s).next(()=>s))))}).then(r=>{const s=t.vs.get(r.targetId);return(s===null||r.snapshotVersion.compareTo(s.snapshotVersion)>0)&&(t.vs=t.vs.insert(r.targetId,r),t.Fs.set(e,r.targetId)),r})}async function Fr(n,e,t){const r=L(n),s=r.vs.get(e),i=t?"readwrite":"readwrite-primary";try{t||await r.persistence.runTransaction("Release target",i,o=>r.persistence.referenceDelegate.removeTarget(o,s))}catch(o){if(!gn(o))throw o;D(Mu,`Failed to update sequence numbers for target ${e}: ${o}`)}r.vs=r.vs.remove(e),r.Fs.delete(s.target)}function $c(n,e,t){const r=L(n);let s=B.min(),i=W();return r.persistence.runTransaction("Execute query","readwrite",o=>function(u,l,f){const p=L(u),g=p.Fs.get(f);return g!==void 0?A.resolve(p.vs.get(g)):p.li.getTargetData(l,f)}(r,o,Qe(e)).next(c=>{if(c)return s=c.lastLimboFreeSnapshotVersion,r.li.getMatchingKeysForTargetId(o,c.targetId).next(u=>{i=u})}).next(()=>r.Cs.getDocumentsMatchingQuery(o,e,t?s:B.min(),t?i:W())).next(c=>(bg(r,Cm(e),c),{documents:c,ks:i})))}function vg(n,e){const t=L(n),r=L(t.li),s=t.vs.get(e);return s?Promise.resolve(s.target):t.persistence.runTransaction("Get target data","readonly",i=>r.At(i,e).next(o=>o?o.target:null))}function Ag(n,e){const t=L(n),r=t.Ms.get(e)||B.min();return t.persistence.runTransaction("Get new document changes","readonly",s=>t.xs.getAllFromCollectionGroup(s,e,Gp(r,br),Number.MAX_SAFE_INTEGER)).then(s=>(bg(t,e,s),s))}function bg(n,e,t){let r=n.Ms.get(e)||B.min();t.forEach((s,i)=>{i.readTime.compareTo(r)>0&&(r=i.readTime)}),n.Ms.set(e,r)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rg="firestore_clients";function ef(n,e){return`${Rg}_${n}_${e}`}const Sg="firestore_mutations";function tf(n,e,t){let r=`${Sg}_${n}_${t}`;return e.isAuthenticated()&&(r+=`_${e.uid}`),r}const Pg="firestore_targets";function rc(n,e){return`${Pg}_${n}_${e}`}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ut="SharedClientState";class Mo{constructor(e,t,r,s){this.user=e,this.batchId=t,this.state=r,this.error=s}static $s(e,t,r){const s=JSON.parse(r);let i,o=typeof s=="object"&&["pending","acknowledged","rejected"].indexOf(s.state)!==-1&&(s.error===void 0||typeof s.error=="object");return o&&s.error&&(o=typeof s.error.message=="string"&&typeof s.error.code=="string",o&&(i=new N(s.error.code,s.error.message))),o?new Mo(e,t,s.state,i):(me(ut,`Failed to parse mutation state for ID '${t}': ${r}`),null)}Ws(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Bs{constructor(e,t,r){this.targetId=e,this.state=t,this.error=r}static $s(e,t){const r=JSON.parse(t);let s,i=typeof r=="object"&&["not-current","current","rejected"].indexOf(r.state)!==-1&&(r.error===void 0||typeof r.error=="object");return i&&r.error&&(i=typeof r.error.message=="string"&&typeof r.error.code=="string",i&&(s=new N(r.error.code,r.error.message))),i?new Bs(e,r.state,s):(me(ut,`Failed to parse target state for ID '${e}': ${t}`),null)}Ws(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Lo{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static $s(e,t){const r=JSON.parse(t);let s=typeof r=="object"&&r.activeTargetIds instanceof Array,i=Eu();for(let o=0;s&&o<r.activeTargetIds.length;++o)s=Yp(r.activeTargetIds[o]),i=i.add(r.activeTargetIds[o]);return s?new Lo(e,i):(me(ut,`Failed to parse client data for instance '${e}': ${t}`),null)}}class Lu{constructor(e,t){this.clientId=e,this.onlineState=t}static $s(e){const t=JSON.parse(e);return typeof t=="object"&&["Unknown","Online","Offline"].indexOf(t.onlineState)!==-1&&typeof t.clientId=="string"?new Lu(t.clientId,t.onlineState):(me(ut,`Failed to parse online state: ${e}`),null)}}class jc{constructor(){this.activeTargetIds=Eu()}Qs(e){this.activeTargetIds=this.activeTargetIds.add(e)}Gs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Ws(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class sc{constructor(e,t,r,s,i){this.window=e,this.Ci=t,this.persistenceKey=r,this.zs=s,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.js=this.Js.bind(this),this.Hs=new ie(z),this.started=!1,this.Zs=[];const o=r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=i,this.Xs=ef(this.persistenceKey,this.zs),this.Ys=function(u){return`firestore_sequence_number_${u}`}(this.persistenceKey),this.Hs=this.Hs.insert(this.zs,new jc),this.eo=new RegExp(`^${Rg}_${o}_([^_]*)$`),this.no=new RegExp(`^${Sg}_${o}_(\\d+)(?:_(.*))?$`),this.ro=new RegExp(`^${Pg}_${o}_(\\d+)$`),this.io=function(u){return`firestore_online_state_${u}`}(this.persistenceKey),this.so=function(u){return`firestore_bundle_loaded_v2_${u}`}(this.persistenceKey),this.window.addEventListener("storage",this.js)}static v(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.hs();for(const r of e){if(r===this.zs)continue;const s=this.getItem(ef(this.persistenceKey,r));if(s){const i=Lo.$s(r,s);i&&(this.Hs=this.Hs.insert(i.clientId,i))}}this.oo();const t=this.storage.getItem(this.io);if(t){const r=this._o(t);r&&this.ao(r)}for(const r of this.Zs)this.Js(r);this.Zs=[],this.window.addEventListener("pagehide",()=>this.shutdown()),this.started=!0}writeSequenceNumber(e){this.setItem(this.Ys,JSON.stringify(e))}getAllActiveQueryTargets(){return this.uo(this.Hs)}isActiveQueryTarget(e){let t=!1;return this.Hs.forEach((r,s)=>{s.activeTargetIds.has(e)&&(t=!0)}),t}addPendingMutation(e){this.co(e,"pending")}updateMutationState(e,t,r){this.co(e,t,r),this.lo(e)}addLocalQueryTarget(e,t=!0){let r="not-current";if(this.isActiveQueryTarget(e)){const s=this.storage.getItem(rc(this.persistenceKey,e));if(s){const i=Bs.$s(e,s);i&&(r=i.state)}}return t&&this.ho.Qs(e),this.oo(),r}removeLocalQueryTarget(e){this.ho.Gs(e),this.oo()}isLocalQueryTarget(e){return this.ho.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(rc(this.persistenceKey,e))}updateQueryState(e,t,r){this.Po(e,t,r)}handleUserChange(e,t,r){t.forEach(s=>{this.lo(s)}),this.currentUser=e,r.forEach(s=>{this.addPendingMutation(s)})}setOnlineState(e){this.To(e)}notifyBundleLoaded(e){this.Io(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.js),this.removeItem(this.Xs),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return D(ut,"READ",e,t),t}setItem(e,t){D(ut,"SET",e,t),this.storage.setItem(e,t)}removeItem(e){D(ut,"REMOVE",e),this.storage.removeItem(e)}Js(e){const t=e;if(t.storageArea===this.storage){if(D(ut,"EVENT",t.key,t.newValue),t.key===this.Xs)return void me("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Ci.enqueueRetryable(async()=>{if(this.started){if(t.key!==null){if(this.eo.test(t.key)){if(t.newValue==null){const r=this.Eo(t.key);return this.Ro(r,null)}{const r=this.Ao(t.key,t.newValue);if(r)return this.Ro(r.clientId,r)}}else if(this.no.test(t.key)){if(t.newValue!==null){const r=this.Vo(t.key,t.newValue);if(r)return this.mo(r)}}else if(this.ro.test(t.key)){if(t.newValue!==null){const r=this.fo(t.key,t.newValue);if(r)return this.po(r)}}else if(t.key===this.io){if(t.newValue!==null){const r=this._o(t.newValue);if(r)return this.ao(r)}}else if(t.key===this.Ys){const r=function(i){let o=qe.ce;if(i!=null)try{const c=JSON.parse(i);F(typeof c=="number",30636,{yo:i}),o=c}catch(c){me(ut,"Failed to read sequence number from WebStorage",c)}return o}(t.newValue);r!==qe.ce&&this.sequenceNumberHandler(r)}else if(t.key===this.so){const r=this.wo(t.newValue);await Promise.all(r.map(s=>this.syncEngine.So(s)))}}}else this.Zs.push(t)})}}get ho(){return this.Hs.get(this.zs)}oo(){this.setItem(this.Xs,this.ho.Ws())}co(e,t,r){const s=new Mo(this.currentUser,e,t,r),i=tf(this.persistenceKey,this.currentUser,e);this.setItem(i,s.Ws())}lo(e){const t=tf(this.persistenceKey,this.currentUser,e);this.removeItem(t)}To(e){const t={clientId:this.zs,onlineState:e};this.storage.setItem(this.io,JSON.stringify(t))}Po(e,t,r){const s=rc(this.persistenceKey,e),i=new Bs(e,t,r);this.setItem(s,i.Ws())}Io(e){const t=JSON.stringify(Array.from(e));this.setItem(this.so,t)}Eo(e){const t=this.eo.exec(e);return t?t[1]:null}Ao(e,t){const r=this.Eo(e);return Lo.$s(r,t)}Vo(e,t){const r=this.no.exec(e),s=Number(r[1]),i=r[2]!==void 0?r[2]:null;return Mo.$s(new Ae(i),s,t)}fo(e,t){const r=this.ro.exec(e),s=Number(r[1]);return Bs.$s(s,t)}_o(e){return Lu.$s(e)}wo(e){return JSON.parse(e)}async mo(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.bo(e.batchId,e.state,e.error);D(ut,`Ignoring mutation for non-active user ${e.user.uid}`)}po(e){return this.syncEngine.Do(e.targetId,e.state,e.error)}Ro(e,t){const r=t?this.Hs.insert(e,t):this.Hs.remove(e),s=this.uo(this.Hs),i=this.uo(r),o=[],c=[];return i.forEach(u=>{s.has(u)||o.push(u)}),s.forEach(u=>{i.has(u)||c.push(u)}),this.syncEngine.Co(o,c).then(()=>{this.Hs=r})}ao(e){this.Hs.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}uo(e){let t=Eu();return e.forEach((r,s)=>{t=t.unionWith(s.activeTargetIds)}),t}}class Cg{constructor(){this.vo=new jc,this.Fo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,r){}addLocalQueryTarget(e,t=!0){return t&&this.vo.Qs(e),this.Fo[e]||"not-current"}updateQueryState(e,t,r){this.Fo[e]=t}removeLocalQueryTarget(e){this.vo.Gs(e)}isLocalQueryTarget(e){return this.vo.activeTargetIds.has(e)}clearQueryState(e){delete this.Fo[e]}getAllActiveQueryTargets(){return this.vo.activeTargetIds}isActiveQueryTarget(e){return this.vo.activeTargetIds.has(e)}start(){return this.vo=new jc,Promise.resolve()}handleUserChange(e,t,r){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wA{Mo(e){}shutdown(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nf="ConnectivityMonitor";class rf{constructor(){this.xo=()=>this.Oo(),this.No=()=>this.Bo(),this.Lo=[],this.ko()}Mo(e){this.Lo.push(e)}shutdown(){window.removeEventListener("online",this.xo),window.removeEventListener("offline",this.No)}ko(){window.addEventListener("online",this.xo),window.addEventListener("offline",this.No)}Oo(){D(nf,"Network connectivity changed: AVAILABLE");for(const e of this.Lo)e(0)}Bo(){D(nf,"Network connectivity changed: UNAVAILABLE");for(const e of this.Lo)e(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Yi=null;function zc(){return Yi===null?Yi=function(){return 268435456+Math.round(2147483648*Math.random())}():Yi++,"0x"+Yi.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ic="RestConnection",vA={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery",ExecutePipeline:"executePipeline"};class AA{get Ko(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",r=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.qo=t+"://"+e.host,this.Uo=`projects/${r}/databases/${s}`,this.$o=this.databaseId.database===Xs?`project_id=${r}`:`project_id=${r}&database_id=${s}`}Wo(e,t,r,s,i){const o=zc(),c=this.Qo(e,t.toUriEncodedString());D(ic,`Sending RPC '${e}' ${o}:`,c,r);const u={"google-cloud-resource-prefix":this.Uo,"x-goog-request-params":this.$o};this.Go(u,s,i);const{host:l}=new URL(c),f=It(l);return this.zo(e,c,u,r,f).then(p=>(D(ic,`Received RPC '${e}' ${o}: `,p),p),p=>{throw $n(ic,`RPC '${e}' ${o} failed with error: `,p,"url: ",c,"request:",r),p})}jo(e,t,r,s,i,o){return this.Wo(e,t,r,s,i)}Go(e,t,r){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+zr}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((s,i)=>e[i]=s),r&&r.headers.forEach((s,i)=>e[i]=s)}Qo(e,t){const r=vA[e];let s=`${this.qo}/v1/${t}:${r}`;return this.databaseInfo.apiKey&&(s=`${s}?key=${encodeURIComponent(this.databaseInfo.apiKey)}`),s}terminate(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bA{constructor(e){this.Jo=e.Jo,this.Ho=e.Ho}Zo(e){this.Xo=e}Yo(e){this.e_=e}t_(e){this.n_=e}onMessage(e){this.r_=e}close(){this.Ho()}send(e){this.Jo(e)}i_(){this.Xo()}s_(){this.e_()}o_(e){this.n_(e)}__(e){this.r_(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ke="WebChannelConnection",vs=(n,e,t)=>{n.listen(e,r=>{try{t(r)}catch(s){setTimeout(()=>{throw s},0)}})};class wr extends AA{constructor(e){super(e),this.a_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}static u_(){if(!wr.c_){const e=Up();vs(e,Fp.STAT_EVENT,t=>{t.stat===wc.PROXY?D(ke,"STAT_EVENT: detected buffering proxy"):t.stat===wc.NOPROXY&&D(ke,"STAT_EVENT: detected no buffering proxy")}),wr.c_=!0}}zo(e,t,r,s,i){const o=zc();return new Promise((c,u)=>{const l=new Mp;l.setWithCredentials(!0),l.listenOnce(Lp.COMPLETE,()=>{try{switch(l.getLastErrorCode()){case so.NO_ERROR:const p=l.getResponseJson();D(ke,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(p)),c(p);break;case so.TIMEOUT:D(ke,`RPC '${e}' ${o} timed out`),u(new N(P.DEADLINE_EXCEEDED,"Request time out"));break;case so.HTTP_ERROR:const g=l.getStatus();if(D(ke,`RPC '${e}' ${o} failed with status:`,g,"response text:",l.getResponseText()),g>0){let v=l.getResponseJson();Array.isArray(v)&&(v=v[0]);const C=v==null?void 0:v.error;if(C&&C.status&&C.message){const V=function($){const q=$.toLowerCase().replace(/_/g,"-");return Object.values(P).indexOf(q)>=0?q:P.UNKNOWN}(C.status);u(new N(V,C.message))}else u(new N(P.UNKNOWN,"Server responded with status "+l.getStatus()))}else u(new N(P.UNAVAILABLE,"Connection failed."));break;default:M(9055,{l_:e,streamId:o,h_:l.getLastErrorCode(),P_:l.getLastError()})}}finally{D(ke,`RPC '${e}' ${o} completed.`)}});const f=JSON.stringify(s);D(ke,`RPC '${e}' ${o} sending request:`,s),l.send(t,"POST",f,r,15)})}T_(e,t,r){const s=zc(),i=[this.qo,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=this.createWebChannelTransport(),c={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;u!==void 0&&(c.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(c.useFetchStreams=!0),this.Go(c.initMessageHeaders,t,r),c.encodeInitMessageHeaders=!0;const l=i.join("");D(ke,`Creating RPC '${e}' stream ${s}: ${l}`,c);const f=o.createWebChannel(l,c);this.I_(f);let p=!1,g=!1;const v=new bA({Jo:C=>{g?D(ke,`Not sending because RPC '${e}' stream ${s} is closed:`,C):(p||(D(ke,`Opening RPC '${e}' stream ${s} transport.`),f.open(),p=!0),D(ke,`RPC '${e}' stream ${s} sending:`,C),f.send(C))},Ho:()=>f.close()});return vs(f,Ss.EventType.OPEN,()=>{g||(D(ke,`RPC '${e}' stream ${s} transport opened.`),v.i_())}),vs(f,Ss.EventType.CLOSE,()=>{g||(g=!0,D(ke,`RPC '${e}' stream ${s} transport closed`),v.o_(),this.E_(f))}),vs(f,Ss.EventType.ERROR,C=>{g||(g=!0,$n(ke,`RPC '${e}' stream ${s} transport errored. Name:`,C.name,"Message:",C.message),v.o_(new N(P.UNAVAILABLE,"The operation could not be completed")))}),vs(f,Ss.EventType.MESSAGE,C=>{var V;if(!g){const k=C.data[0];F(!!k,16349);const $=k,q=($==null?void 0:$.error)||((V=$[0])==null?void 0:V.error);if(q){D(ke,`RPC '${e}' stream ${s} received error:`,q);const U=q.status;let K=function(T){const _=_e[T];if(_!==void 0)return jm(_)}(U),G=q.message;U==="NOT_FOUND"&&G.includes("database")&&G.includes("does not exist")&&G.includes(this.databaseId.database)&&$n(`Database '${this.databaseId.database}' not found. Please check your project configuration.`),K===void 0&&(K=P.INTERNAL,G="Unknown error status: "+U+" with message "+q.message),g=!0,v.o_(new N(K,G)),f.close()}else D(ke,`RPC '${e}' stream ${s} received:`,k),v.__(k)}}),wr.u_(),setTimeout(()=>{v.s_()},0),v}terminate(){this.a_.forEach(e=>e.close()),this.a_=[]}I_(e){this.a_.push(e)}E_(e){this.a_=this.a_.filter(t=>t===e)}Go(e,t,r){super.Go(e,t,r),this.databaseInfo.apiKey&&(e["x-goog-api-key"]=this.databaseInfo.apiKey)}createWebChannelTransport(){return Bp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function RA(n){return new wr(n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function kg(){return typeof window<"u"?window:null}function mo(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ha(n){return new kv(n,!0)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */wr.c_=!1;class Fu{constructor(e,t,r=1e3,s=1.5,i=6e4){this.Ci=e,this.timerId=t,this.R_=r,this.A_=s,this.V_=i,this.d_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.d_=0}g_(){this.d_=this.V_}p_(e){this.cancel();const t=Math.floor(this.d_+this.y_()),r=Math.max(0,Date.now()-this.f_),s=Math.max(0,t-r);s>0&&D("ExponentialBackoff",`Backing off for ${s} ms (base delay: ${this.d_} ms, delay with jitter: ${t} ms, last attempt: ${r} ms ago)`),this.m_=this.Ci.enqueueAfterDelay(this.timerId,s,()=>(this.f_=Date.now(),e())),this.d_*=this.A_,this.d_<this.R_&&(this.d_=this.R_),this.d_>this.V_&&(this.d_=this.V_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.d_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sf="PersistentStream";class Dg{constructor(e,t,r,s,i,o,c,u){this.Ci=e,this.S_=r,this.b_=s,this.connection=i,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=c,this.listener=u,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new Fu(e,t)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Ci.enqueueAfterDelay(this.S_,6e4,()=>this.k_()))}K_(e){this.q_(),this.stream.send(e)}async k_(){if(this.O_())return this.close(0)}q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,t){this.q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():t&&t.code===P.RESOURCE_EXHAUSTED?(me(t.toString()),me("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):t&&t.code===P.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.W_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.t_(t)}W_(){}auth(){this.state=1;const e=this.Q_(this.D_),t=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([r,s])=>{this.D_===t&&this.G_(r,s)},r=>{e(()=>{const s=new N(P.UNKNOWN,"Fetching auth token failed: "+r.message);return this.z_(s)})})}G_(e,t){const r=this.Q_(this.D_);this.stream=this.j_(e,t),this.stream.Zo(()=>{r(()=>this.listener.Zo())}),this.stream.Yo(()=>{r(()=>(this.state=2,this.v_=this.Ci.enqueueAfterDelay(this.b_,1e4,()=>(this.O_()&&(this.state=3),Promise.resolve())),this.listener.Yo()))}),this.stream.t_(s=>{r(()=>this.z_(s))}),this.stream.onMessage(s=>{r(()=>++this.F_==1?this.J_(s):this.onNext(s))})}N_(){this.state=5,this.M_.p_(async()=>{this.state=0,this.start()})}z_(e){return D(sf,`close with error: ${e}`),this.stream=null,this.close(4,e)}Q_(e){return t=>{this.Ci.enqueueAndForget(()=>this.D_===e?t():(D(sf,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class SA extends Dg{constructor(e,t,r,s,i,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,r,s,o),this.serializer=i}j_(e,t){return this.connection.T_("Listen",e,t)}J_(e){return this.onNext(e)}onNext(e){this.M_.reset();const t=Ov(this.serializer,e),r=function(i){if(!("targetChange"in i))return B.min();const o=i.targetChange;return o.targetIds&&o.targetIds.length?B.min():o.readTime?Re(o.readTime):B.min()}(e);return this.listener.H_(t,r)}Z_(e){const t={};t.database=Lc(this.serializer),t.addTarget=function(i,o){let c;const u=o.target;if(c=Po(u)?{documents:Ym(i,u)}:{query:Cu(i,u).ft},c.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){c.resumeToken=Gm(i,o.resumeToken);const l=xc(i,o.expectedCount);l!==null&&(c.expectedCount=l)}else if(o.snapshotVersion.compareTo(B.min())>0){c.readTime=Lr(i,o.snapshotVersion.toTimestamp());const l=xc(i,o.expectedCount);l!==null&&(c.expectedCount=l)}return c}(this.serializer,e);const r=Lv(this.serializer,e);r&&(t.labels=r),this.K_(t)}X_(e){const t={};t.database=Lc(this.serializer),t.removeTarget=e,this.K_(t)}}class PA extends Dg{constructor(e,t,r,s,i,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,r,s,o),this.serializer=i}get Y_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}W_(){this.Y_&&this.ea([])}j_(e,t){return this.connection.T_("Write",e,t)}J_(e){return F(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,F(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta()}onNext(e){F(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();const t=xv(e.writeResults,e.commitTime),r=Re(e.commitTime);return this.listener.na(r,t)}ra(){const e={};e.database=Lc(this.serializer),this.K_(e)}ea(e){const t={streamToken:this.lastStreamToken,writes:e.map(r=>si(this.serializer,r))};this.K_(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class CA{}class kA extends CA{constructor(e,t,r,s){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=r,this.serializer=s,this.ia=!1}sa(){if(this.ia)throw new N(P.FAILED_PRECONDITION,"The client has already been terminated.")}Wo(e,t,r,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([i,o])=>this.connection.Wo(e,Mc(t,r),s,i,o)).catch(i=>{throw i.name==="FirebaseError"?(i.code===P.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),i):new N(P.UNKNOWN,i.toString())})}jo(e,t,r,s,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,c])=>this.connection.jo(e,Mc(t,r),s,o,c,i)).catch(o=>{throw o.name==="FirebaseError"?(o.code===P.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new N(P.UNKNOWN,o.toString())})}terminate(){this.ia=!0,this.connection.terminate()}}function DA(n,e,t,r){return new kA(n,e,t,r)}class VA{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve())))}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ca("Offline")))}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e)}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}la(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.aa?(me(t),this.aa=!1):D("OnlineStateTracker",t)}Pa(){this._a!==null&&(this._a.cancel(),this._a=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yt="RemoteStore";class NA{constructor(e,t,r,s,i){this.localStore=e,this.datastore=t,this.asyncQueue=r,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Map,this.Ra=new Map,this.Aa=new Vt(1e3),this.Va=new Vt(1001),this.da=new Set,this.ma=[],this.fa=i,this.fa.Mo(o=>{r.enqueueAndForget(async()=>{er(this)&&(D(yt,"Restarting streams for network reachability change."),await async function(u){const l=L(u);l.da.add(4),await vi(l),l.ga.set("Unknown"),l.da.delete(4),await da(l)}(this))})}),this.ga=new VA(r,s)}}async function da(n){if(er(n))for(const e of n.ma)await e(!0)}async function vi(n){for(const e of n.ma)await e(!1)}function Kc(n,e){return n.Ea.get(e)||void 0}function fa(n,e){const t=L(n),r=Kc(t,e.targetId);if(r!==void 0&&t.Ia.has(r))return;const s=function(c,u){const l=Kc(c,u);l!==void 0&&c.Ra.delete(l);const f=function(g,v){return v%2!=0?g.Va.next():g.Aa.next()}(c,u);return c.Ea.set(u,f),c.Ra.set(f,u),f}(t,e.targetId);D(yt,"remoteStoreListen mapping SDK target ID to remote",e.targetId,s);const i=new dt(e.target,s,e.purpose,e.sequenceNumber,e.snapshotVersion,e.lastLimboFreeSnapshotVersion,e.resumeToken);t.Ia.set(s,i),qu(t)?Bu(t):Jr(t).O_()&&Uu(t,i)}function Ur(n,e){const t=L(n),r=Jr(t),s=Kc(t,e);D(yt,"remoteStoreUnlisten removing mapping of SDK target ID to remote",e,s),t.Ia.delete(s),t.Ea.delete(e),t.Ra.delete(s),r.O_()&&Vg(t,s),t.Ia.size===0&&(r.O_()?r.L_():er(t)&&t.ga.set("Unknown"))}function Uu(n,e){if(n.pa.$e(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(B.min())>0){const t=n.Ra.get(e.targetId);if(t===void 0)return void D(yt,"SDK target ID not found for remote ID: "+e.targetId);const r=n.remoteSyncer.getRemoteKeysForTarget(t).size;e=e.withExpectedCount(r)}Jr(n).Z_(e)}function Vg(n,e){n.pa.$e(e),Jr(n).X_(e)}function Bu(n){n.pa=new Rv({getRemoteKeysForTarget:e=>{const t=n.Ra.get(e);return t!==void 0?n.remoteSyncer.getRemoteKeysForTarget(t):W()},At:e=>n.Ia.get(e)||null,ht:()=>n.datastore.serializer.databaseId}),Jr(n).start(),n.ga.ua()}function qu(n){return er(n)&&!Jr(n).x_()&&n.Ia.size>0}function er(n){return L(n).da.size===0}function Ng(n){n.pa=void 0}async function OA(n){n.ga.set("Online")}async function xA(n){n.Ia.forEach((e,t)=>{Uu(n,e)})}async function MA(n,e){Ng(n),qu(n)?(n.ga.ha(e),Bu(n)):n.ga.set("Unknown")}async function LA(n,e,t){if(n.ga.set("Online"),e instanceof Km&&e.state===2&&e.cause)try{await async function(s,i){const o=i.cause;for(const c of i.targetIds){if(s.Ia.has(c)){const u=s.Ra.get(c);u!==void 0&&(await s.remoteSyncer.rejectListen(u,o),s.Ea.delete(u),s.Ra.delete(c)),s.Ia.delete(c)}s.pa.removeTarget(c)}}(n,e)}catch(r){D(yt,"Failed to remove targets %s: %s ",e.targetIds.join(","),r),await Fo(n,r)}else if(e instanceof fo?n.pa.Xe(e):e instanceof zm?n.pa.st(e):n.pa.tt(e),!t.isEqual(B.min()))try{const r=await wg(n.localStore);t.compareTo(r)>=0&&await function(i,o){const c=i.pa.Tt(o);c.targetChanges.forEach((l,f)=>{if(l.resumeToken.approximateByteSize()>0){const p=i.Ia.get(f);p&&i.Ia.set(f,p.withResumeToken(l.resumeToken,o))}}),c.targetMismatches.forEach((l,f)=>{const p=i.Ia.get(l);if(!p)return;i.Ia.set(l,p.withResumeToken(ge.EMPTY_BYTE_STRING,p.snapshotVersion)),Vg(i,l);const g=new dt(p.target,l,f,p.sequenceNumber);Uu(i,g)});const u=function(f,p){const g=new Map;p.targetChanges.forEach((C,V)=>{const k=f.Ra.get(V);k!==void 0&&g.set(k,C)});let v=new ie(z);return p.targetMismatches.forEach((C,V)=>{const k=f.Ra.get(C);k!==void 0&&(v=v.insert(k,V))}),new Wr(p.snapshotVersion,g,v,p.documentUpdates,p.resolvedLimboDocuments)}(i,c);return i.remoteSyncer.applyRemoteEvent(u)}(n,t)}catch(r){D(yt,"Failed to raise snapshot:",r),await Fo(n,r)}}async function Fo(n,e,t){if(!gn(e))throw e;n.da.add(1),await vi(n),n.ga.set("Offline"),t||(t=()=>wg(n.localStore)),n.asyncQueue.enqueueRetryable(async()=>{D(yt,"Retrying IndexedDB access"),await t(),n.da.delete(1),await da(n)})}function Og(n,e){return e().catch(t=>Fo(n,t,e))}async function Qr(n){const e=L(n),t=dn(e);let r=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:xn;for(;FA(e);)try{const s=await EA(e.localStore,r);if(s===null){e.Ta.length===0&&t.L_();break}r=s.batchId,UA(e,s)}catch(s){await Fo(e,s)}xg(e)&&Mg(e)}function FA(n){return er(n)&&n.Ta.length<10}function UA(n,e){n.Ta.push(e);const t=dn(n);t.O_()&&t.Y_&&t.ea(e.mutations)}function xg(n){return er(n)&&!dn(n).x_()&&n.Ta.length>0}function Mg(n){dn(n).start()}async function BA(n){dn(n).ra()}async function qA(n){const e=dn(n);for(const t of n.Ta)e.ea(t.mutations)}async function $A(n,e,t){const r=n.Ta.shift(),s=bu.from(r,e,t);await Og(n,()=>n.remoteSyncer.applySuccessfulWrite(s)),await Qr(n)}async function jA(n,e){e&&dn(n).Y_&&await async function(r,s){if(function(o){return $m(o)&&o!==P.ABORTED}(s.code)){const i=r.Ta.shift();dn(r).B_(),await Og(r,()=>r.remoteSyncer.rejectFailedWrite(i.batchId,s)),await Qr(r)}}(n,e),xg(n)&&Mg(n)}async function of(n,e){const t=L(n);t.asyncQueue.verifyOperationInProgress(),D(yt,"RemoteStore received new credentials");const r=er(t);t.da.add(3),await vi(t),r&&t.ga.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.da.delete(3),await da(t)}async function Gc(n,e){const t=L(n);e?(t.da.delete(2),await da(t)):e||(t.da.add(2),await vi(t),t.ga.set("Unknown"))}function Jr(n){return n.ya||(n.ya=function(t,r,s){const i=L(t);return i.sa(),new SA(r,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(n.datastore,n.asyncQueue,{Zo:OA.bind(null,n),Yo:xA.bind(null,n),t_:MA.bind(null,n),H_:LA.bind(null,n)}),n.ma.push(async e=>{e?(n.ya.B_(),qu(n)?Bu(n):n.ga.set("Unknown")):(await n.ya.stop(),Ng(n))})),n.ya}function dn(n){return n.wa||(n.wa=function(t,r,s){const i=L(t);return i.sa(),new PA(r,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(n.datastore,n.asyncQueue,{Zo:()=>Promise.resolve(),Yo:BA.bind(null,n),t_:jA.bind(null,n),ta:qA.bind(null,n),na:$A.bind(null,n)}),n.ma.push(async e=>{e?(n.wa.B_(),await Qr(n)):(await n.wa.stop(),n.Ta.length>0&&(D(yt,`Stopping write stream with ${n.Ta.length} pending writes`),n.Ta=[]))})),n.wa}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $u{constructor(e,t,r,s,i){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=r,this.op=s,this.removalCallback=i,this.deferred=new Xe,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,t,r,s,i){const o=Date.now()+r,c=new $u(e,t,o,s,i);return c.start(r),c}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new N(P.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function ju(n,e){if(me("AsyncQueue",`${e}: ${n}`),gn(n))return new N(P.UNAVAILABLE,`${e}: ${n}`);throw n}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vr{static emptySet(e){return new vr(e.comparator)}constructor(e){this.comparator=e?(t,r)=>e(t,r)||x.comparator(t.key,r.key):(t,r)=>x.comparator(t.key,r.key),this.keyedMap=Ps(),this.sortedSet=new ie(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((t,r)=>(e(t),!1))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof vr)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),r=e.sortedSet.getIterator();for(;t.hasNext();){const s=t.getNext().key,i=r.getNext().key;if(!s.isEqual(i))return!1}return!0}toString(){const e=[];return this.forEach(t=>{e.push(t.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const r=new vr;return r.comparator=this.comparator,r.keyedMap=e,r.sortedSet=t,r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class af{constructor(){this.Sa=new ie(x.comparator)}track(e){const t=e.doc.key,r=this.Sa.get(t);r?e.type!==0&&r.type===3?this.Sa=this.Sa.insert(t,e):e.type===3&&r.type!==1?this.Sa=this.Sa.insert(t,{type:r.type,doc:e.doc}):e.type===2&&r.type===2?this.Sa=this.Sa.insert(t,{type:2,doc:e.doc}):e.type===2&&r.type===0?this.Sa=this.Sa.insert(t,{type:0,doc:e.doc}):e.type===1&&r.type===0?this.Sa=this.Sa.remove(t):e.type===1&&r.type===2?this.Sa=this.Sa.insert(t,{type:1,doc:r.doc}):e.type===0&&r.type===1?this.Sa=this.Sa.insert(t,{type:2,doc:e.doc}):M(63341,{Vt:e,ba:r}):this.Sa=this.Sa.insert(t,e)}Da(){const e=[];return this.Sa.inorderTraversal((t,r)=>{e.push(r)}),e}}class Br{constructor(e,t,r,s,i,o,c,u,l){this.query=e,this.docs=t,this.oldDocs=r,this.docChanges=s,this.mutatedKeys=i,this.fromCache=o,this.syncStateChanged=c,this.excludesMetadataChanges=u,this.hasCachedResults=l}static fromInitialDocuments(e,t,r,s,i){const o=[];return t.forEach(c=>{o.push({type:0,doc:c})}),new Br(e,t,vr.emptySet(t),o,r,s,!0,!1,i)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&sa(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,r=e.docChanges;if(t.length!==r.length)return!1;for(let s=0;s<t.length;s++)if(t[s].type!==r[s].type||!t[s].doc.isEqual(r[s].doc))return!1;return!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zA{constructor(){this.Ca=void 0,this.va=[]}Fa(){return this.va.some(e=>e.Ma())}}class KA{constructor(){this.queries=cf(),this.onlineState="Unknown",this.xa=new Set}terminate(){(function(t,r){const s=L(t),i=s.queries;s.queries=cf(),i.forEach((o,c)=>{for(const u of c.va)u.onError(r)})})(this,new N(P.ABORTED,"Firestore shutting down"))}}function cf(){return new Mt(n=>Pm(n),sa)}async function zu(n,e){const t=L(n);let r=3;const s=e.query;let i=t.queries.get(s);i?!i.Fa()&&e.Ma()&&(r=2):(i=new zA,r=e.Ma()?0:1);try{switch(r){case 0:i.Ca=await t.onListen(s,!0);break;case 1:i.Ca=await t.onListen(s,!1);break;case 2:await t.onFirstRemoteStoreListen(s)}}catch(o){const c=ju(o,`Initialization of query '${pr(e.query)}' failed`);return void e.onError(c)}t.queries.set(s,i),i.va.push(e),e.Oa(t.onlineState),i.Ca&&e.Na(i.Ca)&&Gu(t)}async function Ku(n,e){const t=L(n),r=e.query;let s=3;const i=t.queries.get(r);if(i){const o=i.va.indexOf(e);o>=0&&(i.va.splice(o,1),i.va.length===0?s=e.Ma()?0:1:!i.Fa()&&e.Ma()&&(s=2))}switch(s){case 0:return t.queries.delete(r),t.onUnlisten(r,!0);case 1:return t.queries.delete(r),t.onUnlisten(r,!1);case 2:return t.onLastRemoteStoreUnlisten(r);default:return}}function GA(n,e){const t=L(n);let r=!1;for(const s of e){const i=s.query,o=t.queries.get(i);if(o){for(const c of o.va)c.Na(s)&&(r=!0);o.Ca=s}}r&&Gu(t)}function HA(n,e,t){const r=L(n),s=r.queries.get(e);if(s)for(const i of s.va)i.onError(t);r.queries.delete(e)}function Gu(n){n.xa.forEach(e=>{e.next()})}var Hc,uf;(uf=Hc||(Hc={})).Ba="default",uf.Cache="cache";class Hu{constructor(e,t,r){this.query=e,this.La=t,this.ka=!1,this.Ka=null,this.onlineState="Unknown",this.options=r||{}}Na(e){if(!this.options.includeMetadataChanges){const r=[];for(const s of e.docChanges)s.type!==3&&r.push(s);e=new Br(e.query,e.docs,e.oldDocs,r,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.ka?this.qa(e)&&(this.La.next(e),t=!0):this.Ua(e,this.onlineState)&&(this.$a(e),t=!0),this.Ka=e,t}onError(e){this.La.error(e)}Oa(e){this.onlineState=e;let t=!1;return this.Ka&&!this.ka&&this.Ua(this.Ka,e)&&(this.$a(this.Ka),t=!0),t}Ua(e,t){if(!e.fromCache||!this.Ma())return!0;const r=t!=="Offline";return(!this.options.Wa||!r)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}qa(e){if(e.docChanges.length>0)return!0;const t=this.Ka&&this.Ka.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}$a(e){e=Br.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.ka=!0,this.La.next(e)}Ma(){return this.options.source!==Hc.Cache}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lg{constructor(e){this.key=e}}class Fg{constructor(e){this.key=e}}class WA{constructor(e,t){this.query=e,this.tu=t,this.nu=null,this.hasCachedResults=!1,this.current=!1,this.ru=W(),this.mutatedKeys=W(),this.iu=km(e),this.su=new vr(this.iu)}get ou(){return this.tu}_u(e,t){const r=t?t.au:new af,s=t?t.su:this.su;let i=t?t.mutatedKeys:this.mutatedKeys,o=s,c=!1;const u=this.query.limitType==="F"&&s.size===this.query.limit?s.last():null,l=this.query.limitType==="L"&&s.size===this.query.limit?s.first():null;if(e.inorderTraversal((f,p)=>{const g=s.get(f),v=Ei(this.query,p)?p:null,C=!!g&&this.mutatedKeys.has(g.key),V=!!v&&(v.hasLocalMutations||this.mutatedKeys.has(v.key)&&v.hasCommittedMutations);let k=!1;g&&v?g.data.isEqual(v.data)?C!==V&&(r.track({type:3,doc:v}),k=!0):this.uu(g,v)||(r.track({type:2,doc:v}),k=!0,(u&&this.iu(v,u)>0||l&&this.iu(v,l)<0)&&(c=!0)):!g&&v?(r.track({type:0,doc:v}),k=!0):g&&!v&&(r.track({type:1,doc:g}),k=!0,(u||l)&&(c=!0)),k&&(v?(o=o.add(v),i=V?i.add(f):i.delete(f)):(o=o.delete(f),i=i.delete(f)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const f=this.query.limitType==="F"?o.last():o.first();o=o.delete(f.key),i=i.delete(f.key),r.track({type:1,doc:f})}return{su:o,au:r,bs:c,mutatedKeys:i}}uu(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,r,s){const i=this.su;this.su=e.su,this.mutatedKeys=e.mutatedKeys;const o=e.au.Da();o.sort((f,p)=>function(v,C){const V=k=>{switch(k){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return M(20277,{Vt:k})}};return V(v)-V(C)}(f.type,p.type)||this.iu(f.doc,p.doc)),this.cu(r),s=s??!1;const c=t&&!s?this.lu():[],u=this.ru.size===0&&this.current&&!s?1:0,l=u!==this.nu;return this.nu=u,o.length!==0||l?{snapshot:new Br(this.query,e.su,i,o,e.mutatedKeys,u===0,l,!1,!!r&&r.resumeToken.approximateByteSize()>0),hu:c}:{hu:c}}Oa(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({su:this.su,au:new af,mutatedKeys:this.mutatedKeys,bs:!1},!1)):{hu:[]}}Pu(e){return!this.tu.has(e)&&!!this.su.has(e)&&!this.su.get(e).hasLocalMutations}cu(e){e&&(e.addedDocuments.forEach(t=>this.tu=this.tu.add(t)),e.modifiedDocuments.forEach(t=>{}),e.removedDocuments.forEach(t=>this.tu=this.tu.delete(t)),this.current=e.current)}lu(){if(!this.current)return[];const e=this.ru;this.ru=W(),this.su.forEach(r=>{this.Pu(r.key)&&(this.ru=this.ru.add(r.key))});const t=[];return e.forEach(r=>{this.ru.has(r)||t.push(new Fg(r))}),this.ru.forEach(r=>{e.has(r)||t.push(new Lg(r))}),t}Tu(e){this.tu=e.ks,this.ru=W();const t=this._u(e.documents);return this.applyChanges(t,!0)}Iu(){return Br.fromInitialDocuments(this.query,this.su,this.mutatedKeys,this.nu===0,this.hasCachedResults)}}const Yr="SyncEngine";class QA{constructor(e,t,r){this.query=e,this.targetId=t,this.view=r}}class JA{constructor(e){this.key=e,this.Eu=!1}}class YA{constructor(e,t,r,s,i,o){this.localStore=e,this.remoteStore=t,this.eventManager=r,this.sharedClientState=s,this.currentUser=i,this.maxConcurrentLimboResolutions=o,this.Ru={},this.Au=new Mt(c=>Pm(c),sa),this.Vu=new Map,this.du=new Set,this.mu=new ie(x.comparator),this.fu=new Map,this.gu=new Vu,this.pu={},this.yu=new Map,this.wu=Vt.ar(),this.onlineState="Unknown",this.Su=void 0}get isPrimaryClient(){return this.Su===!0}}async function XA(n,e,t=!0){const r=pa(n);let s;const i=r.Au.get(e);return i?(r.sharedClientState.addLocalQueryTarget(i.targetId),s=i.view.Iu()):s=await Ug(r,e,t,!0),s}async function ZA(n,e){const t=pa(n);await Ug(t,e,!0,!1)}async function Ug(n,e,t,r){const s=await xo(n.localStore,Qe(e)),i=s.targetId,o=n.sharedClientState.addLocalQueryTarget(i,t);let c;return r&&(c=await Wu(n,e,i,o==="current",s.resumeToken)),n.isPrimaryClient&&t&&fa(n.remoteStore,s),c}async function Wu(n,e,t,r,s){n.bu=(p,g,v)=>async function(V,k,$,q){let U=k.view._u($);U.bs&&(U=await $c(V.localStore,k.query,!1).then(({documents:T})=>k.view._u(T,U)));const K=q&&q.targetChanges.get(k.targetId),G=q&&q.targetMismatches.get(k.targetId)!=null,Q=k.view.applyChanges(U,V.isPrimaryClient,K,G);return Wc(V,k.targetId,Q.hu),Q.snapshot}(n,p,g,v);const i=await $c(n.localStore,e,!0),o=new WA(e,i.ks),c=o._u(i.documents),u=wi.createSynthesizedTargetChangeForCurrentChange(t,r&&n.onlineState!=="Offline",s),l=o.applyChanges(c,n.isPrimaryClient,u);Wc(n,t,l.hu);const f=new QA(e,t,o);return n.Au.set(e,f),n.Vu.has(t)?n.Vu.get(t).push(e):n.Vu.set(t,[e]),l.snapshot}async function eb(n,e,t){const r=L(n),s=r.Au.get(e),i=r.Vu.get(s.targetId);if(i.length>1)return r.Vu.set(s.targetId,i.filter(o=>!sa(o,e))),void r.Au.delete(e);r.isPrimaryClient?(r.sharedClientState.removeLocalQueryTarget(s.targetId),r.sharedClientState.isActiveQueryTarget(s.targetId)||await Fr(r.localStore,s.targetId,!1).then(()=>{r.sharedClientState.clearQueryState(s.targetId),t&&Ur(r.remoteStore,s.targetId),qr(r,s.targetId)}).catch(mn)):(qr(r,s.targetId),await Fr(r.localStore,s.targetId,!0))}async function tb(n,e){const t=L(n),r=t.Au.get(e),s=t.Vu.get(r.targetId);t.isPrimaryClient&&s.length===1&&(t.sharedClientState.removeLocalQueryTarget(r.targetId),Ur(t.remoteStore,r.targetId))}async function nb(n,e,t){const r=Xu(n);try{const s=await function(o,c){const u=L(o),l=te.now(),f=c.reduce((v,C)=>v.add(C.key),W());let p,g;return u.persistence.runTransaction("Locally write mutations","readwrite",v=>{let C=He(),V=W();return u.xs.getEntries(v,f).next(k=>{C=k,C.forEach(($,q)=>{q.isValidDocument()||(V=V.add($))})}).next(()=>u.localDocuments.getOverlayedDocuments(v,C)).next(k=>{p=k;const $=[];for(const q of c){const U=Ev(q,p.get(q.key).overlayedDocument);U!=null&&$.push(new Lt(q.key,U,_m(U.value.mapValue),le.exists(!0)))}return u.mutationQueue.addMutationBatch(v,l,$,c)}).next(k=>{g=k;const $=k.applyToLocalDocumentSet(p,V);return u.documentOverlayCache.saveOverlays(v,k.batchId,$)})}).then(()=>({batchId:g.batchId,changes:Vm(p)}))}(r.localStore,e);r.sharedClientState.addPendingMutation(s.batchId),function(o,c,u){let l=o.pu[o.currentUser.toKey()];l||(l=new ie(z)),l=l.insert(c,u),o.pu[o.currentUser.toKey()]=l}(r,s.batchId,t),await yn(r,s.changes),await Qr(r.remoteStore)}catch(s){const i=ju(s,"Failed to persist write");t.reject(i)}}async function Bg(n,e){const t=L(n);try{const r=await IA(t.localStore,e);e.targetChanges.forEach((s,i)=>{const o=t.fu.get(i);o&&(F(s.addedDocuments.size+s.modifiedDocuments.size+s.removedDocuments.size<=1,22616),s.addedDocuments.size>0?o.Eu=!0:s.modifiedDocuments.size>0?F(o.Eu,14607):s.removedDocuments.size>0&&(F(o.Eu,42227),o.Eu=!1))}),await yn(t,r,e)}catch(r){await mn(r)}}function lf(n,e,t){const r=L(n);if(r.isPrimaryClient&&t===0||!r.isPrimaryClient&&t===1){const s=[];r.Au.forEach((i,o)=>{const c=o.view.Oa(e);c.snapshot&&s.push(c.snapshot)}),function(o,c){const u=L(o);u.onlineState=c;let l=!1;u.queries.forEach((f,p)=>{for(const g of p.va)g.Oa(c)&&(l=!0)}),l&&Gu(u)}(r.eventManager,e),s.length&&r.Ru.H_(s),r.onlineState=e,r.isPrimaryClient&&r.sharedClientState.setOnlineState(e)}}async function rb(n,e,t){const r=L(n);r.sharedClientState.updateQueryState(e,"rejected",t);const s=r.fu.get(e),i=s&&s.key;if(i){let o=new ie(x.comparator);o=o.insert(i,ue.newNoDocument(i,B.min()));const c=W().add(i),u=new Wr(B.min(),new Map,new ie(z),o,c);await Bg(r,u),r.mu=r.mu.remove(i),r.fu.delete(e),Yu(r)}else await Fr(r.localStore,e,!1).then(()=>qr(r,e,t)).catch(mn)}async function sb(n,e){const t=L(n),r=e.batch.batchId;try{const s=await yA(t.localStore,e);Ju(t,r,null),Qu(t,r),t.sharedClientState.updateMutationState(r,"acknowledged"),await yn(t,s)}catch(s){await mn(s)}}async function ib(n,e,t){const r=L(n);try{const s=await function(o,c){const u=L(o);return u.persistence.runTransaction("Reject batch","readwrite-primary",l=>{let f;return u.mutationQueue.lookupMutationBatch(l,c).next(p=>(F(p!==null,37113),f=p.keys(),u.mutationQueue.removeMutationBatch(l,p))).next(()=>u.mutationQueue.performConsistencyCheck(l)).next(()=>u.documentOverlayCache.removeOverlaysForBatchId(l,f,c)).next(()=>u.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(l,f)).next(()=>u.localDocuments.getDocuments(l,f))})}(r.localStore,e);Ju(r,e,t),Qu(r,e),r.sharedClientState.updateMutationState(e,"rejected",t),await yn(r,s)}catch(s){await mn(s)}}function Qu(n,e){(n.yu.get(e)||[]).forEach(t=>{t.resolve()}),n.yu.delete(e)}function Ju(n,e,t){const r=L(n);let s=r.pu[r.currentUser.toKey()];if(s){const i=s.get(e);i&&(t?i.reject(t):i.resolve(),s=s.remove(e)),r.pu[r.currentUser.toKey()]=s}}function qr(n,e,t=null){n.sharedClientState.removeLocalQueryTarget(e);for(const r of n.Vu.get(e))n.Au.delete(r),t&&n.Ru.Du(r,t);n.Vu.delete(e),n.isPrimaryClient&&n.gu.Gr(e).forEach(r=>{n.gu.containsKey(r)||qg(n,r)})}function qg(n,e){n.du.delete(e.path.canonicalString());const t=n.mu.get(e);t!==null&&(Ur(n.remoteStore,t),n.mu=n.mu.remove(e),n.fu.delete(t),Yu(n))}function Wc(n,e,t){for(const r of t)r instanceof Lg?(n.gu.addReference(r.key,e),ob(n,r)):r instanceof Fg?(D(Yr,"Document no longer in limbo: "+r.key),n.gu.removeReference(r.key,e),n.gu.containsKey(r.key)||qg(n,r.key)):M(19791,{Cu:r})}function ob(n,e){const t=e.key,r=t.path.canonicalString();n.mu.get(t)||n.du.has(r)||(D(Yr,"New document in limbo: "+t),n.du.add(r),Yu(n))}function Yu(n){for(;n.du.size>0&&n.mu.size<n.maxConcurrentLimboResolutions;){const e=n.du.values().next().value;n.du.delete(e);const t=new x(ee.fromString(e)),r=n.wu.next();n.fu.set(r,new JA(t)),n.mu=n.mu.insert(t,r),fa(n.remoteStore,new dt(Qe(Ti(t.path)),r,"TargetPurposeLimboResolution",qe.ce))}}async function yn(n,e,t){const r=L(n),s=[],i=[],o=[];r.Au.isEmpty()||(r.Au.forEach((c,u)=>{o.push(r.bu(u,e,t).then(l=>{var f;if((l||t)&&r.isPrimaryClient){const p=l?!l.fromCache:(f=t==null?void 0:t.targetChanges.get(u.targetId))==null?void 0:f.current;r.sharedClientState.updateQueryState(u.targetId,p?"current":"not-current")}if(l){s.push(l);const p=xu.Es(u.targetId,l);i.push(p)}}))}),await Promise.all(o),r.Ru.H_(s),await async function(u,l){const f=L(u);try{await f.persistence.runTransaction("notifyLocalViewChanges","readwrite",p=>A.forEach(l,g=>A.forEach(g.Ts,v=>f.persistence.referenceDelegate.addReference(p,g.targetId,v)).next(()=>A.forEach(g.Is,v=>f.persistence.referenceDelegate.removeReference(p,g.targetId,v)))))}catch(p){if(!gn(p))throw p;D(Mu,"Failed to update sequence numbers: "+p)}for(const p of l){const g=p.targetId;if(!p.fromCache){const v=f.vs.get(g),C=v.snapshotVersion,V=v.withLastLimboFreeSnapshotVersion(C);f.vs=f.vs.insert(g,V)}}}(r.localStore,i))}async function ab(n,e){const t=L(n);if(!t.currentUser.isEqual(e)){D(Yr,"User change. New user:",e.toKey());const r=await Eg(t.localStore,e);t.currentUser=e,function(i,o){i.yu.forEach(c=>{c.forEach(u=>{u.reject(new N(P.CANCELLED,o))})}),i.yu.clear()}(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,r.removedBatchIds,r.addedBatchIds),await yn(t,r.Ns)}}function cb(n,e){const t=L(n),r=t.fu.get(e);if(r&&r.Eu)return W().add(r.key);{let s=W();const i=t.Vu.get(e);if(!i)return s;for(const o of i){const c=t.Au.get(o);s=s.unionWith(c.view.ou)}return s}}async function ub(n,e){const t=L(n),r=await $c(t.localStore,e.query,!0),s=e.view.Tu(r);return t.isPrimaryClient&&Wc(t,e.targetId,s.hu),s}async function lb(n,e){const t=L(n);return Ag(t.localStore,e).then(r=>yn(t,r))}async function hb(n,e,t,r){const s=L(n),i=await function(c,u){const l=L(c),f=L(l.mutationQueue);return l.persistence.runTransaction("Lookup mutation documents","readonly",p=>f.Xn(p,u).next(g=>g?l.localDocuments.getDocuments(p,g):A.resolve(null)))}(s.localStore,e);i!==null?(t==="pending"?await Qr(s.remoteStore):t==="acknowledged"||t==="rejected"?(Ju(s,e,r||null),Qu(s,e),function(c,u){L(L(c).mutationQueue).nr(u)}(s.localStore,e)):M(6720,"Unknown batchState",{vu:t}),await yn(s,i)):D(Yr,"Cannot apply mutation batch with id: "+e)}async function db(n,e){const t=L(n);if(pa(t),Xu(t),e===!0&&t.Su!==!0){const r=t.sharedClientState.getAllActiveQueryTargets(),s=await hf(t,r.toArray());t.Su=!0,await Gc(t.remoteStore,!0);for(const i of s)fa(t.remoteStore,i)}else if(e===!1&&t.Su!==!1){const r=[];let s=Promise.resolve();t.Vu.forEach((i,o)=>{t.sharedClientState.isLocalQueryTarget(o)?r.push(o):s=s.then(()=>(qr(t,o),Fr(t.localStore,o,!0))),Ur(t.remoteStore,o)}),await s,await hf(t,r),function(o){const c=L(o);c.fu.forEach((u,l)=>{Ur(c.remoteStore,l)}),c.gu.zr(),c.fu=new Map,c.mu=new ie(x.comparator)}(t),t.Su=!1,await Gc(t.remoteStore,!1)}}async function hf(n,e,t){const r=L(n),s=[],i=[];for(const o of e){let c;const u=r.Vu.get(o);if(u&&u.length!==0){c=await xo(r.localStore,Qe(u[0]));for(const l of u){const f=r.Au.get(l),p=await ub(r,f);p.snapshot&&i.push(p.snapshot)}}else{const l=await vg(r.localStore,o);c=await xo(r.localStore,l),await Wu(r,$g(l),o,!1,c.resumeToken)}s.push(c)}return r.Ru.H_(i),s}function $g(n){return bm(n.path,n.collectionGroup,n.orderBy,n.filters,n.limit,"F",n.startAt,n.endAt)}function fb(n){return function(t){return L(L(t).persistence).hs()}(L(n).localStore)}async function pb(n,e,t,r){const s=L(n);if(s.Su)return void D(Yr,"Ignoring unexpected query state notification.");const i=s.Vu.get(e);if(i&&i.length>0)switch(t){case"current":case"not-current":{const o=await Ag(s.localStore,Cm(i[0])),c=Wr.createSynthesizedRemoteEventForCurrentChange(e,t==="current",ge.EMPTY_BYTE_STRING);await yn(s,o,c);break}case"rejected":await Fr(s.localStore,e,!0),qr(s,e,r);break;default:M(64155,t)}}async function mb(n,e,t){const r=pa(n);if(r.Su){for(const s of e){if(r.Vu.has(s)&&r.sharedClientState.isActiveQueryTarget(s)){D(Yr,"Adding an already active target "+s);continue}const i=await vg(r.localStore,s),o=await xo(r.localStore,i);await Wu(r,$g(i),o.targetId,!1,o.resumeToken),fa(r.remoteStore,o)}for(const s of t)r.Vu.has(s)&&await Fr(r.localStore,s,!1).then(()=>{Ur(r.remoteStore,s),qr(r,s)}).catch(mn)}}function pa(n){const e=L(n);return e.remoteStore.remoteSyncer.applyRemoteEvent=Bg.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=cb.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=rb.bind(null,e),e.Ru.H_=GA.bind(null,e.eventManager),e.Ru.Du=HA.bind(null,e.eventManager),e}function Xu(n){const e=L(n);return e.remoteStore.remoteSyncer.applySuccessfulWrite=sb.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=ib.bind(null,e),e}class ii{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=ha(e.databaseInfo.databaseId),this.sharedClientState=this.Mu(e),this.persistence=this.xu(e),await this.persistence.start(),this.localStore=this.Ou(e),this.gcScheduler=this.Nu(e,this.localStore),this.indexBackfillerScheduler=this.Bu(e,this.localStore)}Nu(e,t){return null}Bu(e,t){return null}Ou(e){return Tg(this.persistence,new Ig,e.initialUser,this.serializer)}xu(e){return new Nu(la.Vi,this.serializer)}Mu(e){return new Cg}async terminate(){var e,t;(e=this.gcScheduler)==null||e.stop(),(t=this.indexBackfillerScheduler)==null||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}ii.provider={build:()=>new ii};class gb extends ii{constructor(e){super(),this.cacheSizeBytes=e}Nu(e,t){F(this.persistence.referenceDelegate instanceof Oo,46915);const r=this.persistence.referenceDelegate.garbageCollector;return new fg(r,e.asyncQueue,t)}xu(e){const t=this.cacheSizeBytes!==void 0?De.withCacheSize(this.cacheSizeBytes):De.DEFAULT;return new Nu(r=>Oo.Vi(r,t),this.serializer)}}class jg extends ii{constructor(e,t,r){super(),this.Lu=e,this.cacheSizeBytes=t,this.forceOwnership=r,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.Lu.initialize(this,e),await Xu(this.Lu.syncEngine),await Qr(this.Lu.remoteStore),await this.persistence.zi(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}Ou(e){return Tg(this.persistence,new Ig,e.initialUser,this.serializer)}Nu(e,t){const r=this.persistence.referenceDelegate.garbageCollector;return new fg(r,e.asyncQueue,t)}Bu(e,t){const r=new Ew(t,this.persistence);return new Tw(e.asyncQueue,r)}xu(e){const t=yg(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),r=this.cacheSizeBytes!==void 0?De.withCacheSize(this.cacheSizeBytes):De.DEFAULT;return new Ou(this.synchronizeTabs,t,e.clientId,r,e.asyncQueue,kg(),mo(),this.serializer,this.sharedClientState,!!this.forceOwnership)}Mu(e){return new Cg}}class _b extends jg{constructor(e,t){super(e,t,!1),this.Lu=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.Lu.syncEngine;this.sharedClientState instanceof sc&&(this.sharedClientState.syncEngine={bo:hb.bind(null,t),Do:pb.bind(null,t),Co:mb.bind(null,t),hs:fb.bind(null,t),So:lb.bind(null,t)},await this.sharedClientState.start()),await this.persistence.zi(async r=>{await db(this.Lu.syncEngine,r),this.gcScheduler&&(r&&!this.gcScheduler.started?this.gcScheduler.start():r||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(r&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():r||this.indexBackfillerScheduler.stop())})}Mu(e){const t=kg();if(!sc.v(t))throw new N(P.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const r=yg(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new sc(t,e.asyncQueue,r,e.clientId,e.initialUser)}}class oi{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=r=>lf(this.syncEngine,r,1),this.remoteStore.remoteSyncer.handleCredentialChange=ab.bind(null,this.syncEngine),await Gc(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new KA}()}createDatastore(e){const t=ha(e.databaseInfo.databaseId),r=RA(e.databaseInfo);return DA(e.authCredentials,e.appCheckCredentials,r,t)}createRemoteStore(e){return function(r,s,i,o,c){return new NA(r,s,i,o,c)}(this.localStore,this.datastore,e.asyncQueue,t=>lf(this.syncEngine,t,0),function(){return rf.v()?new rf:new wA}())}createSyncEngine(e,t){return function(s,i,o,c,u,l,f){const p=new YA(s,i,o,c,u,l);return f&&(p.Su=!0),p}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await async function(s){const i=L(s);D(yt,"RemoteStore shutting down."),i.da.add(5),await vi(i),i.fa.shutdown(),i.ga.set("Unknown")}(this.remoteStore),(e=this.datastore)==null||e.terminate(),(t=this.eventManager)==null||t.terminate()}}oi.provider={build:()=>new oi};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zu{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.ku(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.ku(this.observer.error,e):me("Uncaught Error in snapshot listener:",e.toString()))}Ku(){this.muted=!0}ku(e,t){setTimeout(()=>{this.muted||e(t)},0)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let yb=class{constructor(e){this.datastore=e,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new N(P.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;const t=await async function(s,i){const o=L(s),c={documents:i.map(p=>ri(o.serializer,p))},u=await o.jo("BatchGetDocuments",o.serializer.databaseId,ee.emptyPath(),c,i.length),l=new Map;u.forEach(p=>{const g=Nv(o.serializer,p);l.set(g.key.toString(),g)});const f=[];return i.forEach(p=>{const g=l.get(p.toString());F(!!g,55234,{key:p}),f.push(g)}),f}(this.datastore,e);return t.forEach(r=>this.recordVersion(r)),t}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString())}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)))}catch(r){this.lastTransactionError=r}this.writtenDocs.add(e.toString())}delete(e){this.write(new Hr(e,this.precondition(e))),this.writtenDocs.add(e.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;const e=this.readVersions;this.mutations.forEach(t=>{e.delete(t.key.toString())}),e.forEach((t,r)=>{const s=x.fromPath(r);this.mutations.push(new vu(s,this.precondition(s)))}),await async function(r,s){const i=L(r),o={writes:s.map(c=>si(i.serializer,c))};await i.Wo("Commit",i.serializer.databaseId,ee.emptyPath(),o)}(this.datastore,this.mutations),this.committed=!0}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw M(50498,{Hu:e.constructor.name});t=B.min()}const r=this.readVersions.get(e.key.toString());if(r){if(!t.isEqual(r))throw new N(P.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(e.key.toString(),t)}precondition(e){const t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual(B.min())?le.exists(!1):le.updateTime(t):le.none()}preconditionForUpdate(e){const t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual(B.min()))throw new N(P.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return le.updateTime(t)}return le.exists(!0)}write(e){this.ensureCommitNotCalled(),this.mutations.push(e)}ensureCommitNotCalled(){}};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ib{constructor(e,t,r,s,i){this.asyncQueue=e,this.datastore=t,this.options=r,this.updateFunction=s,this.deferred=i,this.Zu=r.maxAttempts,this.M_=new Fu(this.asyncQueue,"transaction_retry")}Xu(){this.Zu-=1,this.Yu()}Yu(){this.M_.p_(async()=>{const e=new yb(this.datastore),t=this.ec(e);t&&t.then(r=>{this.asyncQueue.enqueueAndForget(()=>e.commit().then(()=>{this.deferred.resolve(r)}).catch(s=>{this.tc(s)}))}).catch(r=>{this.tc(r)})})}ec(e){try{const t=this.updateFunction(e);return!_i(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}tc(e){this.Zu>0&&this.nc(e)?(this.Zu-=1,this.asyncQueue.enqueueAndForget(()=>(this.Yu(),Promise.resolve()))):this.deferred.reject(e)}nc(e){if((e==null?void 0:e.name)==="FirebaseError"){const t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!$m(t)}return!1}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fn="FirestoreClient";class Tb{constructor(e,t,r,s,i){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=r,this._databaseInfo=s,this.user=Ae.UNAUTHENTICATED,this.clientId=lu.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=i,this.authCredentials.start(r,async o=>{D(fn,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(r,o=>(D(fn,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this._databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new Xe;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const r=ju(t,"Failed to shutdown persistence");e.reject(r)}}),e.promise}}async function oc(n,e){n.asyncQueue.verifyOperationInProgress(),D(fn,"Initializing OfflineComponentProvider");const t=n.configuration;await e.initialize(t);let r=t.initialUser;n.setCredentialChangeListener(async s=>{r.isEqual(s)||(await Eg(e.localStore,s),r=s)}),e.persistence.setDatabaseDeletedListener(()=>n.terminate()),n._offlineComponents=e}async function df(n,e){n.asyncQueue.verifyOperationInProgress();const t=await Eb(n);D(fn,"Initializing OnlineComponentProvider"),await e.initialize(t,n.configuration),n.setCredentialChangeListener(r=>of(e.remoteStore,r)),n.setAppCheckTokenChangeListener((r,s)=>of(e.remoteStore,s)),n._onlineComponents=e}async function Eb(n){if(!n._offlineComponents)if(n._uninitializedComponentsProvider){D(fn,"Using user provided OfflineComponentProvider");try{await oc(n,n._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!function(s){return s.name==="FirebaseError"?s.code===P.FAILED_PRECONDITION||s.code===P.UNIMPLEMENTED:!(typeof DOMException<"u"&&s instanceof DOMException)||s.code===22||s.code===20||s.code===11}(t))throw t;$n("Error using user provided cache. Falling back to memory cache: "+t),await oc(n,new ii)}}else D(fn,"Using default OfflineComponentProvider"),await oc(n,new gb(void 0));return n._offlineComponents}async function el(n){return n._onlineComponents||(n._uninitializedComponentsProvider?(D(fn,"Using user provided OnlineComponentProvider"),await df(n,n._uninitializedComponentsProvider._online)):(D(fn,"Using default OnlineComponentProvider"),await df(n,new oi))),n._onlineComponents}function wb(n){return el(n).then(e=>e.syncEngine)}function zg(n){return el(n).then(e=>e.datastore)}async function Uo(n){const e=await el(n),t=e.eventManager;return t.onListen=XA.bind(null,e.syncEngine),t.onUnlisten=eb.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=ZA.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=tb.bind(null,e.syncEngine),t}function vb(n,e,t,r){const s=new Zu(r),i=new Hu(e,s,t);return n.asyncQueue.enqueueAndForget(async()=>zu(await Uo(n),i)),()=>{s.Ku(),n.asyncQueue.enqueueAndForget(async()=>Ku(await Uo(n),i))}}function Ab(n,e,t={}){const r=new Xe;return n.asyncQueue.enqueueAndForget(async()=>function(i,o,c,u,l){const f=new Zu({next:g=>{f.Ku(),o.enqueueAndForget(()=>Ku(i,p));const v=g.docs.has(c);!v&&g.fromCache?l.reject(new N(P.UNAVAILABLE,"Failed to get document because the client is offline.")):v&&g.fromCache&&u&&u.source==="server"?l.reject(new N(P.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):l.resolve(g)},error:g=>l.reject(g)}),p=new Hu(Ti(c.path),f,{includeMetadataChanges:!0,Wa:!0});return zu(i,p)}(await Uo(n),n.asyncQueue,e,t,r)),r.promise}function bb(n,e,t={}){const r=new Xe;return n.asyncQueue.enqueueAndForget(async()=>function(i,o,c,u,l){const f=new Zu({next:g=>{f.Ku(),o.enqueueAndForget(()=>Ku(i,p)),g.fromCache&&u.source==="server"?l.reject(new N(P.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):l.resolve(g)},error:g=>l.reject(g)}),p=new Hu(c,f,{includeMetadataChanges:!0,Wa:!0});return zu(i,p)}(await Uo(n),n.asyncQueue,e,t,r)),r.promise}function Rb(n,e,t){const r=new Xe;return n.asyncQueue.enqueueAndForget(async()=>{try{const s=await zg(n);r.resolve(async function(o,c,u){var V;const l=L(o),{request:f,gt:p,parent:g}=Mv(l.serializer,uv(c),u);l.connection.Ko||delete f.parent;const v=(await l.jo("RunAggregationQuery",l.serializer.databaseId,g,f,1)).filter(k=>!!k.result);F(v.length===1,64727);const C=(V=v[0].result)==null?void 0:V.aggregateFields;return Object.keys(C).reduce((k,$)=>(k[p[$]]=C[$],k),{})}(s,e,t))}catch(s){r.reject(s)}}),r.promise}function Sb(n,e){const t=new Xe;return n.asyncQueue.enqueueAndForget(async()=>nb(await wb(n),e,t)),t.promise}function Pb(n,e,t){const r=new Xe;return n.asyncQueue.enqueueAndForget(async()=>{const s=await zg(n);new Ib(n.asyncQueue,s,t,e,r).Xu()}),r.promise}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Kg(n){const e={};return n.timeoutSeconds!==void 0&&(e.timeoutSeconds=n.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Cb="ComponentProvider",ff=new Map;function kb(n,e,t,r,s){return new Jw(n,e,t,s.host,s.ssl,s.experimentalForceLongPolling,s.experimentalAutoDetectLongPolling,Kg(s.experimentalLongPollingOptions),s.useFetchStreams,s.isUsingEmulator,r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gg="firestore.googleapis.com",pf=!0;class mf{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new N(P.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=Gg,this.ssl=pf}else this.host=e.host,this.ssl=e.ssl??pf;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=cg;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<dg)throw new N(P.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}gw("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=Kg(e.experimentalLongPollingOptions??{}),function(r){if(r.timeoutSeconds!==void 0){if(isNaN(r.timeoutSeconds))throw new N(P.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (must not be NaN)`);if(r.timeoutSeconds<5)throw new N(P.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (minimum allowed value is 5)`);if(r.timeoutSeconds>30)throw new N(P.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(r,s){return r.timeoutSeconds===s.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class ma{constructor(e,t,r,s){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=r,this._app=s,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new mf({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new N(P.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new N(P.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new mf(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(r){if(!r)return new ow;switch(r.type){case"firstParty":return new lw(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new N(P.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(t){const r=ff.get(t);r&&(D(Cb,"Removing Datastore"),ff.delete(t),r.terminate())}(this),Promise.resolve()}}function Db(n,e,t,r={}){var l;n=Pe(n,ma);const s=It(e),i=n._getSettings(),o={...i,emulatorOptions:n._getEmulatorOptions()},c=`${e}:${t}`;s&&li(`https://${c}`),i.host!==Gg&&i.host!==c&&$n("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const u={...i,host:c,ssl:s,emulatorOptions:r};if(!St(u,o)&&(n._setSettings(u),r.mockUserToken)){let f,p;if(typeof r.mockUserToken=="string")f=r.mockUserToken,p=Ae.MOCK_USER;else{f=Qf(r.mockUserToken,(l=n._app)==null?void 0:l.options.projectId);const g=r.mockUserToken.sub||r.mockUserToken.user_id;if(!g)throw new N(P.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");p=new Ae(g)}n._authCredentials=new aw(new $p(f,p))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ft{constructor(e,t,r){this.converter=t,this._query=r,this.type="query",this.firestore=e}withConverter(e){return new Ft(this.firestore,e,this._query)}}class de{constructor(e,t,r){this.converter=t,this._key=r,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new cn(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new de(this.firestore,e,this._key)}toJSON(){return{type:de._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,r){if(gi(t,de._jsonSchema))return new de(e,r||null,new x(ee.fromString(t.referencePath)))}}de._jsonSchemaVersion="firestore/documentReference/1.0",de._jsonSchema={type:ye("string",de._jsonSchemaVersion),referencePath:ye("string")};class cn extends Ft{constructor(e,t,r){super(e,t,Ti(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new de(this.firestore,null,new x(e))}withConverter(e){return new cn(this.firestore,e,this._path)}}function _C(n,e,...t){if(n=Z(n),zp("collection","path",e),n instanceof ma){const r=ee.fromString(e,...t);return sd(r),new cn(n,null,r)}{if(!(n instanceof de||n instanceof cn))throw new N(P.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=n._path.child(ee.fromString(e,...t));return sd(r),new cn(n.firestore,null,r)}}function Vb(n,e,...t){if(n=Z(n),arguments.length===1&&(e=lu.newId()),zp("doc","path",e),n instanceof ma){const r=ee.fromString(e,...t);return rd(r),new de(n,null,new x(r))}{if(!(n instanceof de||n instanceof cn))throw new N(P.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=n._path.child(ee.fromString(e,...t));return rd(r),new de(n.firestore,n instanceof cn?n.converter:null,new x(r))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gf="AsyncQueue";class _f{constructor(e=Promise.resolve()){this.rc=[],this.sc=!1,this.oc=[],this._c=null,this.ac=!1,this.uc=!1,this.cc=[],this.M_=new Fu(this,"async_queue_retry"),this.lc=()=>{const r=mo();r&&D(gf,"Visibility state changed to "+r.visibilityState),this.M_.w_()},this.hc=e;const t=mo();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this.lc)}get isShuttingDown(){return this.sc}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.Pc(),this.Tc(e)}enterRestrictedMode(e){if(!this.sc){this.sc=!0,this.uc=e||!1;const t=mo();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this.lc)}}enqueue(e){if(this.Pc(),this.sc)return new Promise(()=>{});const t=new Xe;return this.Tc(()=>this.sc&&this.uc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.rc.push(e),this.Ic()))}async Ic(){if(this.rc.length!==0){try{await this.rc[0](),this.rc.shift(),this.M_.reset()}catch(e){if(!gn(e))throw e;D(gf,"Operation failed with retryable error: "+e)}this.rc.length>0&&this.M_.p_(()=>this.Ic())}}Tc(e){const t=this.hc.then(()=>(this.ac=!0,e().catch(r=>{throw this._c=r,this.ac=!1,me("INTERNAL UNHANDLED ERROR: ",yf(r)),r}).then(r=>(this.ac=!1,r))));return this.hc=t,t}enqueueAfterDelay(e,t,r){this.Pc(),this.cc.indexOf(e)>-1&&(t=0);const s=$u.createAndSchedule(this,e,t,r,i=>this.Ec(i));return this.oc.push(s),s}Pc(){this._c&&M(47125,{Rc:yf(this._c)})}verifyOperationInProgress(){}async Ac(){let e;do e=this.hc,await e;while(e!==this.hc)}Vc(e){for(const t of this.oc)if(t.timerId===e)return!0;return!1}dc(e){return this.Ac().then(()=>{this.oc.sort((t,r)=>t.targetTimeMs-r.targetTimeMs);for(const t of this.oc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Ac()})}mc(e){this.cc.push(e)}Ec(e){const t=this.oc.indexOf(e);this.oc.splice(t,1)}}function yf(n){let e=n.message||"";return n.stack&&(e=n.stack.includes(n.message)?n.stack:n.message+`
`+n.stack),e}class et extends ma{constructor(e,t,r,s){super(e,t,r,s),this.type="firestore",this._queue=new _f,this._persistenceKey=(s==null?void 0:s.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new _f(e),this._firestoreClient=void 0,await e}}}function yC(n,e,t){t||(t=Xs);const r=Nt(n,"firestore");if(r.isInitialized(t)){const s=r.getImmediate({identifier:t}),i=r.getOptions(t);if(St(i,e))return s;throw new N(P.FAILED_PRECONDITION,"initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.")}if(e.cacheSizeBytes!==void 0&&e.localCache!==void 0)throw new N(P.INVALID_ARGUMENT,"cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes willbe deprecated. Instead, specify the cache size in the cache object");if(e.cacheSizeBytes!==void 0&&e.cacheSizeBytes!==-1&&e.cacheSizeBytes<dg)throw new N(P.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");return e.host&&It(e.host)&&li(e.host),r.initialize({options:e,instanceIdentifier:t})}function IC(n,e){const t=typeof n=="object"?n:hi(),r=typeof n=="string"?n:Xs,s=Nt(t,"firestore").getImmediate({identifier:r});if(!s._initialized){const i=Xc("firestore");i&&Db(s,...i)}return s}function tr(n){if(n._terminated)throw new N(P.FAILED_PRECONDITION,"The client has already been terminated.");return n._firestoreClient||Nb(n),n._firestoreClient}function Nb(n){var r,s,i,o;const e=n._freezeSettings(),t=kb(n._databaseId,((r=n._app)==null?void 0:r.options.appId)||"",n._persistenceKey,(s=n._app)==null?void 0:s.options.apiKey,e);n._componentsProvider||(i=e.localCache)!=null&&i._offlineComponentProvider&&((o=e.localCache)!=null&&o._onlineComponentProvider)&&(n._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),n._firestoreClient=new Tb(n._authCredentials,n._appCheckCredentials,n._queue,t,n._componentsProvider&&function(u){const l=u==null?void 0:u._online.build();return{_offline:u==null?void 0:u._offline.build(l),_online:l}}(n._componentsProvider))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ge{constructor(e){this._byteString=e}static fromBase64String(e){try{return new Ge(ge.fromBase64String(e))}catch(t){throw new N(P.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new Ge(ge.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:Ge._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(gi(e,Ge._jsonSchema))return Ge.fromBase64String(e.bytes)}}Ge._jsonSchemaVersion="firestore/bytes/1.0",Ge._jsonSchema={type:ye("string",Ge._jsonSchemaVersion),bytes:ye("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ai{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new N(P.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new he(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xr{constructor(e){this._methodName=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gt{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new N(P.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new N(P.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return z(this._lat,e._lat)||z(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:gt._jsonSchemaVersion}}static fromJSON(e){if(gi(e,gt._jsonSchema))return new gt(e.latitude,e.longitude)}}gt._jsonSchemaVersion="firestore/geoPoint/1.0",gt._jsonSchema={type:ye("string",gt._jsonSchemaVersion),latitude:ye("number"),longitude:ye("number")};/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class st{constructor(e){this._values=(e||[]).map(t=>t)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(r,s){if(r.length!==s.length)return!1;for(let i=0;i<r.length;++i)if(r[i]!==s[i])return!1;return!0}(this._values,e._values)}toJSON(){return{type:st._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(gi(e,st._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(t=>typeof t=="number"))return new st(e.vectorValues);throw new N(P.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}st._jsonSchemaVersion="firestore/vectorValue/1.0",st._jsonSchema={type:ye("string",st._jsonSchemaVersion),vectorValues:ye("object")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ob=/^__.*__$/;class xb{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r}toMutation(e,t){return this.fieldMask!==null?new Lt(e,this.data,this.fieldMask,t,this.fieldTransforms):new Gr(e,this.data,t,this.fieldTransforms)}}class Hg{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r}toMutation(e,t){return new Lt(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function Wg(n){switch(n){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw M(40011,{dataSource:n})}}class ga{constructor(e,t,r,s,i,o){this.settings=e,this.databaseId=t,this.serializer=r,this.ignoreUndefinedProperties=s,i===void 0&&this.fc(),this.fieldTransforms=i||[],this.fieldMask=o||[]}get path(){return this.settings.path}get dataSource(){return this.settings.dataSource}i(e){return new ga({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}yc(e){var s;const t=(s=this.path)==null?void 0:s.child(e),r=this.i({path:t,arrayElement:!1});return r.wc(e),r}Sc(e){var s;const t=(s=this.path)==null?void 0:s.child(e),r=this.i({path:t,arrayElement:!1});return r.fc(),r}bc(e){return this.i({path:void 0,arrayElement:!0})}Dc(e){return Bo(e,this.settings.methodName,this.settings.hasConverter||!1,this.path,this.settings.targetDoc)}contains(e){return this.fieldMask.find(t=>e.isPrefixOf(t))!==void 0||this.fieldTransforms.find(t=>e.isPrefixOf(t.field))!==void 0}fc(){if(this.path)for(let e=0;e<this.path.length;e++)this.wc(this.path.get(e))}wc(e){if(e.length===0)throw this.Dc("Document fields must not be empty");if(Wg(this.dataSource)&&Ob.test(e))throw this.Dc('Document fields cannot begin and end with "__"')}}class Mb{constructor(e,t,r){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=r||ha(e)}V(e,t,r,s=!1){return new ga({dataSource:e,methodName:t,targetDoc:r,path:he.emptyPath(),arrayElement:!1,hasConverter:s},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function Zr(n){const e=n._freezeSettings(),t=ha(n._databaseId);return new Mb(n._databaseId,!!e.ignoreUndefinedProperties,t)}function _a(n,e,t,r,s,i={}){const o=n.V(i.merge||i.mergeFields?2:0,e,t,s);ol("Data must be an object, but it was:",o,r);const c=Qg(r,o);let u,l;if(i.merge)u=new $e(o.fieldMask),l=o.fieldTransforms;else if(i.mergeFields){const f=[];for(const p of i.mergeFields){const g=Wn(e,p,t);if(!o.contains(g))throw new N(P.INVALID_ARGUMENT,`Field '${g}' is specified in your field mask but missing from your input data.`);Xg(f,g)||f.push(g)}u=new $e(f),l=o.fieldTransforms.filter(p=>u.covers(p.field))}else u=null,l=o.fieldTransforms;return new xb(new be(c),u,l)}class bi extends Xr{_toFieldTransform(e){if(e.dataSource!==2)throw e.dataSource===1?e.Dc(`${this._methodName}() can only appear at the top level of your update data`):e.Dc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof bi}}function Lb(n,e,t){return new ga({dataSource:3,targetDoc:e.settings.targetDoc,methodName:n._methodName,arrayElement:t},e.databaseId,e.serializer,e.ignoreUndefinedProperties)}class tl extends Xr{_toFieldTransform(e){return new oa(e.path,new Or)}isEqual(e){return e instanceof tl}}class nl extends Xr{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=Lb(this,e,!0),r=this.vc.map(i=>es(i,t)),s=new Kn(r);return new oa(e.path,s)}isEqual(e){return e instanceof nl&&St(this.vc,e.vc)}}class rl extends Xr{constructor(e,t){super(e),this.Fc=t}_toFieldTransform(e){const t=new Mr(e.serializer,xm(e.serializer,this.Fc));return new oa(e.path,t)}isEqual(e){return e instanceof rl&&this.Fc===e.Fc}}function sl(n,e,t,r){const s=n.V(1,e,t);ol("Data must be an object, but it was:",s,r);const i=[],o=be.empty();_n(r,(u,l)=>{const f=Yg(e,u,t);l=Z(l);const p=s.Sc(f);if(l instanceof bi)i.push(f);else{const g=es(l,p);g!=null&&(i.push(f),o.set(f,g))}});const c=new $e(i);return new Hg(o,c,s.fieldTransforms)}function il(n,e,t,r,s,i){const o=n.V(1,e,t),c=[Wn(e,r,t)],u=[s];if(i.length%2!=0)throw new N(P.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let g=0;g<i.length;g+=2)c.push(Wn(e,i[g])),u.push(i[g+1]);const l=[],f=be.empty();for(let g=c.length-1;g>=0;--g)if(!Xg(l,c[g])){const v=c[g];let C=u[g];C=Z(C);const V=o.Sc(v);if(C instanceof bi)l.push(v);else{const k=es(C,V);k!=null&&(l.push(v),f.set(v,k))}}const p=new $e(l);return new Hg(f,p,o.fieldTransforms)}function Fb(n,e,t,r=!1){return es(t,n.V(r?4:3,e))}function es(n,e){if(Jg(n=Z(n)))return ol("Unsupported field value:",e,n),Qg(n,e);if(n instanceof Xr)return function(r,s){if(!Wg(s.dataSource))throw s.Dc(`${r._methodName}() can only be used with update() and set()`);if(!s.path)throw s.Dc(`${r._methodName}() is not currently supported inside arrays`);const i=r._toFieldTransform(s);i&&s.fieldTransforms.push(i)}(n,e),null;if(n===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),n instanceof Array){if(e.settings.arrayElement&&e.dataSource!==4)throw e.Dc("Nested arrays are not supported");return function(r,s){const i=[];let o=0;for(const c of r){let u=es(c,s.bc(o));u==null&&(u={nullValue:"NULL_VALUE"}),i.push(u),o++}return{arrayValue:{values:i}}}(n,e)}return function(r,s){if((r=Z(r))===null)return{nullValue:"NULL_VALUE"};if(typeof r=="number")return xm(s.serializer,r);if(typeof r=="boolean")return{booleanValue:r};if(typeof r=="string")return{stringValue:r};if(r instanceof Date){const i=te.fromDate(r);return{timestampValue:Lr(s.serializer,i)}}if(r instanceof te){const i=new te(r.seconds,1e3*Math.floor(r.nanoseconds/1e3));return{timestampValue:Lr(s.serializer,i)}}if(r instanceof gt)return{geoPointValue:{latitude:r.latitude,longitude:r.longitude}};if(r instanceof Ge)return{bytesValue:Gm(s.serializer,r._byteString)};if(r instanceof de){const i=s.databaseId,o=r.firestore._databaseId;if(!o.isEqual(i))throw s.Dc(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${i.projectId}/${i.database}`);return{referenceValue:Pu(r.firestore._databaseId||s.databaseId,r._key.path)}}if(r instanceof st)return function(o,c){const u=o instanceof st?o.toArray():o;return{mapValue:{fields:{[yu]:{stringValue:Iu},[kr]:{arrayValue:{values:u.map(f=>{if(typeof f!="number")throw c.Dc("VectorValues must only contain numeric values.");return wu(c.serializer,f)})}}}}}}(r,s);if(ng(r))return r._toProto(s.serializer);throw s.Dc(`Unsupported field value: ${Yo(r)}`)}(n,e)}function Qg(n,e){const t={};return cm(n)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):_n(n,(r,s)=>{const i=es(s,e.yc(r));i!=null&&(t[r]=i)}),{mapValue:{fields:t}}}function Jg(n){return!(typeof n!="object"||n===null||n instanceof Array||n instanceof Date||n instanceof te||n instanceof gt||n instanceof Ge||n instanceof de||n instanceof Xr||n instanceof st||ng(n))}function ol(n,e,t){if(!Jg(t)||!Kp(t)){const r=Yo(t);throw r==="an object"?e.Dc(n+" a custom object"):e.Dc(n+" "+r)}}function Wn(n,e,t){if((e=Z(e))instanceof Ai)return e._internalPath;if(typeof e=="string")return Yg(n,e);throw Bo("Field path arguments must be of type string or ",n,!1,void 0,t)}const Ub=new RegExp("[~\\*/\\[\\]]");function Yg(n,e,t){if(e.search(Ub)>=0)throw Bo(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,n,!1,void 0,t);try{return new Ai(...e.split("."))._internalPath}catch{throw Bo(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,n,!1,void 0,t)}}function Bo(n,e,t,r,s){const i=r&&!r.isEmpty(),o=s!==void 0;let c=`Function ${e}() called with invalid data`;t&&(c+=" (via `toFirestore()`)"),c+=". ";let u="";return(i||o)&&(u+=" (found",i&&(u+=` in field ${r}`),o&&(u+=` in document ${s}`),u+=")"),new N(P.INVALID_ARGUMENT,c+n+u)}function Xg(n,e){return n.some(t=>t.isEqual(e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zg{convertValue(e,t="none"){switch(ln(e)){case 0:return null;case 1:return e.booleanValue;case 2:return ce(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(Dt(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw M(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const r={};return _n(e,(s,i)=>{r[s]=this.convertValue(i,t)}),r}convertVectorValue(e){var r,s,i;const t=(i=(s=(r=e.fields)==null?void 0:r[kr].arrayValue)==null?void 0:s.values)==null?void 0:i.map(o=>ce(o.doubleValue));return new st(t)}convertGeoPoint(e){return new gt(ce(e.latitude),ce(e.longitude))}convertArray(e,t){return(e.values||[]).map(r=>this.convertValue(r,t))}convertServerTimestamp(e,t){switch(t){case"previous":const r=na(e);return r==null?null:this.convertValue(r,t);case"estimate":return this.convertTimestamp(Ys(e));default:return null}}convertTimestamp(e){const t=kt(e);return new te(t.seconds,t.nanos)}convertDocumentKey(e,t){const r=ee.fromString(e);F(tg(r),9688,{name:e});const s=new jn(r.get(1),r.get(3)),i=new x(r.popFirst(5));return s.isEqual(t)||me(`Document ${i} contains a document reference within a different database (${s.projectId}/${s.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),i}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ri extends Zg{constructor(e){super(),this.firestore=e}convertBytes(e){return new Ge(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new de(this.firestore,null,t)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function TC(){return new bi("deleteField")}function EC(){return new tl("serverTimestamp")}function wC(...n){return new nl("arrayUnion",n)}function vC(n){return new rl("increment",n)}const If="@firebase/firestore",Tf="4.14.1";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ef(n){return function(t,r){if(typeof t!="object"||t===null)return!1;const s=t;for(const i of r)if(i in s&&typeof s[i]=="function")return!0;return!1}(n,["next","error","complete"])}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bb{constructor(e="count",t){this._internalFieldPath=t,this.type="AggregateField",this.aggregateType=e}}class qb{constructor(e,t,r){this._userDataWriter=t,this._data=r,this.type="AggregateQuerySnapshot",this.query=e}data(){return this._userDataWriter.convertObjectMap(this._data)}_fieldsProto(){return new be({mapValue:{fields:this._data}}).clone().value.mapValue.fields}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qo{constructor(e,t,r,s,i){this._firestore=e,this._userDataWriter=t,this._key=r,this._document=s,this._converter=i}get id(){return this._key.path.lastSegment()}get ref(){return new de(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new $b(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}_fieldsProto(){var e;return((e=this._document)==null?void 0:e.data.clone().value.mapValue.fields)??void 0}get(e){if(this._document){const t=this._document.data.field(Wn("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class $b extends qo{data(){return super.data()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function e_(n){if(n.limitType==="L"&&n.explicitOrderBy.length===0)throw new N(P.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class al{}class cl extends al{}function AC(n,e,...t){let r=[];e instanceof al&&r.push(e),r=r.concat(t),function(i){const o=i.filter(u=>u instanceof ul).length,c=i.filter(u=>u instanceof ya).length;if(o>1||o>0&&c>0)throw new N(P.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(r);for(const s of r)n=s._apply(n);return n}class ya extends cl{constructor(e,t,r){super(),this._field=e,this._op=t,this._value=r,this.type="where"}static _create(e,t,r){return new ya(e,t,r)}_apply(e){const t=this._parse(e);return t_(e._query,t),new Ft(e.firestore,e.converter,Oc(e._query,t))}_parse(e){const t=Zr(e.firestore);return function(i,o,c,u,l,f,p){let g;if(l.isKeyField()){if(f==="array-contains"||f==="array-contains-any")throw new N(P.INVALID_ARGUMENT,`Invalid Query. You can't perform '${f}' queries on documentId().`);if(f==="in"||f==="not-in"){vf(p,f);const C=[];for(const V of p)C.push(wf(u,i,V));g={arrayValue:{values:C}}}else g=wf(u,i,p)}else f!=="in"&&f!=="not-in"&&f!=="array-contains-any"||vf(p,f),g=Fb(c,o,p,f==="in"||f==="not-in");return Y.create(l,f,g)}(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function bC(n,e,t){const r=e,s=Wn("where",n);return ya._create(s,r,t)}class ul extends al{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new ul(e,t)}_parse(e){const t=this._queryConstraints.map(r=>r._parse(e)).filter(r=>r.getFilters().length>0);return t.length===1?t[0]:ne.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:(function(s,i){let o=s;const c=i.getFlattenedFilters();for(const u of c)t_(o,u),o=Oc(o,u)}(e._query,t),new Ft(e.firestore,e.converter,Oc(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class ll extends cl{constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}static _create(e,t){return new ll(e,t)}_apply(e){const t=function(s,i,o){if(s.startAt!==null)throw new N(P.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(s.endAt!==null)throw new N(P.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new ni(i,o)}(e._query,this._field,this._direction);return new Ft(e.firestore,e.converter,lv(e._query,t))}}function RC(n,e="asc"){const t=e,r=Wn("orderBy",n);return ll._create(r,t)}class hl extends cl{constructor(e,t,r){super(),this.type=e,this._limit=t,this._limitType=r}static _create(e,t,r){return new hl(e,t,r)}_apply(e){return new Ft(e.firestore,e.converter,ko(e._query,this._limit,this._limitType))}}function SC(n){return _w("limit",n),hl._create("limit",n,"F")}function wf(n,e,t){if(typeof(t=Z(t))=="string"){if(t==="")throw new N(P.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!Rm(e)&&t.indexOf("/")!==-1)throw new N(P.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const r=e.path.child(ee.fromString(t));if(!x.isDocumentKey(r))throw new N(P.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${r}' is not because it has an odd number of segments (${r.length}).`);return ei(n,new x(r))}if(t instanceof de)return ei(n,t._key);throw new N(P.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${Yo(t)}.`)}function vf(n,e){if(!Array.isArray(n)||n.length===0)throw new N(P.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function t_(n,e){const t=function(s,i){for(const o of s)for(const c of o.getFlattenedFilters())if(i.indexOf(c.op)>=0)return c.op;return null}(n.filters,function(s){switch(s){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(t!==null)throw t===e.op?new N(P.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new N(P.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}function Ia(n,e,t){let r;return r=n?t&&(t.merge||t.mergeFields)?n.toFirestore(e,t):n.toFirestore(e):e,r}class jb extends Zg{constructor(e){super(),this.firestore=e}convertBytes(e){return new Ge(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new de(this.firestore,null,t)}}function zb(){return new Bb("count")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function PC(n){return Kb(n,{count:zb()})}function Kb(n,e){const t=Pe(n.firestore,et),r=tr(t),s=Ww(e,(i,o)=>new wv(o,i.aggregateType,i._internalFieldPath));return Rb(r,n._query,s).then(i=>function(c,u,l){const f=new Ri(c);return new qb(u,f,l)}(t,n,i))}class Gb{constructor(e){let t;this.kind="persistent",e!=null&&e.tabManager?(e.tabManager._initialize(e),t=e.tabManager):(t=Qb(void 0),t._initialize(e)),this._onlineComponentProvider=t._onlineComponentProvider,this._offlineComponentProvider=t._offlineComponentProvider}toJSON(){return{kind:this.kind}}}function CC(n){return new Gb(n)}class Hb{constructor(e){this.forceOwnership=e,this.kind="persistentSingleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=oi.provider,this._offlineComponentProvider={build:t=>new jg(t,e==null?void 0:e.cacheSizeBytes,this.forceOwnership)}}}class Wb{constructor(){this.kind="PersistentMultipleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=oi.provider,this._offlineComponentProvider={build:t=>new _b(t,e==null?void 0:e.cacheSizeBytes)}}}function Qb(n){return new Hb(n==null?void 0:n.forceOwnership)}function kC(){return new Wb}class yr{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class un extends qo{constructor(e,t,r,s,i,o){super(e,t,r,s,o),this._firestore=e,this._firestoreImpl=e,this.metadata=i}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new go(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const r=this._document.data.field(Wn("DocumentSnapshot.get",e));if(r!==null)return this._userDataWriter.convertValue(r,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new N(P.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=un._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}}un._jsonSchemaVersion="firestore/documentSnapshot/1.0",un._jsonSchema={type:ye("string",un._jsonSchemaVersion),bundleSource:ye("string","DocumentSnapshot"),bundleName:ye("string"),bundle:ye("string")};class go extends un{data(e={}){return super.data(e)}}class Ln{constructor(e,t,r,s){this._firestore=e,this._userDataWriter=t,this._snapshot=s,this.metadata=new yr(s.hasPendingWrites,s.fromCache),this.query=r}get docs(){const e=[];return this.forEach(t=>e.push(t)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach(r=>{e.call(t,new go(this._firestore,this._userDataWriter,r.key,r,new yr(this._snapshot.mutatedKeys.has(r.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new N(P.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(s,i){if(s._snapshot.oldDocs.isEmpty()){let o=0;return s._snapshot.docChanges.map(c=>{const u=new go(s._firestore,s._userDataWriter,c.doc.key,c.doc,new yr(s._snapshot.mutatedKeys.has(c.doc.key),s._snapshot.fromCache),s.query.converter);return c.doc,{type:"added",doc:u,oldIndex:-1,newIndex:o++}})}{let o=s._snapshot.oldDocs;return s._snapshot.docChanges.filter(c=>i||c.type!==3).map(c=>{const u=new go(s._firestore,s._userDataWriter,c.doc.key,c.doc,new yr(s._snapshot.mutatedKeys.has(c.doc.key),s._snapshot.fromCache),s.query.converter);let l=-1,f=-1;return c.type!==0&&(l=o.indexOf(c.doc.key),o=o.delete(c.doc.key)),c.type!==1&&(o=o.add(c.doc),f=o.indexOf(c.doc.key)),{type:Jb(c.type),doc:u,oldIndex:l,newIndex:f}})}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new N(P.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=Ln._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=lu.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],r=[],s=[];return this.docs.forEach(i=>{i._document!==null&&(t.push(i._document),r.push(this._userDataWriter.convertObjectMap(i._document.data.value.mapValue.fields,"previous")),s.push(i.ref.path))}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function Jb(n){switch(n){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return M(61501,{type:n})}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Ln._jsonSchemaVersion="firestore/querySnapshot/1.0",Ln._jsonSchema={type:ye("string",Ln._jsonSchemaVersion),bundleSource:ye("string","QuerySnapshot"),bundleName:ye("string"),bundle:ye("string")};const Yb={maxAttempts:5};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xb{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=Zr(e)}set(e,t,r){this._verifyNotCommitted();const s=rn(e,this._firestore),i=Ia(s.converter,t,r),o=_a(this._dataReader,"WriteBatch.set",s._key,i,s.converter!==null,r);return this._mutations.push(o.toMutation(s._key,le.none())),this}update(e,t,r,...s){this._verifyNotCommitted();const i=rn(e,this._firestore);let o;return o=typeof(t=Z(t))=="string"||t instanceof Ai?il(this._dataReader,"WriteBatch.update",i._key,t,r,s):sl(this._dataReader,"WriteBatch.update",i._key,t),this._mutations.push(o.toMutation(i._key,le.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=rn(e,this._firestore);return this._mutations=this._mutations.concat(new Hr(t._key,le.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new N(P.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function rn(n,e){if((n=Z(n)).firestore!==e)throw new N(P.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zb{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=Zr(e)}get(e){const t=rn(e,this._firestore),r=new jb(this._firestore);return this._transaction.lookup([t._key]).then(s=>{if(!s||s.length!==1)return M(24041);const i=s[0];if(i.isFoundDocument())return new qo(this._firestore,r,i.key,i,t.converter);if(i.isNoDocument())return new qo(this._firestore,r,t._key,null,t.converter);throw M(18433,{doc:i})})}set(e,t,r){const s=rn(e,this._firestore),i=Ia(s.converter,t,r),o=_a(this._dataReader,"Transaction.set",s._key,i,s.converter!==null,r);return this._transaction.set(s._key,o),this}update(e,t,r,...s){const i=rn(e,this._firestore);let o;return o=typeof(t=Z(t))=="string"||t instanceof Ai?il(this._dataReader,"Transaction.update",i._key,t,r,s):sl(this._dataReader,"Transaction.update",i._key,t),this._transaction.update(i._key,o),this}delete(e){const t=rn(e,this._firestore);return this._transaction.delete(t._key),this}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eR extends Zb{constructor(e,t){super(e,t),this._firestore=e}get(e){const t=rn(e,this._firestore),r=new Ri(this._firestore);return super.get(e).then(s=>new un(this._firestore,r,t._key,s._document,new yr(!1,!1),t.converter))}}function DC(n,e,t){n=Pe(n,et);const r={...Yb,...t};(function(o){if(o.maxAttempts<1)throw new N(P.INVALID_ARGUMENT,"Max attempts must be at least 1")})(r);const s=tr(n);return Pb(s,i=>e(new eR(n,i)),r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function VC(n){n=Pe(n,de);const e=Pe(n.firestore,et),t=tr(e);return Ab(t,n._key).then(r=>n_(e,n,r))}function NC(n){n=Pe(n,Ft);const e=Pe(n.firestore,et),t=tr(e),r=new Ri(e);return e_(n._query),bb(t,n._query).then(s=>new Ln(e,r,n,s))}function OC(n,e,t){n=Pe(n,de);const r=Pe(n.firestore,et),s=Ia(n.converter,e,t),i=Zr(r);return Si(r,[_a(i,"setDoc",n._key,s,n.converter!==null,t).toMutation(n._key,le.none())])}function xC(n,e,t,...r){n=Pe(n,de);const s=Pe(n.firestore,et),i=Zr(s);let o;return o=typeof(e=Z(e))=="string"||e instanceof Ai?il(i,"updateDoc",n._key,e,t,r):sl(i,"updateDoc",n._key,e),Si(s,[o.toMutation(n._key,le.exists(!0))])}function MC(n){return Si(Pe(n.firestore,et),[new Hr(n._key,le.none())])}function LC(n,e){const t=Pe(n.firestore,et),r=Vb(n),s=Ia(n.converter,e),i=Zr(n.firestore);return Si(t,[_a(i,"addDoc",r._key,s,n.converter!==null,{}).toMutation(r._key,le.exists(!1))]).then(()=>r)}function FC(n,...e){var l,f,p;n=Z(n);let t={includeMetadataChanges:!1,source:"default"},r=0;typeof e[r]!="object"||Ef(e[r])||(t=e[r++]);const s={includeMetadataChanges:t.includeMetadataChanges,source:t.source};if(Ef(e[r])){const g=e[r];e[r]=(l=g.next)==null?void 0:l.bind(g),e[r+1]=(f=g.error)==null?void 0:f.bind(g),e[r+2]=(p=g.complete)==null?void 0:p.bind(g)}let i,o,c;if(n instanceof de)o=Pe(n.firestore,et),c=Ti(n._key.path),i={next:g=>{e[r]&&e[r](n_(o,n,g))},error:e[r+1],complete:e[r+2]};else{const g=Pe(n,Ft);o=Pe(g.firestore,et),c=g._query;const v=new Ri(o);i={next:C=>{e[r]&&e[r](new Ln(o,v,g,C))},error:e[r+1],complete:e[r+2]},e_(n._query)}const u=tr(o);return vb(u,c,s,i)}function Si(n,e){const t=tr(n);return Sb(t,e)}function n_(n,e,t){const r=t.docs.get(e._key),s=new Ri(n);return new un(n,s,e._key,r,new yr(t.hasPendingWrites,t.fromCache),e.converter)}function UC(n){return n=Pe(n,et),tr(n),new Xb(n,e=>Si(n,e))}(function(e,t=!0){iw(Zn),Ze(new Je("firestore",(r,{instanceIdentifier:s,options:i})=>{const o=r.getProvider("app").getImmediate(),c=new et(new cw(r.getProvider("auth-internal")),new hw(o,r.getProvider("app-check-internal")),Yw(o,s),o);return i={useFetchStreams:t,...i},c._setSettings(i),c},"PUBLIC").setMultipleInstances(!0)),Ve(If,Tf,e),Ve(If,Tf,"esm2020")})();var tR="firebase",nR="12.13.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Ve(tR,nR,"app");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const r_="firebasestorage.googleapis.com",s_="storageBucket",rR=2*60*1e3,sR=10*60*1e3,iR=1e3;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fe extends tt{constructor(e,t,r=0){super(ac(e),`Firebase Storage: ${t} (${ac(e)})`),this.status_=r,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,fe.prototype)}get status(){return this.status_}set status(e){this.status_=e}_codeEquals(e){return ac(e)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var ae;(function(n){n.UNKNOWN="unknown",n.OBJECT_NOT_FOUND="object-not-found",n.BUCKET_NOT_FOUND="bucket-not-found",n.PROJECT_NOT_FOUND="project-not-found",n.QUOTA_EXCEEDED="quota-exceeded",n.UNAUTHENTICATED="unauthenticated",n.UNAUTHORIZED="unauthorized",n.UNAUTHORIZED_APP="unauthorized-app",n.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",n.INVALID_CHECKSUM="invalid-checksum",n.CANCELED="canceled",n.INVALID_EVENT_NAME="invalid-event-name",n.INVALID_URL="invalid-url",n.INVALID_DEFAULT_BUCKET="invalid-default-bucket",n.NO_DEFAULT_BUCKET="no-default-bucket",n.CANNOT_SLICE_BLOB="cannot-slice-blob",n.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",n.NO_DOWNLOAD_URL="no-download-url",n.INVALID_ARGUMENT="invalid-argument",n.INVALID_ARGUMENT_COUNT="invalid-argument-count",n.APP_DELETED="app-deleted",n.INVALID_ROOT_OPERATION="invalid-root-operation",n.INVALID_FORMAT="invalid-format",n.INTERNAL_ERROR="internal-error",n.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(ae||(ae={}));function ac(n){return"storage/"+n}function dl(){const n="An unknown error occurred, please check the error payload for server response.";return new fe(ae.UNKNOWN,n)}function oR(n){return new fe(ae.OBJECT_NOT_FOUND,"Object '"+n+"' does not exist.")}function aR(n){return new fe(ae.QUOTA_EXCEEDED,"Quota for bucket '"+n+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}function cR(){const n="User is not authenticated, please authenticate using Firebase Authentication and try again.";return new fe(ae.UNAUTHENTICATED,n)}function uR(){return new fe(ae.UNAUTHORIZED_APP,"This app does not have permission to access Firebase Storage on this project.")}function lR(n){return new fe(ae.UNAUTHORIZED,"User does not have permission to access '"+n+"'.")}function i_(){return new fe(ae.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function o_(){return new fe(ae.CANCELED,"User canceled the upload/download.")}function hR(n){return new fe(ae.INVALID_URL,"Invalid URL '"+n+"'.")}function dR(n){return new fe(ae.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+n+"'.")}function fR(){return new fe(ae.NO_DEFAULT_BUCKET,"No default bucket found. Did you set the '"+s_+"' property when initializing the app?")}function a_(){return new fe(ae.CANNOT_SLICE_BLOB,"Cannot slice blob for upload. Please retry the upload.")}function pR(){return new fe(ae.SERVER_FILE_WRONG_SIZE,"Server recorded incorrect upload file size, please retry the upload.")}function mR(){return new fe(ae.NO_DOWNLOAD_URL,"The given file does not have any download URLs.")}function gR(n){return new fe(ae.UNSUPPORTED_ENVIRONMENT,`${n} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`)}function Qc(n){return new fe(ae.INVALID_ARGUMENT,n)}function c_(){return new fe(ae.APP_DELETED,"The Firebase app was deleted.")}function _R(n){return new fe(ae.INVALID_ROOT_OPERATION,"The operation '"+n+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}function qs(n,e){return new fe(ae.INVALID_FORMAT,"String does not match format '"+n+"': "+e)}function As(n){throw new fe(ae.INTERNAL_ERROR,"Internal error: "+n)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class We{constructor(e,t){this.bucket=e,this.path_=t}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const e=encodeURIComponent;return"/b/"+e(this.bucket)+"/o/"+e(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(e,t){let r;try{r=We.makeFromUrl(e,t)}catch{return new We(e,"")}if(r.path==="")return r;throw dR(e)}static makeFromUrl(e,t){let r=null;const s="([A-Za-z0-9.\\-_]+)";function i(K){K.path.charAt(K.path.length-1)==="/"&&(K.path_=K.path_.slice(0,-1))}const o="(/(.*))?$",c=new RegExp("^gs://"+s+o,"i"),u={bucket:1,path:3};function l(K){K.path_=decodeURIComponent(K.path)}const f="v[A-Za-z0-9_]+",p=t.replace(/[.]/g,"\\."),g="(/([^?#]*).*)?$",v=new RegExp(`^https?://${p}/${f}/b/${s}/o${g}`,"i"),C={bucket:1,path:3},V=t===r_?"(?:storage.googleapis.com|storage.cloud.google.com)":t,k="([^?#]*)",$=new RegExp(`^https?://${V}/${s}/${k}`,"i"),U=[{regex:c,indices:u,postModify:i},{regex:v,indices:C,postModify:l},{regex:$,indices:{bucket:1,path:2},postModify:l}];for(let K=0;K<U.length;K++){const G=U[K],Q=G.regex.exec(e);if(Q){const T=Q[G.indices.bucket];let _=Q[G.indices.path];_||(_=""),r=new We(T,_),G.postModify(r);break}}if(r==null)throw hR(e);return r}}class yR{constructor(e){this.promise_=Promise.reject(e)}getPromise(){return this.promise_}cancel(e=!1){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function IR(n,e,t){let r=1,s=null,i=null,o=!1,c=0;function u(){return c===2}let l=!1;function f(...k){l||(l=!0,e.apply(null,k))}function p(k){s=setTimeout(()=>{s=null,n(v,u())},k)}function g(){i&&clearTimeout(i)}function v(k,...$){if(l){g();return}if(k){g(),f.call(null,k,...$);return}if(u()||o){g(),f.call(null,k,...$);return}r<64&&(r*=2);let U;c===1?(c=2,U=0):U=(r+Math.random())*1e3,p(U)}let C=!1;function V(k){C||(C=!0,g(),!l&&(s!==null?(k||(c=2),clearTimeout(s),p(0)):k||(c=1)))}return p(0),i=setTimeout(()=>{o=!0,V(!0)},t),V}function TR(n){n(!1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ER(n){return n!==void 0}function wR(n){return typeof n=="function"}function vR(n){return typeof n=="object"&&!Array.isArray(n)}function Ta(n){return typeof n=="string"||n instanceof String}function Af(n){return fl()&&n instanceof Blob}function fl(){return typeof Blob<"u"}function bf(n,e,t,r){if(r<e)throw Qc(`Invalid value for '${n}'. Expected ${e} or greater.`);if(r>t)throw Qc(`Invalid value for '${n}'. Expected ${t} or less.`)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ts(n,e,t){let r=e;return t==null&&(r=`https://${e}`),`${t}://${r}/v0${n}`}function u_(n){const e=encodeURIComponent;let t="?";for(const r in n)if(n.hasOwnProperty(r)){const s=e(r)+"="+e(n[r]);t=t+s+"&"}return t=t.slice(0,-1),t}var Fn;(function(n){n[n.NO_ERROR=0]="NO_ERROR",n[n.NETWORK_ERROR=1]="NETWORK_ERROR",n[n.ABORT=2]="ABORT"})(Fn||(Fn={}));/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function l_(n,e){const t=n>=500&&n<600,s=[408,429].indexOf(n)!==-1,i=e.indexOf(n)!==-1;return t||s||i}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class AR{constructor(e,t,r,s,i,o,c,u,l,f,p,g=!0,v=!1){this.url_=e,this.method_=t,this.headers_=r,this.body_=s,this.successCodes_=i,this.additionalRetryCodes_=o,this.callback_=c,this.errorCallback_=u,this.timeout_=l,this.progressCallback_=f,this.connectionFactory_=p,this.retry=g,this.isUsingEmulator=v,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((C,V)=>{this.resolve_=C,this.reject_=V,this.start_()})}start_(){const e=(r,s)=>{if(s){r(!1,new Xi(!1,null,!0));return}const i=this.connectionFactory_();this.pendingConnection_=i;const o=c=>{const u=c.loaded,l=c.lengthComputable?c.total:-1;this.progressCallback_!==null&&this.progressCallback_(u,l)};this.progressCallback_!==null&&i.addUploadProgressListener(o),i.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&i.removeUploadProgressListener(o),this.pendingConnection_=null;const c=i.getErrorCode()===Fn.NO_ERROR,u=i.getStatus();if(!c||l_(u,this.additionalRetryCodes_)&&this.retry){const f=i.getErrorCode()===Fn.ABORT;r(!1,new Xi(!1,null,f));return}const l=this.successCodes_.indexOf(u)!==-1;r(!0,new Xi(l,i))})},t=(r,s)=>{const i=this.resolve_,o=this.reject_,c=s.connection;if(s.wasSuccessCode)try{const u=this.callback_(c,c.getResponse());ER(u)?i(u):i()}catch(u){o(u)}else if(c!==null){const u=dl();u.serverResponse=c.getErrorText(),this.errorCallback_?o(this.errorCallback_(c,u)):o(u)}else if(s.canceled){const u=this.appDelete_?c_():o_();o(u)}else{const u=i_();o(u)}};this.canceled_?t(!1,new Xi(!1,null,!0)):this.backoffId_=IR(e,t,this.timeout_)}getPromise(){return this.promise_}cancel(e){this.canceled_=!0,this.appDelete_=e||!1,this.backoffId_!==null&&TR(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class Xi{constructor(e,t,r){this.wasSuccessCode=e,this.connection=t,this.canceled=!!r}}function bR(n,e){e!==null&&e.length>0&&(n.Authorization="Firebase "+e)}function RR(n,e){n["X-Firebase-Storage-Version"]="webjs/"+(e??"AppManager")}function SR(n,e){e&&(n["X-Firebase-GMPID"]=e)}function PR(n,e){e!==null&&(n["X-Firebase-AppCheck"]=e)}function CR(n,e,t,r,s,i,o=!0,c=!1){const u=u_(n.urlParams),l=n.url+u,f=Object.assign({},n.headers);return SR(f,e),bR(f,t),RR(f,i),PR(f,r),new AR(l,n.method,f,n.body,n.successCodes,n.additionalRetryCodes,n.handler,n.errorHandler,n.timeout,n.progressCallback,s,o,c)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function kR(){return typeof BlobBuilder<"u"?BlobBuilder:typeof WebKitBlobBuilder<"u"?WebKitBlobBuilder:void 0}function DR(...n){const e=kR();if(e!==void 0){const t=new e;for(let r=0;r<n.length;r++)t.append(n[r]);return t.getBlob()}else{if(fl())return new Blob(n);throw new fe(ae.UNSUPPORTED_ENVIRONMENT,"This browser doesn't seem to support creating Blobs")}}function VR(n,e,t){return n.webkitSlice?n.webkitSlice(e,t):n.mozSlice?n.mozSlice(e,t):n.slice?n.slice(e,t):null}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function NR(n){if(typeof atob>"u")throw gR("base-64");return atob(n)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ft={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"};class cc{constructor(e,t){this.data=e,this.contentType=t||null}}function OR(n,e){switch(n){case ft.RAW:return new cc(h_(e));case ft.BASE64:case ft.BASE64URL:return new cc(d_(n,e));case ft.DATA_URL:return new cc(MR(e),LR(e))}throw dl()}function h_(n){const e=[];for(let t=0;t<n.length;t++){let r=n.charCodeAt(t);if(r<=127)e.push(r);else if(r<=2047)e.push(192|r>>6,128|r&63);else if((r&64512)===55296)if(!(t<n.length-1&&(n.charCodeAt(t+1)&64512)===56320))e.push(239,191,189);else{const i=r,o=n.charCodeAt(++t);r=65536|(i&1023)<<10|o&1023,e.push(240|r>>18,128|r>>12&63,128|r>>6&63,128|r&63)}else(r&64512)===56320?e.push(239,191,189):e.push(224|r>>12,128|r>>6&63,128|r&63)}return new Uint8Array(e)}function xR(n){let e;try{e=decodeURIComponent(n)}catch{throw qs(ft.DATA_URL,"Malformed data URL.")}return h_(e)}function d_(n,e){switch(n){case ft.BASE64:{const s=e.indexOf("-")!==-1,i=e.indexOf("_")!==-1;if(s||i)throw qs(n,"Invalid character '"+(s?"-":"_")+"' found: is it base64url encoded?");break}case ft.BASE64URL:{const s=e.indexOf("+")!==-1,i=e.indexOf("/")!==-1;if(s||i)throw qs(n,"Invalid character '"+(s?"+":"/")+"' found: is it base64 encoded?");e=e.replace(/-/g,"+").replace(/_/g,"/");break}}let t;try{t=NR(e)}catch(s){throw s.message.includes("polyfill")?s:qs(n,"Invalid character found")}const r=new Uint8Array(t.length);for(let s=0;s<t.length;s++)r[s]=t.charCodeAt(s);return r}class f_{constructor(e){this.base64=!1,this.contentType=null;const t=e.match(/^data:([^,]+)?,/);if(t===null)throw qs(ft.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");const r=t[1]||null;r!=null&&(this.base64=FR(r,";base64"),this.contentType=this.base64?r.substring(0,r.length-7):r),this.rest=e.substring(e.indexOf(",")+1)}}function MR(n){const e=new f_(n);return e.base64?d_(ft.BASE64,e.rest):xR(e.rest)}function LR(n){return new f_(n).contentType}function FR(n,e){return n.length>=e.length?n.substring(n.length-e.length)===e:!1}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Et{constructor(e,t){let r=0,s="";Af(e)?(this.data_=e,r=e.size,s=e.type):e instanceof ArrayBuffer?(t?this.data_=new Uint8Array(e):(this.data_=new Uint8Array(e.byteLength),this.data_.set(new Uint8Array(e))),r=this.data_.length):e instanceof Uint8Array&&(t?this.data_=e:(this.data_=new Uint8Array(e.length),this.data_.set(e)),r=e.length),this.size_=r,this.type_=s}size(){return this.size_}type(){return this.type_}slice(e,t){if(Af(this.data_)){const r=this.data_,s=VR(r,e,t);return s===null?null:new Et(s)}else{const r=new Uint8Array(this.data_.buffer,e,t-e);return new Et(r,!0)}}static getBlob(...e){if(fl()){const t=e.map(r=>r instanceof Et?r.data_:r);return new Et(DR.apply(null,t))}else{const t=e.map(o=>Ta(o)?OR(ft.RAW,o).data:o.data_);let r=0;t.forEach(o=>{r+=o.byteLength});const s=new Uint8Array(r);let i=0;return t.forEach(o=>{for(let c=0;c<o.length;c++)s[i++]=o[c]}),new Et(s,!0)}}uploadData(){return this.data_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function p_(n){let e;try{e=JSON.parse(n)}catch{return null}return vR(e)?e:null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function UR(n){if(n.length===0)return null;const e=n.lastIndexOf("/");return e===-1?"":n.slice(0,e)}function BR(n,e){const t=e.split("/").filter(r=>r.length>0).join("/");return n.length===0?t:n+"/"+t}function m_(n){const e=n.lastIndexOf("/",n.length-2);return e===-1?n:n.slice(e+1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qR(n,e){return e}class Me{constructor(e,t,r,s){this.server=e,this.local=t||e,this.writable=!!r,this.xform=s||qR}}let Zi=null;function $R(n){return!Ta(n)||n.length<2?n:m_(n)}function pl(){if(Zi)return Zi;const n=[];n.push(new Me("bucket")),n.push(new Me("generation")),n.push(new Me("metageneration")),n.push(new Me("name","fullPath",!0));function e(i,o){return $R(o)}const t=new Me("name");t.xform=e,n.push(t);function r(i,o){return o!==void 0?Number(o):o}const s=new Me("size");return s.xform=r,n.push(s),n.push(new Me("timeCreated")),n.push(new Me("updated")),n.push(new Me("md5Hash",null,!0)),n.push(new Me("cacheControl",null,!0)),n.push(new Me("contentDisposition",null,!0)),n.push(new Me("contentEncoding",null,!0)),n.push(new Me("contentLanguage",null,!0)),n.push(new Me("contentType",null,!0)),n.push(new Me("metadata","customMetadata",!0)),Zi=n,Zi}function jR(n,e){function t(){const r=n.bucket,s=n.fullPath,i=new We(r,s);return e._makeStorageReference(i)}Object.defineProperty(n,"ref",{get:t})}function zR(n,e,t){const r={};r.type="file";const s=t.length;for(let i=0;i<s;i++){const o=t[i];r[o.local]=o.xform(r,e[o.server])}return jR(r,n),r}function g_(n,e,t){const r=p_(e);return r===null?null:zR(n,r,t)}function KR(n,e,t,r){const s=p_(e);if(s===null||!Ta(s.downloadTokens))return null;const i=s.downloadTokens;if(i.length===0)return null;const o=encodeURIComponent;return i.split(",").map(l=>{const f=n.bucket,p=n.fullPath,g="/b/"+o(f)+"/o/"+o(p),v=ts(g,t,r),C=u_({alt:"media",token:l});return v+C})[0]}function __(n,e){const t={},r=e.length;for(let s=0;s<r;s++){const i=e[s];i.writable&&(t[i.server]=n[i.local])}return JSON.stringify(t)}class nr{constructor(e,t,r,s){this.url=e,this.method=t,this.handler=r,this.timeout=s,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rt(n){if(!n)throw dl()}function ml(n,e){function t(r,s){const i=g_(n,s,e);return Rt(i!==null),i}return t}function GR(n,e){function t(r,s){const i=g_(n,s,e);return Rt(i!==null),KR(i,s,n.host,n._protocol)}return t}function Pi(n){function e(t,r){let s;return t.getStatus()===401?t.getErrorText().includes("Firebase App Check token is invalid")?s=uR():s=cR():t.getStatus()===402?s=aR(n.bucket):t.getStatus()===403?s=lR(n.path):s=r,s.status=t.getStatus(),s.serverResponse=r.serverResponse,s}return e}function gl(n){const e=Pi(n);function t(r,s){let i=e(r,s);return r.getStatus()===404&&(i=oR(n.path)),i.serverResponse=s.serverResponse,i}return t}function HR(n,e,t){const r=e.fullServerUrl(),s=ts(r,n.host,n._protocol),i="GET",o=n.maxOperationRetryTime,c=new nr(s,i,ml(n,t),o);return c.errorHandler=gl(e),c}function WR(n,e,t){const r=e.fullServerUrl(),s=ts(r,n.host,n._protocol),i="GET",o=n.maxOperationRetryTime,c=new nr(s,i,GR(n,t),o);return c.errorHandler=gl(e),c}function QR(n,e){const t=e.fullServerUrl(),r=ts(t,n.host,n._protocol),s="DELETE",i=n.maxOperationRetryTime;function o(u,l){}const c=new nr(r,s,o,i);return c.successCodes=[200,204],c.errorHandler=gl(e),c}function JR(n,e){return n&&n.contentType||e&&e.type()||"application/octet-stream"}function y_(n,e,t){const r=Object.assign({},t);return r.fullPath=n.path,r.size=e.size(),r.contentType||(r.contentType=JR(null,e)),r}function I_(n,e,t,r,s){const i=e.bucketOnlyServerUrl(),o={"X-Goog-Upload-Protocol":"multipart"};function c(){let U="";for(let K=0;K<2;K++)U=U+Math.random().toString().slice(2);return U}const u=c();o["Content-Type"]="multipart/related; boundary="+u;const l=y_(e,r,s),f=__(l,t),p="--"+u+`\r
Content-Type: application/json; charset=utf-8\r
\r
`+f+`\r
--`+u+`\r
Content-Type: `+l.contentType+`\r
\r
`,g=`\r
--`+u+"--",v=Et.getBlob(p,r,g);if(v===null)throw a_();const C={name:l.fullPath},V=ts(i,n.host,n._protocol),k="POST",$=n.maxUploadRetryTime,q=new nr(V,k,ml(n,t),$);return q.urlParams=C,q.headers=o,q.body=v.uploadData(),q.errorHandler=Pi(e),q}class $o{constructor(e,t,r,s){this.current=e,this.total=t,this.finalized=!!r,this.metadata=s||null}}function _l(n,e){let t=null;try{t=n.getResponseHeader("X-Goog-Upload-Status")}catch{Rt(!1)}return Rt(!!t&&(e||["active"]).indexOf(t)!==-1),t}function YR(n,e,t,r,s){const i=e.bucketOnlyServerUrl(),o=y_(e,r,s),c={name:o.fullPath},u=ts(i,n.host,n._protocol),l="POST",f={"X-Goog-Upload-Protocol":"resumable","X-Goog-Upload-Command":"start","X-Goog-Upload-Header-Content-Length":`${r.size()}`,"X-Goog-Upload-Header-Content-Type":o.contentType,"Content-Type":"application/json; charset=utf-8"},p=__(o,t),g=n.maxUploadRetryTime;function v(V){_l(V);let k;try{k=V.getResponseHeader("X-Goog-Upload-URL")}catch{Rt(!1)}return Rt(Ta(k)),k}const C=new nr(u,l,v,g);return C.urlParams=c,C.headers=f,C.body=p,C.errorHandler=Pi(e),C}function XR(n,e,t,r){const s={"X-Goog-Upload-Command":"query"};function i(l){const f=_l(l,["active","final"]);let p=null;try{p=l.getResponseHeader("X-Goog-Upload-Size-Received")}catch{Rt(!1)}p||Rt(!1);const g=Number(p);return Rt(!isNaN(g)),new $o(g,r.size(),f==="final")}const o="POST",c=n.maxUploadRetryTime,u=new nr(t,o,i,c);return u.headers=s,u.errorHandler=Pi(e),u}const Rf=256*1024;function ZR(n,e,t,r,s,i,o,c){const u=new $o(0,0);if(o?(u.current=o.current,u.total=o.total):(u.current=0,u.total=r.size()),r.size()!==u.total)throw pR();const l=u.total-u.current;let f=l;s>0&&(f=Math.min(f,s));const p=u.current,g=p+f;let v="";f===0?v="finalize":l===f?v="upload, finalize":v="upload";const C={"X-Goog-Upload-Command":v,"X-Goog-Upload-Offset":`${u.current}`},V=r.slice(p,g);if(V===null)throw a_();function k(K,G){const Q=_l(K,["active","final"]),T=u.current+f,_=r.size();let I;return Q==="final"?I=ml(e,i)(K,G):I=null,new $o(T,_,Q==="final",I)}const $="POST",q=e.maxUploadRetryTime,U=new nr(t,$,k,q);return U.headers=C,U.body=V.uploadData(),U.progressCallback=c||null,U.errorHandler=Pi(n),U}const Ue={RUNNING:"running",PAUSED:"paused",SUCCESS:"success",CANCELED:"canceled",ERROR:"error"};function uc(n){switch(n){case"running":case"pausing":case"canceling":return Ue.RUNNING;case"paused":return Ue.PAUSED;case"success":return Ue.SUCCESS;case"canceled":return Ue.CANCELED;case"error":return Ue.ERROR;default:return Ue.ERROR}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eS{constructor(e,t,r){if(wR(e)||t!=null||r!=null)this.next=e,this.error=t??void 0,this.complete=r??void 0;else{const i=e;this.next=i.next,this.error=i.error,this.complete=i.complete}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dr(n){return(...e)=>{Promise.resolve().then(()=>n(...e))}}class tS{constructor(){this.sent_=!1,this.xhr_=new XMLHttpRequest,this.initXhr(),this.errorCode_=Fn.NO_ERROR,this.sendPromise_=new Promise(e=>{this.xhr_.addEventListener("abort",()=>{this.errorCode_=Fn.ABORT,e()}),this.xhr_.addEventListener("error",()=>{this.errorCode_=Fn.NETWORK_ERROR,e()}),this.xhr_.addEventListener("load",()=>{e()})})}send(e,t,r,s,i){if(this.sent_)throw As("cannot .send() more than once");if(It(e)&&r&&(this.xhr_.withCredentials=!0),this.sent_=!0,this.xhr_.open(t,e,!0),i!==void 0)for(const o in i)i.hasOwnProperty(o)&&this.xhr_.setRequestHeader(o,i[o].toString());return s!==void 0?this.xhr_.send(s):this.xhr_.send(),this.sendPromise_}getErrorCode(){if(!this.sent_)throw As("cannot .getErrorCode() before sending");return this.errorCode_}getStatus(){if(!this.sent_)throw As("cannot .getStatus() before sending");try{return this.xhr_.status}catch{return-1}}getResponse(){if(!this.sent_)throw As("cannot .getResponse() before sending");return this.xhr_.response}getErrorText(){if(!this.sent_)throw As("cannot .getErrorText() before sending");return this.xhr_.statusText}abort(){this.xhr_.abort()}getResponseHeader(e){return this.xhr_.getResponseHeader(e)}addUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.addEventListener("progress",e)}removeUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.removeEventListener("progress",e)}}class nS extends tS{initXhr(){this.xhr_.responseType="text"}}function tn(){return new nS}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rS{isExponentialBackoffExpired(){return this.sleepTime>this.maxSleepTime}constructor(e,t,r=null){this._transferred=0,this._needToFetchStatus=!1,this._needToFetchMetadata=!1,this._observers=[],this._error=void 0,this._uploadUrl=void 0,this._request=void 0,this._chunkMultiplier=1,this._resolve=void 0,this._reject=void 0,this._ref=e,this._blob=t,this._metadata=r,this._mappings=pl(),this._resumable=this._shouldDoResumable(this._blob),this._state="running",this._errorHandler=s=>{if(this._request=void 0,this._chunkMultiplier=1,s._codeEquals(ae.CANCELED))this._needToFetchStatus=!0,this.completeTransitions_();else{const i=this.isExponentialBackoffExpired();if(l_(s.status,[]))if(i)s=i_();else{this.sleepTime=Math.max(this.sleepTime*2,iR),this._needToFetchStatus=!0,this.completeTransitions_();return}this._error=s,this._transition("error")}},this._metadataErrorHandler=s=>{this._request=void 0,s._codeEquals(ae.CANCELED)?this.completeTransitions_():(this._error=s,this._transition("error"))},this.sleepTime=0,this.maxSleepTime=this._ref.storage.maxUploadRetryTime,this._promise=new Promise((s,i)=>{this._resolve=s,this._reject=i,this._start()}),this._promise.then(null,()=>{})}_makeProgressCallback(){const e=this._transferred;return t=>this._updateProgress(e+t)}_shouldDoResumable(e){return e.size()>256*1024}_start(){this._state==="running"&&this._request===void 0&&(this._resumable?this._uploadUrl===void 0?this._createResumable():this._needToFetchStatus?this._fetchStatus():this._needToFetchMetadata?this._fetchMetadata():this.pendingTimeout=setTimeout(()=>{this.pendingTimeout=void 0,this._continueUpload()},this.sleepTime):this._oneShotUpload())}_resolveToken(e){Promise.all([this._ref.storage._getAuthToken(),this._ref.storage._getAppCheckToken()]).then(([t,r])=>{switch(this._state){case"running":e(t,r);break;case"canceling":this._transition("canceled");break;case"pausing":this._transition("paused");break}})}_createResumable(){this._resolveToken((e,t)=>{const r=YR(this._ref.storage,this._ref._location,this._mappings,this._blob,this._metadata),s=this._ref.storage._makeRequest(r,tn,e,t);this._request=s,s.getPromise().then(i=>{this._request=void 0,this._uploadUrl=i,this._needToFetchStatus=!1,this.completeTransitions_()},this._errorHandler)})}_fetchStatus(){const e=this._uploadUrl;this._resolveToken((t,r)=>{const s=XR(this._ref.storage,this._ref._location,e,this._blob),i=this._ref.storage._makeRequest(s,tn,t,r);this._request=i,i.getPromise().then(o=>{o=o,this._request=void 0,this._updateProgress(o.current),this._needToFetchStatus=!1,o.finalized&&(this._needToFetchMetadata=!0),this.completeTransitions_()},this._errorHandler)})}_continueUpload(){const e=Rf*this._chunkMultiplier,t=new $o(this._transferred,this._blob.size()),r=this._uploadUrl;this._resolveToken((s,i)=>{let o;try{o=ZR(this._ref._location,this._ref.storage,r,this._blob,e,this._mappings,t,this._makeProgressCallback())}catch(u){this._error=u,this._transition("error");return}const c=this._ref.storage._makeRequest(o,tn,s,i,!1);this._request=c,c.getPromise().then(u=>{this._increaseMultiplier(),this._request=void 0,this._updateProgress(u.current),u.finalized?(this._metadata=u.metadata,this._transition("success")):this.completeTransitions_()},this._errorHandler)})}_increaseMultiplier(){Rf*this._chunkMultiplier*2<32*1024*1024&&(this._chunkMultiplier*=2)}_fetchMetadata(){this._resolveToken((e,t)=>{const r=HR(this._ref.storage,this._ref._location,this._mappings),s=this._ref.storage._makeRequest(r,tn,e,t);this._request=s,s.getPromise().then(i=>{this._request=void 0,this._metadata=i,this._transition("success")},this._metadataErrorHandler)})}_oneShotUpload(){this._resolveToken((e,t)=>{const r=I_(this._ref.storage,this._ref._location,this._mappings,this._blob,this._metadata),s=this._ref.storage._makeRequest(r,tn,e,t);this._request=s,s.getPromise().then(i=>{this._request=void 0,this._metadata=i,this._updateProgress(this._blob.size()),this._transition("success")},this._errorHandler)})}_updateProgress(e){const t=this._transferred;this._transferred=e,this._transferred!==t&&this._notifyObservers()}_transition(e){if(this._state!==e)switch(e){case"canceling":case"pausing":this._state=e,this._request!==void 0?this._request.cancel():this.pendingTimeout&&(clearTimeout(this.pendingTimeout),this.pendingTimeout=void 0,this.completeTransitions_());break;case"running":const t=this._state==="paused";this._state=e,t&&(this._notifyObservers(),this._start());break;case"paused":this._state=e,this._notifyObservers();break;case"canceled":this._error=o_(),this._state=e,this._notifyObservers();break;case"error":this._state=e,this._notifyObservers();break;case"success":this._state=e,this._notifyObservers();break}}completeTransitions_(){switch(this._state){case"pausing":this._transition("paused");break;case"canceling":this._transition("canceled");break;case"running":this._start();break}}get snapshot(){const e=uc(this._state);return{bytesTransferred:this._transferred,totalBytes:this._blob.size(),state:e,metadata:this._metadata,task:this,ref:this._ref}}on(e,t,r,s){const i=new eS(t||void 0,r||void 0,s||void 0);return this._addObserver(i),()=>{this._removeObserver(i)}}then(e,t){return this._promise.then(e,t)}catch(e){return this.then(null,e)}_addObserver(e){this._observers.push(e),this._notifyObserver(e)}_removeObserver(e){const t=this._observers.indexOf(e);t!==-1&&this._observers.splice(t,1)}_notifyObservers(){this._finishPromise(),this._observers.slice().forEach(t=>{this._notifyObserver(t)})}_finishPromise(){if(this._resolve!==void 0){let e=!0;switch(uc(this._state)){case Ue.SUCCESS:dr(this._resolve.bind(null,this.snapshot))();break;case Ue.CANCELED:case Ue.ERROR:const t=this._reject;dr(t.bind(null,this._error))();break;default:e=!1;break}e&&(this._resolve=void 0,this._reject=void 0)}}_notifyObserver(e){switch(uc(this._state)){case Ue.RUNNING:case Ue.PAUSED:e.next&&dr(e.next.bind(e,this.snapshot))();break;case Ue.SUCCESS:e.complete&&dr(e.complete.bind(e))();break;case Ue.CANCELED:case Ue.ERROR:e.error&&dr(e.error.bind(e,this._error))();break;default:e.error&&dr(e.error.bind(e,this._error))()}}resume(){const e=this._state==="paused"||this._state==="pausing";return e&&this._transition("running"),e}pause(){const e=this._state==="running";return e&&this._transition("pausing"),e}cancel(){const e=this._state==="running"||this._state==="pausing";return e&&this._transition("canceling"),e}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qn{constructor(e,t){this._service=e,t instanceof We?this._location=t:this._location=We.makeFromUrl(t,e.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(e,t){return new Qn(e,t)}get root(){const e=new We(this._location.bucket,"");return this._newRef(this._service,e)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return m_(this._location.path)}get storage(){return this._service}get parent(){const e=UR(this._location.path);if(e===null)return null;const t=new We(this._location.bucket,e);return new Qn(this._service,t)}_throwIfRoot(e){if(this._location.path==="")throw _R(e)}}function sS(n,e,t){n._throwIfRoot("uploadBytes");const r=I_(n.storage,n._location,pl(),new Et(e,!0),t);return n.storage.makeRequestWithTokens(r,tn).then(s=>({metadata:s,ref:n}))}function iS(n,e,t){return n._throwIfRoot("uploadBytesResumable"),new rS(n,new Et(e),t)}function oS(n){n._throwIfRoot("getDownloadURL");const e=WR(n.storage,n._location,pl());return n.storage.makeRequestWithTokens(e,tn).then(t=>{if(t===null)throw mR();return t})}function aS(n){n._throwIfRoot("deleteObject");const e=QR(n.storage,n._location);return n.storage.makeRequestWithTokens(e,tn)}function cS(n,e){const t=BR(n._location.path,e),r=new We(n._location.bucket,t);return new Qn(n.storage,r)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function uS(n){return/^[A-Za-z]+:\/\//.test(n)}function lS(n,e){return new Qn(n,e)}function T_(n,e){if(n instanceof yl){const t=n;if(t._bucket==null)throw fR();const r=new Qn(t,t._bucket);return e!=null?T_(r,e):r}else return e!==void 0?cS(n,e):n}function hS(n,e){if(e&&uS(e)){if(n instanceof yl)return lS(n,e);throw Qc("To use ref(service, url), the first argument must be a Storage instance.")}else return T_(n,e)}function Sf(n,e){const t=e==null?void 0:e[s_];return t==null?null:We.makeFromBucketSpec(t,n)}function dS(n,e,t,r={}){n.host=`${e}:${t}`;const s=It(e);s&&li(`https://${n.host}/b`),n._isUsingEmulator=!0,n._protocol=s?"https":"http";const{mockUserToken:i}=r;i&&(n._overrideAuthToken=typeof i=="string"?i:Qf(i,n.app.options.projectId))}class yl{constructor(e,t,r,s,i,o=!1){this.app=e,this._authProvider=t,this._appCheckProvider=r,this._url=s,this._firebaseVersion=i,this._isUsingEmulator=o,this._bucket=null,this._host=r_,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=rR,this._maxUploadRetryTime=sR,this._requests=new Set,s!=null?this._bucket=We.makeFromBucketSpec(s,this._host):this._bucket=Sf(this._host,this.app.options)}get host(){return this._host}set host(e){this._host=e,this._url!=null?this._bucket=We.makeFromBucketSpec(this._url,e):this._bucket=Sf(e,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(e){bf("time",0,Number.POSITIVE_INFINITY,e),this._maxUploadRetryTime=e}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(e){bf("time",0,Number.POSITIVE_INFINITY,e),this._maxOperationRetryTime=e}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const e=this._authProvider.getImmediate({optional:!0});if(e){const t=await e.getToken();if(t!==null)return t.accessToken}return null}async _getAppCheckToken(){if(Be(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=this._appCheckProvider.getImmediate({optional:!0});return e?(await e.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(e=>e.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(e){return new Qn(this,e)}_makeRequest(e,t,r,s,i=!0){if(this._deleted)return new yR(c_());{const o=CR(e,this._appId,r,s,t,this._firebaseVersion,i,this._isUsingEmulator);return this._requests.add(o),o.getPromise().then(()=>this._requests.delete(o),()=>this._requests.delete(o)),o}}async makeRequestWithTokens(e,t){const[r,s]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(e,t,r,s).getPromise()}}const Pf="@firebase/storage",Cf="0.14.3";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const E_="storage";function BC(n,e,t){return n=Z(n),sS(n,e,t)}function qC(n,e,t){return n=Z(n),iS(n,e,t)}function $C(n){return n=Z(n),oS(n)}function jC(n){return n=Z(n),aS(n)}function zC(n,e){return n=Z(n),hS(n,e)}function KC(n=hi(),e){n=Z(n);const r=Nt(n,E_).getImmediate({identifier:e}),s=Xc("storage");return s&&fS(r,...s),r}function fS(n,e,t,r={}){dS(n,e,t,r)}function pS(n,{instanceIdentifier:e}){const t=n.getProvider("app").getImmediate(),r=n.getProvider("auth-internal"),s=n.getProvider("app-check-internal");return new yl(t,r,s,e,Zn)}function mS(){Ze(new Je(E_,pS,"PUBLIC").setMultipleInstances(!0)),Ve(Pf,Cf,""),Ve(Pf,Cf,"esm2020")}mS();const w_="@firebase/installations",Il="0.6.22";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const v_=1e4,A_=`w:${Il}`,b_="FIS_v2",gS="https://firebaseinstallations.googleapis.com/v1",_S=60*60*1e3,yS="installations",IS="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const TS={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},Jn=new Xn(yS,IS,TS);function R_(n){return n instanceof tt&&n.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function S_({projectId:n}){return`${gS}/projects/${n}/installations`}function P_(n){return{token:n.token,requestStatus:2,expiresIn:wS(n.expiresIn),creationTime:Date.now()}}async function C_(n,e){const r=(await e.json()).error;return Jn.create("request-failed",{requestName:n,serverCode:r.code,serverMessage:r.message,serverStatus:r.status})}function k_({apiKey:n}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":n})}function ES(n,{refreshToken:e}){const t=k_(n);return t.append("Authorization",vS(e)),t}async function D_(n){const e=await n();return e.status>=500&&e.status<600?n():e}function wS(n){return Number(n.replace("s","000"))}function vS(n){return`${b_} ${n}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function AS({appConfig:n,heartbeatServiceProvider:e},{fid:t}){const r=S_(n),s=k_(n),i=e.getImmediate({optional:!0});if(i){const l=await i.getHeartbeatsHeader();l&&s.append("x-firebase-client",l)}const o={fid:t,authVersion:b_,appId:n.appId,sdkVersion:A_},c={method:"POST",headers:s,body:JSON.stringify(o)},u=await D_(()=>fetch(r,c));if(u.ok){const l=await u.json();return{fid:l.fid||t,registrationStatus:2,refreshToken:l.refreshToken,authToken:P_(l.authToken)}}else throw await C_("Create Installation",u)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function V_(n){return new Promise(e=>{setTimeout(e,n)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bS(n){return btoa(String.fromCharCode(...n)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const RS=/^[cdef][\w-]{21}$/,Jc="";function SS(){try{const n=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(n),n[0]=112+n[0]%16;const t=PS(n);return RS.test(t)?t:Jc}catch{return Jc}}function PS(n){return bS(n).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ea(n){return`${n.appName}!${n.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const N_=new Map;function O_(n,e){const t=Ea(n);x_(t,e),CS(t,e)}function x_(n,e){const t=N_.get(n);if(t)for(const r of t)r(e)}function CS(n,e){const t=kS();t&&t.postMessage({key:n,fid:e}),DS()}let On=null;function kS(){return!On&&"BroadcastChannel"in self&&(On=new BroadcastChannel("[Firebase] FID Change"),On.onmessage=n=>{x_(n.data.key,n.data.fid)}),On}function DS(){N_.size===0&&On&&(On.close(),On=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const VS="firebase-installations-database",NS=1,Yn="firebase-installations-store";let lc=null;function Tl(){return lc||(lc=Go(VS,NS,{upgrade:(n,e)=>{switch(e){case 0:n.createObjectStore(Yn)}}})),lc}async function jo(n,e){const t=Ea(n),s=(await Tl()).transaction(Yn,"readwrite"),i=s.objectStore(Yn),o=await i.get(t);return await i.put(e,t),await s.done,(!o||o.fid!==e.fid)&&O_(n,e.fid),e}async function M_(n){const e=Ea(n),r=(await Tl()).transaction(Yn,"readwrite");await r.objectStore(Yn).delete(e),await r.done}async function wa(n,e){const t=Ea(n),s=(await Tl()).transaction(Yn,"readwrite"),i=s.objectStore(Yn),o=await i.get(t),c=e(o);return c===void 0?await i.delete(t):await i.put(c,t),await s.done,c&&(!o||o.fid!==c.fid)&&O_(n,c.fid),c}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function El(n){let e;const t=await wa(n.appConfig,r=>{const s=OS(r),i=xS(n,s);return e=i.registrationPromise,i.installationEntry});return t.fid===Jc?{installationEntry:await e}:{installationEntry:t,registrationPromise:e}}function OS(n){const e=n||{fid:SS(),registrationStatus:0};return L_(e)}function xS(n,e){if(e.registrationStatus===0){if(!navigator.onLine){const s=Promise.reject(Jn.create("app-offline"));return{installationEntry:e,registrationPromise:s}}const t={fid:e.fid,registrationStatus:1,registrationTime:Date.now()},r=MS(n,t);return{installationEntry:t,registrationPromise:r}}else return e.registrationStatus===1?{installationEntry:e,registrationPromise:LS(n)}:{installationEntry:e}}async function MS(n,e){try{const t=await AS(n,e);return jo(n.appConfig,t)}catch(t){throw R_(t)&&t.customData.serverCode===409?await M_(n.appConfig):await jo(n.appConfig,{fid:e.fid,registrationStatus:0}),t}}async function LS(n){let e=await kf(n.appConfig);for(;e.registrationStatus===1;)await V_(100),e=await kf(n.appConfig);if(e.registrationStatus===0){const{installationEntry:t,registrationPromise:r}=await El(n);return r||t}return e}function kf(n){return wa(n,e=>{if(!e)throw Jn.create("installation-not-found");return L_(e)})}function L_(n){return FS(n)?{fid:n.fid,registrationStatus:0}:n}function FS(n){return n.registrationStatus===1&&n.registrationTime+v_<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function US({appConfig:n,heartbeatServiceProvider:e},t){const r=BS(n,t),s=ES(n,t),i=e.getImmediate({optional:!0});if(i){const l=await i.getHeartbeatsHeader();l&&s.append("x-firebase-client",l)}const o={installation:{sdkVersion:A_,appId:n.appId}},c={method:"POST",headers:s,body:JSON.stringify(o)},u=await D_(()=>fetch(r,c));if(u.ok){const l=await u.json();return P_(l)}else throw await C_("Generate Auth Token",u)}function BS(n,{fid:e}){return`${S_(n)}/${e}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function wl(n,e=!1){let t;const r=await wa(n.appConfig,i=>{if(!F_(i))throw Jn.create("not-registered");const o=i.authToken;if(!e&&jS(o))return i;if(o.requestStatus===1)return t=qS(n,e),i;{if(!navigator.onLine)throw Jn.create("app-offline");const c=KS(i);return t=$S(n,c),c}});return t?await t:r.authToken}async function qS(n,e){let t=await Df(n.appConfig);for(;t.authToken.requestStatus===1;)await V_(100),t=await Df(n.appConfig);const r=t.authToken;return r.requestStatus===0?wl(n,e):r}function Df(n){return wa(n,e=>{if(!F_(e))throw Jn.create("not-registered");const t=e.authToken;return GS(t)?{...e,authToken:{requestStatus:0}}:e})}async function $S(n,e){try{const t=await US(n,e),r={...e,authToken:t};return await jo(n.appConfig,r),t}catch(t){if(R_(t)&&(t.customData.serverCode===401||t.customData.serverCode===404))await M_(n.appConfig);else{const r={...e,authToken:{requestStatus:0}};await jo(n.appConfig,r)}throw t}}function F_(n){return n!==void 0&&n.registrationStatus===2}function jS(n){return n.requestStatus===2&&!zS(n)}function zS(n){const e=Date.now();return e<n.creationTime||n.creationTime+n.expiresIn<e+_S}function KS(n){const e={requestStatus:1,requestTime:Date.now()};return{...n,authToken:e}}function GS(n){return n.requestStatus===1&&n.requestTime+v_<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function HS(n){const e=n,{installationEntry:t,registrationPromise:r}=await El(e);return r?r.catch(console.error):wl(e).catch(console.error),t.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function WS(n,e=!1){const t=n;return await QS(t),(await wl(t,e)).token}async function QS(n){const{registrationPromise:e}=await El(n);e&&await e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function JS(n){if(!n||!n.options)throw hc("App Configuration");if(!n.name)throw hc("App Name");const e=["projectId","apiKey","appId"];for(const t of e)if(!n.options[t])throw hc(t);return{appName:n.name,projectId:n.options.projectId,apiKey:n.options.apiKey,appId:n.options.appId}}function hc(n){return Jn.create("missing-app-config-values",{valueName:n})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const U_="installations",YS="installations-internal",XS=n=>{const e=n.getProvider("app").getImmediate(),t=JS(e),r=Nt(e,"heartbeat");return{app:e,appConfig:t,heartbeatServiceProvider:r,_delete:()=>Promise.resolve()}},ZS=n=>{const e=n.getProvider("app").getImmediate(),t=Nt(e,U_).getImmediate();return{getId:()=>HS(t),getToken:s=>WS(t,s)}};function eP(){Ze(new Je(U_,XS,"PUBLIC")),Ze(new Je(YS,ZS,"PRIVATE"))}eP();Ve(w_,Il);Ve(w_,Il,"esm2020");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tP="/firebase-messaging-sw.js",nP="/firebase-cloud-messaging-push-scope",B_="BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",rP="https://fcmregistrations.googleapis.com/v1",q_="google.c.a.c_id",sP="google.c.a.c_l",iP="google.c.a.ts",oP="google.c.a.e",Vf=1e4;var Nf;(function(n){n[n.DATA_MESSAGE=1]="DATA_MESSAGE",n[n.DISPLAY_NOTIFICATION=3]="DISPLAY_NOTIFICATION"})(Nf||(Nf={}));/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */var ai;(function(n){n.PUSH_RECEIVED="push-received",n.NOTIFICATION_CLICKED="notification-clicked"})(ai||(ai={}));/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Tt(n){const e=new Uint8Array(n);return btoa(String.fromCharCode(...e)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}function aP(n){const e="=".repeat((4-n.length%4)%4),t=(n+e).replace(/\-/g,"+").replace(/_/g,"/"),r=atob(t),s=new Uint8Array(r.length);for(let i=0;i<r.length;++i)s[i]=r.charCodeAt(i);return s}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dc="fcm_token_details_db",cP=5,Of="fcm_token_object_Store";async function uP(n){if("databases"in indexedDB&&!(await indexedDB.databases()).map(i=>i.name).includes(dc))return null;let e=null;return(await Go(dc,cP,{upgrade:async(r,s,i,o)=>{if(s<2||!r.objectStoreNames.contains(Of))return;const c=o.objectStore(Of),u=await c.index("fcmSenderId").get(n);if(await c.clear(),!!u){if(s===2){const l=u;if(!l.auth||!l.p256dh||!l.endpoint)return;e={token:l.fcmToken,createTime:l.createTime??Date.now(),subscriptionOptions:{auth:l.auth,p256dh:l.p256dh,endpoint:l.endpoint,swScope:l.swScope,vapidKey:typeof l.vapidKey=="string"?l.vapidKey:Tt(l.vapidKey)}}}else if(s===3){const l=u;e={token:l.fcmToken,createTime:l.createTime,subscriptionOptions:{auth:Tt(l.auth),p256dh:Tt(l.p256dh),endpoint:l.endpoint,swScope:l.swScope,vapidKey:Tt(l.vapidKey)}}}else if(s===4){const l=u;e={token:l.fcmToken,createTime:l.createTime,subscriptionOptions:{auth:Tt(l.auth),p256dh:Tt(l.p256dh),endpoint:l.endpoint,swScope:l.swScope,vapidKey:Tt(l.vapidKey)}}}}}})).close(),await Ha(dc),await Ha("fcm_vapid_details_db"),await Ha("undefined"),lP(e)?e:null}function lP(n){if(!n||!n.subscriptionOptions)return!1;const{subscriptionOptions:e}=n;return typeof n.createTime=="number"&&n.createTime>0&&typeof n.token=="string"&&n.token.length>0&&typeof e.auth=="string"&&e.auth.length>0&&typeof e.p256dh=="string"&&e.p256dh.length>0&&typeof e.endpoint=="string"&&e.endpoint.length>0&&typeof e.swScope=="string"&&e.swScope.length>0&&typeof e.vapidKey=="string"&&e.vapidKey.length>0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hP="firebase-messaging-database",dP=1,ci="firebase-messaging-store";let fc=null;function $_(){return fc||(fc=Go(hP,dP,{upgrade:(n,e)=>{switch(e){case 0:n.createObjectStore(ci)}}})),fc}async function fP(n){const e=j_(n),r=await(await $_()).transaction(ci).objectStore(ci).get(e);if(r)return r;{const s=await uP(n.appConfig.senderId);if(s)return await vl(n,s),s}}async function vl(n,e){const t=j_(n),s=(await $_()).transaction(ci,"readwrite");return await s.objectStore(ci).put(e,t),await s.done,e}function j_({appConfig:n}){return n.appId}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pP={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"only-available-in-window":"This method is available in a Window context.","only-available-in-sw":"This method is available in a service worker context.","permission-default":"The notification permission was not granted and dismissed instead.","permission-blocked":"The notification permission was not granted and blocked instead.","unsupported-browser":"This browser doesn't support the API's required to use the Firebase SDK.","indexed-db-unsupported":"This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)","failed-service-worker-registration":"We are unable to register the default service worker. {$browserErrorMessage}","token-subscribe-failed":"A problem occurred while subscribing the user to FCM: {$errorInfo}","token-subscribe-no-token":"FCM returned no token when subscribing the user to push.","token-unsubscribe-failed":"A problem occurred while unsubscribing the user from FCM: {$errorInfo}","token-update-failed":"A problem occurred while updating the user from FCM: {$errorInfo}","token-update-no-token":"FCM returned no token when updating the user to push.","use-sw-after-get-token":"The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.","invalid-sw-registration":"The input to useServiceWorker() must be a ServiceWorkerRegistration.","invalid-bg-handler":"The input to setBackgroundMessageHandler() must be a function.","invalid-vapid-key":"The public VAPID key must be a string.","use-vapid-key-after-get-token":"The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."},Le=new Xn("messaging","Messaging",pP);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function mP(n,e){const t=await bl(n),r=z_(e),s={method:"POST",headers:t,body:JSON.stringify(r)};let i;try{i=await(await fetch(Al(n.appConfig),s)).json()}catch(o){throw Le.create("token-subscribe-failed",{errorInfo:o==null?void 0:o.toString()})}if(i.error){const o=i.error.message;throw Le.create("token-subscribe-failed",{errorInfo:o})}if(!i.token)throw Le.create("token-subscribe-no-token");return i.token}async function gP(n,e){const t=await bl(n),r=z_(e.subscriptionOptions),s={method:"PATCH",headers:t,body:JSON.stringify(r)};let i;try{i=await(await fetch(`${Al(n.appConfig)}/${e.token}`,s)).json()}catch(o){throw Le.create("token-update-failed",{errorInfo:o==null?void 0:o.toString()})}if(i.error){const o=i.error.message;throw Le.create("token-update-failed",{errorInfo:o})}if(!i.token)throw Le.create("token-update-no-token");return i.token}async function _P(n,e){const r={method:"DELETE",headers:await bl(n)};try{const i=await(await fetch(`${Al(n.appConfig)}/${e}`,r)).json();if(i.error){const o=i.error.message;throw Le.create("token-unsubscribe-failed",{errorInfo:o})}}catch(s){throw Le.create("token-unsubscribe-failed",{errorInfo:s==null?void 0:s.toString()})}}function Al({projectId:n}){return`${rP}/projects/${n}/registrations`}async function bl({appConfig:n,installations:e}){const t=await e.getToken();return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":n.apiKey,"x-goog-firebase-installations-auth":`FIS ${t}`})}function z_({p256dh:n,auth:e,endpoint:t,vapidKey:r}){const s={web:{endpoint:t,auth:e,p256dh:n}};return r!==B_&&(s.web.applicationPubKey=r),s}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yP=7*24*60*60*1e3;async function IP(n){const e=await EP(n.swRegistration,n.vapidKey),t={vapidKey:n.vapidKey,swScope:n.swRegistration.scope,endpoint:e.endpoint,auth:Tt(e.getKey("auth")),p256dh:Tt(e.getKey("p256dh"))},r=await fP(n.firebaseDependencies);if(r){if(wP(r.subscriptionOptions,t))return Date.now()>=r.createTime+yP?TP(n,{token:r.token,createTime:Date.now(),subscriptionOptions:t}):r.token;try{await _P(n.firebaseDependencies,r.token)}catch(s){console.warn(s)}return xf(n.firebaseDependencies,t)}else return xf(n.firebaseDependencies,t)}async function TP(n,e){try{const t=await gP(n.firebaseDependencies,e),r={...e,token:t,createTime:Date.now()};return await vl(n.firebaseDependencies,r),t}catch(t){throw t}}async function xf(n,e){const r={token:await mP(n,e),createTime:Date.now(),subscriptionOptions:e};return await vl(n,r),r.token}async function EP(n,e){const t=await n.pushManager.getSubscription();return t||n.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:aP(e)})}function wP(n,e){const t=e.vapidKey===n.vapidKey,r=e.endpoint===n.endpoint,s=e.auth===n.auth,i=e.p256dh===n.p256dh;return t&&r&&s&&i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Mf(n){const e={from:n.from,collapseKey:n.collapse_key,messageId:n.fcmMessageId};return vP(e,n),AP(e,n),bP(e,n),e}function vP(n,e){if(!e.notification)return;n.notification={};const t=e.notification.title;t&&(n.notification.title=t);const r=e.notification.body;r&&(n.notification.body=r);const s=e.notification.image;s&&(n.notification.image=s);const i=e.notification.icon;i&&(n.notification.icon=i)}function AP(n,e){e.data&&(n.data=e.data)}function bP(n,e){var s,i,o,c;if(!e.fcmOptions&&!((s=e.notification)!=null&&s.click_action))return;n.fcmOptions={};const t=((i=e.fcmOptions)==null?void 0:i.link)??((o=e.notification)==null?void 0:o.click_action);t&&(n.fcmOptions.link=t);const r=(c=e.fcmOptions)==null?void 0:c.analytics_label;r&&(n.fcmOptions.analyticsLabel=r)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function RP(n){return typeof n=="object"&&!!n&&q_ in n}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function SP(n){if(!n||!n.options)throw pc("App Configuration Object");if(!n.name)throw pc("App Name");const e=["projectId","apiKey","appId","messagingSenderId"],{options:t}=n;for(const r of e)if(!t[r])throw pc(r);return{appName:n.name,projectId:t.projectId,apiKey:t.apiKey,appId:t.appId,senderId:t.messagingSenderId}}function pc(n){return Le.create("missing-app-config-values",{valueName:n})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class PP{constructor(e,t,r){this.deliveryMetricsExportedToBigQueryEnabled=!1,this.onBackgroundMessageHandler=null,this.onMessageHandler=null,this.logEvents=[],this.isLogServiceStarted=!1;const s=SP(e);this.firebaseDependencies={app:e,appConfig:s,installations:t,analyticsProvider:r}}_delete(){return Promise.resolve()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function CP(n){try{n.swRegistration=await navigator.serviceWorker.register(tP,{scope:nP}),n.swRegistration.update().catch(()=>{}),await kP(n.swRegistration)}catch(e){throw Le.create("failed-service-worker-registration",{browserErrorMessage:e==null?void 0:e.message})}}async function kP(n){return new Promise((e,t)=>{const r=setTimeout(()=>t(new Error(`Service worker not registered after ${Vf} ms`)),Vf),s=n.installing||n.waiting;n.active?(clearTimeout(r),e()):s?s.onstatechange=i=>{var o;((o=i.target)==null?void 0:o.state)==="activated"&&(s.onstatechange=null,clearTimeout(r),e())}:(clearTimeout(r),t(new Error("No incoming service worker found.")))})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function DP(n,e){if(!e&&!n.swRegistration&&await CP(n),!(!e&&n.swRegistration)){if(!(e instanceof ServiceWorkerRegistration))throw Le.create("invalid-sw-registration");n.swRegistration=e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function VP(n,e){e?n.vapidKey=e:n.vapidKey||(n.vapidKey=B_)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function K_(n,e){if(!navigator)throw Le.create("only-available-in-window");if(Notification.permission==="default"&&await Notification.requestPermission(),Notification.permission!=="granted")throw Le.create("permission-blocked");return await VP(n,e==null?void 0:e.vapidKey),await DP(n,e==null?void 0:e.serviceWorkerRegistration),IP(n)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function NP(n,e,t){const r=OP(e);(await n.firebaseDependencies.analyticsProvider.get()).logEvent(r,{message_id:t[q_],message_name:t[sP],message_time:t[iP],message_device_time:Math.floor(Date.now()/1e3)})}function OP(n){switch(n){case ai.NOTIFICATION_CLICKED:return"notification_open";case ai.PUSH_RECEIVED:return"notification_foreground";default:throw new Error}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function xP(n,e){const t=e.data;if(!t.isFirebaseMessaging)return;n.onMessageHandler&&t.messageType===ai.PUSH_RECEIVED&&(typeof n.onMessageHandler=="function"?n.onMessageHandler(Mf(t)):n.onMessageHandler.next(Mf(t)));const r=t.data;RP(r)&&r[oP]==="1"&&await NP(n,t.messageType,r)}const Lf="@firebase/messaging",Ff="0.12.26";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const MP=n=>{const e=new PP(n.getProvider("app").getImmediate(),n.getProvider("installations-internal").getImmediate(),n.getProvider("analytics-internal"));return navigator.serviceWorker.addEventListener("message",t=>xP(e,t)),e},LP=n=>{const e=n.getProvider("messaging").getImmediate();return{getToken:r=>K_(e,r)}};function FP(){Ze(new Je("messaging",MP,"PUBLIC")),Ze(new Je("messaging-internal",LP,"PRIVATE")),Ve(Lf,Ff),Ve(Lf,Ff,"esm2020")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function UP(){try{await Zf()}catch{return!1}return typeof window<"u"&&Zc()&&By()&&"serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window&&"fetch"in window&&ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification")&&PushSubscription.prototype.hasOwnProperty("getKey")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function GC(n=hi()){return UP().then(e=>{if(!e)throw Le.create("unsupported-browser")},e=>{throw Le.create("indexed-db-unsupported")}),Nt(Z(n),"messaging").getImmediate()}async function HC(n,e){return n=Z(n),K_(n,e)}FP();/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const BP="type.googleapis.com/google.protobuf.Int64Value",qP="type.googleapis.com/google.protobuf.UInt64Value";function G_(n,e){const t={};for(const r in n)n.hasOwnProperty(r)&&(t[r]=e(n[r]));return t}function zo(n){if(n==null)return null;if(n instanceof Number&&(n=n.valueOf()),typeof n=="number"&&isFinite(n)||n===!0||n===!1||Object.prototype.toString.call(n)==="[object String]")return n;if(n instanceof Date)return n.toISOString();if(Array.isArray(n))return n.map(e=>zo(e));if(typeof n=="function"||typeof n=="object")return G_(n,e=>zo(e));throw new Error("Data cannot be encoded in JSON: "+n)}function $r(n){if(n==null)return n;if(n["@type"])switch(n["@type"]){case BP:case qP:{const e=Number(n.value);if(isNaN(e))throw new Error("Data cannot be decoded from JSON: "+n);return e}default:throw new Error("Data cannot be decoded from JSON: "+n)}return Array.isArray(n)?n.map(e=>$r(e)):typeof n=="function"||typeof n=="object"?G_(n,e=>$r(e)):n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rl="functions";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Uf={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class je extends tt{constructor(e,t,r){super(`${Rl}/${e}`,t||""),this.details=r,Object.setPrototypeOf(this,je.prototype)}}function $P(n){if(n>=200&&n<300)return"ok";switch(n){case 0:return"internal";case 400:return"invalid-argument";case 401:return"unauthenticated";case 403:return"permission-denied";case 404:return"not-found";case 409:return"aborted";case 429:return"resource-exhausted";case 499:return"cancelled";case 500:return"internal";case 501:return"unimplemented";case 503:return"unavailable";case 504:return"deadline-exceeded"}return"unknown"}function Ko(n,e){let t=$P(n),r=t,s;try{const i=e&&e.error;if(i){const o=i.status;if(typeof o=="string"){if(!Uf[o])return new je("internal","internal");t=Uf[o],r=o}const c=i.message;typeof c=="string"&&(r=c),s=i.details,s!==void 0&&(s=$r(s))}}catch{}return t==="ok"?null:new je(t,r,s)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jP{constructor(e,t,r,s){this.app=e,this.auth=null,this.messaging=null,this.appCheck=null,this.serverAppAppCheckToken=null,Be(e)&&e.settings.appCheckToken&&(this.serverAppAppCheckToken=e.settings.appCheckToken),this.auth=t.getImmediate({optional:!0}),this.messaging=r.getImmediate({optional:!0}),this.auth||t.get().then(i=>this.auth=i,()=>{}),this.messaging||r.get().then(i=>this.messaging=i,()=>{}),this.appCheck||s==null||s.get().then(i=>this.appCheck=i,()=>{})}async getAuthToken(){if(this.auth)try{const e=await this.auth.getToken();return e==null?void 0:e.accessToken}catch{return}}async getMessagingToken(){if(!(!this.messaging||!("Notification"in self)||Notification.permission!=="granted"))try{return await this.messaging.getToken()}catch{return}}async getAppCheckToken(e){if(this.serverAppAppCheckToken)return this.serverAppAppCheckToken;if(this.appCheck){const t=e?await this.appCheck.getLimitedUseToken():await this.appCheck.getToken();return t.error?null:t.token}return null}async getContext(e){const t=await this.getAuthToken(),r=await this.getMessagingToken(),s=await this.getAppCheckToken(e);return{authToken:t,messagingToken:r,appCheckToken:s}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Yc="us-central1",zP=/^data: (.*?)(?:\n|$)/;function KP(n){let e=null;return{promise:new Promise((t,r)=>{e=setTimeout(()=>{r(new je("deadline-exceeded","deadline-exceeded"))},n)}),cancel:()=>{e&&clearTimeout(e)}}}class GP{constructor(e,t,r,s,i=Yc,o=(...c)=>fetch(...c)){this.app=e,this.fetchImpl=o,this.emulatorOrigin=null,this.contextProvider=new jP(e,t,r,s),this.cancelAllRequests=new Promise(c=>{this.deleteService=()=>Promise.resolve(c())});try{const c=new URL(i);this.customDomain=c.origin+(c.pathname==="/"?"":c.pathname),this.region=Yc}catch{this.customDomain=null,this.region=i}}_delete(){return this.deleteService()}_url(e){const t=this.app.options.projectId;return this.emulatorOrigin!==null?`${this.emulatorOrigin}/${t}/${this.region}/${e}`:this.customDomain!==null?`${this.customDomain}/${e}`:`https://${this.region}-${t}.cloudfunctions.net/${e}`}}function HP(n,e,t){const r=It(e);n.emulatorOrigin=`http${r?"s":""}://${e}:${t}`,r&&li(n.emulatorOrigin+"/backends")}function WP(n,e,t){const r=s=>JP(n,e,s,{});return r.stream=(s,i)=>XP(n,e,s,i),r}function H_(n){return n.emulatorOrigin&&It(n.emulatorOrigin)?"include":void 0}async function QP(n,e,t,r,s){t["Content-Type"]="application/json";let i;try{i=await r(n,{method:"POST",body:JSON.stringify(e),headers:t,credentials:H_(s)})}catch{return{status:0,json:null}}let o=null;try{o=await i.json()}catch{}return{status:i.status,json:o}}async function W_(n,e){const t={},r=await n.contextProvider.getContext(e.limitedUseAppCheckTokens);return r.authToken&&(t.Authorization="Bearer "+r.authToken),r.messagingToken&&(t["Firebase-Instance-ID-Token"]=r.messagingToken),r.appCheckToken!==null&&(t["X-Firebase-AppCheck"]=r.appCheckToken),t}function JP(n,e,t,r){const s=n._url(e);return YP(n,s,t,r)}async function YP(n,e,t,r){t=zo(t);const s={data:t},i=await W_(n,r),o=r.timeout||7e4,c=KP(o),u=await Promise.race([QP(e,s,i,n.fetchImpl,n),c.promise,n.cancelAllRequests]);if(c.cancel(),!u)throw new je("cancelled","Firebase Functions instance was deleted.");const l=Ko(u.status,u.json);if(l)throw l;if(!u.json)throw new je("internal","Response is not valid JSON object.");let f=u.json.data;if(typeof f>"u"&&(f=u.json.result),typeof f>"u")throw new je("internal","Response is missing data field.");return{data:$r(f)}}function XP(n,e,t,r){const s=n._url(e);return ZP(n,s,t,r||{})}async function ZP(n,e,t,r){var g;t=zo(t);const s={data:t},i=await W_(n,r);i["Content-Type"]="application/json",i.Accept="text/event-stream";let o;try{o=await n.fetchImpl(e,{method:"POST",body:JSON.stringify(s),headers:i,signal:r==null?void 0:r.signal,credentials:H_(n)})}catch(v){if(v instanceof Error&&v.name==="AbortError"){const V=new je("cancelled","Request was cancelled.");return{data:Promise.reject(V),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(V)}}}}}}const C=Ko(0,null);return{data:Promise.reject(C),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(C)}}}}}}let c,u;const l=new Promise((v,C)=>{c=v,u=C});(g=r==null?void 0:r.signal)==null||g.addEventListener("abort",()=>{const v=new je("cancelled","Request was cancelled.");u(v)});const f=o.body.getReader(),p=eC(f,c,u,r==null?void 0:r.signal);return{stream:{[Symbol.asyncIterator](){const v=p.getReader();return{async next(){const{value:C,done:V}=await v.read();return{value:C,done:V}},async return(){return await v.cancel(),{done:!0,value:void 0}}}}},data:l}}function eC(n,e,t,r){const s=(o,c)=>{const u=o.match(zP);if(!u)return;const l=u[1];try{const f=JSON.parse(l);if("result"in f){e($r(f.result));return}if("message"in f){c.enqueue($r(f.message));return}if("error"in f){const p=Ko(0,f);c.error(p),t(p);return}}catch(f){if(f instanceof je){c.error(f),t(f);return}}},i=new TextDecoder;return new ReadableStream({start(o){let c="";return u();async function u(){if(r!=null&&r.aborted){const l=new je("cancelled","Request was cancelled");return o.error(l),t(l),Promise.resolve()}try{const{value:l,done:f}=await n.read();if(f){c.trim()&&s(c.trim(),o),o.close();return}if(r!=null&&r.aborted){const g=new je("cancelled","Request was cancelled");o.error(g),t(g),await n.cancel();return}c+=i.decode(l,{stream:!0});const p=c.split(`
`);c=p.pop()||"";for(const g of p)g.trim()&&s(g.trim(),o);return u()}catch(l){const f=l instanceof je?l:Ko(0,null);o.error(f),t(f)}}},cancel(){return n.cancel()}})}const Bf="@firebase/functions",qf="0.13.4";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tC="auth-internal",nC="app-check-internal",rC="messaging-internal";function sC(n){const e=(t,{instanceIdentifier:r})=>{const s=t.getProvider("app").getImmediate(),i=t.getProvider(tC),o=t.getProvider(rC),c=t.getProvider(nC);return new GP(s,i,o,c,r)};Ze(new Je(Rl,e,"PUBLIC").setMultipleInstances(!0)),Ve(Bf,qf,n),Ve(Bf,qf,"esm2020")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function WC(n=hi(),e=Yc){const r=Nt(Z(n),Rl).getImmediate({identifier:e}),s=Xc("functions");return s&&iC(r,...s),r}function iC(n,e,t){HP(Z(n),e,t)}function QC(n,e,t){return WP(Z(n),e)}sC();export{UC as A,xC as B,RC as C,NC as D,SC as E,QC as F,WC as G,TC as H,MC as I,zC as J,qC as K,$C as L,BC as M,hi as N,wC as O,vC as P,DC as Q,PC as R,jC as S,te as T,hC as U,cC as V,lC as W,uC as X,ST as a,cE as b,JT as c,Pp as d,pC as e,yC as f,aC as g,kC as h,xI as i,IC as j,KC as k,_C as l,Vb as m,dC as n,FC as o,CC as p,VC as q,AC as r,fC as s,LC as t,EC as u,UP as v,bC as w,GC as x,HC as y,OC as z};

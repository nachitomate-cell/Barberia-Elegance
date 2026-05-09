function u1(t,e){for(var n=0;n<e.length;n++){const r=e[n];if(typeof r!="string"&&!Array.isArray(r)){for(const s in r)if(s!=="default"&&!(s in t)){const i=Object.getOwnPropertyDescriptor(r,s);i&&Object.defineProperty(t,s,i.get?i:{enumerable:!0,get:()=>r[s]})}}}return Object.freeze(Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}))}(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&r(o)}).observe(document,{childList:!0,subtree:!0});function n(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function r(s){if(s.ep)return;s.ep=!0;const i=n(s);fetch(s.href,i)}})();function c1(t){return t&&t.__esModule&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t}var Kv={exports:{}},Xu={},Qv={exports:{}},ne={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var ka=Symbol.for("react.element"),h1=Symbol.for("react.portal"),d1=Symbol.for("react.fragment"),f1=Symbol.for("react.strict_mode"),p1=Symbol.for("react.profiler"),m1=Symbol.for("react.provider"),g1=Symbol.for("react.context"),y1=Symbol.for("react.forward_ref"),_1=Symbol.for("react.suspense"),v1=Symbol.for("react.memo"),w1=Symbol.for("react.lazy"),Mg=Symbol.iterator;function E1(t){return t===null||typeof t!="object"?null:(t=Mg&&t[Mg]||t["@@iterator"],typeof t=="function"?t:null)}var Xv={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},Yv=Object.assign,Jv={};function Ni(t,e,n){this.props=t,this.context=e,this.refs=Jv,this.updater=n||Xv}Ni.prototype.isReactComponent={};Ni.prototype.setState=function(t,e){if(typeof t!="object"&&typeof t!="function"&&t!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,t,e,"setState")};Ni.prototype.forceUpdate=function(t){this.updater.enqueueForceUpdate(this,t,"forceUpdate")};function Zv(){}Zv.prototype=Ni.prototype;function Df(t,e,n){this.props=t,this.context=e,this.refs=Jv,this.updater=n||Xv}var Of=Df.prototype=new Zv;Of.constructor=Df;Yv(Of,Ni.prototype);Of.isPureReactComponent=!0;var jg=Array.isArray,e0=Object.prototype.hasOwnProperty,Vf={current:null},t0={key:!0,ref:!0,__self:!0,__source:!0};function n0(t,e,n){var r,s={},i=null,o=null;if(e!=null)for(r in e.ref!==void 0&&(o=e.ref),e.key!==void 0&&(i=""+e.key),e)e0.call(e,r)&&!t0.hasOwnProperty(r)&&(s[r]=e[r]);var l=arguments.length-2;if(l===1)s.children=n;else if(1<l){for(var u=Array(l),c=0;c<l;c++)u[c]=arguments[c+2];s.children=u}if(t&&t.defaultProps)for(r in l=t.defaultProps,l)s[r]===void 0&&(s[r]=l[r]);return{$$typeof:ka,type:t,key:i,ref:o,props:s,_owner:Vf.current}}function T1(t,e){return{$$typeof:ka,type:t.type,key:e,ref:t.ref,props:t.props,_owner:t._owner}}function Lf(t){return typeof t=="object"&&t!==null&&t.$$typeof===ka}function x1(t){var e={"=":"=0",":":"=2"};return"$"+t.replace(/[=:]/g,function(n){return e[n]})}var Ug=/\/+/g;function ph(t,e){return typeof t=="object"&&t!==null&&t.key!=null?x1(""+t.key):e.toString(36)}function Ol(t,e,n,r,s){var i=typeof t;(i==="undefined"||i==="boolean")&&(t=null);var o=!1;if(t===null)o=!0;else switch(i){case"string":case"number":o=!0;break;case"object":switch(t.$$typeof){case ka:case h1:o=!0}}if(o)return o=t,s=s(o),t=r===""?"."+ph(o,0):r,jg(s)?(n="",t!=null&&(n=t.replace(Ug,"$&/")+"/"),Ol(s,e,n,"",function(c){return c})):s!=null&&(Lf(s)&&(s=T1(s,n+(!s.key||o&&o.key===s.key?"":(""+s.key).replace(Ug,"$&/")+"/")+t)),e.push(s)),1;if(o=0,r=r===""?".":r+":",jg(t))for(var l=0;l<t.length;l++){i=t[l];var u=r+ph(i,l);o+=Ol(i,e,n,u,s)}else if(u=E1(t),typeof u=="function")for(t=u.call(t),l=0;!(i=t.next()).done;)i=i.value,u=r+ph(i,l++),o+=Ol(i,e,n,u,s);else if(i==="object")throw e=String(t),Error("Objects are not valid as a React child (found: "+(e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e)+"). If you meant to render a collection of children, use an array instead.");return o}function al(t,e,n){if(t==null)return t;var r=[],s=0;return Ol(t,r,"","",function(i){return e.call(n,i,s++)}),r}function I1(t){if(t._status===-1){var e=t._result;e=e(),e.then(function(n){(t._status===0||t._status===-1)&&(t._status=1,t._result=n)},function(n){(t._status===0||t._status===-1)&&(t._status=2,t._result=n)}),t._status===-1&&(t._status=0,t._result=e)}if(t._status===1)return t._result.default;throw t._result}var gt={current:null},Vl={transition:null},S1={ReactCurrentDispatcher:gt,ReactCurrentBatchConfig:Vl,ReactCurrentOwner:Vf};function r0(){throw Error("act(...) is not supported in production builds of React.")}ne.Children={map:al,forEach:function(t,e,n){al(t,function(){e.apply(this,arguments)},n)},count:function(t){var e=0;return al(t,function(){e++}),e},toArray:function(t){return al(t,function(e){return e})||[]},only:function(t){if(!Lf(t))throw Error("React.Children.only expected to receive a single React element child.");return t}};ne.Component=Ni;ne.Fragment=d1;ne.Profiler=p1;ne.PureComponent=Df;ne.StrictMode=f1;ne.Suspense=_1;ne.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=S1;ne.act=r0;ne.cloneElement=function(t,e,n){if(t==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+t+".");var r=Yv({},t.props),s=t.key,i=t.ref,o=t._owner;if(e!=null){if(e.ref!==void 0&&(i=e.ref,o=Vf.current),e.key!==void 0&&(s=""+e.key),t.type&&t.type.defaultProps)var l=t.type.defaultProps;for(u in e)e0.call(e,u)&&!t0.hasOwnProperty(u)&&(r[u]=e[u]===void 0&&l!==void 0?l[u]:e[u])}var u=arguments.length-2;if(u===1)r.children=n;else if(1<u){l=Array(u);for(var c=0;c<u;c++)l[c]=arguments[c+2];r.children=l}return{$$typeof:ka,type:t.type,key:s,ref:i,props:r,_owner:o}};ne.createContext=function(t){return t={$$typeof:g1,_currentValue:t,_currentValue2:t,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},t.Provider={$$typeof:m1,_context:t},t.Consumer=t};ne.createElement=n0;ne.createFactory=function(t){var e=n0.bind(null,t);return e.type=t,e};ne.createRef=function(){return{current:null}};ne.forwardRef=function(t){return{$$typeof:y1,render:t}};ne.isValidElement=Lf;ne.lazy=function(t){return{$$typeof:w1,_payload:{_status:-1,_result:t},_init:I1}};ne.memo=function(t,e){return{$$typeof:v1,type:t,compare:e===void 0?null:e}};ne.startTransition=function(t){var e=Vl.transition;Vl.transition={};try{t()}finally{Vl.transition=e}};ne.unstable_act=r0;ne.useCallback=function(t,e){return gt.current.useCallback(t,e)};ne.useContext=function(t){return gt.current.useContext(t)};ne.useDebugValue=function(){};ne.useDeferredValue=function(t){return gt.current.useDeferredValue(t)};ne.useEffect=function(t,e){return gt.current.useEffect(t,e)};ne.useId=function(){return gt.current.useId()};ne.useImperativeHandle=function(t,e,n){return gt.current.useImperativeHandle(t,e,n)};ne.useInsertionEffect=function(t,e){return gt.current.useInsertionEffect(t,e)};ne.useLayoutEffect=function(t,e){return gt.current.useLayoutEffect(t,e)};ne.useMemo=function(t,e){return gt.current.useMemo(t,e)};ne.useReducer=function(t,e,n){return gt.current.useReducer(t,e,n)};ne.useRef=function(t){return gt.current.useRef(t)};ne.useState=function(t){return gt.current.useState(t)};ne.useSyncExternalStore=function(t,e,n){return gt.current.useSyncExternalStore(t,e,n)};ne.useTransition=function(){return gt.current.useTransition()};ne.version="18.3.1";Qv.exports=ne;var O=Qv.exports;const k1=c1(O),C1=u1({__proto__:null,default:k1},[O]);/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var A1=O,R1=Symbol.for("react.element"),b1=Symbol.for("react.fragment"),P1=Object.prototype.hasOwnProperty,N1=A1.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,D1={key:!0,ref:!0,__self:!0,__source:!0};function s0(t,e,n){var r,s={},i=null,o=null;n!==void 0&&(i=""+n),e.key!==void 0&&(i=""+e.key),e.ref!==void 0&&(o=e.ref);for(r in e)P1.call(e,r)&&!D1.hasOwnProperty(r)&&(s[r]=e[r]);if(t&&t.defaultProps)for(r in e=t.defaultProps,e)s[r]===void 0&&(s[r]=e[r]);return{$$typeof:R1,type:t,key:i,ref:o,props:s,_owner:N1.current}}Xu.Fragment=b1;Xu.jsx=s0;Xu.jsxs=s0;Kv.exports=Xu;var d=Kv.exports,i0={exports:{}},Vt={},o0={exports:{}},a0={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */(function(t){function e($,Q){var J=$.length;$.push(Q);e:for(;0<J;){var ve=J-1>>>1,Pe=$[ve];if(0<s(Pe,Q))$[ve]=Q,$[J]=Pe,J=ve;else break e}}function n($){return $.length===0?null:$[0]}function r($){if($.length===0)return null;var Q=$[0],J=$.pop();if(J!==Q){$[0]=J;e:for(var ve=0,Pe=$.length,Jr=Pe>>>1;ve<Jr;){var Mt=2*(ve+1)-1,Zr=$[Mt],Kt=Mt+1,Yn=$[Kt];if(0>s(Zr,J))Kt<Pe&&0>s(Yn,Zr)?($[ve]=Yn,$[Kt]=J,ve=Kt):($[ve]=Zr,$[Mt]=J,ve=Mt);else if(Kt<Pe&&0>s(Yn,J))$[ve]=Yn,$[Kt]=J,ve=Kt;else break e}}return Q}function s($,Q){var J=$.sortIndex-Q.sortIndex;return J!==0?J:$.id-Q.id}if(typeof performance=="object"&&typeof performance.now=="function"){var i=performance;t.unstable_now=function(){return i.now()}}else{var o=Date,l=o.now();t.unstable_now=function(){return o.now()-l}}var u=[],c=[],f=1,p=null,g=3,w=!1,x=!1,b=!1,P=typeof setTimeout=="function"?setTimeout:null,S=typeof clearTimeout=="function"?clearTimeout:null,v=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function C($){for(var Q=n(c);Q!==null;){if(Q.callback===null)r(c);else if(Q.startTime<=$)r(c),Q.sortIndex=Q.expirationTime,e(u,Q);else break;Q=n(c)}}function D($){if(b=!1,C($),!x)if(n(u)!==null)x=!0,ln(j);else{var Q=n(c);Q!==null&&Gt(D,Q.startTime-$)}}function j($,Q){x=!1,b&&(b=!1,S(_),_=-1),w=!0;var J=g;try{for(C(Q),p=n(u);p!==null&&(!(p.expirationTime>Q)||$&&!T());){var ve=p.callback;if(typeof ve=="function"){p.callback=null,g=p.priorityLevel;var Pe=ve(p.expirationTime<=Q);Q=t.unstable_now(),typeof Pe=="function"?p.callback=Pe:p===n(u)&&r(u),C(Q)}else r(u);p=n(u)}if(p!==null)var Jr=!0;else{var Mt=n(c);Mt!==null&&Gt(D,Mt.startTime-Q),Jr=!1}return Jr}finally{p=null,g=J,w=!1}}var L=!1,E=null,_=-1,I=5,R=-1;function T(){return!(t.unstable_now()-R<I)}function A(){if(E!==null){var $=t.unstable_now();R=$;var Q=!0;try{Q=E(!0,$)}finally{Q?k():(L=!1,E=null)}}else L=!1}var k;if(typeof v=="function")k=function(){v(A)};else if(typeof MessageChannel<"u"){var se=new MessageChannel,Ze=se.port2;se.port1.onmessage=A,k=function(){Ze.postMessage(null)}}else k=function(){P(A,0)};function ln($){E=$,L||(L=!0,k())}function Gt($,Q){_=P(function(){$(t.unstable_now())},Q)}t.unstable_IdlePriority=5,t.unstable_ImmediatePriority=1,t.unstable_LowPriority=4,t.unstable_NormalPriority=3,t.unstable_Profiling=null,t.unstable_UserBlockingPriority=2,t.unstable_cancelCallback=function($){$.callback=null},t.unstable_continueExecution=function(){x||w||(x=!0,ln(j))},t.unstable_forceFrameRate=function($){0>$||125<$?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):I=0<$?Math.floor(1e3/$):5},t.unstable_getCurrentPriorityLevel=function(){return g},t.unstable_getFirstCallbackNode=function(){return n(u)},t.unstable_next=function($){switch(g){case 1:case 2:case 3:var Q=3;break;default:Q=g}var J=g;g=Q;try{return $()}finally{g=J}},t.unstable_pauseExecution=function(){},t.unstable_requestPaint=function(){},t.unstable_runWithPriority=function($,Q){switch($){case 1:case 2:case 3:case 4:case 5:break;default:$=3}var J=g;g=$;try{return Q()}finally{g=J}},t.unstable_scheduleCallback=function($,Q,J){var ve=t.unstable_now();switch(typeof J=="object"&&J!==null?(J=J.delay,J=typeof J=="number"&&0<J?ve+J:ve):J=ve,$){case 1:var Pe=-1;break;case 2:Pe=250;break;case 5:Pe=1073741823;break;case 4:Pe=1e4;break;default:Pe=5e3}return Pe=J+Pe,$={id:f++,callback:Q,priorityLevel:$,startTime:J,expirationTime:Pe,sortIndex:-1},J>ve?($.sortIndex=J,e(c,$),n(u)===null&&$===n(c)&&(b?(S(_),_=-1):b=!0,Gt(D,J-ve))):($.sortIndex=Pe,e(u,$),x||w||(x=!0,ln(j))),$},t.unstable_shouldYield=T,t.unstable_wrapCallback=function($){var Q=g;return function(){var J=g;g=Q;try{return $.apply(this,arguments)}finally{g=J}}}})(a0);o0.exports=a0;var O1=o0.exports;/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var V1=O,Ot=O1;function F(t){for(var e="https://reactjs.org/docs/error-decoder.html?invariant="+t,n=1;n<arguments.length;n++)e+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+t+"; visit "+e+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var l0=new Set,Go={};function Cs(t,e){gi(t,e),gi(t+"Capture",e)}function gi(t,e){for(Go[t]=e,t=0;t<e.length;t++)l0.add(e[t])}var zn=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),od=Object.prototype.hasOwnProperty,L1=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,Fg={},zg={};function M1(t){return od.call(zg,t)?!0:od.call(Fg,t)?!1:L1.test(t)?zg[t]=!0:(Fg[t]=!0,!1)}function j1(t,e,n,r){if(n!==null&&n.type===0)return!1;switch(typeof e){case"function":case"symbol":return!0;case"boolean":return r?!1:n!==null?!n.acceptsBooleans:(t=t.toLowerCase().slice(0,5),t!=="data-"&&t!=="aria-");default:return!1}}function U1(t,e,n,r){if(e===null||typeof e>"u"||j1(t,e,n,r))return!0;if(r)return!1;if(n!==null)switch(n.type){case 3:return!e;case 4:return e===!1;case 5:return isNaN(e);case 6:return isNaN(e)||1>e}return!1}function yt(t,e,n,r,s,i,o){this.acceptsBooleans=e===2||e===3||e===4,this.attributeName=r,this.attributeNamespace=s,this.mustUseProperty=n,this.propertyName=t,this.type=e,this.sanitizeURL=i,this.removeEmptyString=o}var Je={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(t){Je[t]=new yt(t,0,!1,t,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(t){var e=t[0];Je[e]=new yt(e,1,!1,t[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(t){Je[t]=new yt(t,2,!1,t.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(t){Je[t]=new yt(t,2,!1,t,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(t){Je[t]=new yt(t,3,!1,t.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(t){Je[t]=new yt(t,3,!0,t,null,!1,!1)});["capture","download"].forEach(function(t){Je[t]=new yt(t,4,!1,t,null,!1,!1)});["cols","rows","size","span"].forEach(function(t){Je[t]=new yt(t,6,!1,t,null,!1,!1)});["rowSpan","start"].forEach(function(t){Je[t]=new yt(t,5,!1,t.toLowerCase(),null,!1,!1)});var Mf=/[\-:]([a-z])/g;function jf(t){return t[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(t){var e=t.replace(Mf,jf);Je[e]=new yt(e,1,!1,t,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t){var e=t.replace(Mf,jf);Je[e]=new yt(e,1,!1,t,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(t){var e=t.replace(Mf,jf);Je[e]=new yt(e,1,!1,t,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(t){Je[t]=new yt(t,1,!1,t.toLowerCase(),null,!1,!1)});Je.xlinkHref=new yt("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(t){Je[t]=new yt(t,1,!1,t.toLowerCase(),null,!0,!0)});function Uf(t,e,n,r){var s=Je.hasOwnProperty(e)?Je[e]:null;(s!==null?s.type!==0:r||!(2<e.length)||e[0]!=="o"&&e[0]!=="O"||e[1]!=="n"&&e[1]!=="N")&&(U1(e,n,s,r)&&(n=null),r||s===null?M1(e)&&(n===null?t.removeAttribute(e):t.setAttribute(e,""+n)):s.mustUseProperty?t[s.propertyName]=n===null?s.type===3?!1:"":n:(e=s.attributeName,r=s.attributeNamespace,n===null?t.removeAttribute(e):(s=s.type,n=s===3||s===4&&n===!0?"":""+n,r?t.setAttributeNS(r,e,n):t.setAttribute(e,n))))}var Qn=V1.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,ll=Symbol.for("react.element"),Ws=Symbol.for("react.portal"),Gs=Symbol.for("react.fragment"),Ff=Symbol.for("react.strict_mode"),ad=Symbol.for("react.profiler"),u0=Symbol.for("react.provider"),c0=Symbol.for("react.context"),zf=Symbol.for("react.forward_ref"),ld=Symbol.for("react.suspense"),ud=Symbol.for("react.suspense_list"),Bf=Symbol.for("react.memo"),or=Symbol.for("react.lazy"),h0=Symbol.for("react.offscreen"),Bg=Symbol.iterator;function ho(t){return t===null||typeof t!="object"?null:(t=Bg&&t[Bg]||t["@@iterator"],typeof t=="function"?t:null)}var Ce=Object.assign,mh;function To(t){if(mh===void 0)try{throw Error()}catch(n){var e=n.stack.trim().match(/\n( *(at )?)/);mh=e&&e[1]||""}return`
`+mh+t}var gh=!1;function yh(t,e){if(!t||gh)return"";gh=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(e)if(e=function(){throw Error()},Object.defineProperty(e.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(e,[])}catch(c){var r=c}Reflect.construct(t,[],e)}else{try{e.call()}catch(c){r=c}t.call(e.prototype)}else{try{throw Error()}catch(c){r=c}t()}}catch(c){if(c&&r&&typeof c.stack=="string"){for(var s=c.stack.split(`
`),i=r.stack.split(`
`),o=s.length-1,l=i.length-1;1<=o&&0<=l&&s[o]!==i[l];)l--;for(;1<=o&&0<=l;o--,l--)if(s[o]!==i[l]){if(o!==1||l!==1)do if(o--,l--,0>l||s[o]!==i[l]){var u=`
`+s[o].replace(" at new "," at ");return t.displayName&&u.includes("<anonymous>")&&(u=u.replace("<anonymous>",t.displayName)),u}while(1<=o&&0<=l);break}}}finally{gh=!1,Error.prepareStackTrace=n}return(t=t?t.displayName||t.name:"")?To(t):""}function F1(t){switch(t.tag){case 5:return To(t.type);case 16:return To("Lazy");case 13:return To("Suspense");case 19:return To("SuspenseList");case 0:case 2:case 15:return t=yh(t.type,!1),t;case 11:return t=yh(t.type.render,!1),t;case 1:return t=yh(t.type,!0),t;default:return""}}function cd(t){if(t==null)return null;if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t;switch(t){case Gs:return"Fragment";case Ws:return"Portal";case ad:return"Profiler";case Ff:return"StrictMode";case ld:return"Suspense";case ud:return"SuspenseList"}if(typeof t=="object")switch(t.$$typeof){case c0:return(t.displayName||"Context")+".Consumer";case u0:return(t._context.displayName||"Context")+".Provider";case zf:var e=t.render;return t=t.displayName,t||(t=e.displayName||e.name||"",t=t!==""?"ForwardRef("+t+")":"ForwardRef"),t;case Bf:return e=t.displayName||null,e!==null?e:cd(t.type)||"Memo";case or:e=t._payload,t=t._init;try{return cd(t(e))}catch{}}return null}function z1(t){var e=t.type;switch(t.tag){case 24:return"Cache";case 9:return(e.displayName||"Context")+".Consumer";case 10:return(e._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return t=e.render,t=t.displayName||t.name||"",e.displayName||(t!==""?"ForwardRef("+t+")":"ForwardRef");case 7:return"Fragment";case 5:return e;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return cd(e);case 8:return e===Ff?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e}return null}function Nr(t){switch(typeof t){case"boolean":case"number":case"string":case"undefined":return t;case"object":return t;default:return""}}function d0(t){var e=t.type;return(t=t.nodeName)&&t.toLowerCase()==="input"&&(e==="checkbox"||e==="radio")}function B1(t){var e=d0(t)?"checked":"value",n=Object.getOwnPropertyDescriptor(t.constructor.prototype,e),r=""+t[e];if(!t.hasOwnProperty(e)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var s=n.get,i=n.set;return Object.defineProperty(t,e,{configurable:!0,get:function(){return s.call(this)},set:function(o){r=""+o,i.call(this,o)}}),Object.defineProperty(t,e,{enumerable:n.enumerable}),{getValue:function(){return r},setValue:function(o){r=""+o},stopTracking:function(){t._valueTracker=null,delete t[e]}}}}function ul(t){t._valueTracker||(t._valueTracker=B1(t))}function f0(t){if(!t)return!1;var e=t._valueTracker;if(!e)return!0;var n=e.getValue(),r="";return t&&(r=d0(t)?t.checked?"true":"false":t.value),t=r,t!==n?(e.setValue(t),!0):!1}function ru(t){if(t=t||(typeof document<"u"?document:void 0),typeof t>"u")return null;try{return t.activeElement||t.body}catch{return t.body}}function hd(t,e){var n=e.checked;return Ce({},e,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??t._wrapperState.initialChecked})}function $g(t,e){var n=e.defaultValue==null?"":e.defaultValue,r=e.checked!=null?e.checked:e.defaultChecked;n=Nr(e.value!=null?e.value:n),t._wrapperState={initialChecked:r,initialValue:n,controlled:e.type==="checkbox"||e.type==="radio"?e.checked!=null:e.value!=null}}function p0(t,e){e=e.checked,e!=null&&Uf(t,"checked",e,!1)}function dd(t,e){p0(t,e);var n=Nr(e.value),r=e.type;if(n!=null)r==="number"?(n===0&&t.value===""||t.value!=n)&&(t.value=""+n):t.value!==""+n&&(t.value=""+n);else if(r==="submit"||r==="reset"){t.removeAttribute("value");return}e.hasOwnProperty("value")?fd(t,e.type,n):e.hasOwnProperty("defaultValue")&&fd(t,e.type,Nr(e.defaultValue)),e.checked==null&&e.defaultChecked!=null&&(t.defaultChecked=!!e.defaultChecked)}function qg(t,e,n){if(e.hasOwnProperty("value")||e.hasOwnProperty("defaultValue")){var r=e.type;if(!(r!=="submit"&&r!=="reset"||e.value!==void 0&&e.value!==null))return;e=""+t._wrapperState.initialValue,n||e===t.value||(t.value=e),t.defaultValue=e}n=t.name,n!==""&&(t.name=""),t.defaultChecked=!!t._wrapperState.initialChecked,n!==""&&(t.name=n)}function fd(t,e,n){(e!=="number"||ru(t.ownerDocument)!==t)&&(n==null?t.defaultValue=""+t._wrapperState.initialValue:t.defaultValue!==""+n&&(t.defaultValue=""+n))}var xo=Array.isArray;function ii(t,e,n,r){if(t=t.options,e){e={};for(var s=0;s<n.length;s++)e["$"+n[s]]=!0;for(n=0;n<t.length;n++)s=e.hasOwnProperty("$"+t[n].value),t[n].selected!==s&&(t[n].selected=s),s&&r&&(t[n].defaultSelected=!0)}else{for(n=""+Nr(n),e=null,s=0;s<t.length;s++){if(t[s].value===n){t[s].selected=!0,r&&(t[s].defaultSelected=!0);return}e!==null||t[s].disabled||(e=t[s])}e!==null&&(e.selected=!0)}}function pd(t,e){if(e.dangerouslySetInnerHTML!=null)throw Error(F(91));return Ce({},e,{value:void 0,defaultValue:void 0,children:""+t._wrapperState.initialValue})}function Hg(t,e){var n=e.value;if(n==null){if(n=e.children,e=e.defaultValue,n!=null){if(e!=null)throw Error(F(92));if(xo(n)){if(1<n.length)throw Error(F(93));n=n[0]}e=n}e==null&&(e=""),n=e}t._wrapperState={initialValue:Nr(n)}}function m0(t,e){var n=Nr(e.value),r=Nr(e.defaultValue);n!=null&&(n=""+n,n!==t.value&&(t.value=n),e.defaultValue==null&&t.defaultValue!==n&&(t.defaultValue=n)),r!=null&&(t.defaultValue=""+r)}function Wg(t){var e=t.textContent;e===t._wrapperState.initialValue&&e!==""&&e!==null&&(t.value=e)}function g0(t){switch(t){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function md(t,e){return t==null||t==="http://www.w3.org/1999/xhtml"?g0(e):t==="http://www.w3.org/2000/svg"&&e==="foreignObject"?"http://www.w3.org/1999/xhtml":t}var cl,y0=function(t){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(e,n,r,s){MSApp.execUnsafeLocalFunction(function(){return t(e,n,r,s)})}:t}(function(t,e){if(t.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in t)t.innerHTML=e;else{for(cl=cl||document.createElement("div"),cl.innerHTML="<svg>"+e.valueOf().toString()+"</svg>",e=cl.firstChild;t.firstChild;)t.removeChild(t.firstChild);for(;e.firstChild;)t.appendChild(e.firstChild)}});function Ko(t,e){if(e){var n=t.firstChild;if(n&&n===t.lastChild&&n.nodeType===3){n.nodeValue=e;return}}t.textContent=e}var Po={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},$1=["Webkit","ms","Moz","O"];Object.keys(Po).forEach(function(t){$1.forEach(function(e){e=e+t.charAt(0).toUpperCase()+t.substring(1),Po[e]=Po[t]})});function _0(t,e,n){return e==null||typeof e=="boolean"||e===""?"":n||typeof e!="number"||e===0||Po.hasOwnProperty(t)&&Po[t]?(""+e).trim():e+"px"}function v0(t,e){t=t.style;for(var n in e)if(e.hasOwnProperty(n)){var r=n.indexOf("--")===0,s=_0(n,e[n],r);n==="float"&&(n="cssFloat"),r?t.setProperty(n,s):t[n]=s}}var q1=Ce({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function gd(t,e){if(e){if(q1[t]&&(e.children!=null||e.dangerouslySetInnerHTML!=null))throw Error(F(137,t));if(e.dangerouslySetInnerHTML!=null){if(e.children!=null)throw Error(F(60));if(typeof e.dangerouslySetInnerHTML!="object"||!("__html"in e.dangerouslySetInnerHTML))throw Error(F(61))}if(e.style!=null&&typeof e.style!="object")throw Error(F(62))}}function yd(t,e){if(t.indexOf("-")===-1)return typeof e.is=="string";switch(t){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var _d=null;function $f(t){return t=t.target||t.srcElement||window,t.correspondingUseElement&&(t=t.correspondingUseElement),t.nodeType===3?t.parentNode:t}var vd=null,oi=null,ai=null;function Gg(t){if(t=Ra(t)){if(typeof vd!="function")throw Error(F(280));var e=t.stateNode;e&&(e=tc(e),vd(t.stateNode,t.type,e))}}function w0(t){oi?ai?ai.push(t):ai=[t]:oi=t}function E0(){if(oi){var t=oi,e=ai;if(ai=oi=null,Gg(t),e)for(t=0;t<e.length;t++)Gg(e[t])}}function T0(t,e){return t(e)}function x0(){}var _h=!1;function I0(t,e,n){if(_h)return t(e,n);_h=!0;try{return T0(t,e,n)}finally{_h=!1,(oi!==null||ai!==null)&&(x0(),E0())}}function Qo(t,e){var n=t.stateNode;if(n===null)return null;var r=tc(n);if(r===null)return null;n=r[e];e:switch(e){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(r=!r.disabled)||(t=t.type,r=!(t==="button"||t==="input"||t==="select"||t==="textarea")),t=!r;break e;default:t=!1}if(t)return null;if(n&&typeof n!="function")throw Error(F(231,e,typeof n));return n}var wd=!1;if(zn)try{var fo={};Object.defineProperty(fo,"passive",{get:function(){wd=!0}}),window.addEventListener("test",fo,fo),window.removeEventListener("test",fo,fo)}catch{wd=!1}function H1(t,e,n,r,s,i,o,l,u){var c=Array.prototype.slice.call(arguments,3);try{e.apply(n,c)}catch(f){this.onError(f)}}var No=!1,su=null,iu=!1,Ed=null,W1={onError:function(t){No=!0,su=t}};function G1(t,e,n,r,s,i,o,l,u){No=!1,su=null,H1.apply(W1,arguments)}function K1(t,e,n,r,s,i,o,l,u){if(G1.apply(this,arguments),No){if(No){var c=su;No=!1,su=null}else throw Error(F(198));iu||(iu=!0,Ed=c)}}function As(t){var e=t,n=t;if(t.alternate)for(;e.return;)e=e.return;else{t=e;do e=t,e.flags&4098&&(n=e.return),t=e.return;while(t)}return e.tag===3?n:null}function S0(t){if(t.tag===13){var e=t.memoizedState;if(e===null&&(t=t.alternate,t!==null&&(e=t.memoizedState)),e!==null)return e.dehydrated}return null}function Kg(t){if(As(t)!==t)throw Error(F(188))}function Q1(t){var e=t.alternate;if(!e){if(e=As(t),e===null)throw Error(F(188));return e!==t?null:t}for(var n=t,r=e;;){var s=n.return;if(s===null)break;var i=s.alternate;if(i===null){if(r=s.return,r!==null){n=r;continue}break}if(s.child===i.child){for(i=s.child;i;){if(i===n)return Kg(s),t;if(i===r)return Kg(s),e;i=i.sibling}throw Error(F(188))}if(n.return!==r.return)n=s,r=i;else{for(var o=!1,l=s.child;l;){if(l===n){o=!0,n=s,r=i;break}if(l===r){o=!0,r=s,n=i;break}l=l.sibling}if(!o){for(l=i.child;l;){if(l===n){o=!0,n=i,r=s;break}if(l===r){o=!0,r=i,n=s;break}l=l.sibling}if(!o)throw Error(F(189))}}if(n.alternate!==r)throw Error(F(190))}if(n.tag!==3)throw Error(F(188));return n.stateNode.current===n?t:e}function k0(t){return t=Q1(t),t!==null?C0(t):null}function C0(t){if(t.tag===5||t.tag===6)return t;for(t=t.child;t!==null;){var e=C0(t);if(e!==null)return e;t=t.sibling}return null}var A0=Ot.unstable_scheduleCallback,Qg=Ot.unstable_cancelCallback,X1=Ot.unstable_shouldYield,Y1=Ot.unstable_requestPaint,De=Ot.unstable_now,J1=Ot.unstable_getCurrentPriorityLevel,qf=Ot.unstable_ImmediatePriority,R0=Ot.unstable_UserBlockingPriority,ou=Ot.unstable_NormalPriority,Z1=Ot.unstable_LowPriority,b0=Ot.unstable_IdlePriority,Yu=null,gn=null;function eS(t){if(gn&&typeof gn.onCommitFiberRoot=="function")try{gn.onCommitFiberRoot(Yu,t,void 0,(t.current.flags&128)===128)}catch{}}var en=Math.clz32?Math.clz32:rS,tS=Math.log,nS=Math.LN2;function rS(t){return t>>>=0,t===0?32:31-(tS(t)/nS|0)|0}var hl=64,dl=4194304;function Io(t){switch(t&-t){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return t&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return t}}function au(t,e){var n=t.pendingLanes;if(n===0)return 0;var r=0,s=t.suspendedLanes,i=t.pingedLanes,o=n&268435455;if(o!==0){var l=o&~s;l!==0?r=Io(l):(i&=o,i!==0&&(r=Io(i)))}else o=n&~s,o!==0?r=Io(o):i!==0&&(r=Io(i));if(r===0)return 0;if(e!==0&&e!==r&&!(e&s)&&(s=r&-r,i=e&-e,s>=i||s===16&&(i&4194240)!==0))return e;if(r&4&&(r|=n&16),e=t.entangledLanes,e!==0)for(t=t.entanglements,e&=r;0<e;)n=31-en(e),s=1<<n,r|=t[n],e&=~s;return r}function sS(t,e){switch(t){case 1:case 2:case 4:return e+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function iS(t,e){for(var n=t.suspendedLanes,r=t.pingedLanes,s=t.expirationTimes,i=t.pendingLanes;0<i;){var o=31-en(i),l=1<<o,u=s[o];u===-1?(!(l&n)||l&r)&&(s[o]=sS(l,e)):u<=e&&(t.expiredLanes|=l),i&=~l}}function Td(t){return t=t.pendingLanes&-1073741825,t!==0?t:t&1073741824?1073741824:0}function P0(){var t=hl;return hl<<=1,!(hl&4194240)&&(hl=64),t}function vh(t){for(var e=[],n=0;31>n;n++)e.push(t);return e}function Ca(t,e,n){t.pendingLanes|=e,e!==536870912&&(t.suspendedLanes=0,t.pingedLanes=0),t=t.eventTimes,e=31-en(e),t[e]=n}function oS(t,e){var n=t.pendingLanes&~e;t.pendingLanes=e,t.suspendedLanes=0,t.pingedLanes=0,t.expiredLanes&=e,t.mutableReadLanes&=e,t.entangledLanes&=e,e=t.entanglements;var r=t.eventTimes;for(t=t.expirationTimes;0<n;){var s=31-en(n),i=1<<s;e[s]=0,r[s]=-1,t[s]=-1,n&=~i}}function Hf(t,e){var n=t.entangledLanes|=e;for(t=t.entanglements;n;){var r=31-en(n),s=1<<r;s&e|t[r]&e&&(t[r]|=e),n&=~s}}var ue=0;function N0(t){return t&=-t,1<t?4<t?t&268435455?16:536870912:4:1}var D0,Wf,O0,V0,L0,xd=!1,fl=[],yr=null,_r=null,vr=null,Xo=new Map,Yo=new Map,lr=[],aS="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function Xg(t,e){switch(t){case"focusin":case"focusout":yr=null;break;case"dragenter":case"dragleave":_r=null;break;case"mouseover":case"mouseout":vr=null;break;case"pointerover":case"pointerout":Xo.delete(e.pointerId);break;case"gotpointercapture":case"lostpointercapture":Yo.delete(e.pointerId)}}function po(t,e,n,r,s,i){return t===null||t.nativeEvent!==i?(t={blockedOn:e,domEventName:n,eventSystemFlags:r,nativeEvent:i,targetContainers:[s]},e!==null&&(e=Ra(e),e!==null&&Wf(e)),t):(t.eventSystemFlags|=r,e=t.targetContainers,s!==null&&e.indexOf(s)===-1&&e.push(s),t)}function lS(t,e,n,r,s){switch(e){case"focusin":return yr=po(yr,t,e,n,r,s),!0;case"dragenter":return _r=po(_r,t,e,n,r,s),!0;case"mouseover":return vr=po(vr,t,e,n,r,s),!0;case"pointerover":var i=s.pointerId;return Xo.set(i,po(Xo.get(i)||null,t,e,n,r,s)),!0;case"gotpointercapture":return i=s.pointerId,Yo.set(i,po(Yo.get(i)||null,t,e,n,r,s)),!0}return!1}function M0(t){var e=us(t.target);if(e!==null){var n=As(e);if(n!==null){if(e=n.tag,e===13){if(e=S0(n),e!==null){t.blockedOn=e,L0(t.priority,function(){O0(n)});return}}else if(e===3&&n.stateNode.current.memoizedState.isDehydrated){t.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}t.blockedOn=null}function Ll(t){if(t.blockedOn!==null)return!1;for(var e=t.targetContainers;0<e.length;){var n=Id(t.domEventName,t.eventSystemFlags,e[0],t.nativeEvent);if(n===null){n=t.nativeEvent;var r=new n.constructor(n.type,n);_d=r,n.target.dispatchEvent(r),_d=null}else return e=Ra(n),e!==null&&Wf(e),t.blockedOn=n,!1;e.shift()}return!0}function Yg(t,e,n){Ll(t)&&n.delete(e)}function uS(){xd=!1,yr!==null&&Ll(yr)&&(yr=null),_r!==null&&Ll(_r)&&(_r=null),vr!==null&&Ll(vr)&&(vr=null),Xo.forEach(Yg),Yo.forEach(Yg)}function mo(t,e){t.blockedOn===e&&(t.blockedOn=null,xd||(xd=!0,Ot.unstable_scheduleCallback(Ot.unstable_NormalPriority,uS)))}function Jo(t){function e(s){return mo(s,t)}if(0<fl.length){mo(fl[0],t);for(var n=1;n<fl.length;n++){var r=fl[n];r.blockedOn===t&&(r.blockedOn=null)}}for(yr!==null&&mo(yr,t),_r!==null&&mo(_r,t),vr!==null&&mo(vr,t),Xo.forEach(e),Yo.forEach(e),n=0;n<lr.length;n++)r=lr[n],r.blockedOn===t&&(r.blockedOn=null);for(;0<lr.length&&(n=lr[0],n.blockedOn===null);)M0(n),n.blockedOn===null&&lr.shift()}var li=Qn.ReactCurrentBatchConfig,lu=!0;function cS(t,e,n,r){var s=ue,i=li.transition;li.transition=null;try{ue=1,Gf(t,e,n,r)}finally{ue=s,li.transition=i}}function hS(t,e,n,r){var s=ue,i=li.transition;li.transition=null;try{ue=4,Gf(t,e,n,r)}finally{ue=s,li.transition=i}}function Gf(t,e,n,r){if(lu){var s=Id(t,e,n,r);if(s===null)Rh(t,e,r,uu,n),Xg(t,r);else if(lS(s,t,e,n,r))r.stopPropagation();else if(Xg(t,r),e&4&&-1<aS.indexOf(t)){for(;s!==null;){var i=Ra(s);if(i!==null&&D0(i),i=Id(t,e,n,r),i===null&&Rh(t,e,r,uu,n),i===s)break;s=i}s!==null&&r.stopPropagation()}else Rh(t,e,r,null,n)}}var uu=null;function Id(t,e,n,r){if(uu=null,t=$f(r),t=us(t),t!==null)if(e=As(t),e===null)t=null;else if(n=e.tag,n===13){if(t=S0(e),t!==null)return t;t=null}else if(n===3){if(e.stateNode.current.memoizedState.isDehydrated)return e.tag===3?e.stateNode.containerInfo:null;t=null}else e!==t&&(t=null);return uu=t,null}function j0(t){switch(t){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(J1()){case qf:return 1;case R0:return 4;case ou:case Z1:return 16;case b0:return 536870912;default:return 16}default:return 16}}var pr=null,Kf=null,Ml=null;function U0(){if(Ml)return Ml;var t,e=Kf,n=e.length,r,s="value"in pr?pr.value:pr.textContent,i=s.length;for(t=0;t<n&&e[t]===s[t];t++);var o=n-t;for(r=1;r<=o&&e[n-r]===s[i-r];r++);return Ml=s.slice(t,1<r?1-r:void 0)}function jl(t){var e=t.keyCode;return"charCode"in t?(t=t.charCode,t===0&&e===13&&(t=13)):t=e,t===10&&(t=13),32<=t||t===13?t:0}function pl(){return!0}function Jg(){return!1}function Lt(t){function e(n,r,s,i,o){this._reactName=n,this._targetInst=s,this.type=r,this.nativeEvent=i,this.target=o,this.currentTarget=null;for(var l in t)t.hasOwnProperty(l)&&(n=t[l],this[l]=n?n(i):i[l]);return this.isDefaultPrevented=(i.defaultPrevented!=null?i.defaultPrevented:i.returnValue===!1)?pl:Jg,this.isPropagationStopped=Jg,this}return Ce(e.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=pl)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=pl)},persist:function(){},isPersistent:pl}),e}var Di={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(t){return t.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Qf=Lt(Di),Aa=Ce({},Di,{view:0,detail:0}),dS=Lt(Aa),wh,Eh,go,Ju=Ce({},Aa,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Xf,button:0,buttons:0,relatedTarget:function(t){return t.relatedTarget===void 0?t.fromElement===t.srcElement?t.toElement:t.fromElement:t.relatedTarget},movementX:function(t){return"movementX"in t?t.movementX:(t!==go&&(go&&t.type==="mousemove"?(wh=t.screenX-go.screenX,Eh=t.screenY-go.screenY):Eh=wh=0,go=t),wh)},movementY:function(t){return"movementY"in t?t.movementY:Eh}}),Zg=Lt(Ju),fS=Ce({},Ju,{dataTransfer:0}),pS=Lt(fS),mS=Ce({},Aa,{relatedTarget:0}),Th=Lt(mS),gS=Ce({},Di,{animationName:0,elapsedTime:0,pseudoElement:0}),yS=Lt(gS),_S=Ce({},Di,{clipboardData:function(t){return"clipboardData"in t?t.clipboardData:window.clipboardData}}),vS=Lt(_S),wS=Ce({},Di,{data:0}),ey=Lt(wS),ES={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},TS={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},xS={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function IS(t){var e=this.nativeEvent;return e.getModifierState?e.getModifierState(t):(t=xS[t])?!!e[t]:!1}function Xf(){return IS}var SS=Ce({},Aa,{key:function(t){if(t.key){var e=ES[t.key]||t.key;if(e!=="Unidentified")return e}return t.type==="keypress"?(t=jl(t),t===13?"Enter":String.fromCharCode(t)):t.type==="keydown"||t.type==="keyup"?TS[t.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Xf,charCode:function(t){return t.type==="keypress"?jl(t):0},keyCode:function(t){return t.type==="keydown"||t.type==="keyup"?t.keyCode:0},which:function(t){return t.type==="keypress"?jl(t):t.type==="keydown"||t.type==="keyup"?t.keyCode:0}}),kS=Lt(SS),CS=Ce({},Ju,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),ty=Lt(CS),AS=Ce({},Aa,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Xf}),RS=Lt(AS),bS=Ce({},Di,{propertyName:0,elapsedTime:0,pseudoElement:0}),PS=Lt(bS),NS=Ce({},Ju,{deltaX:function(t){return"deltaX"in t?t.deltaX:"wheelDeltaX"in t?-t.wheelDeltaX:0},deltaY:function(t){return"deltaY"in t?t.deltaY:"wheelDeltaY"in t?-t.wheelDeltaY:"wheelDelta"in t?-t.wheelDelta:0},deltaZ:0,deltaMode:0}),DS=Lt(NS),OS=[9,13,27,32],Yf=zn&&"CompositionEvent"in window,Do=null;zn&&"documentMode"in document&&(Do=document.documentMode);var VS=zn&&"TextEvent"in window&&!Do,F0=zn&&(!Yf||Do&&8<Do&&11>=Do),ny=" ",ry=!1;function z0(t,e){switch(t){case"keyup":return OS.indexOf(e.keyCode)!==-1;case"keydown":return e.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function B0(t){return t=t.detail,typeof t=="object"&&"data"in t?t.data:null}var Ks=!1;function LS(t,e){switch(t){case"compositionend":return B0(e);case"keypress":return e.which!==32?null:(ry=!0,ny);case"textInput":return t=e.data,t===ny&&ry?null:t;default:return null}}function MS(t,e){if(Ks)return t==="compositionend"||!Yf&&z0(t,e)?(t=U0(),Ml=Kf=pr=null,Ks=!1,t):null;switch(t){case"paste":return null;case"keypress":if(!(e.ctrlKey||e.altKey||e.metaKey)||e.ctrlKey&&e.altKey){if(e.char&&1<e.char.length)return e.char;if(e.which)return String.fromCharCode(e.which)}return null;case"compositionend":return F0&&e.locale!=="ko"?null:e.data;default:return null}}var jS={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function sy(t){var e=t&&t.nodeName&&t.nodeName.toLowerCase();return e==="input"?!!jS[t.type]:e==="textarea"}function $0(t,e,n,r){w0(r),e=cu(e,"onChange"),0<e.length&&(n=new Qf("onChange","change",null,n,r),t.push({event:n,listeners:e}))}var Oo=null,Zo=null;function US(t){ew(t,0)}function Zu(t){var e=Ys(t);if(f0(e))return t}function FS(t,e){if(t==="change")return e}var q0=!1;if(zn){var xh;if(zn){var Ih="oninput"in document;if(!Ih){var iy=document.createElement("div");iy.setAttribute("oninput","return;"),Ih=typeof iy.oninput=="function"}xh=Ih}else xh=!1;q0=xh&&(!document.documentMode||9<document.documentMode)}function oy(){Oo&&(Oo.detachEvent("onpropertychange",H0),Zo=Oo=null)}function H0(t){if(t.propertyName==="value"&&Zu(Zo)){var e=[];$0(e,Zo,t,$f(t)),I0(US,e)}}function zS(t,e,n){t==="focusin"?(oy(),Oo=e,Zo=n,Oo.attachEvent("onpropertychange",H0)):t==="focusout"&&oy()}function BS(t){if(t==="selectionchange"||t==="keyup"||t==="keydown")return Zu(Zo)}function $S(t,e){if(t==="click")return Zu(e)}function qS(t,e){if(t==="input"||t==="change")return Zu(e)}function HS(t,e){return t===e&&(t!==0||1/t===1/e)||t!==t&&e!==e}var sn=typeof Object.is=="function"?Object.is:HS;function ea(t,e){if(sn(t,e))return!0;if(typeof t!="object"||t===null||typeof e!="object"||e===null)return!1;var n=Object.keys(t),r=Object.keys(e);if(n.length!==r.length)return!1;for(r=0;r<n.length;r++){var s=n[r];if(!od.call(e,s)||!sn(t[s],e[s]))return!1}return!0}function ay(t){for(;t&&t.firstChild;)t=t.firstChild;return t}function ly(t,e){var n=ay(t);t=0;for(var r;n;){if(n.nodeType===3){if(r=t+n.textContent.length,t<=e&&r>=e)return{node:n,offset:e-t};t=r}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=ay(n)}}function W0(t,e){return t&&e?t===e?!0:t&&t.nodeType===3?!1:e&&e.nodeType===3?W0(t,e.parentNode):"contains"in t?t.contains(e):t.compareDocumentPosition?!!(t.compareDocumentPosition(e)&16):!1:!1}function G0(){for(var t=window,e=ru();e instanceof t.HTMLIFrameElement;){try{var n=typeof e.contentWindow.location.href=="string"}catch{n=!1}if(n)t=e.contentWindow;else break;e=ru(t.document)}return e}function Jf(t){var e=t&&t.nodeName&&t.nodeName.toLowerCase();return e&&(e==="input"&&(t.type==="text"||t.type==="search"||t.type==="tel"||t.type==="url"||t.type==="password")||e==="textarea"||t.contentEditable==="true")}function WS(t){var e=G0(),n=t.focusedElem,r=t.selectionRange;if(e!==n&&n&&n.ownerDocument&&W0(n.ownerDocument.documentElement,n)){if(r!==null&&Jf(n)){if(e=r.start,t=r.end,t===void 0&&(t=e),"selectionStart"in n)n.selectionStart=e,n.selectionEnd=Math.min(t,n.value.length);else if(t=(e=n.ownerDocument||document)&&e.defaultView||window,t.getSelection){t=t.getSelection();var s=n.textContent.length,i=Math.min(r.start,s);r=r.end===void 0?i:Math.min(r.end,s),!t.extend&&i>r&&(s=r,r=i,i=s),s=ly(n,i);var o=ly(n,r);s&&o&&(t.rangeCount!==1||t.anchorNode!==s.node||t.anchorOffset!==s.offset||t.focusNode!==o.node||t.focusOffset!==o.offset)&&(e=e.createRange(),e.setStart(s.node,s.offset),t.removeAllRanges(),i>r?(t.addRange(e),t.extend(o.node,o.offset)):(e.setEnd(o.node,o.offset),t.addRange(e)))}}for(e=[],t=n;t=t.parentNode;)t.nodeType===1&&e.push({element:t,left:t.scrollLeft,top:t.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<e.length;n++)t=e[n],t.element.scrollLeft=t.left,t.element.scrollTop=t.top}}var GS=zn&&"documentMode"in document&&11>=document.documentMode,Qs=null,Sd=null,Vo=null,kd=!1;function uy(t,e,n){var r=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;kd||Qs==null||Qs!==ru(r)||(r=Qs,"selectionStart"in r&&Jf(r)?r={start:r.selectionStart,end:r.selectionEnd}:(r=(r.ownerDocument&&r.ownerDocument.defaultView||window).getSelection(),r={anchorNode:r.anchorNode,anchorOffset:r.anchorOffset,focusNode:r.focusNode,focusOffset:r.focusOffset}),Vo&&ea(Vo,r)||(Vo=r,r=cu(Sd,"onSelect"),0<r.length&&(e=new Qf("onSelect","select",null,e,n),t.push({event:e,listeners:r}),e.target=Qs)))}function ml(t,e){var n={};return n[t.toLowerCase()]=e.toLowerCase(),n["Webkit"+t]="webkit"+e,n["Moz"+t]="moz"+e,n}var Xs={animationend:ml("Animation","AnimationEnd"),animationiteration:ml("Animation","AnimationIteration"),animationstart:ml("Animation","AnimationStart"),transitionend:ml("Transition","TransitionEnd")},Sh={},K0={};zn&&(K0=document.createElement("div").style,"AnimationEvent"in window||(delete Xs.animationend.animation,delete Xs.animationiteration.animation,delete Xs.animationstart.animation),"TransitionEvent"in window||delete Xs.transitionend.transition);function ec(t){if(Sh[t])return Sh[t];if(!Xs[t])return t;var e=Xs[t],n;for(n in e)if(e.hasOwnProperty(n)&&n in K0)return Sh[t]=e[n];return t}var Q0=ec("animationend"),X0=ec("animationiteration"),Y0=ec("animationstart"),J0=ec("transitionend"),Z0=new Map,cy="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Hr(t,e){Z0.set(t,e),Cs(e,[t])}for(var kh=0;kh<cy.length;kh++){var Ch=cy[kh],KS=Ch.toLowerCase(),QS=Ch[0].toUpperCase()+Ch.slice(1);Hr(KS,"on"+QS)}Hr(Q0,"onAnimationEnd");Hr(X0,"onAnimationIteration");Hr(Y0,"onAnimationStart");Hr("dblclick","onDoubleClick");Hr("focusin","onFocus");Hr("focusout","onBlur");Hr(J0,"onTransitionEnd");gi("onMouseEnter",["mouseout","mouseover"]);gi("onMouseLeave",["mouseout","mouseover"]);gi("onPointerEnter",["pointerout","pointerover"]);gi("onPointerLeave",["pointerout","pointerover"]);Cs("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));Cs("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));Cs("onBeforeInput",["compositionend","keypress","textInput","paste"]);Cs("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));Cs("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));Cs("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var So="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),XS=new Set("cancel close invalid load scroll toggle".split(" ").concat(So));function hy(t,e,n){var r=t.type||"unknown-event";t.currentTarget=n,K1(r,e,void 0,t),t.currentTarget=null}function ew(t,e){e=(e&4)!==0;for(var n=0;n<t.length;n++){var r=t[n],s=r.event;r=r.listeners;e:{var i=void 0;if(e)for(var o=r.length-1;0<=o;o--){var l=r[o],u=l.instance,c=l.currentTarget;if(l=l.listener,u!==i&&s.isPropagationStopped())break e;hy(s,l,c),i=u}else for(o=0;o<r.length;o++){if(l=r[o],u=l.instance,c=l.currentTarget,l=l.listener,u!==i&&s.isPropagationStopped())break e;hy(s,l,c),i=u}}}if(iu)throw t=Ed,iu=!1,Ed=null,t}function ge(t,e){var n=e[Pd];n===void 0&&(n=e[Pd]=new Set);var r=t+"__bubble";n.has(r)||(tw(e,t,2,!1),n.add(r))}function Ah(t,e,n){var r=0;e&&(r|=4),tw(n,t,r,e)}var gl="_reactListening"+Math.random().toString(36).slice(2);function ta(t){if(!t[gl]){t[gl]=!0,l0.forEach(function(n){n!=="selectionchange"&&(XS.has(n)||Ah(n,!1,t),Ah(n,!0,t))});var e=t.nodeType===9?t:t.ownerDocument;e===null||e[gl]||(e[gl]=!0,Ah("selectionchange",!1,e))}}function tw(t,e,n,r){switch(j0(e)){case 1:var s=cS;break;case 4:s=hS;break;default:s=Gf}n=s.bind(null,e,n,t),s=void 0,!wd||e!=="touchstart"&&e!=="touchmove"&&e!=="wheel"||(s=!0),r?s!==void 0?t.addEventListener(e,n,{capture:!0,passive:s}):t.addEventListener(e,n,!0):s!==void 0?t.addEventListener(e,n,{passive:s}):t.addEventListener(e,n,!1)}function Rh(t,e,n,r,s){var i=r;if(!(e&1)&&!(e&2)&&r!==null)e:for(;;){if(r===null)return;var o=r.tag;if(o===3||o===4){var l=r.stateNode.containerInfo;if(l===s||l.nodeType===8&&l.parentNode===s)break;if(o===4)for(o=r.return;o!==null;){var u=o.tag;if((u===3||u===4)&&(u=o.stateNode.containerInfo,u===s||u.nodeType===8&&u.parentNode===s))return;o=o.return}for(;l!==null;){if(o=us(l),o===null)return;if(u=o.tag,u===5||u===6){r=i=o;continue e}l=l.parentNode}}r=r.return}I0(function(){var c=i,f=$f(n),p=[];e:{var g=Z0.get(t);if(g!==void 0){var w=Qf,x=t;switch(t){case"keypress":if(jl(n)===0)break e;case"keydown":case"keyup":w=kS;break;case"focusin":x="focus",w=Th;break;case"focusout":x="blur",w=Th;break;case"beforeblur":case"afterblur":w=Th;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":w=Zg;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":w=pS;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":w=RS;break;case Q0:case X0:case Y0:w=yS;break;case J0:w=PS;break;case"scroll":w=dS;break;case"wheel":w=DS;break;case"copy":case"cut":case"paste":w=vS;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":w=ty}var b=(e&4)!==0,P=!b&&t==="scroll",S=b?g!==null?g+"Capture":null:g;b=[];for(var v=c,C;v!==null;){C=v;var D=C.stateNode;if(C.tag===5&&D!==null&&(C=D,S!==null&&(D=Qo(v,S),D!=null&&b.push(na(v,D,C)))),P)break;v=v.return}0<b.length&&(g=new w(g,x,null,n,f),p.push({event:g,listeners:b}))}}if(!(e&7)){e:{if(g=t==="mouseover"||t==="pointerover",w=t==="mouseout"||t==="pointerout",g&&n!==_d&&(x=n.relatedTarget||n.fromElement)&&(us(x)||x[Bn]))break e;if((w||g)&&(g=f.window===f?f:(g=f.ownerDocument)?g.defaultView||g.parentWindow:window,w?(x=n.relatedTarget||n.toElement,w=c,x=x?us(x):null,x!==null&&(P=As(x),x!==P||x.tag!==5&&x.tag!==6)&&(x=null)):(w=null,x=c),w!==x)){if(b=Zg,D="onMouseLeave",S="onMouseEnter",v="mouse",(t==="pointerout"||t==="pointerover")&&(b=ty,D="onPointerLeave",S="onPointerEnter",v="pointer"),P=w==null?g:Ys(w),C=x==null?g:Ys(x),g=new b(D,v+"leave",w,n,f),g.target=P,g.relatedTarget=C,D=null,us(f)===c&&(b=new b(S,v+"enter",x,n,f),b.target=C,b.relatedTarget=P,D=b),P=D,w&&x)t:{for(b=w,S=x,v=0,C=b;C;C=Fs(C))v++;for(C=0,D=S;D;D=Fs(D))C++;for(;0<v-C;)b=Fs(b),v--;for(;0<C-v;)S=Fs(S),C--;for(;v--;){if(b===S||S!==null&&b===S.alternate)break t;b=Fs(b),S=Fs(S)}b=null}else b=null;w!==null&&dy(p,g,w,b,!1),x!==null&&P!==null&&dy(p,P,x,b,!0)}}e:{if(g=c?Ys(c):window,w=g.nodeName&&g.nodeName.toLowerCase(),w==="select"||w==="input"&&g.type==="file")var j=FS;else if(sy(g))if(q0)j=qS;else{j=BS;var L=zS}else(w=g.nodeName)&&w.toLowerCase()==="input"&&(g.type==="checkbox"||g.type==="radio")&&(j=$S);if(j&&(j=j(t,c))){$0(p,j,n,f);break e}L&&L(t,g,c),t==="focusout"&&(L=g._wrapperState)&&L.controlled&&g.type==="number"&&fd(g,"number",g.value)}switch(L=c?Ys(c):window,t){case"focusin":(sy(L)||L.contentEditable==="true")&&(Qs=L,Sd=c,Vo=null);break;case"focusout":Vo=Sd=Qs=null;break;case"mousedown":kd=!0;break;case"contextmenu":case"mouseup":case"dragend":kd=!1,uy(p,n,f);break;case"selectionchange":if(GS)break;case"keydown":case"keyup":uy(p,n,f)}var E;if(Yf)e:{switch(t){case"compositionstart":var _="onCompositionStart";break e;case"compositionend":_="onCompositionEnd";break e;case"compositionupdate":_="onCompositionUpdate";break e}_=void 0}else Ks?z0(t,n)&&(_="onCompositionEnd"):t==="keydown"&&n.keyCode===229&&(_="onCompositionStart");_&&(F0&&n.locale!=="ko"&&(Ks||_!=="onCompositionStart"?_==="onCompositionEnd"&&Ks&&(E=U0()):(pr=f,Kf="value"in pr?pr.value:pr.textContent,Ks=!0)),L=cu(c,_),0<L.length&&(_=new ey(_,t,null,n,f),p.push({event:_,listeners:L}),E?_.data=E:(E=B0(n),E!==null&&(_.data=E)))),(E=VS?LS(t,n):MS(t,n))&&(c=cu(c,"onBeforeInput"),0<c.length&&(f=new ey("onBeforeInput","beforeinput",null,n,f),p.push({event:f,listeners:c}),f.data=E))}ew(p,e)})}function na(t,e,n){return{instance:t,listener:e,currentTarget:n}}function cu(t,e){for(var n=e+"Capture",r=[];t!==null;){var s=t,i=s.stateNode;s.tag===5&&i!==null&&(s=i,i=Qo(t,n),i!=null&&r.unshift(na(t,i,s)),i=Qo(t,e),i!=null&&r.push(na(t,i,s))),t=t.return}return r}function Fs(t){if(t===null)return null;do t=t.return;while(t&&t.tag!==5);return t||null}function dy(t,e,n,r,s){for(var i=e._reactName,o=[];n!==null&&n!==r;){var l=n,u=l.alternate,c=l.stateNode;if(u!==null&&u===r)break;l.tag===5&&c!==null&&(l=c,s?(u=Qo(n,i),u!=null&&o.unshift(na(n,u,l))):s||(u=Qo(n,i),u!=null&&o.push(na(n,u,l)))),n=n.return}o.length!==0&&t.push({event:e,listeners:o})}var YS=/\r\n?/g,JS=/\u0000|\uFFFD/g;function fy(t){return(typeof t=="string"?t:""+t).replace(YS,`
`).replace(JS,"")}function yl(t,e,n){if(e=fy(e),fy(t)!==e&&n)throw Error(F(425))}function hu(){}var Cd=null,Ad=null;function Rd(t,e){return t==="textarea"||t==="noscript"||typeof e.children=="string"||typeof e.children=="number"||typeof e.dangerouslySetInnerHTML=="object"&&e.dangerouslySetInnerHTML!==null&&e.dangerouslySetInnerHTML.__html!=null}var bd=typeof setTimeout=="function"?setTimeout:void 0,ZS=typeof clearTimeout=="function"?clearTimeout:void 0,py=typeof Promise=="function"?Promise:void 0,ek=typeof queueMicrotask=="function"?queueMicrotask:typeof py<"u"?function(t){return py.resolve(null).then(t).catch(tk)}:bd;function tk(t){setTimeout(function(){throw t})}function bh(t,e){var n=e,r=0;do{var s=n.nextSibling;if(t.removeChild(n),s&&s.nodeType===8)if(n=s.data,n==="/$"){if(r===0){t.removeChild(s),Jo(e);return}r--}else n!=="$"&&n!=="$?"&&n!=="$!"||r++;n=s}while(n);Jo(e)}function wr(t){for(;t!=null;t=t.nextSibling){var e=t.nodeType;if(e===1||e===3)break;if(e===8){if(e=t.data,e==="$"||e==="$!"||e==="$?")break;if(e==="/$")return null}}return t}function my(t){t=t.previousSibling;for(var e=0;t;){if(t.nodeType===8){var n=t.data;if(n==="$"||n==="$!"||n==="$?"){if(e===0)return t;e--}else n==="/$"&&e++}t=t.previousSibling}return null}var Oi=Math.random().toString(36).slice(2),pn="__reactFiber$"+Oi,ra="__reactProps$"+Oi,Bn="__reactContainer$"+Oi,Pd="__reactEvents$"+Oi,nk="__reactListeners$"+Oi,rk="__reactHandles$"+Oi;function us(t){var e=t[pn];if(e)return e;for(var n=t.parentNode;n;){if(e=n[Bn]||n[pn]){if(n=e.alternate,e.child!==null||n!==null&&n.child!==null)for(t=my(t);t!==null;){if(n=t[pn])return n;t=my(t)}return e}t=n,n=t.parentNode}return null}function Ra(t){return t=t[pn]||t[Bn],!t||t.tag!==5&&t.tag!==6&&t.tag!==13&&t.tag!==3?null:t}function Ys(t){if(t.tag===5||t.tag===6)return t.stateNode;throw Error(F(33))}function tc(t){return t[ra]||null}var Nd=[],Js=-1;function Wr(t){return{current:t}}function ye(t){0>Js||(t.current=Nd[Js],Nd[Js]=null,Js--)}function pe(t,e){Js++,Nd[Js]=t.current,t.current=e}var Dr={},lt=Wr(Dr),xt=Wr(!1),ys=Dr;function yi(t,e){var n=t.type.contextTypes;if(!n)return Dr;var r=t.stateNode;if(r&&r.__reactInternalMemoizedUnmaskedChildContext===e)return r.__reactInternalMemoizedMaskedChildContext;var s={},i;for(i in n)s[i]=e[i];return r&&(t=t.stateNode,t.__reactInternalMemoizedUnmaskedChildContext=e,t.__reactInternalMemoizedMaskedChildContext=s),s}function It(t){return t=t.childContextTypes,t!=null}function du(){ye(xt),ye(lt)}function gy(t,e,n){if(lt.current!==Dr)throw Error(F(168));pe(lt,e),pe(xt,n)}function nw(t,e,n){var r=t.stateNode;if(e=e.childContextTypes,typeof r.getChildContext!="function")return n;r=r.getChildContext();for(var s in r)if(!(s in e))throw Error(F(108,z1(t)||"Unknown",s));return Ce({},n,r)}function fu(t){return t=(t=t.stateNode)&&t.__reactInternalMemoizedMergedChildContext||Dr,ys=lt.current,pe(lt,t),pe(xt,xt.current),!0}function yy(t,e,n){var r=t.stateNode;if(!r)throw Error(F(169));n?(t=nw(t,e,ys),r.__reactInternalMemoizedMergedChildContext=t,ye(xt),ye(lt),pe(lt,t)):ye(xt),pe(xt,n)}var An=null,nc=!1,Ph=!1;function rw(t){An===null?An=[t]:An.push(t)}function sk(t){nc=!0,rw(t)}function Gr(){if(!Ph&&An!==null){Ph=!0;var t=0,e=ue;try{var n=An;for(ue=1;t<n.length;t++){var r=n[t];do r=r(!0);while(r!==null)}An=null,nc=!1}catch(s){throw An!==null&&(An=An.slice(t+1)),A0(qf,Gr),s}finally{ue=e,Ph=!1}}return null}var Zs=[],ei=0,pu=null,mu=0,Ut=[],Ft=0,_s=null,Pn=1,Nn="";function os(t,e){Zs[ei++]=mu,Zs[ei++]=pu,pu=t,mu=e}function sw(t,e,n){Ut[Ft++]=Pn,Ut[Ft++]=Nn,Ut[Ft++]=_s,_s=t;var r=Pn;t=Nn;var s=32-en(r)-1;r&=~(1<<s),n+=1;var i=32-en(e)+s;if(30<i){var o=s-s%5;i=(r&(1<<o)-1).toString(32),r>>=o,s-=o,Pn=1<<32-en(e)+s|n<<s|r,Nn=i+t}else Pn=1<<i|n<<s|r,Nn=t}function Zf(t){t.return!==null&&(os(t,1),sw(t,1,0))}function ep(t){for(;t===pu;)pu=Zs[--ei],Zs[ei]=null,mu=Zs[--ei],Zs[ei]=null;for(;t===_s;)_s=Ut[--Ft],Ut[Ft]=null,Nn=Ut[--Ft],Ut[Ft]=null,Pn=Ut[--Ft],Ut[Ft]=null}var Dt=null,bt=null,we=!1,Jt=null;function iw(t,e){var n=zt(5,null,null,0);n.elementType="DELETED",n.stateNode=e,n.return=t,e=t.deletions,e===null?(t.deletions=[n],t.flags|=16):e.push(n)}function _y(t,e){switch(t.tag){case 5:var n=t.type;return e=e.nodeType!==1||n.toLowerCase()!==e.nodeName.toLowerCase()?null:e,e!==null?(t.stateNode=e,Dt=t,bt=wr(e.firstChild),!0):!1;case 6:return e=t.pendingProps===""||e.nodeType!==3?null:e,e!==null?(t.stateNode=e,Dt=t,bt=null,!0):!1;case 13:return e=e.nodeType!==8?null:e,e!==null?(n=_s!==null?{id:Pn,overflow:Nn}:null,t.memoizedState={dehydrated:e,treeContext:n,retryLane:1073741824},n=zt(18,null,null,0),n.stateNode=e,n.return=t,t.child=n,Dt=t,bt=null,!0):!1;default:return!1}}function Dd(t){return(t.mode&1)!==0&&(t.flags&128)===0}function Od(t){if(we){var e=bt;if(e){var n=e;if(!_y(t,e)){if(Dd(t))throw Error(F(418));e=wr(n.nextSibling);var r=Dt;e&&_y(t,e)?iw(r,n):(t.flags=t.flags&-4097|2,we=!1,Dt=t)}}else{if(Dd(t))throw Error(F(418));t.flags=t.flags&-4097|2,we=!1,Dt=t}}}function vy(t){for(t=t.return;t!==null&&t.tag!==5&&t.tag!==3&&t.tag!==13;)t=t.return;Dt=t}function _l(t){if(t!==Dt)return!1;if(!we)return vy(t),we=!0,!1;var e;if((e=t.tag!==3)&&!(e=t.tag!==5)&&(e=t.type,e=e!=="head"&&e!=="body"&&!Rd(t.type,t.memoizedProps)),e&&(e=bt)){if(Dd(t))throw ow(),Error(F(418));for(;e;)iw(t,e),e=wr(e.nextSibling)}if(vy(t),t.tag===13){if(t=t.memoizedState,t=t!==null?t.dehydrated:null,!t)throw Error(F(317));e:{for(t=t.nextSibling,e=0;t;){if(t.nodeType===8){var n=t.data;if(n==="/$"){if(e===0){bt=wr(t.nextSibling);break e}e--}else n!=="$"&&n!=="$!"&&n!=="$?"||e++}t=t.nextSibling}bt=null}}else bt=Dt?wr(t.stateNode.nextSibling):null;return!0}function ow(){for(var t=bt;t;)t=wr(t.nextSibling)}function _i(){bt=Dt=null,we=!1}function tp(t){Jt===null?Jt=[t]:Jt.push(t)}var ik=Qn.ReactCurrentBatchConfig;function yo(t,e,n){if(t=n.ref,t!==null&&typeof t!="function"&&typeof t!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(F(309));var r=n.stateNode}if(!r)throw Error(F(147,t));var s=r,i=""+t;return e!==null&&e.ref!==null&&typeof e.ref=="function"&&e.ref._stringRef===i?e.ref:(e=function(o){var l=s.refs;o===null?delete l[i]:l[i]=o},e._stringRef=i,e)}if(typeof t!="string")throw Error(F(284));if(!n._owner)throw Error(F(290,t))}return t}function vl(t,e){throw t=Object.prototype.toString.call(e),Error(F(31,t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t))}function wy(t){var e=t._init;return e(t._payload)}function aw(t){function e(S,v){if(t){var C=S.deletions;C===null?(S.deletions=[v],S.flags|=16):C.push(v)}}function n(S,v){if(!t)return null;for(;v!==null;)e(S,v),v=v.sibling;return null}function r(S,v){for(S=new Map;v!==null;)v.key!==null?S.set(v.key,v):S.set(v.index,v),v=v.sibling;return S}function s(S,v){return S=Ir(S,v),S.index=0,S.sibling=null,S}function i(S,v,C){return S.index=C,t?(C=S.alternate,C!==null?(C=C.index,C<v?(S.flags|=2,v):C):(S.flags|=2,v)):(S.flags|=1048576,v)}function o(S){return t&&S.alternate===null&&(S.flags|=2),S}function l(S,v,C,D){return v===null||v.tag!==6?(v=jh(C,S.mode,D),v.return=S,v):(v=s(v,C),v.return=S,v)}function u(S,v,C,D){var j=C.type;return j===Gs?f(S,v,C.props.children,D,C.key):v!==null&&(v.elementType===j||typeof j=="object"&&j!==null&&j.$$typeof===or&&wy(j)===v.type)?(D=s(v,C.props),D.ref=yo(S,v,C),D.return=S,D):(D=Hl(C.type,C.key,C.props,null,S.mode,D),D.ref=yo(S,v,C),D.return=S,D)}function c(S,v,C,D){return v===null||v.tag!==4||v.stateNode.containerInfo!==C.containerInfo||v.stateNode.implementation!==C.implementation?(v=Uh(C,S.mode,D),v.return=S,v):(v=s(v,C.children||[]),v.return=S,v)}function f(S,v,C,D,j){return v===null||v.tag!==7?(v=ms(C,S.mode,D,j),v.return=S,v):(v=s(v,C),v.return=S,v)}function p(S,v,C){if(typeof v=="string"&&v!==""||typeof v=="number")return v=jh(""+v,S.mode,C),v.return=S,v;if(typeof v=="object"&&v!==null){switch(v.$$typeof){case ll:return C=Hl(v.type,v.key,v.props,null,S.mode,C),C.ref=yo(S,null,v),C.return=S,C;case Ws:return v=Uh(v,S.mode,C),v.return=S,v;case or:var D=v._init;return p(S,D(v._payload),C)}if(xo(v)||ho(v))return v=ms(v,S.mode,C,null),v.return=S,v;vl(S,v)}return null}function g(S,v,C,D){var j=v!==null?v.key:null;if(typeof C=="string"&&C!==""||typeof C=="number")return j!==null?null:l(S,v,""+C,D);if(typeof C=="object"&&C!==null){switch(C.$$typeof){case ll:return C.key===j?u(S,v,C,D):null;case Ws:return C.key===j?c(S,v,C,D):null;case or:return j=C._init,g(S,v,j(C._payload),D)}if(xo(C)||ho(C))return j!==null?null:f(S,v,C,D,null);vl(S,C)}return null}function w(S,v,C,D,j){if(typeof D=="string"&&D!==""||typeof D=="number")return S=S.get(C)||null,l(v,S,""+D,j);if(typeof D=="object"&&D!==null){switch(D.$$typeof){case ll:return S=S.get(D.key===null?C:D.key)||null,u(v,S,D,j);case Ws:return S=S.get(D.key===null?C:D.key)||null,c(v,S,D,j);case or:var L=D._init;return w(S,v,C,L(D._payload),j)}if(xo(D)||ho(D))return S=S.get(C)||null,f(v,S,D,j,null);vl(v,D)}return null}function x(S,v,C,D){for(var j=null,L=null,E=v,_=v=0,I=null;E!==null&&_<C.length;_++){E.index>_?(I=E,E=null):I=E.sibling;var R=g(S,E,C[_],D);if(R===null){E===null&&(E=I);break}t&&E&&R.alternate===null&&e(S,E),v=i(R,v,_),L===null?j=R:L.sibling=R,L=R,E=I}if(_===C.length)return n(S,E),we&&os(S,_),j;if(E===null){for(;_<C.length;_++)E=p(S,C[_],D),E!==null&&(v=i(E,v,_),L===null?j=E:L.sibling=E,L=E);return we&&os(S,_),j}for(E=r(S,E);_<C.length;_++)I=w(E,S,_,C[_],D),I!==null&&(t&&I.alternate!==null&&E.delete(I.key===null?_:I.key),v=i(I,v,_),L===null?j=I:L.sibling=I,L=I);return t&&E.forEach(function(T){return e(S,T)}),we&&os(S,_),j}function b(S,v,C,D){var j=ho(C);if(typeof j!="function")throw Error(F(150));if(C=j.call(C),C==null)throw Error(F(151));for(var L=j=null,E=v,_=v=0,I=null,R=C.next();E!==null&&!R.done;_++,R=C.next()){E.index>_?(I=E,E=null):I=E.sibling;var T=g(S,E,R.value,D);if(T===null){E===null&&(E=I);break}t&&E&&T.alternate===null&&e(S,E),v=i(T,v,_),L===null?j=T:L.sibling=T,L=T,E=I}if(R.done)return n(S,E),we&&os(S,_),j;if(E===null){for(;!R.done;_++,R=C.next())R=p(S,R.value,D),R!==null&&(v=i(R,v,_),L===null?j=R:L.sibling=R,L=R);return we&&os(S,_),j}for(E=r(S,E);!R.done;_++,R=C.next())R=w(E,S,_,R.value,D),R!==null&&(t&&R.alternate!==null&&E.delete(R.key===null?_:R.key),v=i(R,v,_),L===null?j=R:L.sibling=R,L=R);return t&&E.forEach(function(A){return e(S,A)}),we&&os(S,_),j}function P(S,v,C,D){if(typeof C=="object"&&C!==null&&C.type===Gs&&C.key===null&&(C=C.props.children),typeof C=="object"&&C!==null){switch(C.$$typeof){case ll:e:{for(var j=C.key,L=v;L!==null;){if(L.key===j){if(j=C.type,j===Gs){if(L.tag===7){n(S,L.sibling),v=s(L,C.props.children),v.return=S,S=v;break e}}else if(L.elementType===j||typeof j=="object"&&j!==null&&j.$$typeof===or&&wy(j)===L.type){n(S,L.sibling),v=s(L,C.props),v.ref=yo(S,L,C),v.return=S,S=v;break e}n(S,L);break}else e(S,L);L=L.sibling}C.type===Gs?(v=ms(C.props.children,S.mode,D,C.key),v.return=S,S=v):(D=Hl(C.type,C.key,C.props,null,S.mode,D),D.ref=yo(S,v,C),D.return=S,S=D)}return o(S);case Ws:e:{for(L=C.key;v!==null;){if(v.key===L)if(v.tag===4&&v.stateNode.containerInfo===C.containerInfo&&v.stateNode.implementation===C.implementation){n(S,v.sibling),v=s(v,C.children||[]),v.return=S,S=v;break e}else{n(S,v);break}else e(S,v);v=v.sibling}v=Uh(C,S.mode,D),v.return=S,S=v}return o(S);case or:return L=C._init,P(S,v,L(C._payload),D)}if(xo(C))return x(S,v,C,D);if(ho(C))return b(S,v,C,D);vl(S,C)}return typeof C=="string"&&C!==""||typeof C=="number"?(C=""+C,v!==null&&v.tag===6?(n(S,v.sibling),v=s(v,C),v.return=S,S=v):(n(S,v),v=jh(C,S.mode,D),v.return=S,S=v),o(S)):n(S,v)}return P}var vi=aw(!0),lw=aw(!1),gu=Wr(null),yu=null,ti=null,np=null;function rp(){np=ti=yu=null}function sp(t){var e=gu.current;ye(gu),t._currentValue=e}function Vd(t,e,n){for(;t!==null;){var r=t.alternate;if((t.childLanes&e)!==e?(t.childLanes|=e,r!==null&&(r.childLanes|=e)):r!==null&&(r.childLanes&e)!==e&&(r.childLanes|=e),t===n)break;t=t.return}}function ui(t,e){yu=t,np=ti=null,t=t.dependencies,t!==null&&t.firstContext!==null&&(t.lanes&e&&(Tt=!0),t.firstContext=null)}function qt(t){var e=t._currentValue;if(np!==t)if(t={context:t,memoizedValue:e,next:null},ti===null){if(yu===null)throw Error(F(308));ti=t,yu.dependencies={lanes:0,firstContext:t}}else ti=ti.next=t;return e}var cs=null;function ip(t){cs===null?cs=[t]:cs.push(t)}function uw(t,e,n,r){var s=e.interleaved;return s===null?(n.next=n,ip(e)):(n.next=s.next,s.next=n),e.interleaved=n,$n(t,r)}function $n(t,e){t.lanes|=e;var n=t.alternate;for(n!==null&&(n.lanes|=e),n=t,t=t.return;t!==null;)t.childLanes|=e,n=t.alternate,n!==null&&(n.childLanes|=e),n=t,t=t.return;return n.tag===3?n.stateNode:null}var ar=!1;function op(t){t.updateQueue={baseState:t.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function cw(t,e){t=t.updateQueue,e.updateQueue===t&&(e.updateQueue={baseState:t.baseState,firstBaseUpdate:t.firstBaseUpdate,lastBaseUpdate:t.lastBaseUpdate,shared:t.shared,effects:t.effects})}function Ln(t,e){return{eventTime:t,lane:e,tag:0,payload:null,callback:null,next:null}}function Er(t,e,n){var r=t.updateQueue;if(r===null)return null;if(r=r.shared,ae&2){var s=r.pending;return s===null?e.next=e:(e.next=s.next,s.next=e),r.pending=e,$n(t,n)}return s=r.interleaved,s===null?(e.next=e,ip(r)):(e.next=s.next,s.next=e),r.interleaved=e,$n(t,n)}function Ul(t,e,n){if(e=e.updateQueue,e!==null&&(e=e.shared,(n&4194240)!==0)){var r=e.lanes;r&=t.pendingLanes,n|=r,e.lanes=n,Hf(t,n)}}function Ey(t,e){var n=t.updateQueue,r=t.alternate;if(r!==null&&(r=r.updateQueue,n===r)){var s=null,i=null;if(n=n.firstBaseUpdate,n!==null){do{var o={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};i===null?s=i=o:i=i.next=o,n=n.next}while(n!==null);i===null?s=i=e:i=i.next=e}else s=i=e;n={baseState:r.baseState,firstBaseUpdate:s,lastBaseUpdate:i,shared:r.shared,effects:r.effects},t.updateQueue=n;return}t=n.lastBaseUpdate,t===null?n.firstBaseUpdate=e:t.next=e,n.lastBaseUpdate=e}function _u(t,e,n,r){var s=t.updateQueue;ar=!1;var i=s.firstBaseUpdate,o=s.lastBaseUpdate,l=s.shared.pending;if(l!==null){s.shared.pending=null;var u=l,c=u.next;u.next=null,o===null?i=c:o.next=c,o=u;var f=t.alternate;f!==null&&(f=f.updateQueue,l=f.lastBaseUpdate,l!==o&&(l===null?f.firstBaseUpdate=c:l.next=c,f.lastBaseUpdate=u))}if(i!==null){var p=s.baseState;o=0,f=c=u=null,l=i;do{var g=l.lane,w=l.eventTime;if((r&g)===g){f!==null&&(f=f.next={eventTime:w,lane:0,tag:l.tag,payload:l.payload,callback:l.callback,next:null});e:{var x=t,b=l;switch(g=e,w=n,b.tag){case 1:if(x=b.payload,typeof x=="function"){p=x.call(w,p,g);break e}p=x;break e;case 3:x.flags=x.flags&-65537|128;case 0:if(x=b.payload,g=typeof x=="function"?x.call(w,p,g):x,g==null)break e;p=Ce({},p,g);break e;case 2:ar=!0}}l.callback!==null&&l.lane!==0&&(t.flags|=64,g=s.effects,g===null?s.effects=[l]:g.push(l))}else w={eventTime:w,lane:g,tag:l.tag,payload:l.payload,callback:l.callback,next:null},f===null?(c=f=w,u=p):f=f.next=w,o|=g;if(l=l.next,l===null){if(l=s.shared.pending,l===null)break;g=l,l=g.next,g.next=null,s.lastBaseUpdate=g,s.shared.pending=null}}while(!0);if(f===null&&(u=p),s.baseState=u,s.firstBaseUpdate=c,s.lastBaseUpdate=f,e=s.shared.interleaved,e!==null){s=e;do o|=s.lane,s=s.next;while(s!==e)}else i===null&&(s.shared.lanes=0);ws|=o,t.lanes=o,t.memoizedState=p}}function Ty(t,e,n){if(t=e.effects,e.effects=null,t!==null)for(e=0;e<t.length;e++){var r=t[e],s=r.callback;if(s!==null){if(r.callback=null,r=n,typeof s!="function")throw Error(F(191,s));s.call(r)}}}var ba={},yn=Wr(ba),sa=Wr(ba),ia=Wr(ba);function hs(t){if(t===ba)throw Error(F(174));return t}function ap(t,e){switch(pe(ia,e),pe(sa,t),pe(yn,ba),t=e.nodeType,t){case 9:case 11:e=(e=e.documentElement)?e.namespaceURI:md(null,"");break;default:t=t===8?e.parentNode:e,e=t.namespaceURI||null,t=t.tagName,e=md(e,t)}ye(yn),pe(yn,e)}function wi(){ye(yn),ye(sa),ye(ia)}function hw(t){hs(ia.current);var e=hs(yn.current),n=md(e,t.type);e!==n&&(pe(sa,t),pe(yn,n))}function lp(t){sa.current===t&&(ye(yn),ye(sa))}var xe=Wr(0);function vu(t){for(var e=t;e!==null;){if(e.tag===13){var n=e.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return e}else if(e.tag===19&&e.memoizedProps.revealOrder!==void 0){if(e.flags&128)return e}else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break;for(;e.sibling===null;){if(e.return===null||e.return===t)return null;e=e.return}e.sibling.return=e.return,e=e.sibling}return null}var Nh=[];function up(){for(var t=0;t<Nh.length;t++)Nh[t]._workInProgressVersionPrimary=null;Nh.length=0}var Fl=Qn.ReactCurrentDispatcher,Dh=Qn.ReactCurrentBatchConfig,vs=0,Se=null,Ue=null,qe=null,wu=!1,Lo=!1,oa=0,ok=0;function tt(){throw Error(F(321))}function cp(t,e){if(e===null)return!1;for(var n=0;n<e.length&&n<t.length;n++)if(!sn(t[n],e[n]))return!1;return!0}function hp(t,e,n,r,s,i){if(vs=i,Se=e,e.memoizedState=null,e.updateQueue=null,e.lanes=0,Fl.current=t===null||t.memoizedState===null?ck:hk,t=n(r,s),Lo){i=0;do{if(Lo=!1,oa=0,25<=i)throw Error(F(301));i+=1,qe=Ue=null,e.updateQueue=null,Fl.current=dk,t=n(r,s)}while(Lo)}if(Fl.current=Eu,e=Ue!==null&&Ue.next!==null,vs=0,qe=Ue=Se=null,wu=!1,e)throw Error(F(300));return t}function dp(){var t=oa!==0;return oa=0,t}function dn(){var t={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return qe===null?Se.memoizedState=qe=t:qe=qe.next=t,qe}function Ht(){if(Ue===null){var t=Se.alternate;t=t!==null?t.memoizedState:null}else t=Ue.next;var e=qe===null?Se.memoizedState:qe.next;if(e!==null)qe=e,Ue=t;else{if(t===null)throw Error(F(310));Ue=t,t={memoizedState:Ue.memoizedState,baseState:Ue.baseState,baseQueue:Ue.baseQueue,queue:Ue.queue,next:null},qe===null?Se.memoizedState=qe=t:qe=qe.next=t}return qe}function aa(t,e){return typeof e=="function"?e(t):e}function Oh(t){var e=Ht(),n=e.queue;if(n===null)throw Error(F(311));n.lastRenderedReducer=t;var r=Ue,s=r.baseQueue,i=n.pending;if(i!==null){if(s!==null){var o=s.next;s.next=i.next,i.next=o}r.baseQueue=s=i,n.pending=null}if(s!==null){i=s.next,r=r.baseState;var l=o=null,u=null,c=i;do{var f=c.lane;if((vs&f)===f)u!==null&&(u=u.next={lane:0,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null}),r=c.hasEagerState?c.eagerState:t(r,c.action);else{var p={lane:f,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null};u===null?(l=u=p,o=r):u=u.next=p,Se.lanes|=f,ws|=f}c=c.next}while(c!==null&&c!==i);u===null?o=r:u.next=l,sn(r,e.memoizedState)||(Tt=!0),e.memoizedState=r,e.baseState=o,e.baseQueue=u,n.lastRenderedState=r}if(t=n.interleaved,t!==null){s=t;do i=s.lane,Se.lanes|=i,ws|=i,s=s.next;while(s!==t)}else s===null&&(n.lanes=0);return[e.memoizedState,n.dispatch]}function Vh(t){var e=Ht(),n=e.queue;if(n===null)throw Error(F(311));n.lastRenderedReducer=t;var r=n.dispatch,s=n.pending,i=e.memoizedState;if(s!==null){n.pending=null;var o=s=s.next;do i=t(i,o.action),o=o.next;while(o!==s);sn(i,e.memoizedState)||(Tt=!0),e.memoizedState=i,e.baseQueue===null&&(e.baseState=i),n.lastRenderedState=i}return[i,r]}function dw(){}function fw(t,e){var n=Se,r=Ht(),s=e(),i=!sn(r.memoizedState,s);if(i&&(r.memoizedState=s,Tt=!0),r=r.queue,fp(gw.bind(null,n,r,t),[t]),r.getSnapshot!==e||i||qe!==null&&qe.memoizedState.tag&1){if(n.flags|=2048,la(9,mw.bind(null,n,r,s,e),void 0,null),Ge===null)throw Error(F(349));vs&30||pw(n,e,s)}return s}function pw(t,e,n){t.flags|=16384,t={getSnapshot:e,value:n},e=Se.updateQueue,e===null?(e={lastEffect:null,stores:null},Se.updateQueue=e,e.stores=[t]):(n=e.stores,n===null?e.stores=[t]:n.push(t))}function mw(t,e,n,r){e.value=n,e.getSnapshot=r,yw(e)&&_w(t)}function gw(t,e,n){return n(function(){yw(e)&&_w(t)})}function yw(t){var e=t.getSnapshot;t=t.value;try{var n=e();return!sn(t,n)}catch{return!0}}function _w(t){var e=$n(t,1);e!==null&&tn(e,t,1,-1)}function xy(t){var e=dn();return typeof t=="function"&&(t=t()),e.memoizedState=e.baseState=t,t={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:aa,lastRenderedState:t},e.queue=t,t=t.dispatch=uk.bind(null,Se,t),[e.memoizedState,t]}function la(t,e,n,r){return t={tag:t,create:e,destroy:n,deps:r,next:null},e=Se.updateQueue,e===null?(e={lastEffect:null,stores:null},Se.updateQueue=e,e.lastEffect=t.next=t):(n=e.lastEffect,n===null?e.lastEffect=t.next=t:(r=n.next,n.next=t,t.next=r,e.lastEffect=t)),t}function vw(){return Ht().memoizedState}function zl(t,e,n,r){var s=dn();Se.flags|=t,s.memoizedState=la(1|e,n,void 0,r===void 0?null:r)}function rc(t,e,n,r){var s=Ht();r=r===void 0?null:r;var i=void 0;if(Ue!==null){var o=Ue.memoizedState;if(i=o.destroy,r!==null&&cp(r,o.deps)){s.memoizedState=la(e,n,i,r);return}}Se.flags|=t,s.memoizedState=la(1|e,n,i,r)}function Iy(t,e){return zl(8390656,8,t,e)}function fp(t,e){return rc(2048,8,t,e)}function ww(t,e){return rc(4,2,t,e)}function Ew(t,e){return rc(4,4,t,e)}function Tw(t,e){if(typeof e=="function")return t=t(),e(t),function(){e(null)};if(e!=null)return t=t(),e.current=t,function(){e.current=null}}function xw(t,e,n){return n=n!=null?n.concat([t]):null,rc(4,4,Tw.bind(null,e,t),n)}function pp(){}function Iw(t,e){var n=Ht();e=e===void 0?null:e;var r=n.memoizedState;return r!==null&&e!==null&&cp(e,r[1])?r[0]:(n.memoizedState=[t,e],t)}function Sw(t,e){var n=Ht();e=e===void 0?null:e;var r=n.memoizedState;return r!==null&&e!==null&&cp(e,r[1])?r[0]:(t=t(),n.memoizedState=[t,e],t)}function kw(t,e,n){return vs&21?(sn(n,e)||(n=P0(),Se.lanes|=n,ws|=n,t.baseState=!0),e):(t.baseState&&(t.baseState=!1,Tt=!0),t.memoizedState=n)}function ak(t,e){var n=ue;ue=n!==0&&4>n?n:4,t(!0);var r=Dh.transition;Dh.transition={};try{t(!1),e()}finally{ue=n,Dh.transition=r}}function Cw(){return Ht().memoizedState}function lk(t,e,n){var r=xr(t);if(n={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null},Aw(t))Rw(e,n);else if(n=uw(t,e,n,r),n!==null){var s=pt();tn(n,t,r,s),bw(n,e,r)}}function uk(t,e,n){var r=xr(t),s={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null};if(Aw(t))Rw(e,s);else{var i=t.alternate;if(t.lanes===0&&(i===null||i.lanes===0)&&(i=e.lastRenderedReducer,i!==null))try{var o=e.lastRenderedState,l=i(o,n);if(s.hasEagerState=!0,s.eagerState=l,sn(l,o)){var u=e.interleaved;u===null?(s.next=s,ip(e)):(s.next=u.next,u.next=s),e.interleaved=s;return}}catch{}finally{}n=uw(t,e,s,r),n!==null&&(s=pt(),tn(n,t,r,s),bw(n,e,r))}}function Aw(t){var e=t.alternate;return t===Se||e!==null&&e===Se}function Rw(t,e){Lo=wu=!0;var n=t.pending;n===null?e.next=e:(e.next=n.next,n.next=e),t.pending=e}function bw(t,e,n){if(n&4194240){var r=e.lanes;r&=t.pendingLanes,n|=r,e.lanes=n,Hf(t,n)}}var Eu={readContext:qt,useCallback:tt,useContext:tt,useEffect:tt,useImperativeHandle:tt,useInsertionEffect:tt,useLayoutEffect:tt,useMemo:tt,useReducer:tt,useRef:tt,useState:tt,useDebugValue:tt,useDeferredValue:tt,useTransition:tt,useMutableSource:tt,useSyncExternalStore:tt,useId:tt,unstable_isNewReconciler:!1},ck={readContext:qt,useCallback:function(t,e){return dn().memoizedState=[t,e===void 0?null:e],t},useContext:qt,useEffect:Iy,useImperativeHandle:function(t,e,n){return n=n!=null?n.concat([t]):null,zl(4194308,4,Tw.bind(null,e,t),n)},useLayoutEffect:function(t,e){return zl(4194308,4,t,e)},useInsertionEffect:function(t,e){return zl(4,2,t,e)},useMemo:function(t,e){var n=dn();return e=e===void 0?null:e,t=t(),n.memoizedState=[t,e],t},useReducer:function(t,e,n){var r=dn();return e=n!==void 0?n(e):e,r.memoizedState=r.baseState=e,t={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:t,lastRenderedState:e},r.queue=t,t=t.dispatch=lk.bind(null,Se,t),[r.memoizedState,t]},useRef:function(t){var e=dn();return t={current:t},e.memoizedState=t},useState:xy,useDebugValue:pp,useDeferredValue:function(t){return dn().memoizedState=t},useTransition:function(){var t=xy(!1),e=t[0];return t=ak.bind(null,t[1]),dn().memoizedState=t,[e,t]},useMutableSource:function(){},useSyncExternalStore:function(t,e,n){var r=Se,s=dn();if(we){if(n===void 0)throw Error(F(407));n=n()}else{if(n=e(),Ge===null)throw Error(F(349));vs&30||pw(r,e,n)}s.memoizedState=n;var i={value:n,getSnapshot:e};return s.queue=i,Iy(gw.bind(null,r,i,t),[t]),r.flags|=2048,la(9,mw.bind(null,r,i,n,e),void 0,null),n},useId:function(){var t=dn(),e=Ge.identifierPrefix;if(we){var n=Nn,r=Pn;n=(r&~(1<<32-en(r)-1)).toString(32)+n,e=":"+e+"R"+n,n=oa++,0<n&&(e+="H"+n.toString(32)),e+=":"}else n=ok++,e=":"+e+"r"+n.toString(32)+":";return t.memoizedState=e},unstable_isNewReconciler:!1},hk={readContext:qt,useCallback:Iw,useContext:qt,useEffect:fp,useImperativeHandle:xw,useInsertionEffect:ww,useLayoutEffect:Ew,useMemo:Sw,useReducer:Oh,useRef:vw,useState:function(){return Oh(aa)},useDebugValue:pp,useDeferredValue:function(t){var e=Ht();return kw(e,Ue.memoizedState,t)},useTransition:function(){var t=Oh(aa)[0],e=Ht().memoizedState;return[t,e]},useMutableSource:dw,useSyncExternalStore:fw,useId:Cw,unstable_isNewReconciler:!1},dk={readContext:qt,useCallback:Iw,useContext:qt,useEffect:fp,useImperativeHandle:xw,useInsertionEffect:ww,useLayoutEffect:Ew,useMemo:Sw,useReducer:Vh,useRef:vw,useState:function(){return Vh(aa)},useDebugValue:pp,useDeferredValue:function(t){var e=Ht();return Ue===null?e.memoizedState=t:kw(e,Ue.memoizedState,t)},useTransition:function(){var t=Vh(aa)[0],e=Ht().memoizedState;return[t,e]},useMutableSource:dw,useSyncExternalStore:fw,useId:Cw,unstable_isNewReconciler:!1};function Xt(t,e){if(t&&t.defaultProps){e=Ce({},e),t=t.defaultProps;for(var n in t)e[n]===void 0&&(e[n]=t[n]);return e}return e}function Ld(t,e,n,r){e=t.memoizedState,n=n(r,e),n=n==null?e:Ce({},e,n),t.memoizedState=n,t.lanes===0&&(t.updateQueue.baseState=n)}var sc={isMounted:function(t){return(t=t._reactInternals)?As(t)===t:!1},enqueueSetState:function(t,e,n){t=t._reactInternals;var r=pt(),s=xr(t),i=Ln(r,s);i.payload=e,n!=null&&(i.callback=n),e=Er(t,i,s),e!==null&&(tn(e,t,s,r),Ul(e,t,s))},enqueueReplaceState:function(t,e,n){t=t._reactInternals;var r=pt(),s=xr(t),i=Ln(r,s);i.tag=1,i.payload=e,n!=null&&(i.callback=n),e=Er(t,i,s),e!==null&&(tn(e,t,s,r),Ul(e,t,s))},enqueueForceUpdate:function(t,e){t=t._reactInternals;var n=pt(),r=xr(t),s=Ln(n,r);s.tag=2,e!=null&&(s.callback=e),e=Er(t,s,r),e!==null&&(tn(e,t,r,n),Ul(e,t,r))}};function Sy(t,e,n,r,s,i,o){return t=t.stateNode,typeof t.shouldComponentUpdate=="function"?t.shouldComponentUpdate(r,i,o):e.prototype&&e.prototype.isPureReactComponent?!ea(n,r)||!ea(s,i):!0}function Pw(t,e,n){var r=!1,s=Dr,i=e.contextType;return typeof i=="object"&&i!==null?i=qt(i):(s=It(e)?ys:lt.current,r=e.contextTypes,i=(r=r!=null)?yi(t,s):Dr),e=new e(n,i),t.memoizedState=e.state!==null&&e.state!==void 0?e.state:null,e.updater=sc,t.stateNode=e,e._reactInternals=t,r&&(t=t.stateNode,t.__reactInternalMemoizedUnmaskedChildContext=s,t.__reactInternalMemoizedMaskedChildContext=i),e}function ky(t,e,n,r){t=e.state,typeof e.componentWillReceiveProps=="function"&&e.componentWillReceiveProps(n,r),typeof e.UNSAFE_componentWillReceiveProps=="function"&&e.UNSAFE_componentWillReceiveProps(n,r),e.state!==t&&sc.enqueueReplaceState(e,e.state,null)}function Md(t,e,n,r){var s=t.stateNode;s.props=n,s.state=t.memoizedState,s.refs={},op(t);var i=e.contextType;typeof i=="object"&&i!==null?s.context=qt(i):(i=It(e)?ys:lt.current,s.context=yi(t,i)),s.state=t.memoizedState,i=e.getDerivedStateFromProps,typeof i=="function"&&(Ld(t,e,i,n),s.state=t.memoizedState),typeof e.getDerivedStateFromProps=="function"||typeof s.getSnapshotBeforeUpdate=="function"||typeof s.UNSAFE_componentWillMount!="function"&&typeof s.componentWillMount!="function"||(e=s.state,typeof s.componentWillMount=="function"&&s.componentWillMount(),typeof s.UNSAFE_componentWillMount=="function"&&s.UNSAFE_componentWillMount(),e!==s.state&&sc.enqueueReplaceState(s,s.state,null),_u(t,n,s,r),s.state=t.memoizedState),typeof s.componentDidMount=="function"&&(t.flags|=4194308)}function Ei(t,e){try{var n="",r=e;do n+=F1(r),r=r.return;while(r);var s=n}catch(i){s=`
Error generating stack: `+i.message+`
`+i.stack}return{value:t,source:e,stack:s,digest:null}}function Lh(t,e,n){return{value:t,source:null,stack:n??null,digest:e??null}}function jd(t,e){try{console.error(e.value)}catch(n){setTimeout(function(){throw n})}}var fk=typeof WeakMap=="function"?WeakMap:Map;function Nw(t,e,n){n=Ln(-1,n),n.tag=3,n.payload={element:null};var r=e.value;return n.callback=function(){xu||(xu=!0,Kd=r),jd(t,e)},n}function Dw(t,e,n){n=Ln(-1,n),n.tag=3;var r=t.type.getDerivedStateFromError;if(typeof r=="function"){var s=e.value;n.payload=function(){return r(s)},n.callback=function(){jd(t,e)}}var i=t.stateNode;return i!==null&&typeof i.componentDidCatch=="function"&&(n.callback=function(){jd(t,e),typeof r!="function"&&(Tr===null?Tr=new Set([this]):Tr.add(this));var o=e.stack;this.componentDidCatch(e.value,{componentStack:o!==null?o:""})}),n}function Cy(t,e,n){var r=t.pingCache;if(r===null){r=t.pingCache=new fk;var s=new Set;r.set(e,s)}else s=r.get(e),s===void 0&&(s=new Set,r.set(e,s));s.has(n)||(s.add(n),t=Ck.bind(null,t,e,n),e.then(t,t))}function Ay(t){do{var e;if((e=t.tag===13)&&(e=t.memoizedState,e=e!==null?e.dehydrated!==null:!0),e)return t;t=t.return}while(t!==null);return null}function Ry(t,e,n,r,s){return t.mode&1?(t.flags|=65536,t.lanes=s,t):(t===e?t.flags|=65536:(t.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(e=Ln(-1,1),e.tag=2,Er(n,e,1))),n.lanes|=1),t)}var pk=Qn.ReactCurrentOwner,Tt=!1;function ft(t,e,n,r){e.child=t===null?lw(e,null,n,r):vi(e,t.child,n,r)}function by(t,e,n,r,s){n=n.render;var i=e.ref;return ui(e,s),r=hp(t,e,n,r,i,s),n=dp(),t!==null&&!Tt?(e.updateQueue=t.updateQueue,e.flags&=-2053,t.lanes&=~s,qn(t,e,s)):(we&&n&&Zf(e),e.flags|=1,ft(t,e,r,s),e.child)}function Py(t,e,n,r,s){if(t===null){var i=n.type;return typeof i=="function"&&!Tp(i)&&i.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(e.tag=15,e.type=i,Ow(t,e,i,r,s)):(t=Hl(n.type,null,r,e,e.mode,s),t.ref=e.ref,t.return=e,e.child=t)}if(i=t.child,!(t.lanes&s)){var o=i.memoizedProps;if(n=n.compare,n=n!==null?n:ea,n(o,r)&&t.ref===e.ref)return qn(t,e,s)}return e.flags|=1,t=Ir(i,r),t.ref=e.ref,t.return=e,e.child=t}function Ow(t,e,n,r,s){if(t!==null){var i=t.memoizedProps;if(ea(i,r)&&t.ref===e.ref)if(Tt=!1,e.pendingProps=r=i,(t.lanes&s)!==0)t.flags&131072&&(Tt=!0);else return e.lanes=t.lanes,qn(t,e,s)}return Ud(t,e,n,r,s)}function Vw(t,e,n){var r=e.pendingProps,s=r.children,i=t!==null?t.memoizedState:null;if(r.mode==="hidden")if(!(e.mode&1))e.memoizedState={baseLanes:0,cachePool:null,transitions:null},pe(ri,Ct),Ct|=n;else{if(!(n&1073741824))return t=i!==null?i.baseLanes|n:n,e.lanes=e.childLanes=1073741824,e.memoizedState={baseLanes:t,cachePool:null,transitions:null},e.updateQueue=null,pe(ri,Ct),Ct|=t,null;e.memoizedState={baseLanes:0,cachePool:null,transitions:null},r=i!==null?i.baseLanes:n,pe(ri,Ct),Ct|=r}else i!==null?(r=i.baseLanes|n,e.memoizedState=null):r=n,pe(ri,Ct),Ct|=r;return ft(t,e,s,n),e.child}function Lw(t,e){var n=e.ref;(t===null&&n!==null||t!==null&&t.ref!==n)&&(e.flags|=512,e.flags|=2097152)}function Ud(t,e,n,r,s){var i=It(n)?ys:lt.current;return i=yi(e,i),ui(e,s),n=hp(t,e,n,r,i,s),r=dp(),t!==null&&!Tt?(e.updateQueue=t.updateQueue,e.flags&=-2053,t.lanes&=~s,qn(t,e,s)):(we&&r&&Zf(e),e.flags|=1,ft(t,e,n,s),e.child)}function Ny(t,e,n,r,s){if(It(n)){var i=!0;fu(e)}else i=!1;if(ui(e,s),e.stateNode===null)Bl(t,e),Pw(e,n,r),Md(e,n,r,s),r=!0;else if(t===null){var o=e.stateNode,l=e.memoizedProps;o.props=l;var u=o.context,c=n.contextType;typeof c=="object"&&c!==null?c=qt(c):(c=It(n)?ys:lt.current,c=yi(e,c));var f=n.getDerivedStateFromProps,p=typeof f=="function"||typeof o.getSnapshotBeforeUpdate=="function";p||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(l!==r||u!==c)&&ky(e,o,r,c),ar=!1;var g=e.memoizedState;o.state=g,_u(e,r,o,s),u=e.memoizedState,l!==r||g!==u||xt.current||ar?(typeof f=="function"&&(Ld(e,n,f,r),u=e.memoizedState),(l=ar||Sy(e,n,l,r,g,u,c))?(p||typeof o.UNSAFE_componentWillMount!="function"&&typeof o.componentWillMount!="function"||(typeof o.componentWillMount=="function"&&o.componentWillMount(),typeof o.UNSAFE_componentWillMount=="function"&&o.UNSAFE_componentWillMount()),typeof o.componentDidMount=="function"&&(e.flags|=4194308)):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),e.memoizedProps=r,e.memoizedState=u),o.props=r,o.state=u,o.context=c,r=l):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),r=!1)}else{o=e.stateNode,cw(t,e),l=e.memoizedProps,c=e.type===e.elementType?l:Xt(e.type,l),o.props=c,p=e.pendingProps,g=o.context,u=n.contextType,typeof u=="object"&&u!==null?u=qt(u):(u=It(n)?ys:lt.current,u=yi(e,u));var w=n.getDerivedStateFromProps;(f=typeof w=="function"||typeof o.getSnapshotBeforeUpdate=="function")||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(l!==p||g!==u)&&ky(e,o,r,u),ar=!1,g=e.memoizedState,o.state=g,_u(e,r,o,s);var x=e.memoizedState;l!==p||g!==x||xt.current||ar?(typeof w=="function"&&(Ld(e,n,w,r),x=e.memoizedState),(c=ar||Sy(e,n,c,r,g,x,u)||!1)?(f||typeof o.UNSAFE_componentWillUpdate!="function"&&typeof o.componentWillUpdate!="function"||(typeof o.componentWillUpdate=="function"&&o.componentWillUpdate(r,x,u),typeof o.UNSAFE_componentWillUpdate=="function"&&o.UNSAFE_componentWillUpdate(r,x,u)),typeof o.componentDidUpdate=="function"&&(e.flags|=4),typeof o.getSnapshotBeforeUpdate=="function"&&(e.flags|=1024)):(typeof o.componentDidUpdate!="function"||l===t.memoizedProps&&g===t.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||l===t.memoizedProps&&g===t.memoizedState||(e.flags|=1024),e.memoizedProps=r,e.memoizedState=x),o.props=r,o.state=x,o.context=u,r=c):(typeof o.componentDidUpdate!="function"||l===t.memoizedProps&&g===t.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||l===t.memoizedProps&&g===t.memoizedState||(e.flags|=1024),r=!1)}return Fd(t,e,n,r,i,s)}function Fd(t,e,n,r,s,i){Lw(t,e);var o=(e.flags&128)!==0;if(!r&&!o)return s&&yy(e,n,!1),qn(t,e,i);r=e.stateNode,pk.current=e;var l=o&&typeof n.getDerivedStateFromError!="function"?null:r.render();return e.flags|=1,t!==null&&o?(e.child=vi(e,t.child,null,i),e.child=vi(e,null,l,i)):ft(t,e,l,i),e.memoizedState=r.state,s&&yy(e,n,!0),e.child}function Mw(t){var e=t.stateNode;e.pendingContext?gy(t,e.pendingContext,e.pendingContext!==e.context):e.context&&gy(t,e.context,!1),ap(t,e.containerInfo)}function Dy(t,e,n,r,s){return _i(),tp(s),e.flags|=256,ft(t,e,n,r),e.child}var zd={dehydrated:null,treeContext:null,retryLane:0};function Bd(t){return{baseLanes:t,cachePool:null,transitions:null}}function jw(t,e,n){var r=e.pendingProps,s=xe.current,i=!1,o=(e.flags&128)!==0,l;if((l=o)||(l=t!==null&&t.memoizedState===null?!1:(s&2)!==0),l?(i=!0,e.flags&=-129):(t===null||t.memoizedState!==null)&&(s|=1),pe(xe,s&1),t===null)return Od(e),t=e.memoizedState,t!==null&&(t=t.dehydrated,t!==null)?(e.mode&1?t.data==="$!"?e.lanes=8:e.lanes=1073741824:e.lanes=1,null):(o=r.children,t=r.fallback,i?(r=e.mode,i=e.child,o={mode:"hidden",children:o},!(r&1)&&i!==null?(i.childLanes=0,i.pendingProps=o):i=ac(o,r,0,null),t=ms(t,r,n,null),i.return=e,t.return=e,i.sibling=t,e.child=i,e.child.memoizedState=Bd(n),e.memoizedState=zd,t):mp(e,o));if(s=t.memoizedState,s!==null&&(l=s.dehydrated,l!==null))return mk(t,e,o,r,l,s,n);if(i){i=r.fallback,o=e.mode,s=t.child,l=s.sibling;var u={mode:"hidden",children:r.children};return!(o&1)&&e.child!==s?(r=e.child,r.childLanes=0,r.pendingProps=u,e.deletions=null):(r=Ir(s,u),r.subtreeFlags=s.subtreeFlags&14680064),l!==null?i=Ir(l,i):(i=ms(i,o,n,null),i.flags|=2),i.return=e,r.return=e,r.sibling=i,e.child=r,r=i,i=e.child,o=t.child.memoizedState,o=o===null?Bd(n):{baseLanes:o.baseLanes|n,cachePool:null,transitions:o.transitions},i.memoizedState=o,i.childLanes=t.childLanes&~n,e.memoizedState=zd,r}return i=t.child,t=i.sibling,r=Ir(i,{mode:"visible",children:r.children}),!(e.mode&1)&&(r.lanes=n),r.return=e,r.sibling=null,t!==null&&(n=e.deletions,n===null?(e.deletions=[t],e.flags|=16):n.push(t)),e.child=r,e.memoizedState=null,r}function mp(t,e){return e=ac({mode:"visible",children:e},t.mode,0,null),e.return=t,t.child=e}function wl(t,e,n,r){return r!==null&&tp(r),vi(e,t.child,null,n),t=mp(e,e.pendingProps.children),t.flags|=2,e.memoizedState=null,t}function mk(t,e,n,r,s,i,o){if(n)return e.flags&256?(e.flags&=-257,r=Lh(Error(F(422))),wl(t,e,o,r)):e.memoizedState!==null?(e.child=t.child,e.flags|=128,null):(i=r.fallback,s=e.mode,r=ac({mode:"visible",children:r.children},s,0,null),i=ms(i,s,o,null),i.flags|=2,r.return=e,i.return=e,r.sibling=i,e.child=r,e.mode&1&&vi(e,t.child,null,o),e.child.memoizedState=Bd(o),e.memoizedState=zd,i);if(!(e.mode&1))return wl(t,e,o,null);if(s.data==="$!"){if(r=s.nextSibling&&s.nextSibling.dataset,r)var l=r.dgst;return r=l,i=Error(F(419)),r=Lh(i,r,void 0),wl(t,e,o,r)}if(l=(o&t.childLanes)!==0,Tt||l){if(r=Ge,r!==null){switch(o&-o){case 4:s=2;break;case 16:s=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:s=32;break;case 536870912:s=268435456;break;default:s=0}s=s&(r.suspendedLanes|o)?0:s,s!==0&&s!==i.retryLane&&(i.retryLane=s,$n(t,s),tn(r,t,s,-1))}return Ep(),r=Lh(Error(F(421))),wl(t,e,o,r)}return s.data==="$?"?(e.flags|=128,e.child=t.child,e=Ak.bind(null,t),s._reactRetry=e,null):(t=i.treeContext,bt=wr(s.nextSibling),Dt=e,we=!0,Jt=null,t!==null&&(Ut[Ft++]=Pn,Ut[Ft++]=Nn,Ut[Ft++]=_s,Pn=t.id,Nn=t.overflow,_s=e),e=mp(e,r.children),e.flags|=4096,e)}function Oy(t,e,n){t.lanes|=e;var r=t.alternate;r!==null&&(r.lanes|=e),Vd(t.return,e,n)}function Mh(t,e,n,r,s){var i=t.memoizedState;i===null?t.memoizedState={isBackwards:e,rendering:null,renderingStartTime:0,last:r,tail:n,tailMode:s}:(i.isBackwards=e,i.rendering=null,i.renderingStartTime=0,i.last=r,i.tail=n,i.tailMode=s)}function Uw(t,e,n){var r=e.pendingProps,s=r.revealOrder,i=r.tail;if(ft(t,e,r.children,n),r=xe.current,r&2)r=r&1|2,e.flags|=128;else{if(t!==null&&t.flags&128)e:for(t=e.child;t!==null;){if(t.tag===13)t.memoizedState!==null&&Oy(t,n,e);else if(t.tag===19)Oy(t,n,e);else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break e;for(;t.sibling===null;){if(t.return===null||t.return===e)break e;t=t.return}t.sibling.return=t.return,t=t.sibling}r&=1}if(pe(xe,r),!(e.mode&1))e.memoizedState=null;else switch(s){case"forwards":for(n=e.child,s=null;n!==null;)t=n.alternate,t!==null&&vu(t)===null&&(s=n),n=n.sibling;n=s,n===null?(s=e.child,e.child=null):(s=n.sibling,n.sibling=null),Mh(e,!1,s,n,i);break;case"backwards":for(n=null,s=e.child,e.child=null;s!==null;){if(t=s.alternate,t!==null&&vu(t)===null){e.child=s;break}t=s.sibling,s.sibling=n,n=s,s=t}Mh(e,!0,n,null,i);break;case"together":Mh(e,!1,null,null,void 0);break;default:e.memoizedState=null}return e.child}function Bl(t,e){!(e.mode&1)&&t!==null&&(t.alternate=null,e.alternate=null,e.flags|=2)}function qn(t,e,n){if(t!==null&&(e.dependencies=t.dependencies),ws|=e.lanes,!(n&e.childLanes))return null;if(t!==null&&e.child!==t.child)throw Error(F(153));if(e.child!==null){for(t=e.child,n=Ir(t,t.pendingProps),e.child=n,n.return=e;t.sibling!==null;)t=t.sibling,n=n.sibling=Ir(t,t.pendingProps),n.return=e;n.sibling=null}return e.child}function gk(t,e,n){switch(e.tag){case 3:Mw(e),_i();break;case 5:hw(e);break;case 1:It(e.type)&&fu(e);break;case 4:ap(e,e.stateNode.containerInfo);break;case 10:var r=e.type._context,s=e.memoizedProps.value;pe(gu,r._currentValue),r._currentValue=s;break;case 13:if(r=e.memoizedState,r!==null)return r.dehydrated!==null?(pe(xe,xe.current&1),e.flags|=128,null):n&e.child.childLanes?jw(t,e,n):(pe(xe,xe.current&1),t=qn(t,e,n),t!==null?t.sibling:null);pe(xe,xe.current&1);break;case 19:if(r=(n&e.childLanes)!==0,t.flags&128){if(r)return Uw(t,e,n);e.flags|=128}if(s=e.memoizedState,s!==null&&(s.rendering=null,s.tail=null,s.lastEffect=null),pe(xe,xe.current),r)break;return null;case 22:case 23:return e.lanes=0,Vw(t,e,n)}return qn(t,e,n)}var Fw,$d,zw,Bw;Fw=function(t,e){for(var n=e.child;n!==null;){if(n.tag===5||n.tag===6)t.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===e)break;for(;n.sibling===null;){if(n.return===null||n.return===e)return;n=n.return}n.sibling.return=n.return,n=n.sibling}};$d=function(){};zw=function(t,e,n,r){var s=t.memoizedProps;if(s!==r){t=e.stateNode,hs(yn.current);var i=null;switch(n){case"input":s=hd(t,s),r=hd(t,r),i=[];break;case"select":s=Ce({},s,{value:void 0}),r=Ce({},r,{value:void 0}),i=[];break;case"textarea":s=pd(t,s),r=pd(t,r),i=[];break;default:typeof s.onClick!="function"&&typeof r.onClick=="function"&&(t.onclick=hu)}gd(n,r);var o;n=null;for(c in s)if(!r.hasOwnProperty(c)&&s.hasOwnProperty(c)&&s[c]!=null)if(c==="style"){var l=s[c];for(o in l)l.hasOwnProperty(o)&&(n||(n={}),n[o]="")}else c!=="dangerouslySetInnerHTML"&&c!=="children"&&c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&c!=="autoFocus"&&(Go.hasOwnProperty(c)?i||(i=[]):(i=i||[]).push(c,null));for(c in r){var u=r[c];if(l=s!=null?s[c]:void 0,r.hasOwnProperty(c)&&u!==l&&(u!=null||l!=null))if(c==="style")if(l){for(o in l)!l.hasOwnProperty(o)||u&&u.hasOwnProperty(o)||(n||(n={}),n[o]="");for(o in u)u.hasOwnProperty(o)&&l[o]!==u[o]&&(n||(n={}),n[o]=u[o])}else n||(i||(i=[]),i.push(c,n)),n=u;else c==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,l=l?l.__html:void 0,u!=null&&l!==u&&(i=i||[]).push(c,u)):c==="children"?typeof u!="string"&&typeof u!="number"||(i=i||[]).push(c,""+u):c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&(Go.hasOwnProperty(c)?(u!=null&&c==="onScroll"&&ge("scroll",t),i||l===u||(i=[])):(i=i||[]).push(c,u))}n&&(i=i||[]).push("style",n);var c=i;(e.updateQueue=c)&&(e.flags|=4)}};Bw=function(t,e,n,r){n!==r&&(e.flags|=4)};function _o(t,e){if(!we)switch(t.tailMode){case"hidden":e=t.tail;for(var n=null;e!==null;)e.alternate!==null&&(n=e),e=e.sibling;n===null?t.tail=null:n.sibling=null;break;case"collapsed":n=t.tail;for(var r=null;n!==null;)n.alternate!==null&&(r=n),n=n.sibling;r===null?e||t.tail===null?t.tail=null:t.tail.sibling=null:r.sibling=null}}function nt(t){var e=t.alternate!==null&&t.alternate.child===t.child,n=0,r=0;if(e)for(var s=t.child;s!==null;)n|=s.lanes|s.childLanes,r|=s.subtreeFlags&14680064,r|=s.flags&14680064,s.return=t,s=s.sibling;else for(s=t.child;s!==null;)n|=s.lanes|s.childLanes,r|=s.subtreeFlags,r|=s.flags,s.return=t,s=s.sibling;return t.subtreeFlags|=r,t.childLanes=n,e}function yk(t,e,n){var r=e.pendingProps;switch(ep(e),e.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return nt(e),null;case 1:return It(e.type)&&du(),nt(e),null;case 3:return r=e.stateNode,wi(),ye(xt),ye(lt),up(),r.pendingContext&&(r.context=r.pendingContext,r.pendingContext=null),(t===null||t.child===null)&&(_l(e)?e.flags|=4:t===null||t.memoizedState.isDehydrated&&!(e.flags&256)||(e.flags|=1024,Jt!==null&&(Yd(Jt),Jt=null))),$d(t,e),nt(e),null;case 5:lp(e);var s=hs(ia.current);if(n=e.type,t!==null&&e.stateNode!=null)zw(t,e,n,r,s),t.ref!==e.ref&&(e.flags|=512,e.flags|=2097152);else{if(!r){if(e.stateNode===null)throw Error(F(166));return nt(e),null}if(t=hs(yn.current),_l(e)){r=e.stateNode,n=e.type;var i=e.memoizedProps;switch(r[pn]=e,r[ra]=i,t=(e.mode&1)!==0,n){case"dialog":ge("cancel",r),ge("close",r);break;case"iframe":case"object":case"embed":ge("load",r);break;case"video":case"audio":for(s=0;s<So.length;s++)ge(So[s],r);break;case"source":ge("error",r);break;case"img":case"image":case"link":ge("error",r),ge("load",r);break;case"details":ge("toggle",r);break;case"input":$g(r,i),ge("invalid",r);break;case"select":r._wrapperState={wasMultiple:!!i.multiple},ge("invalid",r);break;case"textarea":Hg(r,i),ge("invalid",r)}gd(n,i),s=null;for(var o in i)if(i.hasOwnProperty(o)){var l=i[o];o==="children"?typeof l=="string"?r.textContent!==l&&(i.suppressHydrationWarning!==!0&&yl(r.textContent,l,t),s=["children",l]):typeof l=="number"&&r.textContent!==""+l&&(i.suppressHydrationWarning!==!0&&yl(r.textContent,l,t),s=["children",""+l]):Go.hasOwnProperty(o)&&l!=null&&o==="onScroll"&&ge("scroll",r)}switch(n){case"input":ul(r),qg(r,i,!0);break;case"textarea":ul(r),Wg(r);break;case"select":case"option":break;default:typeof i.onClick=="function"&&(r.onclick=hu)}r=s,e.updateQueue=r,r!==null&&(e.flags|=4)}else{o=s.nodeType===9?s:s.ownerDocument,t==="http://www.w3.org/1999/xhtml"&&(t=g0(n)),t==="http://www.w3.org/1999/xhtml"?n==="script"?(t=o.createElement("div"),t.innerHTML="<script><\/script>",t=t.removeChild(t.firstChild)):typeof r.is=="string"?t=o.createElement(n,{is:r.is}):(t=o.createElement(n),n==="select"&&(o=t,r.multiple?o.multiple=!0:r.size&&(o.size=r.size))):t=o.createElementNS(t,n),t[pn]=e,t[ra]=r,Fw(t,e,!1,!1),e.stateNode=t;e:{switch(o=yd(n,r),n){case"dialog":ge("cancel",t),ge("close",t),s=r;break;case"iframe":case"object":case"embed":ge("load",t),s=r;break;case"video":case"audio":for(s=0;s<So.length;s++)ge(So[s],t);s=r;break;case"source":ge("error",t),s=r;break;case"img":case"image":case"link":ge("error",t),ge("load",t),s=r;break;case"details":ge("toggle",t),s=r;break;case"input":$g(t,r),s=hd(t,r),ge("invalid",t);break;case"option":s=r;break;case"select":t._wrapperState={wasMultiple:!!r.multiple},s=Ce({},r,{value:void 0}),ge("invalid",t);break;case"textarea":Hg(t,r),s=pd(t,r),ge("invalid",t);break;default:s=r}gd(n,s),l=s;for(i in l)if(l.hasOwnProperty(i)){var u=l[i];i==="style"?v0(t,u):i==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,u!=null&&y0(t,u)):i==="children"?typeof u=="string"?(n!=="textarea"||u!=="")&&Ko(t,u):typeof u=="number"&&Ko(t,""+u):i!=="suppressContentEditableWarning"&&i!=="suppressHydrationWarning"&&i!=="autoFocus"&&(Go.hasOwnProperty(i)?u!=null&&i==="onScroll"&&ge("scroll",t):u!=null&&Uf(t,i,u,o))}switch(n){case"input":ul(t),qg(t,r,!1);break;case"textarea":ul(t),Wg(t);break;case"option":r.value!=null&&t.setAttribute("value",""+Nr(r.value));break;case"select":t.multiple=!!r.multiple,i=r.value,i!=null?ii(t,!!r.multiple,i,!1):r.defaultValue!=null&&ii(t,!!r.multiple,r.defaultValue,!0);break;default:typeof s.onClick=="function"&&(t.onclick=hu)}switch(n){case"button":case"input":case"select":case"textarea":r=!!r.autoFocus;break e;case"img":r=!0;break e;default:r=!1}}r&&(e.flags|=4)}e.ref!==null&&(e.flags|=512,e.flags|=2097152)}return nt(e),null;case 6:if(t&&e.stateNode!=null)Bw(t,e,t.memoizedProps,r);else{if(typeof r!="string"&&e.stateNode===null)throw Error(F(166));if(n=hs(ia.current),hs(yn.current),_l(e)){if(r=e.stateNode,n=e.memoizedProps,r[pn]=e,(i=r.nodeValue!==n)&&(t=Dt,t!==null))switch(t.tag){case 3:yl(r.nodeValue,n,(t.mode&1)!==0);break;case 5:t.memoizedProps.suppressHydrationWarning!==!0&&yl(r.nodeValue,n,(t.mode&1)!==0)}i&&(e.flags|=4)}else r=(n.nodeType===9?n:n.ownerDocument).createTextNode(r),r[pn]=e,e.stateNode=r}return nt(e),null;case 13:if(ye(xe),r=e.memoizedState,t===null||t.memoizedState!==null&&t.memoizedState.dehydrated!==null){if(we&&bt!==null&&e.mode&1&&!(e.flags&128))ow(),_i(),e.flags|=98560,i=!1;else if(i=_l(e),r!==null&&r.dehydrated!==null){if(t===null){if(!i)throw Error(F(318));if(i=e.memoizedState,i=i!==null?i.dehydrated:null,!i)throw Error(F(317));i[pn]=e}else _i(),!(e.flags&128)&&(e.memoizedState=null),e.flags|=4;nt(e),i=!1}else Jt!==null&&(Yd(Jt),Jt=null),i=!0;if(!i)return e.flags&65536?e:null}return e.flags&128?(e.lanes=n,e):(r=r!==null,r!==(t!==null&&t.memoizedState!==null)&&r&&(e.child.flags|=8192,e.mode&1&&(t===null||xe.current&1?Fe===0&&(Fe=3):Ep())),e.updateQueue!==null&&(e.flags|=4),nt(e),null);case 4:return wi(),$d(t,e),t===null&&ta(e.stateNode.containerInfo),nt(e),null;case 10:return sp(e.type._context),nt(e),null;case 17:return It(e.type)&&du(),nt(e),null;case 19:if(ye(xe),i=e.memoizedState,i===null)return nt(e),null;if(r=(e.flags&128)!==0,o=i.rendering,o===null)if(r)_o(i,!1);else{if(Fe!==0||t!==null&&t.flags&128)for(t=e.child;t!==null;){if(o=vu(t),o!==null){for(e.flags|=128,_o(i,!1),r=o.updateQueue,r!==null&&(e.updateQueue=r,e.flags|=4),e.subtreeFlags=0,r=n,n=e.child;n!==null;)i=n,t=r,i.flags&=14680066,o=i.alternate,o===null?(i.childLanes=0,i.lanes=t,i.child=null,i.subtreeFlags=0,i.memoizedProps=null,i.memoizedState=null,i.updateQueue=null,i.dependencies=null,i.stateNode=null):(i.childLanes=o.childLanes,i.lanes=o.lanes,i.child=o.child,i.subtreeFlags=0,i.deletions=null,i.memoizedProps=o.memoizedProps,i.memoizedState=o.memoizedState,i.updateQueue=o.updateQueue,i.type=o.type,t=o.dependencies,i.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext}),n=n.sibling;return pe(xe,xe.current&1|2),e.child}t=t.sibling}i.tail!==null&&De()>Ti&&(e.flags|=128,r=!0,_o(i,!1),e.lanes=4194304)}else{if(!r)if(t=vu(o),t!==null){if(e.flags|=128,r=!0,n=t.updateQueue,n!==null&&(e.updateQueue=n,e.flags|=4),_o(i,!0),i.tail===null&&i.tailMode==="hidden"&&!o.alternate&&!we)return nt(e),null}else 2*De()-i.renderingStartTime>Ti&&n!==1073741824&&(e.flags|=128,r=!0,_o(i,!1),e.lanes=4194304);i.isBackwards?(o.sibling=e.child,e.child=o):(n=i.last,n!==null?n.sibling=o:e.child=o,i.last=o)}return i.tail!==null?(e=i.tail,i.rendering=e,i.tail=e.sibling,i.renderingStartTime=De(),e.sibling=null,n=xe.current,pe(xe,r?n&1|2:n&1),e):(nt(e),null);case 22:case 23:return wp(),r=e.memoizedState!==null,t!==null&&t.memoizedState!==null!==r&&(e.flags|=8192),r&&e.mode&1?Ct&1073741824&&(nt(e),e.subtreeFlags&6&&(e.flags|=8192)):nt(e),null;case 24:return null;case 25:return null}throw Error(F(156,e.tag))}function _k(t,e){switch(ep(e),e.tag){case 1:return It(e.type)&&du(),t=e.flags,t&65536?(e.flags=t&-65537|128,e):null;case 3:return wi(),ye(xt),ye(lt),up(),t=e.flags,t&65536&&!(t&128)?(e.flags=t&-65537|128,e):null;case 5:return lp(e),null;case 13:if(ye(xe),t=e.memoizedState,t!==null&&t.dehydrated!==null){if(e.alternate===null)throw Error(F(340));_i()}return t=e.flags,t&65536?(e.flags=t&-65537|128,e):null;case 19:return ye(xe),null;case 4:return wi(),null;case 10:return sp(e.type._context),null;case 22:case 23:return wp(),null;case 24:return null;default:return null}}var El=!1,it=!1,vk=typeof WeakSet=="function"?WeakSet:Set,H=null;function ni(t,e){var n=t.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(r){be(t,e,r)}else n.current=null}function qd(t,e,n){try{n()}catch(r){be(t,e,r)}}var Vy=!1;function wk(t,e){if(Cd=lu,t=G0(),Jf(t)){if("selectionStart"in t)var n={start:t.selectionStart,end:t.selectionEnd};else e:{n=(n=t.ownerDocument)&&n.defaultView||window;var r=n.getSelection&&n.getSelection();if(r&&r.rangeCount!==0){n=r.anchorNode;var s=r.anchorOffset,i=r.focusNode;r=r.focusOffset;try{n.nodeType,i.nodeType}catch{n=null;break e}var o=0,l=-1,u=-1,c=0,f=0,p=t,g=null;t:for(;;){for(var w;p!==n||s!==0&&p.nodeType!==3||(l=o+s),p!==i||r!==0&&p.nodeType!==3||(u=o+r),p.nodeType===3&&(o+=p.nodeValue.length),(w=p.firstChild)!==null;)g=p,p=w;for(;;){if(p===t)break t;if(g===n&&++c===s&&(l=o),g===i&&++f===r&&(u=o),(w=p.nextSibling)!==null)break;p=g,g=p.parentNode}p=w}n=l===-1||u===-1?null:{start:l,end:u}}else n=null}n=n||{start:0,end:0}}else n=null;for(Ad={focusedElem:t,selectionRange:n},lu=!1,H=e;H!==null;)if(e=H,t=e.child,(e.subtreeFlags&1028)!==0&&t!==null)t.return=e,H=t;else for(;H!==null;){e=H;try{var x=e.alternate;if(e.flags&1024)switch(e.tag){case 0:case 11:case 15:break;case 1:if(x!==null){var b=x.memoizedProps,P=x.memoizedState,S=e.stateNode,v=S.getSnapshotBeforeUpdate(e.elementType===e.type?b:Xt(e.type,b),P);S.__reactInternalSnapshotBeforeUpdate=v}break;case 3:var C=e.stateNode.containerInfo;C.nodeType===1?C.textContent="":C.nodeType===9&&C.documentElement&&C.removeChild(C.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(F(163))}}catch(D){be(e,e.return,D)}if(t=e.sibling,t!==null){t.return=e.return,H=t;break}H=e.return}return x=Vy,Vy=!1,x}function Mo(t,e,n){var r=e.updateQueue;if(r=r!==null?r.lastEffect:null,r!==null){var s=r=r.next;do{if((s.tag&t)===t){var i=s.destroy;s.destroy=void 0,i!==void 0&&qd(e,n,i)}s=s.next}while(s!==r)}}function ic(t,e){if(e=e.updateQueue,e=e!==null?e.lastEffect:null,e!==null){var n=e=e.next;do{if((n.tag&t)===t){var r=n.create;n.destroy=r()}n=n.next}while(n!==e)}}function Hd(t){var e=t.ref;if(e!==null){var n=t.stateNode;switch(t.tag){case 5:t=n;break;default:t=n}typeof e=="function"?e(t):e.current=t}}function $w(t){var e=t.alternate;e!==null&&(t.alternate=null,$w(e)),t.child=null,t.deletions=null,t.sibling=null,t.tag===5&&(e=t.stateNode,e!==null&&(delete e[pn],delete e[ra],delete e[Pd],delete e[nk],delete e[rk])),t.stateNode=null,t.return=null,t.dependencies=null,t.memoizedProps=null,t.memoizedState=null,t.pendingProps=null,t.stateNode=null,t.updateQueue=null}function qw(t){return t.tag===5||t.tag===3||t.tag===4}function Ly(t){e:for(;;){for(;t.sibling===null;){if(t.return===null||qw(t.return))return null;t=t.return}for(t.sibling.return=t.return,t=t.sibling;t.tag!==5&&t.tag!==6&&t.tag!==18;){if(t.flags&2||t.child===null||t.tag===4)continue e;t.child.return=t,t=t.child}if(!(t.flags&2))return t.stateNode}}function Wd(t,e,n){var r=t.tag;if(r===5||r===6)t=t.stateNode,e?n.nodeType===8?n.parentNode.insertBefore(t,e):n.insertBefore(t,e):(n.nodeType===8?(e=n.parentNode,e.insertBefore(t,n)):(e=n,e.appendChild(t)),n=n._reactRootContainer,n!=null||e.onclick!==null||(e.onclick=hu));else if(r!==4&&(t=t.child,t!==null))for(Wd(t,e,n),t=t.sibling;t!==null;)Wd(t,e,n),t=t.sibling}function Gd(t,e,n){var r=t.tag;if(r===5||r===6)t=t.stateNode,e?n.insertBefore(t,e):n.appendChild(t);else if(r!==4&&(t=t.child,t!==null))for(Gd(t,e,n),t=t.sibling;t!==null;)Gd(t,e,n),t=t.sibling}var Qe=null,Yt=!1;function sr(t,e,n){for(n=n.child;n!==null;)Hw(t,e,n),n=n.sibling}function Hw(t,e,n){if(gn&&typeof gn.onCommitFiberUnmount=="function")try{gn.onCommitFiberUnmount(Yu,n)}catch{}switch(n.tag){case 5:it||ni(n,e);case 6:var r=Qe,s=Yt;Qe=null,sr(t,e,n),Qe=r,Yt=s,Qe!==null&&(Yt?(t=Qe,n=n.stateNode,t.nodeType===8?t.parentNode.removeChild(n):t.removeChild(n)):Qe.removeChild(n.stateNode));break;case 18:Qe!==null&&(Yt?(t=Qe,n=n.stateNode,t.nodeType===8?bh(t.parentNode,n):t.nodeType===1&&bh(t,n),Jo(t)):bh(Qe,n.stateNode));break;case 4:r=Qe,s=Yt,Qe=n.stateNode.containerInfo,Yt=!0,sr(t,e,n),Qe=r,Yt=s;break;case 0:case 11:case 14:case 15:if(!it&&(r=n.updateQueue,r!==null&&(r=r.lastEffect,r!==null))){s=r=r.next;do{var i=s,o=i.destroy;i=i.tag,o!==void 0&&(i&2||i&4)&&qd(n,e,o),s=s.next}while(s!==r)}sr(t,e,n);break;case 1:if(!it&&(ni(n,e),r=n.stateNode,typeof r.componentWillUnmount=="function"))try{r.props=n.memoizedProps,r.state=n.memoizedState,r.componentWillUnmount()}catch(l){be(n,e,l)}sr(t,e,n);break;case 21:sr(t,e,n);break;case 22:n.mode&1?(it=(r=it)||n.memoizedState!==null,sr(t,e,n),it=r):sr(t,e,n);break;default:sr(t,e,n)}}function My(t){var e=t.updateQueue;if(e!==null){t.updateQueue=null;var n=t.stateNode;n===null&&(n=t.stateNode=new vk),e.forEach(function(r){var s=Rk.bind(null,t,r);n.has(r)||(n.add(r),r.then(s,s))})}}function Qt(t,e){var n=e.deletions;if(n!==null)for(var r=0;r<n.length;r++){var s=n[r];try{var i=t,o=e,l=o;e:for(;l!==null;){switch(l.tag){case 5:Qe=l.stateNode,Yt=!1;break e;case 3:Qe=l.stateNode.containerInfo,Yt=!0;break e;case 4:Qe=l.stateNode.containerInfo,Yt=!0;break e}l=l.return}if(Qe===null)throw Error(F(160));Hw(i,o,s),Qe=null,Yt=!1;var u=s.alternate;u!==null&&(u.return=null),s.return=null}catch(c){be(s,e,c)}}if(e.subtreeFlags&12854)for(e=e.child;e!==null;)Ww(e,t),e=e.sibling}function Ww(t,e){var n=t.alternate,r=t.flags;switch(t.tag){case 0:case 11:case 14:case 15:if(Qt(e,t),hn(t),r&4){try{Mo(3,t,t.return),ic(3,t)}catch(b){be(t,t.return,b)}try{Mo(5,t,t.return)}catch(b){be(t,t.return,b)}}break;case 1:Qt(e,t),hn(t),r&512&&n!==null&&ni(n,n.return);break;case 5:if(Qt(e,t),hn(t),r&512&&n!==null&&ni(n,n.return),t.flags&32){var s=t.stateNode;try{Ko(s,"")}catch(b){be(t,t.return,b)}}if(r&4&&(s=t.stateNode,s!=null)){var i=t.memoizedProps,o=n!==null?n.memoizedProps:i,l=t.type,u=t.updateQueue;if(t.updateQueue=null,u!==null)try{l==="input"&&i.type==="radio"&&i.name!=null&&p0(s,i),yd(l,o);var c=yd(l,i);for(o=0;o<u.length;o+=2){var f=u[o],p=u[o+1];f==="style"?v0(s,p):f==="dangerouslySetInnerHTML"?y0(s,p):f==="children"?Ko(s,p):Uf(s,f,p,c)}switch(l){case"input":dd(s,i);break;case"textarea":m0(s,i);break;case"select":var g=s._wrapperState.wasMultiple;s._wrapperState.wasMultiple=!!i.multiple;var w=i.value;w!=null?ii(s,!!i.multiple,w,!1):g!==!!i.multiple&&(i.defaultValue!=null?ii(s,!!i.multiple,i.defaultValue,!0):ii(s,!!i.multiple,i.multiple?[]:"",!1))}s[ra]=i}catch(b){be(t,t.return,b)}}break;case 6:if(Qt(e,t),hn(t),r&4){if(t.stateNode===null)throw Error(F(162));s=t.stateNode,i=t.memoizedProps;try{s.nodeValue=i}catch(b){be(t,t.return,b)}}break;case 3:if(Qt(e,t),hn(t),r&4&&n!==null&&n.memoizedState.isDehydrated)try{Jo(e.containerInfo)}catch(b){be(t,t.return,b)}break;case 4:Qt(e,t),hn(t);break;case 13:Qt(e,t),hn(t),s=t.child,s.flags&8192&&(i=s.memoizedState!==null,s.stateNode.isHidden=i,!i||s.alternate!==null&&s.alternate.memoizedState!==null||(_p=De())),r&4&&My(t);break;case 22:if(f=n!==null&&n.memoizedState!==null,t.mode&1?(it=(c=it)||f,Qt(e,t),it=c):Qt(e,t),hn(t),r&8192){if(c=t.memoizedState!==null,(t.stateNode.isHidden=c)&&!f&&t.mode&1)for(H=t,f=t.child;f!==null;){for(p=H=f;H!==null;){switch(g=H,w=g.child,g.tag){case 0:case 11:case 14:case 15:Mo(4,g,g.return);break;case 1:ni(g,g.return);var x=g.stateNode;if(typeof x.componentWillUnmount=="function"){r=g,n=g.return;try{e=r,x.props=e.memoizedProps,x.state=e.memoizedState,x.componentWillUnmount()}catch(b){be(r,n,b)}}break;case 5:ni(g,g.return);break;case 22:if(g.memoizedState!==null){Uy(p);continue}}w!==null?(w.return=g,H=w):Uy(p)}f=f.sibling}e:for(f=null,p=t;;){if(p.tag===5){if(f===null){f=p;try{s=p.stateNode,c?(i=s.style,typeof i.setProperty=="function"?i.setProperty("display","none","important"):i.display="none"):(l=p.stateNode,u=p.memoizedProps.style,o=u!=null&&u.hasOwnProperty("display")?u.display:null,l.style.display=_0("display",o))}catch(b){be(t,t.return,b)}}}else if(p.tag===6){if(f===null)try{p.stateNode.nodeValue=c?"":p.memoizedProps}catch(b){be(t,t.return,b)}}else if((p.tag!==22&&p.tag!==23||p.memoizedState===null||p===t)&&p.child!==null){p.child.return=p,p=p.child;continue}if(p===t)break e;for(;p.sibling===null;){if(p.return===null||p.return===t)break e;f===p&&(f=null),p=p.return}f===p&&(f=null),p.sibling.return=p.return,p=p.sibling}}break;case 19:Qt(e,t),hn(t),r&4&&My(t);break;case 21:break;default:Qt(e,t),hn(t)}}function hn(t){var e=t.flags;if(e&2){try{e:{for(var n=t.return;n!==null;){if(qw(n)){var r=n;break e}n=n.return}throw Error(F(160))}switch(r.tag){case 5:var s=r.stateNode;r.flags&32&&(Ko(s,""),r.flags&=-33);var i=Ly(t);Gd(t,i,s);break;case 3:case 4:var o=r.stateNode.containerInfo,l=Ly(t);Wd(t,l,o);break;default:throw Error(F(161))}}catch(u){be(t,t.return,u)}t.flags&=-3}e&4096&&(t.flags&=-4097)}function Ek(t,e,n){H=t,Gw(t)}function Gw(t,e,n){for(var r=(t.mode&1)!==0;H!==null;){var s=H,i=s.child;if(s.tag===22&&r){var o=s.memoizedState!==null||El;if(!o){var l=s.alternate,u=l!==null&&l.memoizedState!==null||it;l=El;var c=it;if(El=o,(it=u)&&!c)for(H=s;H!==null;)o=H,u=o.child,o.tag===22&&o.memoizedState!==null?Fy(s):u!==null?(u.return=o,H=u):Fy(s);for(;i!==null;)H=i,Gw(i),i=i.sibling;H=s,El=l,it=c}jy(t)}else s.subtreeFlags&8772&&i!==null?(i.return=s,H=i):jy(t)}}function jy(t){for(;H!==null;){var e=H;if(e.flags&8772){var n=e.alternate;try{if(e.flags&8772)switch(e.tag){case 0:case 11:case 15:it||ic(5,e);break;case 1:var r=e.stateNode;if(e.flags&4&&!it)if(n===null)r.componentDidMount();else{var s=e.elementType===e.type?n.memoizedProps:Xt(e.type,n.memoizedProps);r.componentDidUpdate(s,n.memoizedState,r.__reactInternalSnapshotBeforeUpdate)}var i=e.updateQueue;i!==null&&Ty(e,i,r);break;case 3:var o=e.updateQueue;if(o!==null){if(n=null,e.child!==null)switch(e.child.tag){case 5:n=e.child.stateNode;break;case 1:n=e.child.stateNode}Ty(e,o,n)}break;case 5:var l=e.stateNode;if(n===null&&e.flags&4){n=l;var u=e.memoizedProps;switch(e.type){case"button":case"input":case"select":case"textarea":u.autoFocus&&n.focus();break;case"img":u.src&&(n.src=u.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(e.memoizedState===null){var c=e.alternate;if(c!==null){var f=c.memoizedState;if(f!==null){var p=f.dehydrated;p!==null&&Jo(p)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(F(163))}it||e.flags&512&&Hd(e)}catch(g){be(e,e.return,g)}}if(e===t){H=null;break}if(n=e.sibling,n!==null){n.return=e.return,H=n;break}H=e.return}}function Uy(t){for(;H!==null;){var e=H;if(e===t){H=null;break}var n=e.sibling;if(n!==null){n.return=e.return,H=n;break}H=e.return}}function Fy(t){for(;H!==null;){var e=H;try{switch(e.tag){case 0:case 11:case 15:var n=e.return;try{ic(4,e)}catch(u){be(e,n,u)}break;case 1:var r=e.stateNode;if(typeof r.componentDidMount=="function"){var s=e.return;try{r.componentDidMount()}catch(u){be(e,s,u)}}var i=e.return;try{Hd(e)}catch(u){be(e,i,u)}break;case 5:var o=e.return;try{Hd(e)}catch(u){be(e,o,u)}}}catch(u){be(e,e.return,u)}if(e===t){H=null;break}var l=e.sibling;if(l!==null){l.return=e.return,H=l;break}H=e.return}}var Tk=Math.ceil,Tu=Qn.ReactCurrentDispatcher,gp=Qn.ReactCurrentOwner,Bt=Qn.ReactCurrentBatchConfig,ae=0,Ge=null,Ve=null,Ye=0,Ct=0,ri=Wr(0),Fe=0,ua=null,ws=0,oc=0,yp=0,jo=null,wt=null,_p=0,Ti=1/0,Cn=null,xu=!1,Kd=null,Tr=null,Tl=!1,mr=null,Iu=0,Uo=0,Qd=null,$l=-1,ql=0;function pt(){return ae&6?De():$l!==-1?$l:$l=De()}function xr(t){return t.mode&1?ae&2&&Ye!==0?Ye&-Ye:ik.transition!==null?(ql===0&&(ql=P0()),ql):(t=ue,t!==0||(t=window.event,t=t===void 0?16:j0(t.type)),t):1}function tn(t,e,n,r){if(50<Uo)throw Uo=0,Qd=null,Error(F(185));Ca(t,n,r),(!(ae&2)||t!==Ge)&&(t===Ge&&(!(ae&2)&&(oc|=n),Fe===4&&ur(t,Ye)),St(t,r),n===1&&ae===0&&!(e.mode&1)&&(Ti=De()+500,nc&&Gr()))}function St(t,e){var n=t.callbackNode;iS(t,e);var r=au(t,t===Ge?Ye:0);if(r===0)n!==null&&Qg(n),t.callbackNode=null,t.callbackPriority=0;else if(e=r&-r,t.callbackPriority!==e){if(n!=null&&Qg(n),e===1)t.tag===0?sk(zy.bind(null,t)):rw(zy.bind(null,t)),ek(function(){!(ae&6)&&Gr()}),n=null;else{switch(N0(r)){case 1:n=qf;break;case 4:n=R0;break;case 16:n=ou;break;case 536870912:n=b0;break;default:n=ou}n=tE(n,Kw.bind(null,t))}t.callbackPriority=e,t.callbackNode=n}}function Kw(t,e){if($l=-1,ql=0,ae&6)throw Error(F(327));var n=t.callbackNode;if(ci()&&t.callbackNode!==n)return null;var r=au(t,t===Ge?Ye:0);if(r===0)return null;if(r&30||r&t.expiredLanes||e)e=Su(t,r);else{e=r;var s=ae;ae|=2;var i=Xw();(Ge!==t||Ye!==e)&&(Cn=null,Ti=De()+500,ps(t,e));do try{Sk();break}catch(l){Qw(t,l)}while(!0);rp(),Tu.current=i,ae=s,Ve!==null?e=0:(Ge=null,Ye=0,e=Fe)}if(e!==0){if(e===2&&(s=Td(t),s!==0&&(r=s,e=Xd(t,s))),e===1)throw n=ua,ps(t,0),ur(t,r),St(t,De()),n;if(e===6)ur(t,r);else{if(s=t.current.alternate,!(r&30)&&!xk(s)&&(e=Su(t,r),e===2&&(i=Td(t),i!==0&&(r=i,e=Xd(t,i))),e===1))throw n=ua,ps(t,0),ur(t,r),St(t,De()),n;switch(t.finishedWork=s,t.finishedLanes=r,e){case 0:case 1:throw Error(F(345));case 2:as(t,wt,Cn);break;case 3:if(ur(t,r),(r&130023424)===r&&(e=_p+500-De(),10<e)){if(au(t,0)!==0)break;if(s=t.suspendedLanes,(s&r)!==r){pt(),t.pingedLanes|=t.suspendedLanes&s;break}t.timeoutHandle=bd(as.bind(null,t,wt,Cn),e);break}as(t,wt,Cn);break;case 4:if(ur(t,r),(r&4194240)===r)break;for(e=t.eventTimes,s=-1;0<r;){var o=31-en(r);i=1<<o,o=e[o],o>s&&(s=o),r&=~i}if(r=s,r=De()-r,r=(120>r?120:480>r?480:1080>r?1080:1920>r?1920:3e3>r?3e3:4320>r?4320:1960*Tk(r/1960))-r,10<r){t.timeoutHandle=bd(as.bind(null,t,wt,Cn),r);break}as(t,wt,Cn);break;case 5:as(t,wt,Cn);break;default:throw Error(F(329))}}}return St(t,De()),t.callbackNode===n?Kw.bind(null,t):null}function Xd(t,e){var n=jo;return t.current.memoizedState.isDehydrated&&(ps(t,e).flags|=256),t=Su(t,e),t!==2&&(e=wt,wt=n,e!==null&&Yd(e)),t}function Yd(t){wt===null?wt=t:wt.push.apply(wt,t)}function xk(t){for(var e=t;;){if(e.flags&16384){var n=e.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var r=0;r<n.length;r++){var s=n[r],i=s.getSnapshot;s=s.value;try{if(!sn(i(),s))return!1}catch{return!1}}}if(n=e.child,e.subtreeFlags&16384&&n!==null)n.return=e,e=n;else{if(e===t)break;for(;e.sibling===null;){if(e.return===null||e.return===t)return!0;e=e.return}e.sibling.return=e.return,e=e.sibling}}return!0}function ur(t,e){for(e&=~yp,e&=~oc,t.suspendedLanes|=e,t.pingedLanes&=~e,t=t.expirationTimes;0<e;){var n=31-en(e),r=1<<n;t[n]=-1,e&=~r}}function zy(t){if(ae&6)throw Error(F(327));ci();var e=au(t,0);if(!(e&1))return St(t,De()),null;var n=Su(t,e);if(t.tag!==0&&n===2){var r=Td(t);r!==0&&(e=r,n=Xd(t,r))}if(n===1)throw n=ua,ps(t,0),ur(t,e),St(t,De()),n;if(n===6)throw Error(F(345));return t.finishedWork=t.current.alternate,t.finishedLanes=e,as(t,wt,Cn),St(t,De()),null}function vp(t,e){var n=ae;ae|=1;try{return t(e)}finally{ae=n,ae===0&&(Ti=De()+500,nc&&Gr())}}function Es(t){mr!==null&&mr.tag===0&&!(ae&6)&&ci();var e=ae;ae|=1;var n=Bt.transition,r=ue;try{if(Bt.transition=null,ue=1,t)return t()}finally{ue=r,Bt.transition=n,ae=e,!(ae&6)&&Gr()}}function wp(){Ct=ri.current,ye(ri)}function ps(t,e){t.finishedWork=null,t.finishedLanes=0;var n=t.timeoutHandle;if(n!==-1&&(t.timeoutHandle=-1,ZS(n)),Ve!==null)for(n=Ve.return;n!==null;){var r=n;switch(ep(r),r.tag){case 1:r=r.type.childContextTypes,r!=null&&du();break;case 3:wi(),ye(xt),ye(lt),up();break;case 5:lp(r);break;case 4:wi();break;case 13:ye(xe);break;case 19:ye(xe);break;case 10:sp(r.type._context);break;case 22:case 23:wp()}n=n.return}if(Ge=t,Ve=t=Ir(t.current,null),Ye=Ct=e,Fe=0,ua=null,yp=oc=ws=0,wt=jo=null,cs!==null){for(e=0;e<cs.length;e++)if(n=cs[e],r=n.interleaved,r!==null){n.interleaved=null;var s=r.next,i=n.pending;if(i!==null){var o=i.next;i.next=s,r.next=o}n.pending=r}cs=null}return t}function Qw(t,e){do{var n=Ve;try{if(rp(),Fl.current=Eu,wu){for(var r=Se.memoizedState;r!==null;){var s=r.queue;s!==null&&(s.pending=null),r=r.next}wu=!1}if(vs=0,qe=Ue=Se=null,Lo=!1,oa=0,gp.current=null,n===null||n.return===null){Fe=1,ua=e,Ve=null;break}e:{var i=t,o=n.return,l=n,u=e;if(e=Ye,l.flags|=32768,u!==null&&typeof u=="object"&&typeof u.then=="function"){var c=u,f=l,p=f.tag;if(!(f.mode&1)&&(p===0||p===11||p===15)){var g=f.alternate;g?(f.updateQueue=g.updateQueue,f.memoizedState=g.memoizedState,f.lanes=g.lanes):(f.updateQueue=null,f.memoizedState=null)}var w=Ay(o);if(w!==null){w.flags&=-257,Ry(w,o,l,i,e),w.mode&1&&Cy(i,c,e),e=w,u=c;var x=e.updateQueue;if(x===null){var b=new Set;b.add(u),e.updateQueue=b}else x.add(u);break e}else{if(!(e&1)){Cy(i,c,e),Ep();break e}u=Error(F(426))}}else if(we&&l.mode&1){var P=Ay(o);if(P!==null){!(P.flags&65536)&&(P.flags|=256),Ry(P,o,l,i,e),tp(Ei(u,l));break e}}i=u=Ei(u,l),Fe!==4&&(Fe=2),jo===null?jo=[i]:jo.push(i),i=o;do{switch(i.tag){case 3:i.flags|=65536,e&=-e,i.lanes|=e;var S=Nw(i,u,e);Ey(i,S);break e;case 1:l=u;var v=i.type,C=i.stateNode;if(!(i.flags&128)&&(typeof v.getDerivedStateFromError=="function"||C!==null&&typeof C.componentDidCatch=="function"&&(Tr===null||!Tr.has(C)))){i.flags|=65536,e&=-e,i.lanes|=e;var D=Dw(i,l,e);Ey(i,D);break e}}i=i.return}while(i!==null)}Jw(n)}catch(j){e=j,Ve===n&&n!==null&&(Ve=n=n.return);continue}break}while(!0)}function Xw(){var t=Tu.current;return Tu.current=Eu,t===null?Eu:t}function Ep(){(Fe===0||Fe===3||Fe===2)&&(Fe=4),Ge===null||!(ws&268435455)&&!(oc&268435455)||ur(Ge,Ye)}function Su(t,e){var n=ae;ae|=2;var r=Xw();(Ge!==t||Ye!==e)&&(Cn=null,ps(t,e));do try{Ik();break}catch(s){Qw(t,s)}while(!0);if(rp(),ae=n,Tu.current=r,Ve!==null)throw Error(F(261));return Ge=null,Ye=0,Fe}function Ik(){for(;Ve!==null;)Yw(Ve)}function Sk(){for(;Ve!==null&&!X1();)Yw(Ve)}function Yw(t){var e=eE(t.alternate,t,Ct);t.memoizedProps=t.pendingProps,e===null?Jw(t):Ve=e,gp.current=null}function Jw(t){var e=t;do{var n=e.alternate;if(t=e.return,e.flags&32768){if(n=_k(n,e),n!==null){n.flags&=32767,Ve=n;return}if(t!==null)t.flags|=32768,t.subtreeFlags=0,t.deletions=null;else{Fe=6,Ve=null;return}}else if(n=yk(n,e,Ct),n!==null){Ve=n;return}if(e=e.sibling,e!==null){Ve=e;return}Ve=e=t}while(e!==null);Fe===0&&(Fe=5)}function as(t,e,n){var r=ue,s=Bt.transition;try{Bt.transition=null,ue=1,kk(t,e,n,r)}finally{Bt.transition=s,ue=r}return null}function kk(t,e,n,r){do ci();while(mr!==null);if(ae&6)throw Error(F(327));n=t.finishedWork;var s=t.finishedLanes;if(n===null)return null;if(t.finishedWork=null,t.finishedLanes=0,n===t.current)throw Error(F(177));t.callbackNode=null,t.callbackPriority=0;var i=n.lanes|n.childLanes;if(oS(t,i),t===Ge&&(Ve=Ge=null,Ye=0),!(n.subtreeFlags&2064)&&!(n.flags&2064)||Tl||(Tl=!0,tE(ou,function(){return ci(),null})),i=(n.flags&15990)!==0,n.subtreeFlags&15990||i){i=Bt.transition,Bt.transition=null;var o=ue;ue=1;var l=ae;ae|=4,gp.current=null,wk(t,n),Ww(n,t),WS(Ad),lu=!!Cd,Ad=Cd=null,t.current=n,Ek(n),Y1(),ae=l,ue=o,Bt.transition=i}else t.current=n;if(Tl&&(Tl=!1,mr=t,Iu=s),i=t.pendingLanes,i===0&&(Tr=null),eS(n.stateNode),St(t,De()),e!==null)for(r=t.onRecoverableError,n=0;n<e.length;n++)s=e[n],r(s.value,{componentStack:s.stack,digest:s.digest});if(xu)throw xu=!1,t=Kd,Kd=null,t;return Iu&1&&t.tag!==0&&ci(),i=t.pendingLanes,i&1?t===Qd?Uo++:(Uo=0,Qd=t):Uo=0,Gr(),null}function ci(){if(mr!==null){var t=N0(Iu),e=Bt.transition,n=ue;try{if(Bt.transition=null,ue=16>t?16:t,mr===null)var r=!1;else{if(t=mr,mr=null,Iu=0,ae&6)throw Error(F(331));var s=ae;for(ae|=4,H=t.current;H!==null;){var i=H,o=i.child;if(H.flags&16){var l=i.deletions;if(l!==null){for(var u=0;u<l.length;u++){var c=l[u];for(H=c;H!==null;){var f=H;switch(f.tag){case 0:case 11:case 15:Mo(8,f,i)}var p=f.child;if(p!==null)p.return=f,H=p;else for(;H!==null;){f=H;var g=f.sibling,w=f.return;if($w(f),f===c){H=null;break}if(g!==null){g.return=w,H=g;break}H=w}}}var x=i.alternate;if(x!==null){var b=x.child;if(b!==null){x.child=null;do{var P=b.sibling;b.sibling=null,b=P}while(b!==null)}}H=i}}if(i.subtreeFlags&2064&&o!==null)o.return=i,H=o;else e:for(;H!==null;){if(i=H,i.flags&2048)switch(i.tag){case 0:case 11:case 15:Mo(9,i,i.return)}var S=i.sibling;if(S!==null){S.return=i.return,H=S;break e}H=i.return}}var v=t.current;for(H=v;H!==null;){o=H;var C=o.child;if(o.subtreeFlags&2064&&C!==null)C.return=o,H=C;else e:for(o=v;H!==null;){if(l=H,l.flags&2048)try{switch(l.tag){case 0:case 11:case 15:ic(9,l)}}catch(j){be(l,l.return,j)}if(l===o){H=null;break e}var D=l.sibling;if(D!==null){D.return=l.return,H=D;break e}H=l.return}}if(ae=s,Gr(),gn&&typeof gn.onPostCommitFiberRoot=="function")try{gn.onPostCommitFiberRoot(Yu,t)}catch{}r=!0}return r}finally{ue=n,Bt.transition=e}}return!1}function By(t,e,n){e=Ei(n,e),e=Nw(t,e,1),t=Er(t,e,1),e=pt(),t!==null&&(Ca(t,1,e),St(t,e))}function be(t,e,n){if(t.tag===3)By(t,t,n);else for(;e!==null;){if(e.tag===3){By(e,t,n);break}else if(e.tag===1){var r=e.stateNode;if(typeof e.type.getDerivedStateFromError=="function"||typeof r.componentDidCatch=="function"&&(Tr===null||!Tr.has(r))){t=Ei(n,t),t=Dw(e,t,1),e=Er(e,t,1),t=pt(),e!==null&&(Ca(e,1,t),St(e,t));break}}e=e.return}}function Ck(t,e,n){var r=t.pingCache;r!==null&&r.delete(e),e=pt(),t.pingedLanes|=t.suspendedLanes&n,Ge===t&&(Ye&n)===n&&(Fe===4||Fe===3&&(Ye&130023424)===Ye&&500>De()-_p?ps(t,0):yp|=n),St(t,e)}function Zw(t,e){e===0&&(t.mode&1?(e=dl,dl<<=1,!(dl&130023424)&&(dl=4194304)):e=1);var n=pt();t=$n(t,e),t!==null&&(Ca(t,e,n),St(t,n))}function Ak(t){var e=t.memoizedState,n=0;e!==null&&(n=e.retryLane),Zw(t,n)}function Rk(t,e){var n=0;switch(t.tag){case 13:var r=t.stateNode,s=t.memoizedState;s!==null&&(n=s.retryLane);break;case 19:r=t.stateNode;break;default:throw Error(F(314))}r!==null&&r.delete(e),Zw(t,n)}var eE;eE=function(t,e,n){if(t!==null)if(t.memoizedProps!==e.pendingProps||xt.current)Tt=!0;else{if(!(t.lanes&n)&&!(e.flags&128))return Tt=!1,gk(t,e,n);Tt=!!(t.flags&131072)}else Tt=!1,we&&e.flags&1048576&&sw(e,mu,e.index);switch(e.lanes=0,e.tag){case 2:var r=e.type;Bl(t,e),t=e.pendingProps;var s=yi(e,lt.current);ui(e,n),s=hp(null,e,r,t,s,n);var i=dp();return e.flags|=1,typeof s=="object"&&s!==null&&typeof s.render=="function"&&s.$$typeof===void 0?(e.tag=1,e.memoizedState=null,e.updateQueue=null,It(r)?(i=!0,fu(e)):i=!1,e.memoizedState=s.state!==null&&s.state!==void 0?s.state:null,op(e),s.updater=sc,e.stateNode=s,s._reactInternals=e,Md(e,r,t,n),e=Fd(null,e,r,!0,i,n)):(e.tag=0,we&&i&&Zf(e),ft(null,e,s,n),e=e.child),e;case 16:r=e.elementType;e:{switch(Bl(t,e),t=e.pendingProps,s=r._init,r=s(r._payload),e.type=r,s=e.tag=Pk(r),t=Xt(r,t),s){case 0:e=Ud(null,e,r,t,n);break e;case 1:e=Ny(null,e,r,t,n);break e;case 11:e=by(null,e,r,t,n);break e;case 14:e=Py(null,e,r,Xt(r.type,t),n);break e}throw Error(F(306,r,""))}return e;case 0:return r=e.type,s=e.pendingProps,s=e.elementType===r?s:Xt(r,s),Ud(t,e,r,s,n);case 1:return r=e.type,s=e.pendingProps,s=e.elementType===r?s:Xt(r,s),Ny(t,e,r,s,n);case 3:e:{if(Mw(e),t===null)throw Error(F(387));r=e.pendingProps,i=e.memoizedState,s=i.element,cw(t,e),_u(e,r,null,n);var o=e.memoizedState;if(r=o.element,i.isDehydrated)if(i={element:r,isDehydrated:!1,cache:o.cache,pendingSuspenseBoundaries:o.pendingSuspenseBoundaries,transitions:o.transitions},e.updateQueue.baseState=i,e.memoizedState=i,e.flags&256){s=Ei(Error(F(423)),e),e=Dy(t,e,r,n,s);break e}else if(r!==s){s=Ei(Error(F(424)),e),e=Dy(t,e,r,n,s);break e}else for(bt=wr(e.stateNode.containerInfo.firstChild),Dt=e,we=!0,Jt=null,n=lw(e,null,r,n),e.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(_i(),r===s){e=qn(t,e,n);break e}ft(t,e,r,n)}e=e.child}return e;case 5:return hw(e),t===null&&Od(e),r=e.type,s=e.pendingProps,i=t!==null?t.memoizedProps:null,o=s.children,Rd(r,s)?o=null:i!==null&&Rd(r,i)&&(e.flags|=32),Lw(t,e),ft(t,e,o,n),e.child;case 6:return t===null&&Od(e),null;case 13:return jw(t,e,n);case 4:return ap(e,e.stateNode.containerInfo),r=e.pendingProps,t===null?e.child=vi(e,null,r,n):ft(t,e,r,n),e.child;case 11:return r=e.type,s=e.pendingProps,s=e.elementType===r?s:Xt(r,s),by(t,e,r,s,n);case 7:return ft(t,e,e.pendingProps,n),e.child;case 8:return ft(t,e,e.pendingProps.children,n),e.child;case 12:return ft(t,e,e.pendingProps.children,n),e.child;case 10:e:{if(r=e.type._context,s=e.pendingProps,i=e.memoizedProps,o=s.value,pe(gu,r._currentValue),r._currentValue=o,i!==null)if(sn(i.value,o)){if(i.children===s.children&&!xt.current){e=qn(t,e,n);break e}}else for(i=e.child,i!==null&&(i.return=e);i!==null;){var l=i.dependencies;if(l!==null){o=i.child;for(var u=l.firstContext;u!==null;){if(u.context===r){if(i.tag===1){u=Ln(-1,n&-n),u.tag=2;var c=i.updateQueue;if(c!==null){c=c.shared;var f=c.pending;f===null?u.next=u:(u.next=f.next,f.next=u),c.pending=u}}i.lanes|=n,u=i.alternate,u!==null&&(u.lanes|=n),Vd(i.return,n,e),l.lanes|=n;break}u=u.next}}else if(i.tag===10)o=i.type===e.type?null:i.child;else if(i.tag===18){if(o=i.return,o===null)throw Error(F(341));o.lanes|=n,l=o.alternate,l!==null&&(l.lanes|=n),Vd(o,n,e),o=i.sibling}else o=i.child;if(o!==null)o.return=i;else for(o=i;o!==null;){if(o===e){o=null;break}if(i=o.sibling,i!==null){i.return=o.return,o=i;break}o=o.return}i=o}ft(t,e,s.children,n),e=e.child}return e;case 9:return s=e.type,r=e.pendingProps.children,ui(e,n),s=qt(s),r=r(s),e.flags|=1,ft(t,e,r,n),e.child;case 14:return r=e.type,s=Xt(r,e.pendingProps),s=Xt(r.type,s),Py(t,e,r,s,n);case 15:return Ow(t,e,e.type,e.pendingProps,n);case 17:return r=e.type,s=e.pendingProps,s=e.elementType===r?s:Xt(r,s),Bl(t,e),e.tag=1,It(r)?(t=!0,fu(e)):t=!1,ui(e,n),Pw(e,r,s),Md(e,r,s,n),Fd(null,e,r,!0,t,n);case 19:return Uw(t,e,n);case 22:return Vw(t,e,n)}throw Error(F(156,e.tag))};function tE(t,e){return A0(t,e)}function bk(t,e,n,r){this.tag=t,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=e,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=r,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function zt(t,e,n,r){return new bk(t,e,n,r)}function Tp(t){return t=t.prototype,!(!t||!t.isReactComponent)}function Pk(t){if(typeof t=="function")return Tp(t)?1:0;if(t!=null){if(t=t.$$typeof,t===zf)return 11;if(t===Bf)return 14}return 2}function Ir(t,e){var n=t.alternate;return n===null?(n=zt(t.tag,e,t.key,t.mode),n.elementType=t.elementType,n.type=t.type,n.stateNode=t.stateNode,n.alternate=t,t.alternate=n):(n.pendingProps=e,n.type=t.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=t.flags&14680064,n.childLanes=t.childLanes,n.lanes=t.lanes,n.child=t.child,n.memoizedProps=t.memoizedProps,n.memoizedState=t.memoizedState,n.updateQueue=t.updateQueue,e=t.dependencies,n.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext},n.sibling=t.sibling,n.index=t.index,n.ref=t.ref,n}function Hl(t,e,n,r,s,i){var o=2;if(r=t,typeof t=="function")Tp(t)&&(o=1);else if(typeof t=="string")o=5;else e:switch(t){case Gs:return ms(n.children,s,i,e);case Ff:o=8,s|=8;break;case ad:return t=zt(12,n,e,s|2),t.elementType=ad,t.lanes=i,t;case ld:return t=zt(13,n,e,s),t.elementType=ld,t.lanes=i,t;case ud:return t=zt(19,n,e,s),t.elementType=ud,t.lanes=i,t;case h0:return ac(n,s,i,e);default:if(typeof t=="object"&&t!==null)switch(t.$$typeof){case u0:o=10;break e;case c0:o=9;break e;case zf:o=11;break e;case Bf:o=14;break e;case or:o=16,r=null;break e}throw Error(F(130,t==null?t:typeof t,""))}return e=zt(o,n,e,s),e.elementType=t,e.type=r,e.lanes=i,e}function ms(t,e,n,r){return t=zt(7,t,r,e),t.lanes=n,t}function ac(t,e,n,r){return t=zt(22,t,r,e),t.elementType=h0,t.lanes=n,t.stateNode={isHidden:!1},t}function jh(t,e,n){return t=zt(6,t,null,e),t.lanes=n,t}function Uh(t,e,n){return e=zt(4,t.children!==null?t.children:[],t.key,e),e.lanes=n,e.stateNode={containerInfo:t.containerInfo,pendingChildren:null,implementation:t.implementation},e}function Nk(t,e,n,r,s){this.tag=e,this.containerInfo=t,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=vh(0),this.expirationTimes=vh(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=vh(0),this.identifierPrefix=r,this.onRecoverableError=s,this.mutableSourceEagerHydrationData=null}function xp(t,e,n,r,s,i,o,l,u){return t=new Nk(t,e,n,l,u),e===1?(e=1,i===!0&&(e|=8)):e=0,i=zt(3,null,null,e),t.current=i,i.stateNode=t,i.memoizedState={element:r,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},op(i),t}function Dk(t,e,n){var r=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:Ws,key:r==null?null:""+r,children:t,containerInfo:e,implementation:n}}function nE(t){if(!t)return Dr;t=t._reactInternals;e:{if(As(t)!==t||t.tag!==1)throw Error(F(170));var e=t;do{switch(e.tag){case 3:e=e.stateNode.context;break e;case 1:if(It(e.type)){e=e.stateNode.__reactInternalMemoizedMergedChildContext;break e}}e=e.return}while(e!==null);throw Error(F(171))}if(t.tag===1){var n=t.type;if(It(n))return nw(t,n,e)}return e}function rE(t,e,n,r,s,i,o,l,u){return t=xp(n,r,!0,t,s,i,o,l,u),t.context=nE(null),n=t.current,r=pt(),s=xr(n),i=Ln(r,s),i.callback=e??null,Er(n,i,s),t.current.lanes=s,Ca(t,s,r),St(t,r),t}function lc(t,e,n,r){var s=e.current,i=pt(),o=xr(s);return n=nE(n),e.context===null?e.context=n:e.pendingContext=n,e=Ln(i,o),e.payload={element:t},r=r===void 0?null:r,r!==null&&(e.callback=r),t=Er(s,e,o),t!==null&&(tn(t,s,o,i),Ul(t,s,o)),o}function ku(t){if(t=t.current,!t.child)return null;switch(t.child.tag){case 5:return t.child.stateNode;default:return t.child.stateNode}}function $y(t,e){if(t=t.memoizedState,t!==null&&t.dehydrated!==null){var n=t.retryLane;t.retryLane=n!==0&&n<e?n:e}}function Ip(t,e){$y(t,e),(t=t.alternate)&&$y(t,e)}function Ok(){return null}var sE=typeof reportError=="function"?reportError:function(t){console.error(t)};function Sp(t){this._internalRoot=t}uc.prototype.render=Sp.prototype.render=function(t){var e=this._internalRoot;if(e===null)throw Error(F(409));lc(t,e,null,null)};uc.prototype.unmount=Sp.prototype.unmount=function(){var t=this._internalRoot;if(t!==null){this._internalRoot=null;var e=t.containerInfo;Es(function(){lc(null,t,null,null)}),e[Bn]=null}};function uc(t){this._internalRoot=t}uc.prototype.unstable_scheduleHydration=function(t){if(t){var e=V0();t={blockedOn:null,target:t,priority:e};for(var n=0;n<lr.length&&e!==0&&e<lr[n].priority;n++);lr.splice(n,0,t),n===0&&M0(t)}};function kp(t){return!(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11)}function cc(t){return!(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11&&(t.nodeType!==8||t.nodeValue!==" react-mount-point-unstable "))}function qy(){}function Vk(t,e,n,r,s){if(s){if(typeof r=="function"){var i=r;r=function(){var c=ku(o);i.call(c)}}var o=rE(e,r,t,0,null,!1,!1,"",qy);return t._reactRootContainer=o,t[Bn]=o.current,ta(t.nodeType===8?t.parentNode:t),Es(),o}for(;s=t.lastChild;)t.removeChild(s);if(typeof r=="function"){var l=r;r=function(){var c=ku(u);l.call(c)}}var u=xp(t,0,!1,null,null,!1,!1,"",qy);return t._reactRootContainer=u,t[Bn]=u.current,ta(t.nodeType===8?t.parentNode:t),Es(function(){lc(e,u,n,r)}),u}function hc(t,e,n,r,s){var i=n._reactRootContainer;if(i){var o=i;if(typeof s=="function"){var l=s;s=function(){var u=ku(o);l.call(u)}}lc(e,o,t,s)}else o=Vk(n,e,t,s,r);return ku(o)}D0=function(t){switch(t.tag){case 3:var e=t.stateNode;if(e.current.memoizedState.isDehydrated){var n=Io(e.pendingLanes);n!==0&&(Hf(e,n|1),St(e,De()),!(ae&6)&&(Ti=De()+500,Gr()))}break;case 13:Es(function(){var r=$n(t,1);if(r!==null){var s=pt();tn(r,t,1,s)}}),Ip(t,1)}};Wf=function(t){if(t.tag===13){var e=$n(t,134217728);if(e!==null){var n=pt();tn(e,t,134217728,n)}Ip(t,134217728)}};O0=function(t){if(t.tag===13){var e=xr(t),n=$n(t,e);if(n!==null){var r=pt();tn(n,t,e,r)}Ip(t,e)}};V0=function(){return ue};L0=function(t,e){var n=ue;try{return ue=t,e()}finally{ue=n}};vd=function(t,e,n){switch(e){case"input":if(dd(t,n),e=n.name,n.type==="radio"&&e!=null){for(n=t;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+e)+'][type="radio"]'),e=0;e<n.length;e++){var r=n[e];if(r!==t&&r.form===t.form){var s=tc(r);if(!s)throw Error(F(90));f0(r),dd(r,s)}}}break;case"textarea":m0(t,n);break;case"select":e=n.value,e!=null&&ii(t,!!n.multiple,e,!1)}};T0=vp;x0=Es;var Lk={usingClientEntryPoint:!1,Events:[Ra,Ys,tc,w0,E0,vp]},vo={findFiberByHostInstance:us,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},Mk={bundleType:vo.bundleType,version:vo.version,rendererPackageName:vo.rendererPackageName,rendererConfig:vo.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:Qn.ReactCurrentDispatcher,findHostInstanceByFiber:function(t){return t=k0(t),t===null?null:t.stateNode},findFiberByHostInstance:vo.findFiberByHostInstance||Ok,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var xl=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!xl.isDisabled&&xl.supportsFiber)try{Yu=xl.inject(Mk),gn=xl}catch{}}Vt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Lk;Vt.createPortal=function(t,e){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!kp(e))throw Error(F(200));return Dk(t,e,null,n)};Vt.createRoot=function(t,e){if(!kp(t))throw Error(F(299));var n=!1,r="",s=sE;return e!=null&&(e.unstable_strictMode===!0&&(n=!0),e.identifierPrefix!==void 0&&(r=e.identifierPrefix),e.onRecoverableError!==void 0&&(s=e.onRecoverableError)),e=xp(t,1,!1,null,null,n,!1,r,s),t[Bn]=e.current,ta(t.nodeType===8?t.parentNode:t),new Sp(e)};Vt.findDOMNode=function(t){if(t==null)return null;if(t.nodeType===1)return t;var e=t._reactInternals;if(e===void 0)throw typeof t.render=="function"?Error(F(188)):(t=Object.keys(t).join(","),Error(F(268,t)));return t=k0(e),t=t===null?null:t.stateNode,t};Vt.flushSync=function(t){return Es(t)};Vt.hydrate=function(t,e,n){if(!cc(e))throw Error(F(200));return hc(null,t,e,!0,n)};Vt.hydrateRoot=function(t,e,n){if(!kp(t))throw Error(F(405));var r=n!=null&&n.hydratedSources||null,s=!1,i="",o=sE;if(n!=null&&(n.unstable_strictMode===!0&&(s=!0),n.identifierPrefix!==void 0&&(i=n.identifierPrefix),n.onRecoverableError!==void 0&&(o=n.onRecoverableError)),e=rE(e,null,t,1,n??null,s,!1,i,o),t[Bn]=e.current,ta(t),r)for(t=0;t<r.length;t++)n=r[t],s=n._getVersion,s=s(n._source),e.mutableSourceEagerHydrationData==null?e.mutableSourceEagerHydrationData=[n,s]:e.mutableSourceEagerHydrationData.push(n,s);return new uc(e)};Vt.render=function(t,e,n){if(!cc(e))throw Error(F(200));return hc(null,t,e,!1,n)};Vt.unmountComponentAtNode=function(t){if(!cc(t))throw Error(F(40));return t._reactRootContainer?(Es(function(){hc(null,null,t,!1,function(){t._reactRootContainer=null,t[Bn]=null})}),!0):!1};Vt.unstable_batchedUpdates=vp;Vt.unstable_renderSubtreeIntoContainer=function(t,e,n,r){if(!cc(n))throw Error(F(200));if(t==null||t._reactInternals===void 0)throw Error(F(38));return hc(t,e,n,!1,r)};Vt.version="18.3.1-next-f1338f8080-20240426";function iE(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(iE)}catch(t){console.error(t)}}iE(),i0.exports=Vt;var jk=i0.exports,oE,Hy=jk;oE=Hy.createRoot,Hy.hydrateRoot;/**
 * @remix-run/router v1.23.2
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function ca(){return ca=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},ca.apply(this,arguments)}var gr;(function(t){t.Pop="POP",t.Push="PUSH",t.Replace="REPLACE"})(gr||(gr={}));const Wy="popstate";function Uk(t){t===void 0&&(t={});function e(r,s){let{pathname:i,search:o,hash:l}=r.location;return Jd("",{pathname:i,search:o,hash:l},s.state&&s.state.usr||null,s.state&&s.state.key||"default")}function n(r,s){return typeof s=="string"?s:Cu(s)}return zk(e,n,null,t)}function ke(t,e){if(t===!1||t===null||typeof t>"u")throw new Error(e)}function Cp(t,e){if(!t){typeof console<"u"&&console.warn(e);try{throw new Error(e)}catch{}}}function Fk(){return Math.random().toString(36).substr(2,8)}function Gy(t,e){return{usr:t.state,key:t.key,idx:e}}function Jd(t,e,n,r){return n===void 0&&(n=null),ca({pathname:typeof t=="string"?t:t.pathname,search:"",hash:""},typeof e=="string"?Vi(e):e,{state:n,key:e&&e.key||r||Fk()})}function Cu(t){let{pathname:e="/",search:n="",hash:r=""}=t;return n&&n!=="?"&&(e+=n.charAt(0)==="?"?n:"?"+n),r&&r!=="#"&&(e+=r.charAt(0)==="#"?r:"#"+r),e}function Vi(t){let e={};if(t){let n=t.indexOf("#");n>=0&&(e.hash=t.substr(n),t=t.substr(0,n));let r=t.indexOf("?");r>=0&&(e.search=t.substr(r),t=t.substr(0,r)),t&&(e.pathname=t)}return e}function zk(t,e,n,r){r===void 0&&(r={});let{window:s=document.defaultView,v5Compat:i=!1}=r,o=s.history,l=gr.Pop,u=null,c=f();c==null&&(c=0,o.replaceState(ca({},o.state,{idx:c}),""));function f(){return(o.state||{idx:null}).idx}function p(){l=gr.Pop;let P=f(),S=P==null?null:P-c;c=P,u&&u({action:l,location:b.location,delta:S})}function g(P,S){l=gr.Push;let v=Jd(b.location,P,S);c=f()+1;let C=Gy(v,c),D=b.createHref(v);try{o.pushState(C,"",D)}catch(j){if(j instanceof DOMException&&j.name==="DataCloneError")throw j;s.location.assign(D)}i&&u&&u({action:l,location:b.location,delta:1})}function w(P,S){l=gr.Replace;let v=Jd(b.location,P,S);c=f();let C=Gy(v,c),D=b.createHref(v);o.replaceState(C,"",D),i&&u&&u({action:l,location:b.location,delta:0})}function x(P){let S=s.location.origin!=="null"?s.location.origin:s.location.href,v=typeof P=="string"?P:Cu(P);return v=v.replace(/ $/,"%20"),ke(S,"No window.location.(origin|href) available to create URL for href: "+v),new URL(v,S)}let b={get action(){return l},get location(){return t(s,o)},listen(P){if(u)throw new Error("A history only accepts one active listener");return s.addEventListener(Wy,p),u=P,()=>{s.removeEventListener(Wy,p),u=null}},createHref(P){return e(s,P)},createURL:x,encodeLocation(P){let S=x(P);return{pathname:S.pathname,search:S.search,hash:S.hash}},push:g,replace:w,go(P){return o.go(P)}};return b}var Ky;(function(t){t.data="data",t.deferred="deferred",t.redirect="redirect",t.error="error"})(Ky||(Ky={}));function Bk(t,e,n){return n===void 0&&(n="/"),$k(t,e,n)}function $k(t,e,n,r){let s=typeof e=="string"?Vi(e):e,i=xi(s.pathname||"/",n);if(i==null)return null;let o=aE(t);qk(o);let l=null;for(let u=0;l==null&&u<o.length;++u){let c=tC(i);l=Zk(o[u],c)}return l}function aE(t,e,n,r){e===void 0&&(e=[]),n===void 0&&(n=[]),r===void 0&&(r="");let s=(i,o,l)=>{let u={relativePath:l===void 0?i.path||"":l,caseSensitive:i.caseSensitive===!0,childrenIndex:o,route:i};u.relativePath.startsWith("/")&&(ke(u.relativePath.startsWith(r),'Absolute route path "'+u.relativePath+'" nested under path '+('"'+r+'" is not valid. An absolute child route path ')+"must start with the combined path of all its parent routes."),u.relativePath=u.relativePath.slice(r.length));let c=Sr([r,u.relativePath]),f=n.concat(u);i.children&&i.children.length>0&&(ke(i.index!==!0,"Index routes must not have child routes. Please remove "+('all child routes from route path "'+c+'".')),aE(i.children,e,f,c)),!(i.path==null&&!i.index)&&e.push({path:c,score:Yk(c,i.index),routesMeta:f})};return t.forEach((i,o)=>{var l;if(i.path===""||!((l=i.path)!=null&&l.includes("?")))s(i,o);else for(let u of lE(i.path))s(i,o,u)}),e}function lE(t){let e=t.split("/");if(e.length===0)return[];let[n,...r]=e,s=n.endsWith("?"),i=n.replace(/\?$/,"");if(r.length===0)return s?[i,""]:[i];let o=lE(r.join("/")),l=[];return l.push(...o.map(u=>u===""?i:[i,u].join("/"))),s&&l.push(...o),l.map(u=>t.startsWith("/")&&u===""?"/":u)}function qk(t){t.sort((e,n)=>e.score!==n.score?n.score-e.score:Jk(e.routesMeta.map(r=>r.childrenIndex),n.routesMeta.map(r=>r.childrenIndex)))}const Hk=/^:[\w-]+$/,Wk=3,Gk=2,Kk=1,Qk=10,Xk=-2,Qy=t=>t==="*";function Yk(t,e){let n=t.split("/"),r=n.length;return n.some(Qy)&&(r+=Xk),e&&(r+=Gk),n.filter(s=>!Qy(s)).reduce((s,i)=>s+(Hk.test(i)?Wk:i===""?Kk:Qk),r)}function Jk(t,e){return t.length===e.length&&t.slice(0,-1).every((r,s)=>r===e[s])?t[t.length-1]-e[e.length-1]:0}function Zk(t,e,n){let{routesMeta:r}=t,s={},i="/",o=[];for(let l=0;l<r.length;++l){let u=r[l],c=l===r.length-1,f=i==="/"?e:e.slice(i.length)||"/",p=Zd({path:u.relativePath,caseSensitive:u.caseSensitive,end:c},f),g=u.route;if(!p)return null;Object.assign(s,p.params),o.push({params:s,pathname:Sr([i,p.pathname]),pathnameBase:oC(Sr([i,p.pathnameBase])),route:g}),p.pathnameBase!=="/"&&(i=Sr([i,p.pathnameBase]))}return o}function Zd(t,e){typeof t=="string"&&(t={path:t,caseSensitive:!1,end:!0});let[n,r]=eC(t.path,t.caseSensitive,t.end),s=e.match(n);if(!s)return null;let i=s[0],o=i.replace(/(.)\/+$/,"$1"),l=s.slice(1);return{params:r.reduce((c,f,p)=>{let{paramName:g,isOptional:w}=f;if(g==="*"){let b=l[p]||"";o=i.slice(0,i.length-b.length).replace(/(.)\/+$/,"$1")}const x=l[p];return w&&!x?c[g]=void 0:c[g]=(x||"").replace(/%2F/g,"/"),c},{}),pathname:i,pathnameBase:o,pattern:t}}function eC(t,e,n){e===void 0&&(e=!1),n===void 0&&(n=!0),Cp(t==="*"||!t.endsWith("*")||t.endsWith("/*"),'Route path "'+t+'" will be treated as if it were '+('"'+t.replace(/\*$/,"/*")+'" because the `*` character must ')+"always follow a `/` in the pattern. To get rid of this warning, "+('please change the route path to "'+t.replace(/\*$/,"/*")+'".'));let r=[],s="^"+t.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(o,l,u)=>(r.push({paramName:l,isOptional:u!=null}),u?"/?([^\\/]+)?":"/([^\\/]+)"));return t.endsWith("*")?(r.push({paramName:"*"}),s+=t==="*"||t==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):n?s+="\\/*$":t!==""&&t!=="/"&&(s+="(?:(?=\\/|$))"),[new RegExp(s,e?void 0:"i"),r]}function tC(t){try{return t.split("/").map(e=>decodeURIComponent(e).replace(/\//g,"%2F")).join("/")}catch(e){return Cp(!1,'The URL path "'+t+'" could not be decoded because it is is a malformed URL segment. This is probably due to a bad percent '+("encoding ("+e+").")),t}}function xi(t,e){if(e==="/")return t;if(!t.toLowerCase().startsWith(e.toLowerCase()))return null;let n=e.endsWith("/")?e.length-1:e.length,r=t.charAt(n);return r&&r!=="/"?null:t.slice(n)||"/"}const nC=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,rC=t=>nC.test(t);function sC(t,e){e===void 0&&(e="/");let{pathname:n,search:r="",hash:s=""}=typeof t=="string"?Vi(t):t,i;if(n)if(rC(n))i=n;else{if(n.includes("//")){let o=n;n=n.replace(/\/\/+/g,"/"),Cp(!1,"Pathnames cannot have embedded double slashes - normalizing "+(o+" -> "+n))}n.startsWith("/")?i=Xy(n.substring(1),"/"):i=Xy(n,e)}else i=e;return{pathname:i,search:aC(r),hash:lC(s)}}function Xy(t,e){let n=e.replace(/\/+$/,"").split("/");return t.split("/").forEach(s=>{s===".."?n.length>1&&n.pop():s!=="."&&n.push(s)}),n.length>1?n.join("/"):"/"}function Fh(t,e,n,r){return"Cannot include a '"+t+"' character in a manually specified "+("`to."+e+"` field ["+JSON.stringify(r)+"].  Please separate it out to the ")+("`to."+n+"` field. Alternatively you may provide the full path as ")+'a string in <Link to="..."> and the router will parse it for you.'}function iC(t){return t.filter((e,n)=>n===0||e.route.path&&e.route.path.length>0)}function Ap(t,e){let n=iC(t);return e?n.map((r,s)=>s===n.length-1?r.pathname:r.pathnameBase):n.map(r=>r.pathnameBase)}function Rp(t,e,n,r){r===void 0&&(r=!1);let s;typeof t=="string"?s=Vi(t):(s=ca({},t),ke(!s.pathname||!s.pathname.includes("?"),Fh("?","pathname","search",s)),ke(!s.pathname||!s.pathname.includes("#"),Fh("#","pathname","hash",s)),ke(!s.search||!s.search.includes("#"),Fh("#","search","hash",s)));let i=t===""||s.pathname==="",o=i?"/":s.pathname,l;if(o==null)l=n;else{let p=e.length-1;if(!r&&o.startsWith("..")){let g=o.split("/");for(;g[0]==="..";)g.shift(),p-=1;s.pathname=g.join("/")}l=p>=0?e[p]:"/"}let u=sC(s,l),c=o&&o!=="/"&&o.endsWith("/"),f=(i||o===".")&&n.endsWith("/");return!u.pathname.endsWith("/")&&(c||f)&&(u.pathname+="/"),u}const Sr=t=>t.join("/").replace(/\/\/+/g,"/"),oC=t=>t.replace(/\/+$/,"").replace(/^\/*/,"/"),aC=t=>!t||t==="?"?"":t.startsWith("?")?t:"?"+t,lC=t=>!t||t==="#"?"":t.startsWith("#")?t:"#"+t;function uC(t){return t!=null&&typeof t.status=="number"&&typeof t.statusText=="string"&&typeof t.internal=="boolean"&&"data"in t}const uE=["post","put","patch","delete"];new Set(uE);const cC=["get",...uE];new Set(cC);/**
 * React Router v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function ha(){return ha=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},ha.apply(this,arguments)}const dc=O.createContext(null),cE=O.createContext(null),Xn=O.createContext(null),fc=O.createContext(null),Kr=O.createContext({outlet:null,matches:[],isDataRoute:!1}),hE=O.createContext(null);function hC(t,e){let{relative:n}=e===void 0?{}:e;Li()||ke(!1);let{basename:r,navigator:s}=O.useContext(Xn),{hash:i,pathname:o,search:l}=pc(t,{relative:n}),u=o;return r!=="/"&&(u=o==="/"?r:Sr([r,o])),s.createHref({pathname:u,search:l,hash:i})}function Li(){return O.useContext(fc)!=null}function Mi(){return Li()||ke(!1),O.useContext(fc).location}function dE(t){O.useContext(Xn).static||O.useLayoutEffect(t)}function fE(){let{isDataRoute:t}=O.useContext(Kr);return t?IC():dC()}function dC(){Li()||ke(!1);let t=O.useContext(dc),{basename:e,future:n,navigator:r}=O.useContext(Xn),{matches:s}=O.useContext(Kr),{pathname:i}=Mi(),o=JSON.stringify(Ap(s,n.v7_relativeSplatPath)),l=O.useRef(!1);return dE(()=>{l.current=!0}),O.useCallback(function(c,f){if(f===void 0&&(f={}),!l.current)return;if(typeof c=="number"){r.go(c);return}let p=Rp(c,JSON.parse(o),i,f.relative==="path");t==null&&e!=="/"&&(p.pathname=p.pathname==="/"?e:Sr([e,p.pathname])),(f.replace?r.replace:r.push)(p,f.state,f)},[e,r,o,i,t])}function pc(t,e){let{relative:n}=e===void 0?{}:e,{future:r}=O.useContext(Xn),{matches:s}=O.useContext(Kr),{pathname:i}=Mi(),o=JSON.stringify(Ap(s,r.v7_relativeSplatPath));return O.useMemo(()=>Rp(t,JSON.parse(o),i,n==="path"),[t,o,i,n])}function fC(t,e){return pC(t,e)}function pC(t,e,n,r){Li()||ke(!1);let{navigator:s}=O.useContext(Xn),{matches:i}=O.useContext(Kr),o=i[i.length-1],l=o?o.params:{};o&&o.pathname;let u=o?o.pathnameBase:"/";o&&o.route;let c=Mi(),f;if(e){var p;let P=typeof e=="string"?Vi(e):e;u==="/"||(p=P.pathname)!=null&&p.startsWith(u)||ke(!1),f=P}else f=c;let g=f.pathname||"/",w=g;if(u!=="/"){let P=u.replace(/^\//,"").split("/");w="/"+g.replace(/^\//,"").split("/").slice(P.length).join("/")}let x=Bk(t,{pathname:w}),b=vC(x&&x.map(P=>Object.assign({},P,{params:Object.assign({},l,P.params),pathname:Sr([u,s.encodeLocation?s.encodeLocation(P.pathname).pathname:P.pathname]),pathnameBase:P.pathnameBase==="/"?u:Sr([u,s.encodeLocation?s.encodeLocation(P.pathnameBase).pathname:P.pathnameBase])})),i,n,r);return e&&b?O.createElement(fc.Provider,{value:{location:ha({pathname:"/",search:"",hash:"",state:null,key:"default"},f),navigationType:gr.Pop}},b):b}function mC(){let t=xC(),e=uC(t)?t.status+" "+t.statusText:t instanceof Error?t.message:JSON.stringify(t),n=t instanceof Error?t.stack:null,s={padding:"0.5rem",backgroundColor:"rgba(200,200,200, 0.5)"};return O.createElement(O.Fragment,null,O.createElement("h2",null,"Unexpected Application Error!"),O.createElement("h3",{style:{fontStyle:"italic"}},e),n?O.createElement("pre",{style:s},n):null,null)}const gC=O.createElement(mC,null);class yC extends O.Component{constructor(e){super(e),this.state={location:e.location,revalidation:e.revalidation,error:e.error}}static getDerivedStateFromError(e){return{error:e}}static getDerivedStateFromProps(e,n){return n.location!==e.location||n.revalidation!=="idle"&&e.revalidation==="idle"?{error:e.error,location:e.location,revalidation:e.revalidation}:{error:e.error!==void 0?e.error:n.error,location:n.location,revalidation:e.revalidation||n.revalidation}}componentDidCatch(e,n){console.error("React Router caught the following error during render",e,n)}render(){return this.state.error!==void 0?O.createElement(Kr.Provider,{value:this.props.routeContext},O.createElement(hE.Provider,{value:this.state.error,children:this.props.component})):this.props.children}}function _C(t){let{routeContext:e,match:n,children:r}=t,s=O.useContext(dc);return s&&s.static&&s.staticContext&&(n.route.errorElement||n.route.ErrorBoundary)&&(s.staticContext._deepestRenderedBoundaryId=n.route.id),O.createElement(Kr.Provider,{value:e},r)}function vC(t,e,n,r){var s;if(e===void 0&&(e=[]),n===void 0&&(n=null),r===void 0&&(r=null),t==null){var i;if(!n)return null;if(n.errors)t=n.matches;else if((i=r)!=null&&i.v7_partialHydration&&e.length===0&&!n.initialized&&n.matches.length>0)t=n.matches;else return null}let o=t,l=(s=n)==null?void 0:s.errors;if(l!=null){let f=o.findIndex(p=>p.route.id&&(l==null?void 0:l[p.route.id])!==void 0);f>=0||ke(!1),o=o.slice(0,Math.min(o.length,f+1))}let u=!1,c=-1;if(n&&r&&r.v7_partialHydration)for(let f=0;f<o.length;f++){let p=o[f];if((p.route.HydrateFallback||p.route.hydrateFallbackElement)&&(c=f),p.route.id){let{loaderData:g,errors:w}=n,x=p.route.loader&&g[p.route.id]===void 0&&(!w||w[p.route.id]===void 0);if(p.route.lazy||x){u=!0,c>=0?o=o.slice(0,c+1):o=[o[0]];break}}}return o.reduceRight((f,p,g)=>{let w,x=!1,b=null,P=null;n&&(w=l&&p.route.id?l[p.route.id]:void 0,b=p.route.errorElement||gC,u&&(c<0&&g===0?(SC("route-fallback"),x=!0,P=null):c===g&&(x=!0,P=p.route.hydrateFallbackElement||null)));let S=e.concat(o.slice(0,g+1)),v=()=>{let C;return w?C=b:x?C=P:p.route.Component?C=O.createElement(p.route.Component,null):p.route.element?C=p.route.element:C=f,O.createElement(_C,{match:p,routeContext:{outlet:f,matches:S,isDataRoute:n!=null},children:C})};return n&&(p.route.ErrorBoundary||p.route.errorElement||g===0)?O.createElement(yC,{location:n.location,revalidation:n.revalidation,component:b,error:w,children:v(),routeContext:{outlet:null,matches:S,isDataRoute:!0}}):v()},null)}var pE=function(t){return t.UseBlocker="useBlocker",t.UseRevalidator="useRevalidator",t.UseNavigateStable="useNavigate",t}(pE||{}),mE=function(t){return t.UseBlocker="useBlocker",t.UseLoaderData="useLoaderData",t.UseActionData="useActionData",t.UseRouteError="useRouteError",t.UseNavigation="useNavigation",t.UseRouteLoaderData="useRouteLoaderData",t.UseMatches="useMatches",t.UseRevalidator="useRevalidator",t.UseNavigateStable="useNavigate",t.UseRouteId="useRouteId",t}(mE||{});function wC(t){let e=O.useContext(dc);return e||ke(!1),e}function EC(t){let e=O.useContext(cE);return e||ke(!1),e}function TC(t){let e=O.useContext(Kr);return e||ke(!1),e}function gE(t){let e=TC(),n=e.matches[e.matches.length-1];return n.route.id||ke(!1),n.route.id}function xC(){var t;let e=O.useContext(hE),n=EC(),r=gE();return e!==void 0?e:(t=n.errors)==null?void 0:t[r]}function IC(){let{router:t}=wC(pE.UseNavigateStable),e=gE(mE.UseNavigateStable),n=O.useRef(!1);return dE(()=>{n.current=!0}),O.useCallback(function(s,i){i===void 0&&(i={}),n.current&&(typeof s=="number"?t.navigate(s):t.navigate(s,ha({fromRouteId:e},i)))},[t,e])}const Yy={};function SC(t,e,n){Yy[t]||(Yy[t]=!0)}function kC(t,e){t==null||t.v7_startTransition,t==null||t.v7_relativeSplatPath}function zh(t){let{to:e,replace:n,state:r,relative:s}=t;Li()||ke(!1);let{future:i,static:o}=O.useContext(Xn),{matches:l}=O.useContext(Kr),{pathname:u}=Mi(),c=fE(),f=Rp(e,Ap(l,i.v7_relativeSplatPath),u,s==="path"),p=JSON.stringify(f);return O.useEffect(()=>c(JSON.parse(p),{replace:n,state:r,relative:s}),[c,p,s,n,r]),null}function jt(t){ke(!1)}function CC(t){let{basename:e="/",children:n=null,location:r,navigationType:s=gr.Pop,navigator:i,static:o=!1,future:l}=t;Li()&&ke(!1);let u=e.replace(/^\/*/,"/"),c=O.useMemo(()=>({basename:u,navigator:i,static:o,future:ha({v7_relativeSplatPath:!1},l)}),[u,l,i,o]);typeof r=="string"&&(r=Vi(r));let{pathname:f="/",search:p="",hash:g="",state:w=null,key:x="default"}=r,b=O.useMemo(()=>{let P=xi(f,u);return P==null?null:{location:{pathname:P,search:p,hash:g,state:w,key:x},navigationType:s}},[u,f,p,g,w,x,s]);return b==null?null:O.createElement(Xn.Provider,{value:c},O.createElement(fc.Provider,{children:n,value:b}))}function yE(t){let{children:e,location:n}=t;return fC(ef(e),n)}new Promise(()=>{});function ef(t,e){e===void 0&&(e=[]);let n=[];return O.Children.forEach(t,(r,s)=>{if(!O.isValidElement(r))return;let i=[...e,s];if(r.type===O.Fragment){n.push.apply(n,ef(r.props.children,i));return}r.type!==jt&&ke(!1),!r.props.index||!r.props.children||ke(!1);let o={id:r.props.id||i.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,loader:r.props.loader,action:r.props.action,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(o.children=ef(r.props.children,i)),n.push(o)}),n}/**
 * React Router DOM v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function Au(){return Au=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},Au.apply(this,arguments)}function _E(t,e){if(t==null)return{};var n={},r=Object.keys(t),s,i;for(i=0;i<r.length;i++)s=r[i],!(e.indexOf(s)>=0)&&(n[s]=t[s]);return n}function AC(t){return!!(t.metaKey||t.altKey||t.ctrlKey||t.shiftKey)}function RC(t,e){return t.button===0&&(!e||e==="_self")&&!AC(t)}const bC=["onClick","relative","reloadDocument","replace","state","target","to","preventScrollReset","viewTransition"],PC=["aria-current","caseSensitive","className","end","style","to","viewTransition","children"],NC="6";try{window.__reactRouterVersion=NC}catch{}const DC=O.createContext({isTransitioning:!1}),OC="startTransition",Jy=C1[OC];function VC(t){let{basename:e,children:n,future:r,window:s}=t,i=O.useRef();i.current==null&&(i.current=Uk({window:s,v5Compat:!0}));let o=i.current,[l,u]=O.useState({action:o.action,location:o.location}),{v7_startTransition:c}=r||{},f=O.useCallback(p=>{c&&Jy?Jy(()=>u(p)):u(p)},[u,c]);return O.useLayoutEffect(()=>o.listen(f),[o,f]),O.useEffect(()=>kC(r),[r]),O.createElement(CC,{basename:e,children:n,location:l.location,navigationType:l.action,navigator:o,future:r})}const LC=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u",MC=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,jC=O.forwardRef(function(e,n){let{onClick:r,relative:s,reloadDocument:i,replace:o,state:l,target:u,to:c,preventScrollReset:f,viewTransition:p}=e,g=_E(e,bC),{basename:w}=O.useContext(Xn),x,b=!1;if(typeof c=="string"&&MC.test(c)&&(x=c,LC))try{let C=new URL(window.location.href),D=c.startsWith("//")?new URL(C.protocol+c):new URL(c),j=xi(D.pathname,w);D.origin===C.origin&&j!=null?c=j+D.search+D.hash:b=!0}catch{}let P=hC(c,{relative:s}),S=zC(c,{replace:o,state:l,target:u,preventScrollReset:f,relative:s,viewTransition:p});function v(C){r&&r(C),C.defaultPrevented||S(C)}return O.createElement("a",Au({},g,{href:x||P,onClick:b||i?r:v,ref:n,target:u}))}),UC=O.forwardRef(function(e,n){let{"aria-current":r="page",caseSensitive:s=!1,className:i="",end:o=!1,style:l,to:u,viewTransition:c,children:f}=e,p=_E(e,PC),g=pc(u,{relative:p.relative}),w=Mi(),x=O.useContext(cE),{navigator:b,basename:P}=O.useContext(Xn),S=x!=null&&BC(g)&&c===!0,v=b.encodeLocation?b.encodeLocation(g).pathname:g.pathname,C=w.pathname,D=x&&x.navigation&&x.navigation.location?x.navigation.location.pathname:null;s||(C=C.toLowerCase(),D=D?D.toLowerCase():null,v=v.toLowerCase()),D&&P&&(D=xi(D,P)||D);const j=v!=="/"&&v.endsWith("/")?v.length-1:v.length;let L=C===v||!o&&C.startsWith(v)&&C.charAt(j)==="/",E=D!=null&&(D===v||!o&&D.startsWith(v)&&D.charAt(v.length)==="/"),_={isActive:L,isPending:E,isTransitioning:S},I=L?r:void 0,R;typeof i=="function"?R=i(_):R=[i,L?"active":null,E?"pending":null,S?"transitioning":null].filter(Boolean).join(" ");let T=typeof l=="function"?l(_):l;return O.createElement(jC,Au({},p,{"aria-current":I,className:R,ref:n,style:T,to:u,viewTransition:c}),typeof f=="function"?f(_):f)});var tf;(function(t){t.UseScrollRestoration="useScrollRestoration",t.UseSubmit="useSubmit",t.UseSubmitFetcher="useSubmitFetcher",t.UseFetcher="useFetcher",t.useViewTransitionState="useViewTransitionState"})(tf||(tf={}));var Zy;(function(t){t.UseFetcher="useFetcher",t.UseFetchers="useFetchers",t.UseScrollRestoration="useScrollRestoration"})(Zy||(Zy={}));function FC(t){let e=O.useContext(dc);return e||ke(!1),e}function zC(t,e){let{target:n,replace:r,state:s,preventScrollReset:i,relative:o,viewTransition:l}=e===void 0?{}:e,u=fE(),c=Mi(),f=pc(t,{relative:o});return O.useCallback(p=>{if(RC(p,n)){p.preventDefault();let g=r!==void 0?r:Cu(c)===Cu(f);u(t,{replace:g,state:s,preventScrollReset:i,relative:o,viewTransition:l})}},[c,u,f,r,s,n,t,i,o,l])}function BC(t,e){e===void 0&&(e={});let n=O.useContext(DC);n==null&&ke(!1);let{basename:r}=FC(tf.useViewTransitionState),s=pc(t,{relative:e.relative});if(!n.isTransitioning)return!1;let i=xi(n.currentLocation.pathname,r)||n.currentLocation.pathname,o=xi(n.nextLocation.pathname,r)||n.nextLocation.pathname;return Zd(s.pathname,o)!=null||Zd(s.pathname,i)!=null}const $C=()=>{};var e_={};/**
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
 */const vE=function(t){const e=[];let n=0;for(let r=0;r<t.length;r++){let s=t.charCodeAt(r);s<128?e[n++]=s:s<2048?(e[n++]=s>>6|192,e[n++]=s&63|128):(s&64512)===55296&&r+1<t.length&&(t.charCodeAt(r+1)&64512)===56320?(s=65536+((s&1023)<<10)+(t.charCodeAt(++r)&1023),e[n++]=s>>18|240,e[n++]=s>>12&63|128,e[n++]=s>>6&63|128,e[n++]=s&63|128):(e[n++]=s>>12|224,e[n++]=s>>6&63|128,e[n++]=s&63|128)}return e},qC=function(t){const e=[];let n=0,r=0;for(;n<t.length;){const s=t[n++];if(s<128)e[r++]=String.fromCharCode(s);else if(s>191&&s<224){const i=t[n++];e[r++]=String.fromCharCode((s&31)<<6|i&63)}else if(s>239&&s<365){const i=t[n++],o=t[n++],l=t[n++],u=((s&7)<<18|(i&63)<<12|(o&63)<<6|l&63)-65536;e[r++]=String.fromCharCode(55296+(u>>10)),e[r++]=String.fromCharCode(56320+(u&1023))}else{const i=t[n++],o=t[n++];e[r++]=String.fromCharCode((s&15)<<12|(i&63)<<6|o&63)}}return e.join("")},wE={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(t,e){if(!Array.isArray(t))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let s=0;s<t.length;s+=3){const i=t[s],o=s+1<t.length,l=o?t[s+1]:0,u=s+2<t.length,c=u?t[s+2]:0,f=i>>2,p=(i&3)<<4|l>>4;let g=(l&15)<<2|c>>6,w=c&63;u||(w=64,o||(g=64)),r.push(n[f],n[p],n[g],n[w])}return r.join("")},encodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(t):this.encodeByteArray(vE(t),e)},decodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(t):qC(this.decodeStringToByteArray(t,e))},decodeStringToByteArray(t,e){this.init_();const n=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let s=0;s<t.length;){const i=n[t.charAt(s++)],l=s<t.length?n[t.charAt(s)]:0;++s;const c=s<t.length?n[t.charAt(s)]:64;++s;const p=s<t.length?n[t.charAt(s)]:64;if(++s,i==null||l==null||c==null||p==null)throw new HC;const g=i<<2|l>>4;if(r.push(g),c!==64){const w=l<<4&240|c>>2;if(r.push(w),p!==64){const x=c<<6&192|p;r.push(x)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let t=0;t<this.ENCODED_VALS.length;t++)this.byteToCharMap_[t]=this.ENCODED_VALS.charAt(t),this.charToByteMap_[this.byteToCharMap_[t]]=t,this.byteToCharMapWebSafe_[t]=this.ENCODED_VALS_WEBSAFE.charAt(t),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[t]]=t,t>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(t)]=t,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(t)]=t)}}};class HC extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const WC=function(t){const e=vE(t);return wE.encodeByteArray(e,!0)},Ru=function(t){return WC(t).replace(/\./g,"")},EE=function(t){try{return wE.decodeString(t,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
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
 */function GC(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const KC=()=>GC().__FIREBASE_DEFAULTS__,QC=()=>{if(typeof process>"u"||typeof e_>"u")return;const t=e_.__FIREBASE_DEFAULTS__;if(t)return JSON.parse(t)},XC=()=>{if(typeof document>"u")return;let t;try{t=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=t&&EE(t[1]);return e&&JSON.parse(e)},mc=()=>{try{return $C()||KC()||QC()||XC()}catch(t){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${t}`);return}},TE=t=>{var e,n;return(n=(e=mc())==null?void 0:e.emulatorHosts)==null?void 0:n[t]},xE=t=>{const e=TE(t);if(!e)return;const n=e.lastIndexOf(":");if(n<=0||n+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const r=parseInt(e.substring(n+1),10);return e[0]==="["?[e.substring(1,n-1),r]:[e.substring(0,n),r]},IE=()=>{var t;return(t=mc())==null?void 0:t.config},SE=t=>{var e;return(e=mc())==null?void 0:e[`_${t}`]};/**
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
 */class YC{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,n)=>{this.resolve=e,this.reject=n})}wrapCallback(e){return(n,r)=>{n?this.reject(n):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(n):e(n,r))}}}/**
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
 */function kE(t,e){if(t.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const n={alg:"none",type:"JWT"},r=e||"demo-project",s=t.iat||0,i=t.sub||t.user_id;if(!i)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o={iss:`https://securetoken.google.com/${r}`,aud:r,iat:s,exp:s+3600,auth_time:s,sub:i,user_id:i,firebase:{sign_in_provider:"custom",identities:{}},...t};return[Ru(JSON.stringify(n)),Ru(JSON.stringify(o)),""].join(".")}/**
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
 */function ut(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function JC(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(ut())}function ZC(){var e;const t=(e=mc())==null?void 0:e.forceEnvironment;if(t==="node")return!0;if(t==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function eA(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function tA(){const t=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof t=="object"&&t.id!==void 0}function nA(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function rA(){const t=ut();return t.indexOf("MSIE ")>=0||t.indexOf("Trident/")>=0}function sA(){return!ZC()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function iA(){try{return typeof indexedDB=="object"}catch{return!1}}function oA(){return new Promise((t,e)=>{try{let n=!0;const r="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(r);s.onsuccess=()=>{s.result.close(),n||self.indexedDB.deleteDatabase(r),t(!0)},s.onupgradeneeded=()=>{n=!1},s.onerror=()=>{var i;e(((i=s.error)==null?void 0:i.message)||"")}}catch(n){e(n)}})}/**
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
 */const aA="FirebaseError";class Sn extends Error{constructor(e,n,r){super(n),this.code=e,this.customData=r,this.name=aA,Object.setPrototypeOf(this,Sn.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Pa.prototype.create)}}class Pa{constructor(e,n,r){this.service=e,this.serviceName=n,this.errors=r}create(e,...n){const r=n[0]||{},s=`${this.service}/${e}`,i=this.errors[e],o=i?lA(i,r):"Error",l=`${this.serviceName}: ${o} (${s}).`;return new Sn(s,l,r)}}function lA(t,e){return t.replace(uA,(n,r)=>{const s=e[r];return s!=null?String(s):`<${r}?>`})}const uA=/\{\$([^}]+)}/g;function cA(t){for(const e in t)if(Object.prototype.hasOwnProperty.call(t,e))return!1;return!0}function Or(t,e){if(t===e)return!0;const n=Object.keys(t),r=Object.keys(e);for(const s of n){if(!r.includes(s))return!1;const i=t[s],o=e[s];if(t_(i)&&t_(o)){if(!Or(i,o))return!1}else if(i!==o)return!1}for(const s of r)if(!n.includes(s))return!1;return!0}function t_(t){return t!==null&&typeof t=="object"}/**
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
 */function Na(t){const e=[];for(const[n,r]of Object.entries(t))Array.isArray(r)?r.forEach(s=>{e.push(encodeURIComponent(n)+"="+encodeURIComponent(s))}):e.push(encodeURIComponent(n)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function ko(t){const e={};return t.replace(/^\?/,"").split("&").forEach(r=>{if(r){const[s,i]=r.split("=");e[decodeURIComponent(s)]=decodeURIComponent(i)}}),e}function Co(t){const e=t.indexOf("?");if(!e)return"";const n=t.indexOf("#",e);return t.substring(e,n>0?n:void 0)}function hA(t,e){const n=new dA(t,e);return n.subscribe.bind(n)}class dA{constructor(e,n){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=n,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(n=>{n.next(e)})}error(e){this.forEachObserver(n=>{n.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,n,r){let s;if(e===void 0&&n===void 0&&r===void 0)throw new Error("Missing Observer.");fA(e,["next","error","complete"])?s=e:s={next:e,error:n,complete:r},s.next===void 0&&(s.next=Bh),s.error===void 0&&(s.error=Bh),s.complete===void 0&&(s.complete=Bh);const i=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?s.error(this.finalError):s.complete()}catch{}}),this.observers.push(s),i}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let n=0;n<this.observers.length;n++)this.sendOne(n,e)}sendOne(e,n){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{n(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function fA(t,e){if(typeof t!="object"||t===null)return!1;for(const n of e)if(n in t&&typeof t[n]=="function")return!0;return!1}function Bh(){}/**
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
 */function ce(t){return t&&t._delegate?t._delegate:t}/**
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
 */function Rs(t){try{return(t.startsWith("http://")||t.startsWith("https://")?new URL(t).hostname:t).endsWith(".cloudworkstations.dev")}catch{return!1}}async function bp(t){return(await fetch(t,{credentials:"include"})).ok}class Vr{constructor(e,n,r){this.name=e,this.instanceFactory=n,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
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
 */const ls="[DEFAULT]";/**
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
 */class pA{constructor(e,n){this.name=e,this.container=n,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const n=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(n)){const r=new YC;if(this.instancesDeferred.set(n,r),this.isInitialized(n)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:n});s&&r.resolve(s)}catch{}}return this.instancesDeferred.get(n).promise}getImmediate(e){const n=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),r=(e==null?void 0:e.optional)??!1;if(this.isInitialized(n)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:n})}catch(s){if(r)return null;throw s}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(gA(e))try{this.getOrInitializeService({instanceIdentifier:ls})}catch{}for(const[n,r]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(n);try{const i=this.getOrInitializeService({instanceIdentifier:s});r.resolve(i)}catch{}}}}clearInstance(e=ls){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(n=>"INTERNAL"in n).map(n=>n.INTERNAL.delete()),...e.filter(n=>"_delete"in n).map(n=>n._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=ls){return this.instances.has(e)}getOptions(e=ls){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:n={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:r,options:n});for(const[i,o]of this.instancesDeferred.entries()){const l=this.normalizeInstanceIdentifier(i);r===l&&o.resolve(s)}return s}onInit(e,n){const r=this.normalizeInstanceIdentifier(n),s=this.onInitCallbacks.get(r)??new Set;s.add(e),this.onInitCallbacks.set(r,s);const i=this.instances.get(r);return i&&e(i,r),()=>{s.delete(e)}}invokeOnInitCallbacks(e,n){const r=this.onInitCallbacks.get(n);if(r)for(const s of r)try{s(e,n)}catch{}}getOrInitializeService({instanceIdentifier:e,options:n={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:mA(e),options:n}),this.instances.set(e,r),this.instancesOptions.set(e,n),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=ls){return this.component?this.component.multipleInstances?e:ls:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function mA(t){return t===ls?void 0:t}function gA(t){return t.instantiationMode==="EAGER"}/**
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
 */class yA{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const n=this.getProvider(e.name);if(n.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);n.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const n=new pA(e,this);return this.providers.set(e,n),n}getProviders(){return Array.from(this.providers.values())}}/**
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
 */var re;(function(t){t[t.DEBUG=0]="DEBUG",t[t.VERBOSE=1]="VERBOSE",t[t.INFO=2]="INFO",t[t.WARN=3]="WARN",t[t.ERROR=4]="ERROR",t[t.SILENT=5]="SILENT"})(re||(re={}));const _A={debug:re.DEBUG,verbose:re.VERBOSE,info:re.INFO,warn:re.WARN,error:re.ERROR,silent:re.SILENT},vA=re.INFO,wA={[re.DEBUG]:"log",[re.VERBOSE]:"log",[re.INFO]:"info",[re.WARN]:"warn",[re.ERROR]:"error"},EA=(t,e,...n)=>{if(e<t.logLevel)return;const r=new Date().toISOString(),s=wA[e];if(s)console[s](`[${r}]  ${t.name}:`,...n);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class Pp{constructor(e){this.name=e,this._logLevel=vA,this._logHandler=EA,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in re))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?_A[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,re.DEBUG,...e),this._logHandler(this,re.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,re.VERBOSE,...e),this._logHandler(this,re.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,re.INFO,...e),this._logHandler(this,re.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,re.WARN,...e),this._logHandler(this,re.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,re.ERROR,...e),this._logHandler(this,re.ERROR,...e)}}const TA=(t,e)=>e.some(n=>t instanceof n);let n_,r_;function xA(){return n_||(n_=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function IA(){return r_||(r_=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const CE=new WeakMap,nf=new WeakMap,AE=new WeakMap,$h=new WeakMap,Np=new WeakMap;function SA(t){const e=new Promise((n,r)=>{const s=()=>{t.removeEventListener("success",i),t.removeEventListener("error",o)},i=()=>{n(kr(t.result)),s()},o=()=>{r(t.error),s()};t.addEventListener("success",i),t.addEventListener("error",o)});return e.then(n=>{n instanceof IDBCursor&&CE.set(n,t)}).catch(()=>{}),Np.set(e,t),e}function kA(t){if(nf.has(t))return;const e=new Promise((n,r)=>{const s=()=>{t.removeEventListener("complete",i),t.removeEventListener("error",o),t.removeEventListener("abort",o)},i=()=>{n(),s()},o=()=>{r(t.error||new DOMException("AbortError","AbortError")),s()};t.addEventListener("complete",i),t.addEventListener("error",o),t.addEventListener("abort",o)});nf.set(t,e)}let rf={get(t,e,n){if(t instanceof IDBTransaction){if(e==="done")return nf.get(t);if(e==="objectStoreNames")return t.objectStoreNames||AE.get(t);if(e==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return kr(t[e])},set(t,e,n){return t[e]=n,!0},has(t,e){return t instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in t}};function CA(t){rf=t(rf)}function AA(t){return t===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...n){const r=t.call(qh(this),e,...n);return AE.set(r,e.sort?e.sort():[e]),kr(r)}:IA().includes(t)?function(...e){return t.apply(qh(this),e),kr(CE.get(this))}:function(...e){return kr(t.apply(qh(this),e))}}function RA(t){return typeof t=="function"?AA(t):(t instanceof IDBTransaction&&kA(t),TA(t,xA())?new Proxy(t,rf):t)}function kr(t){if(t instanceof IDBRequest)return SA(t);if($h.has(t))return $h.get(t);const e=RA(t);return e!==t&&($h.set(t,e),Np.set(e,t)),e}const qh=t=>Np.get(t);function bA(t,e,{blocked:n,upgrade:r,blocking:s,terminated:i}={}){const o=indexedDB.open(t,e),l=kr(o);return r&&o.addEventListener("upgradeneeded",u=>{r(kr(o.result),u.oldVersion,u.newVersion,kr(o.transaction),u)}),n&&o.addEventListener("blocked",u=>n(u.oldVersion,u.newVersion,u)),l.then(u=>{i&&u.addEventListener("close",()=>i()),s&&u.addEventListener("versionchange",c=>s(c.oldVersion,c.newVersion,c))}).catch(()=>{}),l}const PA=["get","getKey","getAll","getAllKeys","count"],NA=["put","add","delete","clear"],Hh=new Map;function s_(t,e){if(!(t instanceof IDBDatabase&&!(e in t)&&typeof e=="string"))return;if(Hh.get(e))return Hh.get(e);const n=e.replace(/FromIndex$/,""),r=e!==n,s=NA.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(s||PA.includes(n)))return;const i=async function(o,...l){const u=this.transaction(o,s?"readwrite":"readonly");let c=u.store;return r&&(c=c.index(l.shift())),(await Promise.all([c[n](...l),s&&u.done]))[0]};return Hh.set(e,i),i}CA(t=>({...t,get:(e,n,r)=>s_(e,n)||t.get(e,n,r),has:(e,n)=>!!s_(e,n)||t.has(e,n)}));/**
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
 */class DA{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(n=>{if(OA(n)){const r=n.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(n=>n).join(" ")}}function OA(t){const e=t.getComponent();return(e==null?void 0:e.type)==="VERSION"}const sf="@firebase/app",i_="0.14.12";/**
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
 */const Hn=new Pp("@firebase/app"),VA="@firebase/app-compat",LA="@firebase/analytics-compat",MA="@firebase/analytics",jA="@firebase/app-check-compat",UA="@firebase/app-check",FA="@firebase/auth",zA="@firebase/auth-compat",BA="@firebase/database",$A="@firebase/data-connect",qA="@firebase/database-compat",HA="@firebase/functions",WA="@firebase/functions-compat",GA="@firebase/installations",KA="@firebase/installations-compat",QA="@firebase/messaging",XA="@firebase/messaging-compat",YA="@firebase/performance",JA="@firebase/performance-compat",ZA="@firebase/remote-config",eR="@firebase/remote-config-compat",tR="@firebase/storage",nR="@firebase/storage-compat",rR="@firebase/firestore",sR="@firebase/ai",iR="@firebase/firestore-compat",oR="firebase",aR="12.13.0";/**
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
 */const of="[DEFAULT]",lR={[sf]:"fire-core",[VA]:"fire-core-compat",[MA]:"fire-analytics",[LA]:"fire-analytics-compat",[UA]:"fire-app-check",[jA]:"fire-app-check-compat",[FA]:"fire-auth",[zA]:"fire-auth-compat",[BA]:"fire-rtdb",[$A]:"fire-data-connect",[qA]:"fire-rtdb-compat",[HA]:"fire-fn",[WA]:"fire-fn-compat",[GA]:"fire-iid",[KA]:"fire-iid-compat",[QA]:"fire-fcm",[XA]:"fire-fcm-compat",[YA]:"fire-perf",[JA]:"fire-perf-compat",[ZA]:"fire-rc",[eR]:"fire-rc-compat",[tR]:"fire-gcs",[nR]:"fire-gcs-compat",[rR]:"fire-fst",[iR]:"fire-fst-compat",[sR]:"fire-vertex","fire-js":"fire-js",[oR]:"fire-js-all"};/**
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
 */const da=new Map,uR=new Map,af=new Map;function o_(t,e){try{t.container.addComponent(e)}catch(n){Hn.debug(`Component ${e.name} failed to register with FirebaseApp ${t.name}`,n)}}function Ts(t){const e=t.name;if(af.has(e))return Hn.debug(`There were multiple attempts to register component ${e}.`),!1;af.set(e,t);for(const n of da.values())o_(n,t);for(const n of uR.values())o_(n,t);return!0}function gc(t,e){const n=t.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),t.container.getProvider(e)}function At(t){return t==null?!1:t.settings!==void 0}/**
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
 */const cR={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},Cr=new Pa("app","Firebase",cR);/**
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
 */class hR{constructor(e,n,r){this._isDeleted=!1,this._options={...e},this._config={...n},this._name=n.name,this._automaticDataCollectionEnabled=n.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new Vr("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw Cr.create("app-deleted",{appName:this._name})}}/**
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
 */const bs=aR;function RE(t,e={}){let n=t;typeof e!="object"&&(e={name:e});const r={name:of,automaticDataCollectionEnabled:!0,...e},s=r.name;if(typeof s!="string"||!s)throw Cr.create("bad-app-name",{appName:String(s)});if(n||(n=IE()),!n)throw Cr.create("no-options");const i=da.get(s);if(i){if(Or(n,i.options)&&Or(r,i.config))return i;throw Cr.create("duplicate-app",{appName:s})}const o=new yA(s);for(const u of af.values())o.addComponent(u);const l=new hR(n,r,o);return da.set(s,l),l}function Dp(t=of){const e=da.get(t);if(!e&&t===of&&IE())return RE();if(!e)throw Cr.create("no-app",{appName:t});return e}function a_(){return Array.from(da.values())}function _n(t,e,n){let r=lR[t]??t;n&&(r+=`-${n}`);const s=r.match(/\s|\//),i=e.match(/\s|\//);if(s||i){const o=[`Unable to register library "${r}" with version "${e}":`];s&&o.push(`library name "${r}" contains illegal characters (whitespace or "/")`),s&&i&&o.push("and"),i&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Hn.warn(o.join(" "));return}Ts(new Vr(`${r}-version`,()=>({library:r,version:e}),"VERSION"))}/**
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
 */const dR="firebase-heartbeat-database",fR=1,fa="firebase-heartbeat-store";let Wh=null;function bE(){return Wh||(Wh=bA(dR,fR,{upgrade:(t,e)=>{switch(e){case 0:try{t.createObjectStore(fa)}catch(n){console.warn(n)}}}}).catch(t=>{throw Cr.create("idb-open",{originalErrorMessage:t.message})})),Wh}async function pR(t){try{const n=(await bE()).transaction(fa),r=await n.objectStore(fa).get(PE(t));return await n.done,r}catch(e){if(e instanceof Sn)Hn.warn(e.message);else{const n=Cr.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});Hn.warn(n.message)}}}async function l_(t,e){try{const r=(await bE()).transaction(fa,"readwrite");await r.objectStore(fa).put(e,PE(t)),await r.done}catch(n){if(n instanceof Sn)Hn.warn(n.message);else{const r=Cr.create("idb-set",{originalErrorMessage:n==null?void 0:n.message});Hn.warn(r.message)}}}function PE(t){return`${t.name}!${t.options.appId}`}/**
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
 */const mR=1024,gR=30;class yR{constructor(e){this.container=e,this._heartbeatsCache=null;const n=this.container.getProvider("app").getImmediate();this._storage=new vR(n),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,n;try{const s=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),i=u_();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((n=this._heartbeatsCache)==null?void 0:n.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===i||this._heartbeatsCache.heartbeats.some(o=>o.date===i))return;if(this._heartbeatsCache.heartbeats.push({date:i,agent:s}),this._heartbeatsCache.heartbeats.length>gR){const o=wR(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(r){Hn.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const n=u_(),{heartbeatsToSend:r,unsentEntries:s}=_R(this._heartbeatsCache.heartbeats),i=Ru(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=n,s.length>0?(this._heartbeatsCache.heartbeats=s,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),i}catch(n){return Hn.warn(n),""}}}function u_(){return new Date().toISOString().substring(0,10)}function _R(t,e=mR){const n=[];let r=t.slice();for(const s of t){const i=n.find(o=>o.agent===s.agent);if(i){if(i.dates.push(s.date),c_(n)>e){i.dates.pop();break}}else if(n.push({agent:s.agent,dates:[s.date]}),c_(n)>e){n.pop();break}r=r.slice(1)}return{heartbeatsToSend:n,unsentEntries:r}}class vR{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return iA()?oA().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const n=await pR(this.app);return n!=null&&n.heartbeats?n:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return l_(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return l_(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...e.heartbeats]})}else return}}function c_(t){return Ru(JSON.stringify({version:2,heartbeats:t})).length}function wR(t){if(t.length===0)return-1;let e=0,n=t[0].date;for(let r=1;r<t.length;r++)t[r].date<n&&(n=t[r].date,e=r);return e}/**
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
 */function ER(t){Ts(new Vr("platform-logger",e=>new DA(e),"PRIVATE")),Ts(new Vr("heartbeat",e=>new yR(e),"PRIVATE")),_n(sf,i_,t),_n(sf,i_,"esm2020"),_n("fire-js","")}ER("");var h_=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Ar,NE;(function(){var t;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(E,_){function I(){}I.prototype=_.prototype,E.F=_.prototype,E.prototype=new I,E.prototype.constructor=E,E.D=function(R,T,A){for(var k=Array(arguments.length-2),se=2;se<arguments.length;se++)k[se-2]=arguments[se];return _.prototype[T].apply(R,k)}}function n(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(r,n),r.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function s(E,_,I){I||(I=0);const R=Array(16);if(typeof _=="string")for(var T=0;T<16;++T)R[T]=_.charCodeAt(I++)|_.charCodeAt(I++)<<8|_.charCodeAt(I++)<<16|_.charCodeAt(I++)<<24;else for(T=0;T<16;++T)R[T]=_[I++]|_[I++]<<8|_[I++]<<16|_[I++]<<24;_=E.g[0],I=E.g[1],T=E.g[2];let A=E.g[3],k;k=_+(A^I&(T^A))+R[0]+3614090360&4294967295,_=I+(k<<7&4294967295|k>>>25),k=A+(T^_&(I^T))+R[1]+3905402710&4294967295,A=_+(k<<12&4294967295|k>>>20),k=T+(I^A&(_^I))+R[2]+606105819&4294967295,T=A+(k<<17&4294967295|k>>>15),k=I+(_^T&(A^_))+R[3]+3250441966&4294967295,I=T+(k<<22&4294967295|k>>>10),k=_+(A^I&(T^A))+R[4]+4118548399&4294967295,_=I+(k<<7&4294967295|k>>>25),k=A+(T^_&(I^T))+R[5]+1200080426&4294967295,A=_+(k<<12&4294967295|k>>>20),k=T+(I^A&(_^I))+R[6]+2821735955&4294967295,T=A+(k<<17&4294967295|k>>>15),k=I+(_^T&(A^_))+R[7]+4249261313&4294967295,I=T+(k<<22&4294967295|k>>>10),k=_+(A^I&(T^A))+R[8]+1770035416&4294967295,_=I+(k<<7&4294967295|k>>>25),k=A+(T^_&(I^T))+R[9]+2336552879&4294967295,A=_+(k<<12&4294967295|k>>>20),k=T+(I^A&(_^I))+R[10]+4294925233&4294967295,T=A+(k<<17&4294967295|k>>>15),k=I+(_^T&(A^_))+R[11]+2304563134&4294967295,I=T+(k<<22&4294967295|k>>>10),k=_+(A^I&(T^A))+R[12]+1804603682&4294967295,_=I+(k<<7&4294967295|k>>>25),k=A+(T^_&(I^T))+R[13]+4254626195&4294967295,A=_+(k<<12&4294967295|k>>>20),k=T+(I^A&(_^I))+R[14]+2792965006&4294967295,T=A+(k<<17&4294967295|k>>>15),k=I+(_^T&(A^_))+R[15]+1236535329&4294967295,I=T+(k<<22&4294967295|k>>>10),k=_+(T^A&(I^T))+R[1]+4129170786&4294967295,_=I+(k<<5&4294967295|k>>>27),k=A+(I^T&(_^I))+R[6]+3225465664&4294967295,A=_+(k<<9&4294967295|k>>>23),k=T+(_^I&(A^_))+R[11]+643717713&4294967295,T=A+(k<<14&4294967295|k>>>18),k=I+(A^_&(T^A))+R[0]+3921069994&4294967295,I=T+(k<<20&4294967295|k>>>12),k=_+(T^A&(I^T))+R[5]+3593408605&4294967295,_=I+(k<<5&4294967295|k>>>27),k=A+(I^T&(_^I))+R[10]+38016083&4294967295,A=_+(k<<9&4294967295|k>>>23),k=T+(_^I&(A^_))+R[15]+3634488961&4294967295,T=A+(k<<14&4294967295|k>>>18),k=I+(A^_&(T^A))+R[4]+3889429448&4294967295,I=T+(k<<20&4294967295|k>>>12),k=_+(T^A&(I^T))+R[9]+568446438&4294967295,_=I+(k<<5&4294967295|k>>>27),k=A+(I^T&(_^I))+R[14]+3275163606&4294967295,A=_+(k<<9&4294967295|k>>>23),k=T+(_^I&(A^_))+R[3]+4107603335&4294967295,T=A+(k<<14&4294967295|k>>>18),k=I+(A^_&(T^A))+R[8]+1163531501&4294967295,I=T+(k<<20&4294967295|k>>>12),k=_+(T^A&(I^T))+R[13]+2850285829&4294967295,_=I+(k<<5&4294967295|k>>>27),k=A+(I^T&(_^I))+R[2]+4243563512&4294967295,A=_+(k<<9&4294967295|k>>>23),k=T+(_^I&(A^_))+R[7]+1735328473&4294967295,T=A+(k<<14&4294967295|k>>>18),k=I+(A^_&(T^A))+R[12]+2368359562&4294967295,I=T+(k<<20&4294967295|k>>>12),k=_+(I^T^A)+R[5]+4294588738&4294967295,_=I+(k<<4&4294967295|k>>>28),k=A+(_^I^T)+R[8]+2272392833&4294967295,A=_+(k<<11&4294967295|k>>>21),k=T+(A^_^I)+R[11]+1839030562&4294967295,T=A+(k<<16&4294967295|k>>>16),k=I+(T^A^_)+R[14]+4259657740&4294967295,I=T+(k<<23&4294967295|k>>>9),k=_+(I^T^A)+R[1]+2763975236&4294967295,_=I+(k<<4&4294967295|k>>>28),k=A+(_^I^T)+R[4]+1272893353&4294967295,A=_+(k<<11&4294967295|k>>>21),k=T+(A^_^I)+R[7]+4139469664&4294967295,T=A+(k<<16&4294967295|k>>>16),k=I+(T^A^_)+R[10]+3200236656&4294967295,I=T+(k<<23&4294967295|k>>>9),k=_+(I^T^A)+R[13]+681279174&4294967295,_=I+(k<<4&4294967295|k>>>28),k=A+(_^I^T)+R[0]+3936430074&4294967295,A=_+(k<<11&4294967295|k>>>21),k=T+(A^_^I)+R[3]+3572445317&4294967295,T=A+(k<<16&4294967295|k>>>16),k=I+(T^A^_)+R[6]+76029189&4294967295,I=T+(k<<23&4294967295|k>>>9),k=_+(I^T^A)+R[9]+3654602809&4294967295,_=I+(k<<4&4294967295|k>>>28),k=A+(_^I^T)+R[12]+3873151461&4294967295,A=_+(k<<11&4294967295|k>>>21),k=T+(A^_^I)+R[15]+530742520&4294967295,T=A+(k<<16&4294967295|k>>>16),k=I+(T^A^_)+R[2]+3299628645&4294967295,I=T+(k<<23&4294967295|k>>>9),k=_+(T^(I|~A))+R[0]+4096336452&4294967295,_=I+(k<<6&4294967295|k>>>26),k=A+(I^(_|~T))+R[7]+1126891415&4294967295,A=_+(k<<10&4294967295|k>>>22),k=T+(_^(A|~I))+R[14]+2878612391&4294967295,T=A+(k<<15&4294967295|k>>>17),k=I+(A^(T|~_))+R[5]+4237533241&4294967295,I=T+(k<<21&4294967295|k>>>11),k=_+(T^(I|~A))+R[12]+1700485571&4294967295,_=I+(k<<6&4294967295|k>>>26),k=A+(I^(_|~T))+R[3]+2399980690&4294967295,A=_+(k<<10&4294967295|k>>>22),k=T+(_^(A|~I))+R[10]+4293915773&4294967295,T=A+(k<<15&4294967295|k>>>17),k=I+(A^(T|~_))+R[1]+2240044497&4294967295,I=T+(k<<21&4294967295|k>>>11),k=_+(T^(I|~A))+R[8]+1873313359&4294967295,_=I+(k<<6&4294967295|k>>>26),k=A+(I^(_|~T))+R[15]+4264355552&4294967295,A=_+(k<<10&4294967295|k>>>22),k=T+(_^(A|~I))+R[6]+2734768916&4294967295,T=A+(k<<15&4294967295|k>>>17),k=I+(A^(T|~_))+R[13]+1309151649&4294967295,I=T+(k<<21&4294967295|k>>>11),k=_+(T^(I|~A))+R[4]+4149444226&4294967295,_=I+(k<<6&4294967295|k>>>26),k=A+(I^(_|~T))+R[11]+3174756917&4294967295,A=_+(k<<10&4294967295|k>>>22),k=T+(_^(A|~I))+R[2]+718787259&4294967295,T=A+(k<<15&4294967295|k>>>17),k=I+(A^(T|~_))+R[9]+3951481745&4294967295,E.g[0]=E.g[0]+_&4294967295,E.g[1]=E.g[1]+(T+(k<<21&4294967295|k>>>11))&4294967295,E.g[2]=E.g[2]+T&4294967295,E.g[3]=E.g[3]+A&4294967295}r.prototype.v=function(E,_){_===void 0&&(_=E.length);const I=_-this.blockSize,R=this.C;let T=this.h,A=0;for(;A<_;){if(T==0)for(;A<=I;)s(this,E,A),A+=this.blockSize;if(typeof E=="string"){for(;A<_;)if(R[T++]=E.charCodeAt(A++),T==this.blockSize){s(this,R),T=0;break}}else for(;A<_;)if(R[T++]=E[A++],T==this.blockSize){s(this,R),T=0;break}}this.h=T,this.o+=_},r.prototype.A=function(){var E=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);E[0]=128;for(var _=1;_<E.length-8;++_)E[_]=0;_=this.o*8;for(var I=E.length-8;I<E.length;++I)E[I]=_&255,_/=256;for(this.v(E),E=Array(16),_=0,I=0;I<4;++I)for(let R=0;R<32;R+=8)E[_++]=this.g[I]>>>R&255;return E};function i(E,_){var I=l;return Object.prototype.hasOwnProperty.call(I,E)?I[E]:I[E]=_(E)}function o(E,_){this.h=_;const I=[];let R=!0;for(let T=E.length-1;T>=0;T--){const A=E[T]|0;R&&A==_||(I[T]=A,R=!1)}this.g=I}var l={};function u(E){return-128<=E&&E<128?i(E,function(_){return new o([_|0],_<0?-1:0)}):new o([E|0],E<0?-1:0)}function c(E){if(isNaN(E)||!isFinite(E))return p;if(E<0)return P(c(-E));const _=[];let I=1;for(let R=0;E>=I;R++)_[R]=E/I|0,I*=4294967296;return new o(_,0)}function f(E,_){if(E.length==0)throw Error("number format error: empty string");if(_=_||10,_<2||36<_)throw Error("radix out of range: "+_);if(E.charAt(0)=="-")return P(f(E.substring(1),_));if(E.indexOf("-")>=0)throw Error('number format error: interior "-" character');const I=c(Math.pow(_,8));let R=p;for(let A=0;A<E.length;A+=8){var T=Math.min(8,E.length-A);const k=parseInt(E.substring(A,A+T),_);T<8?(T=c(Math.pow(_,T)),R=R.j(T).add(c(k))):(R=R.j(I),R=R.add(c(k)))}return R}var p=u(0),g=u(1),w=u(16777216);t=o.prototype,t.m=function(){if(b(this))return-P(this).m();let E=0,_=1;for(let I=0;I<this.g.length;I++){const R=this.i(I);E+=(R>=0?R:4294967296+R)*_,_*=4294967296}return E},t.toString=function(E){if(E=E||10,E<2||36<E)throw Error("radix out of range: "+E);if(x(this))return"0";if(b(this))return"-"+P(this).toString(E);const _=c(Math.pow(E,6));var I=this;let R="";for(;;){const T=D(I,_).g;I=S(I,T.j(_));let A=((I.g.length>0?I.g[0]:I.h)>>>0).toString(E);if(I=T,x(I))return A+R;for(;A.length<6;)A="0"+A;R=A+R}},t.i=function(E){return E<0?0:E<this.g.length?this.g[E]:this.h};function x(E){if(E.h!=0)return!1;for(let _=0;_<E.g.length;_++)if(E.g[_]!=0)return!1;return!0}function b(E){return E.h==-1}t.l=function(E){return E=S(this,E),b(E)?-1:x(E)?0:1};function P(E){const _=E.g.length,I=[];for(let R=0;R<_;R++)I[R]=~E.g[R];return new o(I,~E.h).add(g)}t.abs=function(){return b(this)?P(this):this},t.add=function(E){const _=Math.max(this.g.length,E.g.length),I=[];let R=0;for(let T=0;T<=_;T++){let A=R+(this.i(T)&65535)+(E.i(T)&65535),k=(A>>>16)+(this.i(T)>>>16)+(E.i(T)>>>16);R=k>>>16,A&=65535,k&=65535,I[T]=k<<16|A}return new o(I,I[I.length-1]&-2147483648?-1:0)};function S(E,_){return E.add(P(_))}t.j=function(E){if(x(this)||x(E))return p;if(b(this))return b(E)?P(this).j(P(E)):P(P(this).j(E));if(b(E))return P(this.j(P(E)));if(this.l(w)<0&&E.l(w)<0)return c(this.m()*E.m());const _=this.g.length+E.g.length,I=[];for(var R=0;R<2*_;R++)I[R]=0;for(R=0;R<this.g.length;R++)for(let T=0;T<E.g.length;T++){const A=this.i(R)>>>16,k=this.i(R)&65535,se=E.i(T)>>>16,Ze=E.i(T)&65535;I[2*R+2*T]+=k*Ze,v(I,2*R+2*T),I[2*R+2*T+1]+=A*Ze,v(I,2*R+2*T+1),I[2*R+2*T+1]+=k*se,v(I,2*R+2*T+1),I[2*R+2*T+2]+=A*se,v(I,2*R+2*T+2)}for(E=0;E<_;E++)I[E]=I[2*E+1]<<16|I[2*E];for(E=_;E<2*_;E++)I[E]=0;return new o(I,0)};function v(E,_){for(;(E[_]&65535)!=E[_];)E[_+1]+=E[_]>>>16,E[_]&=65535,_++}function C(E,_){this.g=E,this.h=_}function D(E,_){if(x(_))throw Error("division by zero");if(x(E))return new C(p,p);if(b(E))return _=D(P(E),_),new C(P(_.g),P(_.h));if(b(_))return _=D(E,P(_)),new C(P(_.g),_.h);if(E.g.length>30){if(b(E)||b(_))throw Error("slowDivide_ only works with positive integers.");for(var I=g,R=_;R.l(E)<=0;)I=j(I),R=j(R);var T=L(I,1),A=L(R,1);for(R=L(R,2),I=L(I,2);!x(R);){var k=A.add(R);k.l(E)<=0&&(T=T.add(I),A=k),R=L(R,1),I=L(I,1)}return _=S(E,T.j(_)),new C(T,_)}for(T=p;E.l(_)>=0;){for(I=Math.max(1,Math.floor(E.m()/_.m())),R=Math.ceil(Math.log(I)/Math.LN2),R=R<=48?1:Math.pow(2,R-48),A=c(I),k=A.j(_);b(k)||k.l(E)>0;)I-=R,A=c(I),k=A.j(_);x(A)&&(A=g),T=T.add(A),E=S(E,k)}return new C(T,E)}t.B=function(E){return D(this,E).h},t.and=function(E){const _=Math.max(this.g.length,E.g.length),I=[];for(let R=0;R<_;R++)I[R]=this.i(R)&E.i(R);return new o(I,this.h&E.h)},t.or=function(E){const _=Math.max(this.g.length,E.g.length),I=[];for(let R=0;R<_;R++)I[R]=this.i(R)|E.i(R);return new o(I,this.h|E.h)},t.xor=function(E){const _=Math.max(this.g.length,E.g.length),I=[];for(let R=0;R<_;R++)I[R]=this.i(R)^E.i(R);return new o(I,this.h^E.h)};function j(E){const _=E.g.length+1,I=[];for(let R=0;R<_;R++)I[R]=E.i(R)<<1|E.i(R-1)>>>31;return new o(I,E.h)}function L(E,_){const I=_>>5;_%=32;const R=E.g.length-I,T=[];for(let A=0;A<R;A++)T[A]=_>0?E.i(A+I)>>>_|E.i(A+I+1)<<32-_:E.i(A+I);return new o(T,E.h)}r.prototype.digest=r.prototype.A,r.prototype.reset=r.prototype.u,r.prototype.update=r.prototype.v,NE=r,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=c,o.fromString=f,Ar=o}).apply(typeof h_<"u"?h_:typeof self<"u"?self:typeof window<"u"?window:{});var Il=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var DE,Ao,OE,Wl,lf,VE,LE,ME;(function(){var t,e=Object.defineProperty;function n(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof Il=="object"&&Il];for(var h=0;h<a.length;++h){var m=a[h];if(m&&m.Math==Math)return m}throw Error("Cannot find global object")}var r=n(this);function s(a,h){if(h)e:{var m=r;a=a.split(".");for(var y=0;y<a.length-1;y++){var N=a[y];if(!(N in m))break e;m=m[N]}a=a[a.length-1],y=m[a],h=h(y),h!=y&&h!=null&&e(m,a,{configurable:!0,writable:!0,value:h})}}s("Symbol.dispose",function(a){return a||Symbol("Symbol.dispose")}),s("Array.prototype.values",function(a){return a||function(){return this[Symbol.iterator]()}}),s("Object.entries",function(a){return a||function(h){var m=[],y;for(y in h)Object.prototype.hasOwnProperty.call(h,y)&&m.push([y,h[y]]);return m}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var i=i||{},o=this||self;function l(a){var h=typeof a;return h=="object"&&a!=null||h=="function"}function u(a,h,m){return a.call.apply(a.bind,arguments)}function c(a,h,m){return c=u,c.apply(null,arguments)}function f(a,h){var m=Array.prototype.slice.call(arguments,1);return function(){var y=m.slice();return y.push.apply(y,arguments),a.apply(this,y)}}function p(a,h){function m(){}m.prototype=h.prototype,a.Z=h.prototype,a.prototype=new m,a.prototype.constructor=a,a.Ob=function(y,N,V){for(var z=Array(arguments.length-2),Z=2;Z<arguments.length;Z++)z[Z-2]=arguments[Z];return h.prototype[N].apply(y,z)}}var g=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?a=>a&&AsyncContext.Snapshot.wrap(a):a=>a;function w(a){const h=a.length;if(h>0){const m=Array(h);for(let y=0;y<h;y++)m[y]=a[y];return m}return[]}function x(a,h){for(let y=1;y<arguments.length;y++){const N=arguments[y];var m=typeof N;if(m=m!="object"?m:N?Array.isArray(N)?"array":m:"null",m=="array"||m=="object"&&typeof N.length=="number"){m=a.length||0;const V=N.length||0;a.length=m+V;for(let z=0;z<V;z++)a[m+z]=N[z]}else a.push(N)}}class b{constructor(h,m){this.i=h,this.j=m,this.h=0,this.g=null}get(){let h;return this.h>0?(this.h--,h=this.g,this.g=h.next,h.next=null):h=this.i(),h}}function P(a){o.setTimeout(()=>{throw a},0)}function S(){var a=E;let h=null;return a.g&&(h=a.g,a.g=a.g.next,a.g||(a.h=null),h.next=null),h}class v{constructor(){this.h=this.g=null}add(h,m){const y=C.get();y.set(h,m),this.h?this.h.next=y:this.g=y,this.h=y}}var C=new b(()=>new D,a=>a.reset());class D{constructor(){this.next=this.g=this.h=null}set(h,m){this.h=h,this.g=m,this.next=null}reset(){this.next=this.g=this.h=null}}let j,L=!1,E=new v,_=()=>{const a=Promise.resolve(void 0);j=()=>{a.then(I)}};function I(){for(var a;a=S();){try{a.h.call(a.g)}catch(m){P(m)}var h=C;h.j(a),h.h<100&&(h.h++,a.next=h.g,h.g=a)}L=!1}function R(){this.u=this.u,this.C=this.C}R.prototype.u=!1,R.prototype.dispose=function(){this.u||(this.u=!0,this.N())},R.prototype[Symbol.dispose]=function(){this.dispose()},R.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function T(a,h){this.type=a,this.g=this.target=h,this.defaultPrevented=!1}T.prototype.h=function(){this.defaultPrevented=!0};var A=function(){if(!o.addEventListener||!Object.defineProperty)return!1;var a=!1,h=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const m=()=>{};o.addEventListener("test",m,h),o.removeEventListener("test",m,h)}catch{}return a}();function k(a){return/^[\s\xa0]*$/.test(a)}function se(a,h){T.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a&&this.init(a,h)}p(se,T),se.prototype.init=function(a,h){const m=this.type=a.type,y=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement,this.g=h,h=a.relatedTarget,h||(m=="mouseover"?h=a.fromElement:m=="mouseout"&&(h=a.toElement)),this.relatedTarget=h,y?(this.clientX=y.clientX!==void 0?y.clientX:y.pageX,this.clientY=y.clientY!==void 0?y.clientY:y.pageY,this.screenX=y.screenX||0,this.screenY=y.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=a.pointerType,this.state=a.state,this.i=a,a.defaultPrevented&&se.Z.h.call(this)},se.prototype.h=function(){se.Z.h.call(this);const a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var Ze="closure_listenable_"+(Math.random()*1e6|0),ln=0;function Gt(a,h,m,y,N){this.listener=a,this.proxy=null,this.src=h,this.type=m,this.capture=!!y,this.ha=N,this.key=++ln,this.da=this.fa=!1}function $(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function Q(a,h,m){for(const y in a)h.call(m,a[y],y,a)}function J(a,h){for(const m in a)h.call(void 0,a[m],m,a)}function ve(a){const h={};for(const m in a)h[m]=a[m];return h}const Pe="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function Jr(a,h){let m,y;for(let N=1;N<arguments.length;N++){y=arguments[N];for(m in y)a[m]=y[m];for(let V=0;V<Pe.length;V++)m=Pe[V],Object.prototype.hasOwnProperty.call(y,m)&&(a[m]=y[m])}}function Mt(a){this.src=a,this.g={},this.h=0}Mt.prototype.add=function(a,h,m,y,N){const V=a.toString();a=this.g[V],a||(a=this.g[V]=[],this.h++);const z=Kt(a,h,y,N);return z>-1?(h=a[z],m||(h.fa=!1)):(h=new Gt(h,this.src,V,!!y,N),h.fa=m,a.push(h)),h};function Zr(a,h){const m=h.type;if(m in a.g){var y=a.g[m],N=Array.prototype.indexOf.call(y,h,void 0),V;(V=N>=0)&&Array.prototype.splice.call(y,N,1),V&&($(h),a.g[m].length==0&&(delete a.g[m],a.h--))}}function Kt(a,h,m,y){for(let N=0;N<a.length;++N){const V=a[N];if(!V.da&&V.listener==h&&V.capture==!!m&&V.ha==y)return N}return-1}var Yn="closure_lm_"+(Math.random()*1e6|0),Gc={};function Um(a,h,m,y,N){if(Array.isArray(h)){for(let V=0;V<h.length;V++)Um(a,h[V],m,y,N);return null}return m=Bm(m),a&&a[Ze]?a.J(h,m,l(y)?!!y.capture:!1,N):OI(a,h,m,!1,y,N)}function OI(a,h,m,y,N,V){if(!h)throw Error("Invalid event type");const z=l(N)?!!N.capture:!!N;let Z=Qc(a);if(Z||(a[Yn]=Z=new Mt(a)),m=Z.add(h,m,y,z,V),m.proxy)return m;if(y=VI(),m.proxy=y,y.src=a,y.listener=m,a.addEventListener)A||(N=z),N===void 0&&(N=!1),a.addEventListener(h.toString(),y,N);else if(a.attachEvent)a.attachEvent(zm(h.toString()),y);else if(a.addListener&&a.removeListener)a.addListener(y);else throw Error("addEventListener and attachEvent are unavailable.");return m}function VI(){function a(m){return h.call(a.src,a.listener,m)}const h=LI;return a}function Fm(a,h,m,y,N){if(Array.isArray(h))for(var V=0;V<h.length;V++)Fm(a,h[V],m,y,N);else y=l(y)?!!y.capture:!!y,m=Bm(m),a&&a[Ze]?(a=a.i,V=String(h).toString(),V in a.g&&(h=a.g[V],m=Kt(h,m,y,N),m>-1&&($(h[m]),Array.prototype.splice.call(h,m,1),h.length==0&&(delete a.g[V],a.h--)))):a&&(a=Qc(a))&&(h=a.g[h.toString()],a=-1,h&&(a=Kt(h,m,y,N)),(m=a>-1?h[a]:null)&&Kc(m))}function Kc(a){if(typeof a!="number"&&a&&!a.da){var h=a.src;if(h&&h[Ze])Zr(h.i,a);else{var m=a.type,y=a.proxy;h.removeEventListener?h.removeEventListener(m,y,a.capture):h.detachEvent?h.detachEvent(zm(m),y):h.addListener&&h.removeListener&&h.removeListener(y),(m=Qc(h))?(Zr(m,a),m.h==0&&(m.src=null,h[Yn]=null)):$(a)}}}function zm(a){return a in Gc?Gc[a]:Gc[a]="on"+a}function LI(a,h){if(a.da)a=!0;else{h=new se(h,this);const m=a.listener,y=a.ha||a.src;a.fa&&Kc(a),a=m.call(y,h)}return a}function Qc(a){return a=a[Yn],a instanceof Mt?a:null}var Xc="__closure_events_fn_"+(Math.random()*1e9>>>0);function Bm(a){return typeof a=="function"?a:(a[Xc]||(a[Xc]=function(h){return a.handleEvent(h)}),a[Xc])}function et(){R.call(this),this.i=new Mt(this),this.M=this,this.G=null}p(et,R),et.prototype[Ze]=!0,et.prototype.removeEventListener=function(a,h,m,y){Fm(this,a,h,m,y)};function ct(a,h){var m,y=a.G;if(y)for(m=[];y;y=y.G)m.push(y);if(a=a.M,y=h.type||h,typeof h=="string")h=new T(h,a);else if(h instanceof T)h.target=h.target||a;else{var N=h;h=new T(y,a),Jr(h,N)}N=!0;let V,z;if(m)for(z=m.length-1;z>=0;z--)V=h.g=m[z],N=Qa(V,y,!0,h)&&N;if(V=h.g=a,N=Qa(V,y,!0,h)&&N,N=Qa(V,y,!1,h)&&N,m)for(z=0;z<m.length;z++)V=h.g=m[z],N=Qa(V,y,!1,h)&&N}et.prototype.N=function(){if(et.Z.N.call(this),this.i){var a=this.i;for(const h in a.g){const m=a.g[h];for(let y=0;y<m.length;y++)$(m[y]);delete a.g[h],a.h--}}this.G=null},et.prototype.J=function(a,h,m,y){return this.i.add(String(a),h,!1,m,y)},et.prototype.K=function(a,h,m,y){return this.i.add(String(a),h,!0,m,y)};function Qa(a,h,m,y){if(h=a.i.g[String(h)],!h)return!0;h=h.concat();let N=!0;for(let V=0;V<h.length;++V){const z=h[V];if(z&&!z.da&&z.capture==m){const Z=z.listener,je=z.ha||z.src;z.fa&&Zr(a.i,z),N=Z.call(je,y)!==!1&&N}}return N&&!y.defaultPrevented}function MI(a,h){if(typeof a!="function")if(a&&typeof a.handleEvent=="function")a=c(a.handleEvent,a);else throw Error("Invalid listener argument");return Number(h)>2147483647?-1:o.setTimeout(a,h||0)}function $m(a){a.g=MI(()=>{a.g=null,a.i&&(a.i=!1,$m(a))},a.l);const h=a.h;a.h=null,a.m.apply(null,h)}class jI extends R{constructor(h,m){super(),this.m=h,this.l=m,this.h=null,this.i=!1,this.g=null}j(h){this.h=arguments,this.g?this.i=!0:$m(this)}N(){super.N(),this.g&&(o.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Qi(a){R.call(this),this.h=a,this.g={}}p(Qi,R);var qm=[];function Hm(a){Q(a.g,function(h,m){this.g.hasOwnProperty(m)&&Kc(h)},a),a.g={}}Qi.prototype.N=function(){Qi.Z.N.call(this),Hm(this)},Qi.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Yc=o.JSON.stringify,UI=o.JSON.parse,FI=class{stringify(a){return o.JSON.stringify(a,void 0)}parse(a){return o.JSON.parse(a,void 0)}};function Wm(){}function Gm(){}var Xi={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function Jc(){T.call(this,"d")}p(Jc,T);function Zc(){T.call(this,"c")}p(Zc,T);var es={},Km=null;function Xa(){return Km=Km||new et}es.Ia="serverreachability";function Qm(a){T.call(this,es.Ia,a)}p(Qm,T);function Yi(a){const h=Xa();ct(h,new Qm(h))}es.STAT_EVENT="statevent";function Xm(a,h){T.call(this,es.STAT_EVENT,a),this.stat=h}p(Xm,T);function ht(a){const h=Xa();ct(h,new Xm(h,a))}es.Ja="timingevent";function Ym(a,h){T.call(this,es.Ja,a),this.size=h}p(Ym,T);function Ji(a,h){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return o.setTimeout(function(){a()},h)}function Zi(){this.g=!0}Zi.prototype.ua=function(){this.g=!1};function zI(a,h,m,y,N,V){a.info(function(){if(a.g)if(V){var z="",Z=V.split("&");for(let he=0;he<Z.length;he++){var je=Z[he].split("=");if(je.length>1){const Be=je[0];je=je[1];const cn=Be.split("_");z=cn.length>=2&&cn[1]=="type"?z+(Be+"="+je+"&"):z+(Be+"=redacted&")}}}else z=null;else z=V;return"XMLHTTP REQ ("+y+") [attempt "+N+"]: "+h+`
`+m+`
`+z})}function BI(a,h,m,y,N,V,z){a.info(function(){return"XMLHTTP RESP ("+y+") [ attempt "+N+"]: "+h+`
`+m+`
`+V+" "+z})}function Ms(a,h,m,y){a.info(function(){return"XMLHTTP TEXT ("+h+"): "+qI(a,m)+(y?" "+y:"")})}function $I(a,h){a.info(function(){return"TIMEOUT: "+h})}Zi.prototype.info=function(){};function qI(a,h){if(!a.g)return h;if(!h)return null;try{const V=JSON.parse(h);if(V){for(a=0;a<V.length;a++)if(Array.isArray(V[a])){var m=V[a];if(!(m.length<2)){var y=m[1];if(Array.isArray(y)&&!(y.length<1)){var N=y[0];if(N!="noop"&&N!="stop"&&N!="close")for(let z=1;z<y.length;z++)y[z]=""}}}}return Yc(V)}catch{return h}}var Ya={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},Jm={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},Zm;function eh(){}p(eh,Wm),eh.prototype.g=function(){return new XMLHttpRequest},Zm=new eh;function eo(a){return encodeURIComponent(String(a))}function HI(a){var h=1;a=a.split(":");const m=[];for(;h>0&&a.length;)m.push(a.shift()),h--;return a.length&&m.push(a.join(":")),m}function Jn(a,h,m,y){this.j=a,this.i=h,this.l=m,this.S=y||1,this.V=new Qi(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new eg}function eg(){this.i=null,this.g="",this.h=!1}var tg={},th={};function nh(a,h,m){a.M=1,a.A=Za(un(h)),a.u=m,a.R=!0,ng(a,null)}function ng(a,h){a.F=Date.now(),Ja(a),a.B=un(a.A);var m=a.B,y=a.S;Array.isArray(y)||(y=[String(y)]),mg(m.i,"t",y),a.C=0,m=a.j.L,a.h=new eg,a.g=Dg(a.j,m?h:null,!a.u),a.P>0&&(a.O=new jI(c(a.Y,a,a.g),a.P)),h=a.V,m=a.g,y=a.ba;var N="readystatechange";Array.isArray(N)||(N&&(qm[0]=N.toString()),N=qm);for(let V=0;V<N.length;V++){const z=Um(m,N[V],y||h.handleEvent,!1,h.h||h);if(!z)break;h.g[z.key]=z}h=a.J?ve(a.J):{},a.u?(a.v||(a.v="POST"),h["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.B,a.v,a.u,h)):(a.v="GET",a.g.ea(a.B,a.v,null,h)),Yi(),zI(a.i,a.v,a.B,a.l,a.S,a.u)}Jn.prototype.ba=function(a){a=a.target;const h=this.O;h&&tr(a)==3?h.j():this.Y(a)},Jn.prototype.Y=function(a){try{if(a==this.g)e:{const Z=tr(this.g),je=this.g.ya(),he=this.g.ca();if(!(Z<3)&&(Z!=3||this.g&&(this.h.h||this.g.la()||Tg(this.g)))){this.K||Z!=4||je==7||(je==8||he<=0?Yi(3):Yi(2)),rh(this);var h=this.g.ca();this.X=h;var m=WI(this);if(this.o=h==200,BI(this.i,this.v,this.B,this.l,this.S,Z,h),this.o){if(this.U&&!this.L){t:{if(this.g){var y,N=this.g;if((y=N.g?N.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!k(y)){var V=y;break t}}V=null}if(a=V)Ms(this.i,this.l,a,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,sh(this,a);else{this.o=!1,this.m=3,ht(12),ts(this),to(this);break e}}if(this.R){a=!0;let Be;for(;!this.K&&this.C<m.length;)if(Be=GI(this,m),Be==th){Z==4&&(this.m=4,ht(14),a=!1),Ms(this.i,this.l,null,"[Incomplete Response]");break}else if(Be==tg){this.m=4,ht(15),Ms(this.i,this.l,m,"[Invalid Chunk]"),a=!1;break}else Ms(this.i,this.l,Be,null),sh(this,Be);if(rg(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),Z!=4||m.length!=0||this.h.h||(this.m=1,ht(16),a=!1),this.o=this.o&&a,!a)Ms(this.i,this.l,m,"[Invalid Chunked Response]"),ts(this),to(this);else if(m.length>0&&!this.W){this.W=!0;var z=this.j;z.g==this&&z.aa&&!z.P&&(z.j.info("Great, no buffering proxy detected. Bytes received: "+m.length),dh(z),z.P=!0,ht(11))}}else Ms(this.i,this.l,m,null),sh(this,m);Z==4&&ts(this),this.o&&!this.K&&(Z==4?Rg(this.j,this):(this.o=!1,Ja(this)))}else a1(this.g),h==400&&m.indexOf("Unknown SID")>0?(this.m=3,ht(12)):(this.m=0,ht(13)),ts(this),to(this)}}}catch{}finally{}};function WI(a){if(!rg(a))return a.g.la();const h=Tg(a.g);if(h==="")return"";let m="";const y=h.length,N=tr(a.g)==4;if(!a.h.i){if(typeof TextDecoder>"u")return ts(a),to(a),"";a.h.i=new o.TextDecoder}for(let V=0;V<y;V++)a.h.h=!0,m+=a.h.i.decode(h[V],{stream:!(N&&V==y-1)});return h.length=0,a.h.g+=m,a.C=0,a.h.g}function rg(a){return a.g?a.v=="GET"&&a.M!=2&&a.j.Aa:!1}function GI(a,h){var m=a.C,y=h.indexOf(`
`,m);return y==-1?th:(m=Number(h.substring(m,y)),isNaN(m)?tg:(y+=1,y+m>h.length?th:(h=h.slice(y,y+m),a.C=y+m,h)))}Jn.prototype.cancel=function(){this.K=!0,ts(this)};function Ja(a){a.T=Date.now()+a.H,sg(a,a.H)}function sg(a,h){if(a.D!=null)throw Error("WatchDog timer not null");a.D=Ji(c(a.aa,a),h)}function rh(a){a.D&&(o.clearTimeout(a.D),a.D=null)}Jn.prototype.aa=function(){this.D=null;const a=Date.now();a-this.T>=0?($I(this.i,this.B),this.M!=2&&(Yi(),ht(17)),ts(this),this.m=2,to(this)):sg(this,this.T-a)};function to(a){a.j.I==0||a.K||Rg(a.j,a)}function ts(a){rh(a);var h=a.O;h&&typeof h.dispose=="function"&&h.dispose(),a.O=null,Hm(a.V),a.g&&(h=a.g,a.g=null,h.abort(),h.dispose())}function sh(a,h){try{var m=a.j;if(m.I!=0&&(m.g==a||ih(m.h,a))){if(!a.L&&ih(m.h,a)&&m.I==3){try{var y=m.Ba.g.parse(h)}catch{y=null}if(Array.isArray(y)&&y.length==3){var N=y;if(N[0]==0){e:if(!m.v){if(m.g)if(m.g.F+3e3<a.F)sl(m),nl(m);else break e;hh(m),ht(18)}}else m.xa=N[1],0<m.xa-m.K&&N[2]<37500&&m.F&&m.A==0&&!m.C&&(m.C=Ji(c(m.Va,m),6e3));ag(m.h)<=1&&m.ta&&(m.ta=void 0)}else rs(m,11)}else if((a.L||m.g==a)&&sl(m),!k(h))for(N=m.Ba.g.parse(h),h=0;h<N.length;h++){let he=N[h];const Be=he[0];if(!(Be<=m.K))if(m.K=Be,he=he[1],m.I==2)if(he[0]=="c"){m.M=he[1],m.ba=he[2];const cn=he[3];cn!=null&&(m.ka=cn,m.j.info("VER="+m.ka));const ss=he[4];ss!=null&&(m.za=ss,m.j.info("SVER="+m.za));const nr=he[5];nr!=null&&typeof nr=="number"&&nr>0&&(y=1.5*nr,m.O=y,m.j.info("backChannelRequestTimeoutMs_="+y)),y=m;const rr=a.g;if(rr){const ol=rr.g?rr.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(ol){var V=y.h;V.g||ol.indexOf("spdy")==-1&&ol.indexOf("quic")==-1&&ol.indexOf("h2")==-1||(V.j=V.l,V.g=new Set,V.h&&(oh(V,V.h),V.h=null))}if(y.G){const fh=rr.g?rr.g.getResponseHeader("X-HTTP-Session-Id"):null;fh&&(y.wa=fh,me(y.J,y.G,fh))}}m.I=3,m.l&&m.l.ra(),m.aa&&(m.T=Date.now()-a.F,m.j.info("Handshake RTT: "+m.T+"ms")),y=m;var z=a;if(y.na=Ng(y,y.L?y.ba:null,y.W),z.L){lg(y.h,z);var Z=z,je=y.O;je&&(Z.H=je),Z.D&&(rh(Z),Ja(Z)),y.g=z}else Cg(y);m.i.length>0&&rl(m)}else he[0]!="stop"&&he[0]!="close"||rs(m,7);else m.I==3&&(he[0]=="stop"||he[0]=="close"?he[0]=="stop"?rs(m,7):ch(m):he[0]!="noop"&&m.l&&m.l.qa(he),m.A=0)}}Yi(4)}catch{}}var KI=class{constructor(a,h){this.g=a,this.map=h}};function ig(a){this.l=a||10,o.PerformanceNavigationTiming?(a=o.performance.getEntriesByType("navigation"),a=a.length>0&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(o.chrome&&o.chrome.loadTimes&&o.chrome.loadTimes()&&o.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function og(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function ag(a){return a.h?1:a.g?a.g.size:0}function ih(a,h){return a.h?a.h==h:a.g?a.g.has(h):!1}function oh(a,h){a.g?a.g.add(h):a.h=h}function lg(a,h){a.h&&a.h==h?a.h=null:a.g&&a.g.has(h)&&a.g.delete(h)}ig.prototype.cancel=function(){if(this.i=ug(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function ug(a){if(a.h!=null)return a.i.concat(a.h.G);if(a.g!=null&&a.g.size!==0){let h=a.i;for(const m of a.g.values())h=h.concat(m.G);return h}return w(a.i)}var cg=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function QI(a,h){if(a){a=a.split("&");for(let m=0;m<a.length;m++){const y=a[m].indexOf("=");let N,V=null;y>=0?(N=a[m].substring(0,y),V=a[m].substring(y+1)):N=a[m],h(N,V?decodeURIComponent(V.replace(/\+/g," ")):"")}}}function Zn(a){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let h;a instanceof Zn?(this.l=a.l,no(this,a.j),this.o=a.o,this.g=a.g,ro(this,a.u),this.h=a.h,ah(this,gg(a.i)),this.m=a.m):a&&(h=String(a).match(cg))?(this.l=!1,no(this,h[1]||"",!0),this.o=so(h[2]||""),this.g=so(h[3]||"",!0),ro(this,h[4]),this.h=so(h[5]||"",!0),ah(this,h[6]||"",!0),this.m=so(h[7]||"")):(this.l=!1,this.i=new oo(null,this.l))}Zn.prototype.toString=function(){const a=[];var h=this.j;h&&a.push(io(h,hg,!0),":");var m=this.g;return(m||h=="file")&&(a.push("//"),(h=this.o)&&a.push(io(h,hg,!0),"@"),a.push(eo(m).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),m=this.u,m!=null&&a.push(":",String(m))),(m=this.h)&&(this.g&&m.charAt(0)!="/"&&a.push("/"),a.push(io(m,m.charAt(0)=="/"?JI:YI,!0))),(m=this.i.toString())&&a.push("?",m),(m=this.m)&&a.push("#",io(m,e1)),a.join("")},Zn.prototype.resolve=function(a){const h=un(this);let m=!!a.j;m?no(h,a.j):m=!!a.o,m?h.o=a.o:m=!!a.g,m?h.g=a.g:m=a.u!=null;var y=a.h;if(m)ro(h,a.u);else if(m=!!a.h){if(y.charAt(0)!="/")if(this.g&&!this.h)y="/"+y;else{var N=h.h.lastIndexOf("/");N!=-1&&(y=h.h.slice(0,N+1)+y)}if(N=y,N==".."||N==".")y="";else if(N.indexOf("./")!=-1||N.indexOf("/.")!=-1){y=N.lastIndexOf("/",0)==0,N=N.split("/");const V=[];for(let z=0;z<N.length;){const Z=N[z++];Z=="."?y&&z==N.length&&V.push(""):Z==".."?((V.length>1||V.length==1&&V[0]!="")&&V.pop(),y&&z==N.length&&V.push("")):(V.push(Z),y=!0)}y=V.join("/")}else y=N}return m?h.h=y:m=a.i.toString()!=="",m?ah(h,gg(a.i)):m=!!a.m,m&&(h.m=a.m),h};function un(a){return new Zn(a)}function no(a,h,m){a.j=m?so(h,!0):h,a.j&&(a.j=a.j.replace(/:$/,""))}function ro(a,h){if(h){if(h=Number(h),isNaN(h)||h<0)throw Error("Bad port number "+h);a.u=h}else a.u=null}function ah(a,h,m){h instanceof oo?(a.i=h,t1(a.i,a.l)):(m||(h=io(h,ZI)),a.i=new oo(h,a.l))}function me(a,h,m){a.i.set(h,m)}function Za(a){return me(a,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),a}function so(a,h){return a?h?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function io(a,h,m){return typeof a=="string"?(a=encodeURI(a).replace(h,XI),m&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function XI(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var hg=/[#\/\?@]/g,YI=/[#\?:]/g,JI=/[#\?]/g,ZI=/[#\?@]/g,e1=/#/g;function oo(a,h){this.h=this.g=null,this.i=a||null,this.j=!!h}function ns(a){a.g||(a.g=new Map,a.h=0,a.i&&QI(a.i,function(h,m){a.add(decodeURIComponent(h.replace(/\+/g," ")),m)}))}t=oo.prototype,t.add=function(a,h){ns(this),this.i=null,a=js(this,a);let m=this.g.get(a);return m||this.g.set(a,m=[]),m.push(h),this.h+=1,this};function dg(a,h){ns(a),h=js(a,h),a.g.has(h)&&(a.i=null,a.h-=a.g.get(h).length,a.g.delete(h))}function fg(a,h){return ns(a),h=js(a,h),a.g.has(h)}t.forEach=function(a,h){ns(this),this.g.forEach(function(m,y){m.forEach(function(N){a.call(h,N,y,this)},this)},this)};function pg(a,h){ns(a);let m=[];if(typeof h=="string")fg(a,h)&&(m=m.concat(a.g.get(js(a,h))));else for(a=Array.from(a.g.values()),h=0;h<a.length;h++)m=m.concat(a[h]);return m}t.set=function(a,h){return ns(this),this.i=null,a=js(this,a),fg(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[h]),this.h+=1,this},t.get=function(a,h){return a?(a=pg(this,a),a.length>0?String(a[0]):h):h};function mg(a,h,m){dg(a,h),m.length>0&&(a.i=null,a.g.set(js(a,h),w(m)),a.h+=m.length)}t.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],h=Array.from(this.g.keys());for(let y=0;y<h.length;y++){var m=h[y];const N=eo(m);m=pg(this,m);for(let V=0;V<m.length;V++){let z=N;m[V]!==""&&(z+="="+eo(m[V])),a.push(z)}}return this.i=a.join("&")};function gg(a){const h=new oo;return h.i=a.i,a.g&&(h.g=new Map(a.g),h.h=a.h),h}function js(a,h){return h=String(h),a.j&&(h=h.toLowerCase()),h}function t1(a,h){h&&!a.j&&(ns(a),a.i=null,a.g.forEach(function(m,y){const N=y.toLowerCase();y!=N&&(dg(this,y),mg(this,N,m))},a)),a.j=h}function n1(a,h){const m=new Zi;if(o.Image){const y=new Image;y.onload=f(er,m,"TestLoadImage: loaded",!0,h,y),y.onerror=f(er,m,"TestLoadImage: error",!1,h,y),y.onabort=f(er,m,"TestLoadImage: abort",!1,h,y),y.ontimeout=f(er,m,"TestLoadImage: timeout",!1,h,y),o.setTimeout(function(){y.ontimeout&&y.ontimeout()},1e4),y.src=a}else h(!1)}function r1(a,h){const m=new Zi,y=new AbortController,N=setTimeout(()=>{y.abort(),er(m,"TestPingServer: timeout",!1,h)},1e4);fetch(a,{signal:y.signal}).then(V=>{clearTimeout(N),V.ok?er(m,"TestPingServer: ok",!0,h):er(m,"TestPingServer: server error",!1,h)}).catch(()=>{clearTimeout(N),er(m,"TestPingServer: error",!1,h)})}function er(a,h,m,y,N){try{N&&(N.onload=null,N.onerror=null,N.onabort=null,N.ontimeout=null),y(m)}catch{}}function s1(){this.g=new FI}function lh(a){this.i=a.Sb||null,this.h=a.ab||!1}p(lh,Wm),lh.prototype.g=function(){return new el(this.i,this.h)};function el(a,h){et.call(this),this.H=a,this.o=h,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}p(el,et),t=el.prototype,t.open=function(a,h){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=a,this.D=h,this.readyState=1,lo(this)},t.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const h={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};a&&(h.body=a),(this.H||o).fetch(new Request(this.D,h)).then(this.Pa.bind(this),this.ga.bind(this))},t.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,ao(this)),this.readyState=0},t.Pa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,lo(this)),this.g&&(this.readyState=3,lo(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof o.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;yg(this)}else a.text().then(this.Oa.bind(this),this.ga.bind(this))};function yg(a){a.j.read().then(a.Ma.bind(a)).catch(a.ga.bind(a))}t.Ma=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var h=a.value?a.value:new Uint8Array(0);(h=this.B.decode(h,{stream:!a.done}))&&(this.response=this.responseText+=h)}a.done?ao(this):lo(this),this.readyState==3&&yg(this)}},t.Oa=function(a){this.g&&(this.response=this.responseText=a,ao(this))},t.Na=function(a){this.g&&(this.response=a,ao(this))},t.ga=function(){this.g&&ao(this)};function ao(a){a.readyState=4,a.l=null,a.j=null,a.B=null,lo(a)}t.setRequestHeader=function(a,h){this.A.append(a,h)},t.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},t.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],h=this.h.entries();for(var m=h.next();!m.done;)m=m.value,a.push(m[0]+": "+m[1]),m=h.next();return a.join(`\r
`)};function lo(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(el.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function _g(a){let h="";return Q(a,function(m,y){h+=y,h+=":",h+=m,h+=`\r
`}),h}function uh(a,h,m){e:{for(y in m){var y=!1;break e}y=!0}y||(m=_g(m),typeof a=="string"?m!=null&&eo(m):me(a,h,m))}function Re(a){et.call(this),this.headers=new Map,this.L=a||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}p(Re,et);var i1=/^https?$/i,o1=["POST","PUT"];t=Re.prototype,t.Fa=function(a){this.H=a},t.ea=function(a,h,m,y){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);h=h?h.toUpperCase():"GET",this.D=a,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():Zm.g(),this.g.onreadystatechange=g(c(this.Ca,this));try{this.B=!0,this.g.open(h,String(a),!0),this.B=!1}catch(V){vg(this,V);return}if(a=m||"",m=new Map(this.headers),y)if(Object.getPrototypeOf(y)===Object.prototype)for(var N in y)m.set(N,y[N]);else if(typeof y.keys=="function"&&typeof y.get=="function")for(const V of y.keys())m.set(V,y.get(V));else throw Error("Unknown input type for opt_headers: "+String(y));y=Array.from(m.keys()).find(V=>V.toLowerCase()=="content-type"),N=o.FormData&&a instanceof o.FormData,!(Array.prototype.indexOf.call(o1,h,void 0)>=0)||y||N||m.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[V,z]of m)this.g.setRequestHeader(V,z);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(a),this.v=!1}catch(V){vg(this,V)}};function vg(a,h){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=h,a.o=5,wg(a),tl(a)}function wg(a){a.A||(a.A=!0,ct(a,"complete"),ct(a,"error"))}t.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=a||7,ct(this,"complete"),ct(this,"abort"),tl(this))},t.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),tl(this,!0)),Re.Z.N.call(this)},t.Ca=function(){this.u||(this.B||this.v||this.j?Eg(this):this.Xa())},t.Xa=function(){Eg(this)};function Eg(a){if(a.h&&typeof i<"u"){if(a.v&&tr(a)==4)setTimeout(a.Ca.bind(a),0);else if(ct(a,"readystatechange"),tr(a)==4){a.h=!1;try{const V=a.ca();e:switch(V){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var h=!0;break e;default:h=!1}var m;if(!(m=h)){var y;if(y=V===0){let z=String(a.D).match(cg)[1]||null;!z&&o.self&&o.self.location&&(z=o.self.location.protocol.slice(0,-1)),y=!i1.test(z?z.toLowerCase():"")}m=y}if(m)ct(a,"complete"),ct(a,"success");else{a.o=6;try{var N=tr(a)>2?a.g.statusText:""}catch{N=""}a.l=N+" ["+a.ca()+"]",wg(a)}}finally{tl(a)}}}}function tl(a,h){if(a.g){a.m&&(clearTimeout(a.m),a.m=null);const m=a.g;a.g=null,h||ct(a,"ready");try{m.onreadystatechange=null}catch{}}}t.isActive=function(){return!!this.g};function tr(a){return a.g?a.g.readyState:0}t.ca=function(){try{return tr(this)>2?this.g.status:-1}catch{return-1}},t.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},t.La=function(a){if(this.g){var h=this.g.responseText;return a&&h.indexOf(a)==0&&(h=h.substring(a.length)),UI(h)}};function Tg(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.F){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function a1(a){const h={};a=(a.g&&tr(a)>=2&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let y=0;y<a.length;y++){if(k(a[y]))continue;var m=HI(a[y]);const N=m[0];if(m=m[1],typeof m!="string")continue;m=m.trim();const V=h[N]||[];h[N]=V,V.push(m)}J(h,function(y){return y.join(", ")})}t.ya=function(){return this.o},t.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function uo(a,h,m){return m&&m.internalChannelParams&&m.internalChannelParams[a]||h}function xg(a){this.za=0,this.i=[],this.j=new Zi,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=uo("failFast",!1,a),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=uo("baseRetryDelayMs",5e3,a),this.Za=uo("retryDelaySeedMs",1e4,a),this.Ta=uo("forwardChannelMaxRetries",2,a),this.va=uo("forwardChannelRequestTimeoutMs",2e4,a),this.ma=a&&a.xmlHttpFactory||void 0,this.Ua=a&&a.Rb||void 0,this.Aa=a&&a.useFetchStreams||!1,this.O=void 0,this.L=a&&a.supportsCrossDomainXhr||!1,this.M="",this.h=new ig(a&&a.concurrentRequestLimit),this.Ba=new s1,this.S=a&&a.fastHandshake||!1,this.R=a&&a.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=a&&a.Pb||!1,a&&a.ua&&this.j.ua(),a&&a.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&a&&a.detectBufferingProxy||!1,this.ia=void 0,a&&a.longPollingTimeout&&a.longPollingTimeout>0&&(this.ia=a.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}t=xg.prototype,t.ka=8,t.I=1,t.connect=function(a,h,m,y){ht(0),this.W=a,this.H=h||{},m&&y!==void 0&&(this.H.OSID=m,this.H.OAID=y),this.F=this.X,this.J=Ng(this,null,this.W),rl(this)};function ch(a){if(Ig(a),a.I==3){var h=a.V++,m=un(a.J);if(me(m,"SID",a.M),me(m,"RID",h),me(m,"TYPE","terminate"),co(a,m),h=new Jn(a,a.j,h),h.M=2,h.A=Za(un(m)),m=!1,o.navigator&&o.navigator.sendBeacon)try{m=o.navigator.sendBeacon(h.A.toString(),"")}catch{}!m&&o.Image&&(new Image().src=h.A,m=!0),m||(h.g=Dg(h.j,null),h.g.ea(h.A)),h.F=Date.now(),Ja(h)}Pg(a)}function nl(a){a.g&&(dh(a),a.g.cancel(),a.g=null)}function Ig(a){nl(a),a.v&&(o.clearTimeout(a.v),a.v=null),sl(a),a.h.cancel(),a.m&&(typeof a.m=="number"&&o.clearTimeout(a.m),a.m=null)}function rl(a){if(!og(a.h)&&!a.m){a.m=!0;var h=a.Ea;j||_(),L||(j(),L=!0),E.add(h,a),a.D=0}}function l1(a,h){return ag(a.h)>=a.h.j-(a.m?1:0)?!1:a.m?(a.i=h.G.concat(a.i),!0):a.I==1||a.I==2||a.D>=(a.Sa?0:a.Ta)?!1:(a.m=Ji(c(a.Ea,a,h),bg(a,a.D)),a.D++,!0)}t.Ea=function(a){if(this.m)if(this.m=null,this.I==1){if(!a){this.V=Math.floor(Math.random()*1e5),a=this.V++;const N=new Jn(this,this.j,a);let V=this.o;if(this.U&&(V?(V=ve(V),Jr(V,this.U)):V=this.U),this.u!==null||this.R||(N.J=V,V=null),this.S)e:{for(var h=0,m=0;m<this.i.length;m++){t:{var y=this.i[m];if("__data__"in y.map&&(y=y.map.__data__,typeof y=="string")){y=y.length;break t}y=void 0}if(y===void 0)break;if(h+=y,h>4096){h=m;break e}if(h===4096||m===this.i.length-1){h=m+1;break e}}h=1e3}else h=1e3;h=kg(this,N,h),m=un(this.J),me(m,"RID",a),me(m,"CVER",22),this.G&&me(m,"X-HTTP-Session-Id",this.G),co(this,m),V&&(this.R?h="headers="+eo(_g(V))+"&"+h:this.u&&uh(m,this.u,V)),oh(this.h,N),this.Ra&&me(m,"TYPE","init"),this.S?(me(m,"$req",h),me(m,"SID","null"),N.U=!0,nh(N,m,null)):nh(N,m,h),this.I=2}}else this.I==3&&(a?Sg(this,a):this.i.length==0||og(this.h)||Sg(this))};function Sg(a,h){var m;h?m=h.l:m=a.V++;const y=un(a.J);me(y,"SID",a.M),me(y,"RID",m),me(y,"AID",a.K),co(a,y),a.u&&a.o&&uh(y,a.u,a.o),m=new Jn(a,a.j,m,a.D+1),a.u===null&&(m.J=a.o),h&&(a.i=h.G.concat(a.i)),h=kg(a,m,1e3),m.H=Math.round(a.va*.5)+Math.round(a.va*.5*Math.random()),oh(a.h,m),nh(m,y,h)}function co(a,h){a.H&&Q(a.H,function(m,y){me(h,y,m)}),a.l&&Q({},function(m,y){me(h,y,m)})}function kg(a,h,m){m=Math.min(a.i.length,m);const y=a.l?c(a.l.Ka,a.l,a):null;e:{var N=a.i;let Z=-1;for(;;){const je=["count="+m];Z==-1?m>0?(Z=N[0].g,je.push("ofs="+Z)):Z=0:je.push("ofs="+Z);let he=!0;for(let Be=0;Be<m;Be++){var V=N[Be].g;const cn=N[Be].map;if(V-=Z,V<0)Z=Math.max(0,N[Be].g-100),he=!1;else try{V="req"+V+"_"||"";try{var z=cn instanceof Map?cn:Object.entries(cn);for(const[ss,nr]of z){let rr=nr;l(nr)&&(rr=Yc(nr)),je.push(V+ss+"="+encodeURIComponent(rr))}}catch(ss){throw je.push(V+"type="+encodeURIComponent("_badmap")),ss}}catch{y&&y(cn)}}if(he){z=je.join("&");break e}}z=void 0}return a=a.i.splice(0,m),h.G=a,z}function Cg(a){if(!a.g&&!a.v){a.Y=1;var h=a.Da;j||_(),L||(j(),L=!0),E.add(h,a),a.A=0}}function hh(a){return a.g||a.v||a.A>=3?!1:(a.Y++,a.v=Ji(c(a.Da,a),bg(a,a.A)),a.A++,!0)}t.Da=function(){if(this.v=null,Ag(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var a=4*this.T;this.j.info("BP detection timer enabled: "+a),this.B=Ji(c(this.Wa,this),a)}},t.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,ht(10),nl(this),Ag(this))};function dh(a){a.B!=null&&(o.clearTimeout(a.B),a.B=null)}function Ag(a){a.g=new Jn(a,a.j,"rpc",a.Y),a.u===null&&(a.g.J=a.o),a.g.P=0;var h=un(a.na);me(h,"RID","rpc"),me(h,"SID",a.M),me(h,"AID",a.K),me(h,"CI",a.F?"0":"1"),!a.F&&a.ia&&me(h,"TO",a.ia),me(h,"TYPE","xmlhttp"),co(a,h),a.u&&a.o&&uh(h,a.u,a.o),a.O&&(a.g.H=a.O);var m=a.g;a=a.ba,m.M=1,m.A=Za(un(h)),m.u=null,m.R=!0,ng(m,a)}t.Va=function(){this.C!=null&&(this.C=null,nl(this),hh(this),ht(19))};function sl(a){a.C!=null&&(o.clearTimeout(a.C),a.C=null)}function Rg(a,h){var m=null;if(a.g==h){sl(a),dh(a),a.g=null;var y=2}else if(ih(a.h,h))m=h.G,lg(a.h,h),y=1;else return;if(a.I!=0){if(h.o)if(y==1){m=h.u?h.u.length:0,h=Date.now()-h.F;var N=a.D;y=Xa(),ct(y,new Ym(y,m)),rl(a)}else Cg(a);else if(N=h.m,N==3||N==0&&h.X>0||!(y==1&&l1(a,h)||y==2&&hh(a)))switch(m&&m.length>0&&(h=a.h,h.i=h.i.concat(m)),N){case 1:rs(a,5);break;case 4:rs(a,10);break;case 3:rs(a,6);break;default:rs(a,2)}}}function bg(a,h){let m=a.Qa+Math.floor(Math.random()*a.Za);return a.isActive()||(m*=2),m*h}function rs(a,h){if(a.j.info("Error code "+h),h==2){var m=c(a.bb,a),y=a.Ua;const N=!y;y=new Zn(y||"//www.google.com/images/cleardot.gif"),o.location&&o.location.protocol=="http"||no(y,"https"),Za(y),N?n1(y.toString(),m):r1(y.toString(),m)}else ht(2);a.I=0,a.l&&a.l.pa(h),Pg(a),Ig(a)}t.bb=function(a){a?(this.j.info("Successfully pinged google.com"),ht(2)):(this.j.info("Failed to ping google.com"),ht(1))};function Pg(a){if(a.I=0,a.ja=[],a.l){const h=ug(a.h);(h.length!=0||a.i.length!=0)&&(x(a.ja,h),x(a.ja,a.i),a.h.i.length=0,w(a.i),a.i.length=0),a.l.oa()}}function Ng(a,h,m){var y=m instanceof Zn?un(m):new Zn(m);if(y.g!="")h&&(y.g=h+"."+y.g),ro(y,y.u);else{var N=o.location;y=N.protocol,h=h?h+"."+N.hostname:N.hostname,N=+N.port;const V=new Zn(null);y&&no(V,y),h&&(V.g=h),N&&ro(V,N),m&&(V.h=m),y=V}return m=a.G,h=a.wa,m&&h&&me(y,m,h),me(y,"VER",a.ka),co(a,y),y}function Dg(a,h,m){if(h&&!a.L)throw Error("Can't create secondary domain capable XhrIo object.");return h=a.Aa&&!a.ma?new Re(new lh({ab:m})):new Re(a.ma),h.Fa(a.L),h}t.isActive=function(){return!!this.l&&this.l.isActive(this)};function Og(){}t=Og.prototype,t.ra=function(){},t.qa=function(){},t.pa=function(){},t.oa=function(){},t.isActive=function(){return!0},t.Ka=function(){};function il(){}il.prototype.g=function(a,h){return new kt(a,h)};function kt(a,h){et.call(this),this.g=new xg(h),this.l=a,this.h=h&&h.messageUrlParams||null,a=h&&h.messageHeaders||null,h&&h.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=h&&h.initMessageHeaders||null,h&&h.messageContentType&&(a?a["X-WebChannel-Content-Type"]=h.messageContentType:a={"X-WebChannel-Content-Type":h.messageContentType}),h&&h.sa&&(a?a["X-WebChannel-Client-Profile"]=h.sa:a={"X-WebChannel-Client-Profile":h.sa}),this.g.U=a,(a=h&&h.Qb)&&!k(a)&&(this.g.u=a),this.A=h&&h.supportsCrossDomainXhr||!1,this.v=h&&h.sendRawJson||!1,(h=h&&h.httpSessionIdParam)&&!k(h)&&(this.g.G=h,a=this.h,a!==null&&h in a&&(a=this.h,h in a&&delete a[h])),this.j=new Us(this)}p(kt,et),kt.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},kt.prototype.close=function(){ch(this.g)},kt.prototype.o=function(a){var h=this.g;if(typeof a=="string"){var m={};m.__data__=a,a=m}else this.v&&(m={},m.__data__=Yc(a),a=m);h.i.push(new KI(h.Ya++,a)),h.I==3&&rl(h)},kt.prototype.N=function(){this.g.l=null,delete this.j,ch(this.g),delete this.g,kt.Z.N.call(this)};function Vg(a){Jc.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var h=a.__sm__;if(h){e:{for(const m in h){a=m;break e}a=void 0}(this.i=a)&&(a=this.i,h=h!==null&&a in h?h[a]:void 0),this.data=h}else this.data=a}p(Vg,Jc);function Lg(){Zc.call(this),this.status=1}p(Lg,Zc);function Us(a){this.g=a}p(Us,Og),Us.prototype.ra=function(){ct(this.g,"a")},Us.prototype.qa=function(a){ct(this.g,new Vg(a))},Us.prototype.pa=function(a){ct(this.g,new Lg)},Us.prototype.oa=function(){ct(this.g,"b")},il.prototype.createWebChannel=il.prototype.g,kt.prototype.send=kt.prototype.o,kt.prototype.open=kt.prototype.m,kt.prototype.close=kt.prototype.close,ME=function(){return new il},LE=function(){return Xa()},VE=es,lf={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},Ya.NO_ERROR=0,Ya.TIMEOUT=8,Ya.HTTP_ERROR=6,Wl=Ya,Jm.COMPLETE="complete",OE=Jm,Gm.EventType=Xi,Xi.OPEN="a",Xi.CLOSE="b",Xi.ERROR="c",Xi.MESSAGE="d",et.prototype.listen=et.prototype.J,Ao=Gm,Re.prototype.listenOnce=Re.prototype.K,Re.prototype.getLastError=Re.prototype.Ha,Re.prototype.getLastErrorCode=Re.prototype.ya,Re.prototype.getStatus=Re.prototype.ca,Re.prototype.getResponseJson=Re.prototype.La,Re.prototype.getResponseText=Re.prototype.la,Re.prototype.send=Re.prototype.ea,Re.prototype.setWithCredentials=Re.prototype.Fa,DE=Re}).apply(typeof Il<"u"?Il:typeof self<"u"?self:typeof window<"u"?window:{});/**
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
 */let st=class{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}};st.UNAUTHENTICATED=new st(null),st.GOOGLE_CREDENTIALS=new st("google-credentials-uid"),st.FIRST_PARTY=new st("first-party-uid"),st.MOCK_USER=new st("mock-user");/**
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
 */let ji="12.13.0";function TR(t){ji=t}/**
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
 */const xs=new Pp("@firebase/firestore");function Bs(){return xs.logLevel}function q(t,...e){if(xs.logLevel<=re.DEBUG){const n=e.map(Op);xs.debug(`Firestore (${ji}): ${t}`,...n)}}function Wn(t,...e){if(xs.logLevel<=re.ERROR){const n=e.map(Op);xs.error(`Firestore (${ji}): ${t}`,...n)}}function Lr(t,...e){if(xs.logLevel<=re.WARN){const n=e.map(Op);xs.warn(`Firestore (${ji}): ${t}`,...n)}}function Op(t){if(typeof t=="string")return t;try{return function(n){return JSON.stringify(n)}(t)}catch{return t}}/**
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
 */function K(t,e,n){let r="Unexpected state";typeof e=="string"?r=e:n=e,jE(t,r,n)}function jE(t,e,n){let r=`FIRESTORE (${ji}) INTERNAL ASSERTION FAILED: ${e} (ID: ${t.toString(16)})`;if(n!==void 0)try{r+=" CONTEXT: "+JSON.stringify(n)}catch{r+=" CONTEXT: "+n}throw Wn(r),new Error(r)}function le(t,e,n,r){let s="Unexpected state";typeof n=="string"?s=n:r=n,t||jE(e,s,r)}function Y(t,e){return t}/**
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
 */const M={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class B extends Sn{constructor(e,n){super(e,n),this.code=e,this.message=n,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
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
 */class Mn{constructor(){this.promise=new Promise((e,n)=>{this.resolve=e,this.reject=n})}}/**
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
 */class UE{constructor(e,n){this.user=n,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class FE{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,n){e.enqueueRetryable(()=>n(st.UNAUTHENTICATED))}shutdown(){}}class xR{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,n){this.changeListener=n,e.enqueueRetryable(()=>n(this.token.user))}shutdown(){this.changeListener=null}}class IR{constructor(e){this.t=e,this.currentUser=st.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,n){le(this.o===void 0,42304);let r=this.i;const s=u=>this.i!==r?(r=this.i,n(u)):Promise.resolve();let i=new Mn;this.o=()=>{this.i++,this.currentUser=this.u(),i.resolve(),i=new Mn,e.enqueueRetryable(()=>s(this.currentUser))};const o=()=>{const u=i;e.enqueueRetryable(async()=>{await u.promise,await s(this.currentUser)})},l=u=>{q("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=u,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(u=>l(u)),setTimeout(()=>{if(!this.auth){const u=this.t.getImmediate({optional:!0});u?l(u):(q("FirebaseAuthCredentialsProvider","Auth not yet detected"),i.resolve(),i=new Mn)}},0),o()}getToken(){const e=this.i,n=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(n).then(r=>this.i!==e?(q("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(le(typeof r.accessToken=="string",31837,{l:r}),new UE(r.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return le(e===null||typeof e=="string",2055,{h:e}),new st(e)}}class SR{constructor(e,n,r){this.P=e,this.T=n,this.I=r,this.type="FirstParty",this.user=st.FIRST_PARTY,this.R=new Map}A(){return this.I?this.I():null}get headers(){this.R.set("X-Goog-AuthUser",this.P);const e=this.A();return e&&this.R.set("Authorization",e),this.T&&this.R.set("X-Goog-Iam-Authorization-Token",this.T),this.R}}class kR{constructor(e,n,r){this.P=e,this.T=n,this.I=r}getToken(){return Promise.resolve(new SR(this.P,this.T,this.I))}start(e,n){e.enqueueRetryable(()=>n(st.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class d_{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class CR{constructor(e,n){this.V=n,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,At(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,n){le(this.o===void 0,3512);const r=i=>{i.error!=null&&q("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${i.error.message}`);const o=i.token!==this.m;return this.m=i.token,q("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?n(i.token):Promise.resolve()};this.o=i=>{e.enqueueRetryable(()=>r(i))};const s=i=>{q("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=i,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit(i=>s(i)),setTimeout(()=>{if(!this.appCheck){const i=this.V.getImmediate({optional:!0});i?s(i):q("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.p)return Promise.resolve(new d_(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(n=>n?(le(typeof n.token=="string",44558,{tokenResult:n}),this.m=n.token,new d_(n.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
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
 */function AR(t){const e=typeof self<"u"&&(self.crypto||self.msCrypto),n=new Uint8Array(t);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(n);else for(let r=0;r<t;r++)n[r]=Math.floor(256*Math.random());return n}/**
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
 */class yc{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",n=62*Math.floor(4.129032258064516);let r="";for(;r.length<20;){const s=AR(40);for(let i=0;i<s.length;++i)r.length<20&&s[i]<n&&(r+=e.charAt(s[i]%62))}return r}}function ee(t,e){return t<e?-1:t>e?1:0}function uf(t,e){const n=Math.min(t.length,e.length);for(let r=0;r<n;r++){const s=t.charAt(r),i=e.charAt(r);if(s!==i)return Gh(s)===Gh(i)?ee(s,i):Gh(s)?1:-1}return ee(t.length,e.length)}const RR=55296,bR=57343;function Gh(t){const e=t.charCodeAt(0);return e>=RR&&e<=bR}function Ii(t,e,n){return t.length===e.length&&t.every((r,s)=>n(r,e[s]))}/**
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
 */const f_="__name__";class fn{constructor(e,n,r){n===void 0?n=0:n>e.length&&K(637,{offset:n,range:e.length}),r===void 0?r=e.length-n:r>e.length-n&&K(1746,{length:r,range:e.length-n}),this.segments=e,this.offset=n,this.len=r}get length(){return this.len}isEqual(e){return fn.comparator(this,e)===0}child(e){const n=this.segments.slice(this.offset,this.limit());return e instanceof fn?e.forEach(r=>{n.push(r)}):n.push(e),this.construct(n)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let n=0;n<this.length;n++)if(this.get(n)!==e.get(n))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let n=0;n<this.length;n++)if(this.get(n)!==e.get(n))return!1;return!0}forEach(e){for(let n=this.offset,r=this.limit();n<r;n++)e(this.segments[n])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,n){const r=Math.min(e.length,n.length);for(let s=0;s<r;s++){const i=fn.compareSegments(e.get(s),n.get(s));if(i!==0)return i}return ee(e.length,n.length)}static compareSegments(e,n){const r=fn.isNumericId(e),s=fn.isNumericId(n);return r&&!s?-1:!r&&s?1:r&&s?fn.extractNumericId(e).compare(fn.extractNumericId(n)):uf(e,n)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return Ar.fromString(e.substring(4,e.length-2))}}class de extends fn{construct(e,n,r){return new de(e,n,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const n=[];for(const r of e){if(r.indexOf("//")>=0)throw new B(M.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);n.push(...r.split("/").filter(s=>s.length>0))}return new de(n)}static emptyPath(){return new de([])}}const PR=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class He extends fn{construct(e,n,r){return new He(e,n,r)}static isValidIdentifier(e){return PR.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),He.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===f_}static keyField(){return new He([f_])}static fromServerFormat(e){const n=[];let r="",s=0;const i=()=>{if(r.length===0)throw new B(M.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);n.push(r),r=""};let o=!1;for(;s<e.length;){const l=e[s];if(l==="\\"){if(s+1===e.length)throw new B(M.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const u=e[s+1];if(u!=="\\"&&u!=="."&&u!=="`")throw new B(M.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=u,s+=2}else l==="`"?(o=!o,s++):l!=="."||o?(r+=l,s++):(i(),s++)}if(i(),o)throw new B(M.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new He(n)}static emptyPath(){return new He([])}}/**
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
 */class W{constructor(e){this.path=e}static fromPath(e){return new W(de.fromString(e))}static fromName(e){return new W(de.fromString(e).popFirst(5))}static empty(){return new W(de.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&de.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,n){return de.comparator(e.path,n.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new W(new de(e.slice()))}}/**
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
 */function zE(t,e,n){if(!n)throw new B(M.INVALID_ARGUMENT,`Function ${t}() cannot be called with an empty ${e}.`)}function BE(t,e,n,r){if(e===!0&&r===!0)throw new B(M.INVALID_ARGUMENT,`${t} and ${n} cannot be used together.`)}function p_(t){if(!W.isDocumentKey(t))throw new B(M.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${t} has ${t.length}.`)}function m_(t){if(W.isDocumentKey(t))throw new B(M.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${t} has ${t.length}.`)}function $E(t){return typeof t=="object"&&t!==null&&(Object.getPrototypeOf(t)===Object.prototype||Object.getPrototypeOf(t)===null)}function _c(t){if(t===void 0)return"undefined";if(t===null)return"null";if(typeof t=="string")return t.length>20&&(t=`${t.substring(0,20)}...`),JSON.stringify(t);if(typeof t=="number"||typeof t=="boolean")return""+t;if(typeof t=="object"){if(t instanceof Array)return"an array";{const e=function(r){return r.constructor?r.constructor.name:null}(t);return e?`a custom ${e} object`:"an object"}}return typeof t=="function"?"a function":K(12329,{type:typeof t})}function at(t,e){if("_delegate"in t&&(t=t._delegate),!(t instanceof e)){if(e.name===t.constructor.name)throw new B(M.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const n=_c(t);throw new B(M.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${n}`)}}return t}/**
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
 */function Me(t,e){const n={typeString:t};return e&&(n.value=e),n}function Da(t,e){if(!$E(t))throw new B(M.INVALID_ARGUMENT,"JSON must be an object");let n;for(const r in e)if(e[r]){const s=e[r].typeString,i="value"in e[r]?{value:e[r].value}:void 0;if(!(r in t)){n=`JSON missing required field: '${r}'`;break}const o=t[r];if(s&&typeof o!==s){n=`JSON field '${r}' must be a ${s}.`;break}if(i!==void 0&&o!==i.value){n=`Expected '${r}' field to equal '${i.value}'`;break}}if(n)throw new B(M.INVALID_ARGUMENT,n);return!0}/**
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
 */const g_=-62135596800,y_=1e6;class fe{static now(){return fe.fromMillis(Date.now())}static fromDate(e){return fe.fromMillis(e.getTime())}static fromMillis(e){const n=Math.floor(e/1e3),r=Math.floor((e-1e3*n)*y_);return new fe(n,r)}constructor(e,n){if(this.seconds=e,this.nanoseconds=n,n<0)throw new B(M.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+n);if(n>=1e9)throw new B(M.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+n);if(e<g_)throw new B(M.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new B(M.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/y_}_compareTo(e){return this.seconds===e.seconds?ee(this.nanoseconds,e.nanoseconds):ee(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:fe._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(Da(e,fe._jsonSchema))return new fe(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-g_;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}fe._jsonSchemaVersion="firestore/timestamp/1.0",fe._jsonSchema={type:Me("string",fe._jsonSchemaVersion),seconds:Me("number"),nanoseconds:Me("number")};/**
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
 */class X{static fromTimestamp(e){return new X(e)}static min(){return new X(new fe(0,0))}static max(){return new X(new fe(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
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
 */const pa=-1;function NR(t,e){const n=t.toTimestamp().seconds,r=t.toTimestamp().nanoseconds+1,s=X.fromTimestamp(r===1e9?new fe(n+1,0):new fe(n,r));return new Mr(s,W.empty(),e)}function DR(t){return new Mr(t.readTime,t.key,pa)}class Mr{constructor(e,n,r){this.readTime=e,this.documentKey=n,this.largestBatchId=r}static min(){return new Mr(X.min(),W.empty(),pa)}static max(){return new Mr(X.max(),W.empty(),pa)}}function OR(t,e){let n=t.readTime.compareTo(e.readTime);return n!==0?n:(n=W.comparator(t.documentKey,e.documentKey),n!==0?n:ee(t.largestBatchId,e.largestBatchId))}/**
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
 */const VR="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class LR{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
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
 */async function Ui(t){if(t.code!==M.FAILED_PRECONDITION||t.message!==VR)throw t;q("LocalStore","Unexpectedly lost primary lease")}/**
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
 */class U{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(n=>{this.isDone=!0,this.result=n,this.nextCallback&&this.nextCallback(n)},n=>{this.isDone=!0,this.error=n,this.catchCallback&&this.catchCallback(n)})}catch(e){return this.next(void 0,e)}next(e,n){return this.callbackAttached&&K(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(n,this.error):this.wrapSuccess(e,this.result):new U((r,s)=>{this.nextCallback=i=>{this.wrapSuccess(e,i).next(r,s)},this.catchCallback=i=>{this.wrapFailure(n,i).next(r,s)}})}toPromise(){return new Promise((e,n)=>{this.next(e,n)})}wrapUserFunction(e){try{const n=e();return n instanceof U?n:U.resolve(n)}catch(n){return U.reject(n)}}wrapSuccess(e,n){return e?this.wrapUserFunction(()=>e(n)):U.resolve(n)}wrapFailure(e,n){return e?this.wrapUserFunction(()=>e(n)):U.reject(n)}static resolve(e){return new U((n,r)=>{n(e)})}static reject(e){return new U((n,r)=>{r(e)})}static waitFor(e){return new U((n,r)=>{let s=0,i=0,o=!1;e.forEach(l=>{++s,l.next(()=>{++i,o&&i===s&&n()},u=>r(u))}),o=!0,i===s&&n()})}static or(e){let n=U.resolve(!1);for(const r of e)n=n.next(s=>s?U.resolve(s):r());return n}static forEach(e,n){const r=[];return e.forEach((s,i)=>{r.push(n.call(this,s,i))}),this.waitFor(r)}static mapArray(e,n){return new U((r,s)=>{const i=e.length,o=new Array(i);let l=0;for(let u=0;u<i;u++){const c=u;n(e[c]).next(f=>{o[c]=f,++l,l===i&&r(o)},f=>s(f))}})}static doWhile(e,n){return new U((r,s)=>{const i=()=>{e()===!0?n().next(()=>{i()},s):r()};i()})}}function MR(t){const e=t.match(/Android ([\d.]+)/i),n=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(n)}function Fi(t){return t.name==="IndexedDbTransactionError"}/**
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
 */class vc{constructor(e,n){this.previousValue=e,n&&(n.sequenceNumberHandler=r=>this.ae(r),this.ue=r=>n.writeSequenceNumber(r))}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ue&&this.ue(e),e}}vc.ce=-1;/**
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
 */const Vp=-1;function wc(t){return t==null}function bu(t){return t===0&&1/t==-1/0}function jR(t){return typeof t=="number"&&Number.isInteger(t)&&!bu(t)&&t<=Number.MAX_SAFE_INTEGER&&t>=Number.MIN_SAFE_INTEGER}/**
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
 */const qE="";function UR(t){let e="";for(let n=0;n<t.length;n++)e.length>0&&(e=__(e)),e=FR(t.get(n),e);return __(e)}function FR(t,e){let n=e;const r=t.length;for(let s=0;s<r;s++){const i=t.charAt(s);switch(i){case"\0":n+="";break;case qE:n+="";break;default:n+=i}}return n}function __(t){return t+qE+""}/**
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
 */function v_(t){let e=0;for(const n in t)Object.prototype.hasOwnProperty.call(t,n)&&e++;return e}function Qr(t,e){for(const n in t)Object.prototype.hasOwnProperty.call(t,n)&&e(n,t[n])}function HE(t){for(const e in t)if(Object.prototype.hasOwnProperty.call(t,e))return!1;return!0}/**
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
 */class Te{constructor(e,n){this.comparator=e,this.root=n||Xe.EMPTY}insert(e,n){return new Te(this.comparator,this.root.insert(e,n,this.comparator).copy(null,null,Xe.BLACK,null,null))}remove(e){return new Te(this.comparator,this.root.remove(e,this.comparator).copy(null,null,Xe.BLACK,null,null))}get(e){let n=this.root;for(;!n.isEmpty();){const r=this.comparator(e,n.key);if(r===0)return n.value;r<0?n=n.left:r>0&&(n=n.right)}return null}indexOf(e){let n=0,r=this.root;for(;!r.isEmpty();){const s=this.comparator(e,r.key);if(s===0)return n+r.left.size;s<0?r=r.left:(n+=r.left.size+1,r=r.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((n,r)=>(e(n,r),!1))}toString(){const e=[];return this.inorderTraversal((n,r)=>(e.push(`${n}:${r}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new Sl(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new Sl(this.root,e,this.comparator,!1)}getReverseIterator(){return new Sl(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new Sl(this.root,e,this.comparator,!0)}}class Sl{constructor(e,n,r,s){this.isReverse=s,this.nodeStack=[];let i=1;for(;!e.isEmpty();)if(i=n?r(e.key,n):1,n&&s&&(i*=-1),i<0)e=this.isReverse?e.left:e.right;else{if(i===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const n={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return n}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class Xe{constructor(e,n,r,s,i){this.key=e,this.value=n,this.color=r??Xe.RED,this.left=s??Xe.EMPTY,this.right=i??Xe.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,n,r,s,i){return new Xe(e??this.key,n??this.value,r??this.color,s??this.left,i??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,n,r){let s=this;const i=r(e,s.key);return s=i<0?s.copy(null,null,null,s.left.insert(e,n,r),null):i===0?s.copy(null,n,null,null,null):s.copy(null,null,null,null,s.right.insert(e,n,r)),s.fixUp()}removeMin(){if(this.left.isEmpty())return Xe.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,n){let r,s=this;if(n(e,s.key)<0)s.left.isEmpty()||s.left.isRed()||s.left.left.isRed()||(s=s.moveRedLeft()),s=s.copy(null,null,null,s.left.remove(e,n),null);else{if(s.left.isRed()&&(s=s.rotateRight()),s.right.isEmpty()||s.right.isRed()||s.right.left.isRed()||(s=s.moveRedRight()),n(e,s.key)===0){if(s.right.isEmpty())return Xe.EMPTY;r=s.right.min(),s=s.copy(r.key,r.value,null,null,s.right.removeMin())}s=s.copy(null,null,null,null,s.right.remove(e,n))}return s.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,Xe.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,Xe.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),n=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,n)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw K(43730,{key:this.key,value:this.value});if(this.right.isRed())throw K(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw K(27949);return e+(this.isRed()?0:1)}}Xe.EMPTY=null,Xe.RED=!0,Xe.BLACK=!1;Xe.EMPTY=new class{constructor(){this.size=0}get key(){throw K(57766)}get value(){throw K(16141)}get color(){throw K(16727)}get left(){throw K(29726)}get right(){throw K(36894)}copy(e,n,r,s,i){return this}insert(e,n,r){return new Xe(e,n)}remove(e,n){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
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
 */class ze{constructor(e){this.comparator=e,this.data=new Te(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((n,r)=>(e(n),!1))}forEachInRange(e,n){const r=this.data.getIteratorFrom(e[0]);for(;r.hasNext();){const s=r.getNext();if(this.comparator(s.key,e[1])>=0)return;n(s.key)}}forEachWhile(e,n){let r;for(r=n!==void 0?this.data.getIteratorFrom(n):this.data.getIterator();r.hasNext();)if(!e(r.getNext().key))return}firstAfterOrEqual(e){const n=this.data.getIteratorFrom(e);return n.hasNext()?n.getNext().key:null}getIterator(){return new w_(this.data.getIterator())}getIteratorFrom(e){return new w_(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let n=this;return n.size<e.size&&(n=e,e=this),e.forEach(r=>{n=n.add(r)}),n}isEqual(e){if(!(e instanceof ze)||this.size!==e.size)return!1;const n=this.data.getIterator(),r=e.data.getIterator();for(;n.hasNext();){const s=n.getNext().key,i=r.getNext().key;if(this.comparator(s,i)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(n=>{e.push(n)}),e}toString(){const e=[];return this.forEach(n=>e.push(n)),"SortedSet("+e.toString()+")"}copy(e){const n=new ze(this.comparator);return n.data=e,n}}class w_{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}/**
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
 */class Pt{constructor(e){this.fields=e,e.sort(He.comparator)}static empty(){return new Pt([])}unionWith(e){let n=new ze(He.comparator);for(const r of this.fields)n=n.add(r);for(const r of e)n=n.add(r);return new Pt(n.toArray())}covers(e){for(const n of this.fields)if(n.isPrefixOf(e))return!0;return!1}isEqual(e){return Ii(this.fields,e.fields,(n,r)=>n.isEqual(r))}}/**
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
 */class WE extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
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
 */class Ke{constructor(e){this.binaryString=e}static fromBase64String(e){const n=function(s){try{return atob(s)}catch(i){throw typeof DOMException<"u"&&i instanceof DOMException?new WE("Invalid base64 string: "+i):i}}(e);return new Ke(n)}static fromUint8Array(e){const n=function(s){let i="";for(let o=0;o<s.length;++o)i+=String.fromCharCode(s[o]);return i}(e);return new Ke(n)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(n){return btoa(n)}(this.binaryString)}toUint8Array(){return function(n){const r=new Uint8Array(n.length);for(let s=0;s<n.length;s++)r[s]=n.charCodeAt(s);return r}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return ee(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}Ke.EMPTY_BYTE_STRING=new Ke("");const zR=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function jr(t){if(le(!!t,39018),typeof t=="string"){let e=0;const n=zR.exec(t);if(le(!!n,46558,{timestamp:t}),n[1]){let s=n[1];s=(s+"000000000").substr(0,9),e=Number(s)}const r=new Date(t);return{seconds:Math.floor(r.getTime()/1e3),nanos:e}}return{seconds:Ne(t.seconds),nanos:Ne(t.nanos)}}function Ne(t){return typeof t=="number"?t:typeof t=="string"?Number(t):0}function Ur(t){return typeof t=="string"?Ke.fromBase64String(t):Ke.fromUint8Array(t)}/**
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
 */const GE="server_timestamp",KE="__type__",QE="__previous_value__",XE="__local_write_time__";function Lp(t){var n,r;return((r=(((n=t==null?void 0:t.mapValue)==null?void 0:n.fields)||{})[KE])==null?void 0:r.stringValue)===GE}function Ec(t){const e=t.mapValue.fields[QE];return Lp(e)?Ec(e):e}function ma(t){const e=jr(t.mapValue.fields[XE].timestampValue);return new fe(e.seconds,e.nanos)}/**
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
 */class BR{constructor(e,n,r,s,i,o,l,u,c,f,p){this.databaseId=e,this.appId=n,this.persistenceKey=r,this.host=s,this.ssl=i,this.forceLongPolling=o,this.autoDetectLongPolling=l,this.longPollingOptions=u,this.useFetchStreams=c,this.isUsingEmulator=f,this.apiKey=p}}const Pu="(default)";class Si{constructor(e,n){this.projectId=e,this.database=n||Pu}static empty(){return new Si("","")}get isDefaultDatabase(){return this.database===Pu}isEqual(e){return e instanceof Si&&e.projectId===this.projectId&&e.database===this.database}}function $R(t,e){if(!Object.prototype.hasOwnProperty.apply(t.options,["projectId"]))throw new B(M.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new Si(t.options.projectId,e)}/**
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
 */const YE="__type__",qR="__max__",kl={mapValue:{}},JE="__vector__",Nu="value";function Fr(t){return"nullValue"in t?0:"booleanValue"in t?1:"integerValue"in t||"doubleValue"in t?2:"timestampValue"in t?3:"stringValue"in t?5:"bytesValue"in t?6:"referenceValue"in t?7:"geoPointValue"in t?8:"arrayValue"in t?9:"mapValue"in t?Lp(t)?4:WR(t)?9007199254740991:HR(t)?10:11:K(28295,{value:t})}function Tn(t,e){if(t===e)return!0;const n=Fr(t);if(n!==Fr(e))return!1;switch(n){case 0:case 9007199254740991:return!0;case 1:return t.booleanValue===e.booleanValue;case 4:return ma(t).isEqual(ma(e));case 3:return function(s,i){if(typeof s.timestampValue=="string"&&typeof i.timestampValue=="string"&&s.timestampValue.length===i.timestampValue.length)return s.timestampValue===i.timestampValue;const o=jr(s.timestampValue),l=jr(i.timestampValue);return o.seconds===l.seconds&&o.nanos===l.nanos}(t,e);case 5:return t.stringValue===e.stringValue;case 6:return function(s,i){return Ur(s.bytesValue).isEqual(Ur(i.bytesValue))}(t,e);case 7:return t.referenceValue===e.referenceValue;case 8:return function(s,i){return Ne(s.geoPointValue.latitude)===Ne(i.geoPointValue.latitude)&&Ne(s.geoPointValue.longitude)===Ne(i.geoPointValue.longitude)}(t,e);case 2:return function(s,i){if("integerValue"in s&&"integerValue"in i)return Ne(s.integerValue)===Ne(i.integerValue);if("doubleValue"in s&&"doubleValue"in i){const o=Ne(s.doubleValue),l=Ne(i.doubleValue);return o===l?bu(o)===bu(l):isNaN(o)&&isNaN(l)}return!1}(t,e);case 9:return Ii(t.arrayValue.values||[],e.arrayValue.values||[],Tn);case 10:case 11:return function(s,i){const o=s.mapValue.fields||{},l=i.mapValue.fields||{};if(v_(o)!==v_(l))return!1;for(const u in o)if(o.hasOwnProperty(u)&&(l[u]===void 0||!Tn(o[u],l[u])))return!1;return!0}(t,e);default:return K(52216,{left:t})}}function ga(t,e){return(t.values||[]).find(n=>Tn(n,e))!==void 0}function ki(t,e){if(t===e)return 0;const n=Fr(t),r=Fr(e);if(n!==r)return ee(n,r);switch(n){case 0:case 9007199254740991:return 0;case 1:return ee(t.booleanValue,e.booleanValue);case 2:return function(i,o){const l=Ne(i.integerValue||i.doubleValue),u=Ne(o.integerValue||o.doubleValue);return l<u?-1:l>u?1:l===u?0:isNaN(l)?isNaN(u)?0:-1:1}(t,e);case 3:return E_(t.timestampValue,e.timestampValue);case 4:return E_(ma(t),ma(e));case 5:return uf(t.stringValue,e.stringValue);case 6:return function(i,o){const l=Ur(i),u=Ur(o);return l.compareTo(u)}(t.bytesValue,e.bytesValue);case 7:return function(i,o){const l=i.split("/"),u=o.split("/");for(let c=0;c<l.length&&c<u.length;c++){const f=ee(l[c],u[c]);if(f!==0)return f}return ee(l.length,u.length)}(t.referenceValue,e.referenceValue);case 8:return function(i,o){const l=ee(Ne(i.latitude),Ne(o.latitude));return l!==0?l:ee(Ne(i.longitude),Ne(o.longitude))}(t.geoPointValue,e.geoPointValue);case 9:return T_(t.arrayValue,e.arrayValue);case 10:return function(i,o){var g,w,x,b;const l=i.fields||{},u=o.fields||{},c=(g=l[Nu])==null?void 0:g.arrayValue,f=(w=u[Nu])==null?void 0:w.arrayValue,p=ee(((x=c==null?void 0:c.values)==null?void 0:x.length)||0,((b=f==null?void 0:f.values)==null?void 0:b.length)||0);return p!==0?p:T_(c,f)}(t.mapValue,e.mapValue);case 11:return function(i,o){if(i===kl.mapValue&&o===kl.mapValue)return 0;if(i===kl.mapValue)return 1;if(o===kl.mapValue)return-1;const l=i.fields||{},u=Object.keys(l),c=o.fields||{},f=Object.keys(c);u.sort(),f.sort();for(let p=0;p<u.length&&p<f.length;++p){const g=uf(u[p],f[p]);if(g!==0)return g;const w=ki(l[u[p]],c[f[p]]);if(w!==0)return w}return ee(u.length,f.length)}(t.mapValue,e.mapValue);default:throw K(23264,{he:n})}}function E_(t,e){if(typeof t=="string"&&typeof e=="string"&&t.length===e.length)return ee(t,e);const n=jr(t),r=jr(e),s=ee(n.seconds,r.seconds);return s!==0?s:ee(n.nanos,r.nanos)}function T_(t,e){const n=t.values||[],r=e.values||[];for(let s=0;s<n.length&&s<r.length;++s){const i=ki(n[s],r[s]);if(i)return i}return ee(n.length,r.length)}function Ci(t){return cf(t)}function cf(t){return"nullValue"in t?"null":"booleanValue"in t?""+t.booleanValue:"integerValue"in t?""+t.integerValue:"doubleValue"in t?""+t.doubleValue:"timestampValue"in t?function(n){const r=jr(n);return`time(${r.seconds},${r.nanos})`}(t.timestampValue):"stringValue"in t?t.stringValue:"bytesValue"in t?function(n){return Ur(n).toBase64()}(t.bytesValue):"referenceValue"in t?function(n){return W.fromName(n).toString()}(t.referenceValue):"geoPointValue"in t?function(n){return`geo(${n.latitude},${n.longitude})`}(t.geoPointValue):"arrayValue"in t?function(n){let r="[",s=!0;for(const i of n.values||[])s?s=!1:r+=",",r+=cf(i);return r+"]"}(t.arrayValue):"mapValue"in t?function(n){const r=Object.keys(n.fields||{}).sort();let s="{",i=!0;for(const o of r)i?i=!1:s+=",",s+=`${o}:${cf(n.fields[o])}`;return s+"}"}(t.mapValue):K(61005,{value:t})}function Gl(t){switch(Fr(t)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=Ec(t);return e?16+Gl(e):16;case 5:return 2*t.stringValue.length;case 6:return Ur(t.bytesValue).approximateByteSize();case 7:return t.referenceValue.length;case 9:return function(r){return(r.values||[]).reduce((s,i)=>s+Gl(i),0)}(t.arrayValue);case 10:case 11:return function(r){let s=0;return Qr(r.fields,(i,o)=>{s+=i.length+Gl(o)}),s}(t.mapValue);default:throw K(13486,{value:t})}}function x_(t,e){return{referenceValue:`projects/${t.projectId}/databases/${t.database}/documents/${e.path.canonicalString()}`}}function hf(t){return!!t&&"integerValue"in t}function Mp(t){return!!t&&"arrayValue"in t}function I_(t){return!!t&&"nullValue"in t}function S_(t){return!!t&&"doubleValue"in t&&isNaN(Number(t.doubleValue))}function Kl(t){return!!t&&"mapValue"in t}function HR(t){var n,r;return((r=(((n=t==null?void 0:t.mapValue)==null?void 0:n.fields)||{})[YE])==null?void 0:r.stringValue)===JE}function Fo(t){if(t.geoPointValue)return{geoPointValue:{...t.geoPointValue}};if(t.timestampValue&&typeof t.timestampValue=="object")return{timestampValue:{...t.timestampValue}};if(t.mapValue){const e={mapValue:{fields:{}}};return Qr(t.mapValue.fields,(n,r)=>e.mapValue.fields[n]=Fo(r)),e}if(t.arrayValue){const e={arrayValue:{values:[]}};for(let n=0;n<(t.arrayValue.values||[]).length;++n)e.arrayValue.values[n]=Fo(t.arrayValue.values[n]);return e}return{...t}}function WR(t){return(((t.mapValue||{}).fields||{}).__type__||{}).stringValue===qR}/**
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
 */class Et{constructor(e){this.value=e}static empty(){return new Et({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let n=this.value;for(let r=0;r<e.length-1;++r)if(n=(n.mapValue.fields||{})[e.get(r)],!Kl(n))return null;return n=(n.mapValue.fields||{})[e.lastSegment()],n||null}}set(e,n){this.getFieldsMap(e.popLast())[e.lastSegment()]=Fo(n)}setAll(e){let n=He.emptyPath(),r={},s=[];e.forEach((o,l)=>{if(!n.isImmediateParentOf(l)){const u=this.getFieldsMap(n);this.applyChanges(u,r,s),r={},s=[],n=l.popLast()}o?r[l.lastSegment()]=Fo(o):s.push(l.lastSegment())});const i=this.getFieldsMap(n);this.applyChanges(i,r,s)}delete(e){const n=this.field(e.popLast());Kl(n)&&n.mapValue.fields&&delete n.mapValue.fields[e.lastSegment()]}isEqual(e){return Tn(this.value,e.value)}getFieldsMap(e){let n=this.value;n.mapValue.fields||(n.mapValue={fields:{}});for(let r=0;r<e.length;++r){let s=n.mapValue.fields[e.get(r)];Kl(s)&&s.mapValue.fields||(s={mapValue:{fields:{}}},n.mapValue.fields[e.get(r)]=s),n=s}return n.mapValue.fields}applyChanges(e,n,r){Qr(n,(s,i)=>e[s]=i);for(const s of r)delete e[s]}clone(){return new Et(Fo(this.value))}}function ZE(t){const e=[];return Qr(t.fields,(n,r)=>{const s=new He([n]);if(Kl(r)){const i=ZE(r.mapValue).fields;if(i.length===0)e.push(s);else for(const o of i)e.push(s.child(o))}else e.push(s)}),new Pt(e)}/**
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
 */class ot{constructor(e,n,r,s,i,o,l){this.key=e,this.documentType=n,this.version=r,this.readTime=s,this.createTime=i,this.data=o,this.documentState=l}static newInvalidDocument(e){return new ot(e,0,X.min(),X.min(),X.min(),Et.empty(),0)}static newFoundDocument(e,n,r,s){return new ot(e,1,n,X.min(),r,s,0)}static newNoDocument(e,n){return new ot(e,2,n,X.min(),X.min(),Et.empty(),0)}static newUnknownDocument(e,n){return new ot(e,3,n,X.min(),X.min(),Et.empty(),2)}convertToFoundDocument(e,n){return!this.createTime.isEqual(X.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=n,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=Et.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=Et.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=X.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof ot&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new ot(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
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
 */class Du{constructor(e,n){this.position=e,this.inclusive=n}}function k_(t,e,n){let r=0;for(let s=0;s<t.position.length;s++){const i=e[s],o=t.position[s];if(i.field.isKeyField()?r=W.comparator(W.fromName(o.referenceValue),n.key):r=ki(o,n.data.field(i.field)),i.dir==="desc"&&(r*=-1),r!==0)break}return r}function C_(t,e){if(t===null)return e===null;if(e===null||t.inclusive!==e.inclusive||t.position.length!==e.position.length)return!1;for(let n=0;n<t.position.length;n++)if(!Tn(t.position[n],e.position[n]))return!1;return!0}/**
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
 */class ya{constructor(e,n="asc"){this.field=e,this.dir=n}}function GR(t,e){return t.dir===e.dir&&t.field.isEqual(e.field)}/**
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
 */class eT{}class Le extends eT{constructor(e,n,r){super(),this.field=e,this.op=n,this.value=r}static create(e,n,r){return e.isKeyField()?n==="in"||n==="not-in"?this.createKeyFieldInFilter(e,n,r):new QR(e,n,r):n==="array-contains"?new JR(e,r):n==="in"?new ZR(e,r):n==="not-in"?new eb(e,r):n==="array-contains-any"?new tb(e,r):new Le(e,n,r)}static createKeyFieldInFilter(e,n,r){return n==="in"?new XR(e,r):new YR(e,r)}matches(e){const n=e.data.field(this.field);return this.op==="!="?n!==null&&n.nullValue===void 0&&this.matchesComparison(ki(n,this.value)):n!==null&&Fr(this.value)===Fr(n)&&this.matchesComparison(ki(n,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return K(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class on extends eT{constructor(e,n){super(),this.filters=e,this.op=n,this.Pe=null}static create(e,n){return new on(e,n)}matches(e){return tT(this)?this.filters.find(n=>!n.matches(e))===void 0:this.filters.find(n=>n.matches(e))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce((e,n)=>e.concat(n.getFlattenedFilters()),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function tT(t){return t.op==="and"}function nT(t){return KR(t)&&tT(t)}function KR(t){for(const e of t.filters)if(e instanceof on)return!1;return!0}function df(t){if(t instanceof Le)return t.field.canonicalString()+t.op.toString()+Ci(t.value);if(nT(t))return t.filters.map(e=>df(e)).join(",");{const e=t.filters.map(n=>df(n)).join(",");return`${t.op}(${e})`}}function rT(t,e){return t instanceof Le?function(r,s){return s instanceof Le&&r.op===s.op&&r.field.isEqual(s.field)&&Tn(r.value,s.value)}(t,e):t instanceof on?function(r,s){return s instanceof on&&r.op===s.op&&r.filters.length===s.filters.length?r.filters.reduce((i,o,l)=>i&&rT(o,s.filters[l]),!0):!1}(t,e):void K(19439)}function sT(t){return t instanceof Le?function(n){return`${n.field.canonicalString()} ${n.op} ${Ci(n.value)}`}(t):t instanceof on?function(n){return n.op.toString()+" {"+n.getFilters().map(sT).join(" ,")+"}"}(t):"Filter"}class QR extends Le{constructor(e,n,r){super(e,n,r),this.key=W.fromName(r.referenceValue)}matches(e){const n=W.comparator(e.key,this.key);return this.matchesComparison(n)}}class XR extends Le{constructor(e,n){super(e,"in",n),this.keys=iT("in",n)}matches(e){return this.keys.some(n=>n.isEqual(e.key))}}class YR extends Le{constructor(e,n){super(e,"not-in",n),this.keys=iT("not-in",n)}matches(e){return!this.keys.some(n=>n.isEqual(e.key))}}function iT(t,e){var n;return(((n=e.arrayValue)==null?void 0:n.values)||[]).map(r=>W.fromName(r.referenceValue))}class JR extends Le{constructor(e,n){super(e,"array-contains",n)}matches(e){const n=e.data.field(this.field);return Mp(n)&&ga(n.arrayValue,this.value)}}class ZR extends Le{constructor(e,n){super(e,"in",n)}matches(e){const n=e.data.field(this.field);return n!==null&&ga(this.value.arrayValue,n)}}class eb extends Le{constructor(e,n){super(e,"not-in",n)}matches(e){if(ga(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const n=e.data.field(this.field);return n!==null&&n.nullValue===void 0&&!ga(this.value.arrayValue,n)}}class tb extends Le{constructor(e,n){super(e,"array-contains-any",n)}matches(e){const n=e.data.field(this.field);return!(!Mp(n)||!n.arrayValue.values)&&n.arrayValue.values.some(r=>ga(this.value.arrayValue,r))}}/**
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
 */class nb{constructor(e,n=null,r=[],s=[],i=null,o=null,l=null){this.path=e,this.collectionGroup=n,this.orderBy=r,this.filters=s,this.limit=i,this.startAt=o,this.endAt=l,this.Te=null}}function A_(t,e=null,n=[],r=[],s=null,i=null,o=null){return new nb(t,e,n,r,s,i,o)}function jp(t){const e=Y(t);if(e.Te===null){let n=e.path.canonicalString();e.collectionGroup!==null&&(n+="|cg:"+e.collectionGroup),n+="|f:",n+=e.filters.map(r=>df(r)).join(","),n+="|ob:",n+=e.orderBy.map(r=>function(i){return i.field.canonicalString()+i.dir}(r)).join(","),wc(e.limit)||(n+="|l:",n+=e.limit),e.startAt&&(n+="|lb:",n+=e.startAt.inclusive?"b:":"a:",n+=e.startAt.position.map(r=>Ci(r)).join(",")),e.endAt&&(n+="|ub:",n+=e.endAt.inclusive?"a:":"b:",n+=e.endAt.position.map(r=>Ci(r)).join(",")),e.Te=n}return e.Te}function Up(t,e){if(t.limit!==e.limit||t.orderBy.length!==e.orderBy.length)return!1;for(let n=0;n<t.orderBy.length;n++)if(!GR(t.orderBy[n],e.orderBy[n]))return!1;if(t.filters.length!==e.filters.length)return!1;for(let n=0;n<t.filters.length;n++)if(!rT(t.filters[n],e.filters[n]))return!1;return t.collectionGroup===e.collectionGroup&&!!t.path.isEqual(e.path)&&!!C_(t.startAt,e.startAt)&&C_(t.endAt,e.endAt)}function ff(t){return W.isDocumentKey(t.path)&&t.collectionGroup===null&&t.filters.length===0}/**
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
 */class zi{constructor(e,n=null,r=[],s=[],i=null,o="F",l=null,u=null){this.path=e,this.collectionGroup=n,this.explicitOrderBy=r,this.filters=s,this.limit=i,this.limitType=o,this.startAt=l,this.endAt=u,this.Ie=null,this.Ee=null,this.Re=null,this.startAt,this.endAt}}function rb(t,e,n,r,s,i,o,l){return new zi(t,e,n,r,s,i,o,l)}function Tc(t){return new zi(t)}function R_(t){return t.filters.length===0&&t.limit===null&&t.startAt==null&&t.endAt==null&&(t.explicitOrderBy.length===0||t.explicitOrderBy.length===1&&t.explicitOrderBy[0].field.isKeyField())}function sb(t){return W.isDocumentKey(t.path)&&t.collectionGroup===null&&t.filters.length===0}function oT(t){return t.collectionGroup!==null}function zo(t){const e=Y(t);if(e.Ie===null){e.Ie=[];const n=new Set;for(const i of e.explicitOrderBy)e.Ie.push(i),n.add(i.field.canonicalString());const r=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let l=new ze(He.comparator);return o.filters.forEach(u=>{u.getFlattenedFilters().forEach(c=>{c.isInequality()&&(l=l.add(c.field))})}),l})(e).forEach(i=>{n.has(i.canonicalString())||i.isKeyField()||e.Ie.push(new ya(i,r))}),n.has(He.keyField().canonicalString())||e.Ie.push(new ya(He.keyField(),r))}return e.Ie}function vn(t){const e=Y(t);return e.Ee||(e.Ee=ib(e,zo(t))),e.Ee}function ib(t,e){if(t.limitType==="F")return A_(t.path,t.collectionGroup,e,t.filters,t.limit,t.startAt,t.endAt);{e=e.map(s=>{const i=s.dir==="desc"?"asc":"desc";return new ya(s.field,i)});const n=t.endAt?new Du(t.endAt.position,t.endAt.inclusive):null,r=t.startAt?new Du(t.startAt.position,t.startAt.inclusive):null;return A_(t.path,t.collectionGroup,e,t.filters,t.limit,n,r)}}function pf(t,e){const n=t.filters.concat([e]);return new zi(t.path,t.collectionGroup,t.explicitOrderBy.slice(),n,t.limit,t.limitType,t.startAt,t.endAt)}function ob(t,e){const n=t.explicitOrderBy.concat([e]);return new zi(t.path,t.collectionGroup,n,t.filters.slice(),t.limit,t.limitType,t.startAt,t.endAt)}function Ou(t,e,n){return new zi(t.path,t.collectionGroup,t.explicitOrderBy.slice(),t.filters.slice(),e,n,t.startAt,t.endAt)}function xc(t,e){return Up(vn(t),vn(e))&&t.limitType===e.limitType}function aT(t){return`${jp(vn(t))}|lt:${t.limitType}`}function $s(t){return`Query(target=${function(n){let r=n.path.canonicalString();return n.collectionGroup!==null&&(r+=" collectionGroup="+n.collectionGroup),n.filters.length>0&&(r+=`, filters: [${n.filters.map(s=>sT(s)).join(", ")}]`),wc(n.limit)||(r+=", limit: "+n.limit),n.orderBy.length>0&&(r+=`, orderBy: [${n.orderBy.map(s=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(s)).join(", ")}]`),n.startAt&&(r+=", startAt: ",r+=n.startAt.inclusive?"b:":"a:",r+=n.startAt.position.map(s=>Ci(s)).join(",")),n.endAt&&(r+=", endAt: ",r+=n.endAt.inclusive?"a:":"b:",r+=n.endAt.position.map(s=>Ci(s)).join(",")),`Target(${r})`}(vn(t))}; limitType=${t.limitType})`}function Ic(t,e){return e.isFoundDocument()&&function(r,s){const i=s.key.path;return r.collectionGroup!==null?s.key.hasCollectionId(r.collectionGroup)&&r.path.isPrefixOf(i):W.isDocumentKey(r.path)?r.path.isEqual(i):r.path.isImmediateParentOf(i)}(t,e)&&function(r,s){for(const i of zo(r))if(!i.field.isKeyField()&&s.data.field(i.field)===null)return!1;return!0}(t,e)&&function(r,s){for(const i of r.filters)if(!i.matches(s))return!1;return!0}(t,e)&&function(r,s){return!(r.startAt&&!function(o,l,u){const c=k_(o,l,u);return o.inclusive?c<=0:c<0}(r.startAt,zo(r),s)||r.endAt&&!function(o,l,u){const c=k_(o,l,u);return o.inclusive?c>=0:c>0}(r.endAt,zo(r),s))}(t,e)}function ab(t){return t.collectionGroup||(t.path.length%2==1?t.path.lastSegment():t.path.get(t.path.length-2))}function lT(t){return(e,n)=>{let r=!1;for(const s of zo(t)){const i=lb(s,e,n);if(i!==0)return i;r=r||s.field.isKeyField()}return 0}}function lb(t,e,n){const r=t.field.isKeyField()?W.comparator(e.key,n.key):function(i,o,l){const u=o.data.field(i),c=l.data.field(i);return u!==null&&c!==null?ki(u,c):K(42886)}(t.field,e,n);switch(t.dir){case"asc":return r;case"desc":return-1*r;default:return K(19790,{direction:t.dir})}}/**
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
 */class Ps{constructor(e,n){this.mapKeyFn=e,this.equalsFn=n,this.inner={},this.innerSize=0}get(e){const n=this.mapKeyFn(e),r=this.inner[n];if(r!==void 0){for(const[s,i]of r)if(this.equalsFn(s,e))return i}}has(e){return this.get(e)!==void 0}set(e,n){const r=this.mapKeyFn(e),s=this.inner[r];if(s===void 0)return this.inner[r]=[[e,n]],void this.innerSize++;for(let i=0;i<s.length;i++)if(this.equalsFn(s[i][0],e))return void(s[i]=[e,n]);s.push([e,n]),this.innerSize++}delete(e){const n=this.mapKeyFn(e),r=this.inner[n];if(r===void 0)return!1;for(let s=0;s<r.length;s++)if(this.equalsFn(r[s][0],e))return r.length===1?delete this.inner[n]:r.splice(s,1),this.innerSize--,!0;return!1}forEach(e){Qr(this.inner,(n,r)=>{for(const[s,i]of r)e(s,i)})}isEmpty(){return HE(this.inner)}size(){return this.innerSize}}/**
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
 */const ub=new Te(W.comparator);function Gn(){return ub}const uT=new Te(W.comparator);function Ro(...t){let e=uT;for(const n of t)e=e.insert(n.key,n);return e}function cT(t){let e=uT;return t.forEach((n,r)=>e=e.insert(n,r.overlayedDocument)),e}function ds(){return Bo()}function hT(){return Bo()}function Bo(){return new Ps(t=>t.toString(),(t,e)=>t.isEqual(e))}const cb=new Te(W.comparator),hb=new ze(W.comparator);function te(...t){let e=hb;for(const n of t)e=e.add(n);return e}const db=new ze(ee);function fb(){return db}/**
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
 */function Fp(t,e){if(t.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:bu(e)?"-0":e}}function dT(t){return{integerValue:""+t}}function fT(t,e){return jR(e)?dT(e):Fp(t,e)}/**
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
 */class Sc{constructor(){this._=void 0}}function pb(t,e,n){return t instanceof _a?function(s,i){const o={fields:{[KE]:{stringValue:GE},[XE]:{timestampValue:{seconds:s.seconds,nanos:s.nanoseconds}}}};return i&&Lp(i)&&(i=Ec(i)),i&&(o.fields[QE]=i),{mapValue:o}}(n,e):t instanceof Ai?mT(t,e):t instanceof va?gT(t,e):function(s,i){const o=pT(s,i),l=b_(o)+b_(s.Ae);return hf(o)&&hf(s.Ae)?dT(l):Fp(s.serializer,l)}(t,e)}function mb(t,e,n){return t instanceof Ai?mT(t,e):t instanceof va?gT(t,e):n}function pT(t,e){return t instanceof wa?function(r){return hf(r)||function(i){return!!i&&"doubleValue"in i}(r)}(e)?e:{integerValue:0}:null}class _a extends Sc{}class Ai extends Sc{constructor(e){super(),this.elements=e}}function mT(t,e){const n=yT(e);for(const r of t.elements)n.some(s=>Tn(s,r))||n.push(r);return{arrayValue:{values:n}}}class va extends Sc{constructor(e){super(),this.elements=e}}function gT(t,e){let n=yT(e);for(const r of t.elements)n=n.filter(s=>!Tn(s,r));return{arrayValue:{values:n}}}class wa extends Sc{constructor(e,n){super(),this.serializer=e,this.Ae=n}}function b_(t){return Ne(t.integerValue||t.doubleValue)}function yT(t){return Mp(t)&&t.arrayValue.values?t.arrayValue.values.slice():[]}/**
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
 */class zp{constructor(e,n){this.field=e,this.transform=n}}function gb(t,e){return t.field.isEqual(e.field)&&function(r,s){return r instanceof Ai&&s instanceof Ai||r instanceof va&&s instanceof va?Ii(r.elements,s.elements,Tn):r instanceof wa&&s instanceof wa?Tn(r.Ae,s.Ae):r instanceof _a&&s instanceof _a}(t.transform,e.transform)}class yb{constructor(e,n){this.version=e,this.transformResults=n}}class mt{constructor(e,n){this.updateTime=e,this.exists=n}static none(){return new mt}static exists(e){return new mt(void 0,e)}static updateTime(e){return new mt(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function Ql(t,e){return t.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(t.updateTime):t.exists===void 0||t.exists===e.isFoundDocument()}class kc{}function _T(t,e){if(!t.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return t.isNoDocument()?new Cc(t.key,mt.none()):new Oa(t.key,t.data,mt.none());{const n=t.data,r=Et.empty();let s=new ze(He.comparator);for(let i of e.fields)if(!s.has(i)){let o=n.field(i);o===null&&i.length>1&&(i=i.popLast(),o=n.field(i)),o===null?r.delete(i):r.set(i,o),s=s.add(i)}return new Xr(t.key,r,new Pt(s.toArray()),mt.none())}}function _b(t,e,n){t instanceof Oa?function(s,i,o){const l=s.value.clone(),u=N_(s.fieldTransforms,i,o.transformResults);l.setAll(u),i.convertToFoundDocument(o.version,l).setHasCommittedMutations()}(t,e,n):t instanceof Xr?function(s,i,o){if(!Ql(s.precondition,i))return void i.convertToUnknownDocument(o.version);const l=N_(s.fieldTransforms,i,o.transformResults),u=i.data;u.setAll(vT(s)),u.setAll(l),i.convertToFoundDocument(o.version,u).setHasCommittedMutations()}(t,e,n):function(s,i,o){i.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,n)}function $o(t,e,n,r){return t instanceof Oa?function(i,o,l,u){if(!Ql(i.precondition,o))return l;const c=i.value.clone(),f=D_(i.fieldTransforms,u,o);return c.setAll(f),o.convertToFoundDocument(o.version,c).setHasLocalMutations(),null}(t,e,n,r):t instanceof Xr?function(i,o,l,u){if(!Ql(i.precondition,o))return l;const c=D_(i.fieldTransforms,u,o),f=o.data;return f.setAll(vT(i)),f.setAll(c),o.convertToFoundDocument(o.version,f).setHasLocalMutations(),l===null?null:l.unionWith(i.fieldMask.fields).unionWith(i.fieldTransforms.map(p=>p.field))}(t,e,n,r):function(i,o,l){return Ql(i.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):l}(t,e,n)}function vb(t,e){let n=null;for(const r of t.fieldTransforms){const s=e.data.field(r.field),i=pT(r.transform,s||null);i!=null&&(n===null&&(n=Et.empty()),n.set(r.field,i))}return n||null}function P_(t,e){return t.type===e.type&&!!t.key.isEqual(e.key)&&!!t.precondition.isEqual(e.precondition)&&!!function(r,s){return r===void 0&&s===void 0||!(!r||!s)&&Ii(r,s,(i,o)=>gb(i,o))}(t.fieldTransforms,e.fieldTransforms)&&(t.type===0?t.value.isEqual(e.value):t.type!==1||t.data.isEqual(e.data)&&t.fieldMask.isEqual(e.fieldMask))}class Oa extends kc{constructor(e,n,r,s=[]){super(),this.key=e,this.value=n,this.precondition=r,this.fieldTransforms=s,this.type=0}getFieldMask(){return null}}class Xr extends kc{constructor(e,n,r,s,i=[]){super(),this.key=e,this.data=n,this.fieldMask=r,this.precondition=s,this.fieldTransforms=i,this.type=1}getFieldMask(){return this.fieldMask}}function vT(t){const e=new Map;return t.fieldMask.fields.forEach(n=>{if(!n.isEmpty()){const r=t.data.field(n);e.set(n,r)}}),e}function N_(t,e,n){const r=new Map;le(t.length===n.length,32656,{Ve:n.length,de:t.length});for(let s=0;s<n.length;s++){const i=t[s],o=i.transform,l=e.data.field(i.field);r.set(i.field,mb(o,l,n[s]))}return r}function D_(t,e,n){const r=new Map;for(const s of t){const i=s.transform,o=n.data.field(s.field);r.set(s.field,pb(i,o,e))}return r}class Cc extends kc{constructor(e,n){super(),this.key=e,this.precondition=n,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class wb extends kc{constructor(e,n){super(),this.key=e,this.precondition=n,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
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
 */class Eb{constructor(e,n,r,s){this.batchId=e,this.localWriteTime=n,this.baseMutations=r,this.mutations=s}applyToRemoteDocument(e,n){const r=n.mutationResults;for(let s=0;s<this.mutations.length;s++){const i=this.mutations[s];i.key.isEqual(e.key)&&_b(i,e,r[s])}}applyToLocalView(e,n){for(const r of this.baseMutations)r.key.isEqual(e.key)&&(n=$o(r,e,n,this.localWriteTime));for(const r of this.mutations)r.key.isEqual(e.key)&&(n=$o(r,e,n,this.localWriteTime));return n}applyToLocalDocumentSet(e,n){const r=hT();return this.mutations.forEach(s=>{const i=e.get(s.key),o=i.overlayedDocument;let l=this.applyToLocalView(o,i.mutatedFields);l=n.has(s.key)?null:l;const u=_T(o,l);u!==null&&r.set(s.key,u),o.isValidDocument()||o.convertToNoDocument(X.min())}),r}keys(){return this.mutations.reduce((e,n)=>e.add(n.key),te())}isEqual(e){return this.batchId===e.batchId&&Ii(this.mutations,e.mutations,(n,r)=>P_(n,r))&&Ii(this.baseMutations,e.baseMutations,(n,r)=>P_(n,r))}}class Bp{constructor(e,n,r,s){this.batch=e,this.commitVersion=n,this.mutationResults=r,this.docVersions=s}static from(e,n,r){le(e.mutations.length===r.length,58842,{me:e.mutations.length,fe:r.length});let s=function(){return cb}();const i=e.mutations;for(let o=0;o<i.length;o++)s=s.insert(i[o].key,r[o].version);return new Bp(e,n,r,s)}}/**
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
 */class Tb{constructor(e,n){this.largestBatchId=e,this.mutation=n}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
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
 */class xb{constructor(e,n){this.count=e,this.unchangedNames=n}}/**
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
 */var Oe,oe;function Ib(t){switch(t){case M.OK:return K(64938);case M.CANCELLED:case M.UNKNOWN:case M.DEADLINE_EXCEEDED:case M.RESOURCE_EXHAUSTED:case M.INTERNAL:case M.UNAVAILABLE:case M.UNAUTHENTICATED:return!1;case M.INVALID_ARGUMENT:case M.NOT_FOUND:case M.ALREADY_EXISTS:case M.PERMISSION_DENIED:case M.FAILED_PRECONDITION:case M.ABORTED:case M.OUT_OF_RANGE:case M.UNIMPLEMENTED:case M.DATA_LOSS:return!0;default:return K(15467,{code:t})}}function wT(t){if(t===void 0)return Wn("GRPC error has no .code"),M.UNKNOWN;switch(t){case Oe.OK:return M.OK;case Oe.CANCELLED:return M.CANCELLED;case Oe.UNKNOWN:return M.UNKNOWN;case Oe.DEADLINE_EXCEEDED:return M.DEADLINE_EXCEEDED;case Oe.RESOURCE_EXHAUSTED:return M.RESOURCE_EXHAUSTED;case Oe.INTERNAL:return M.INTERNAL;case Oe.UNAVAILABLE:return M.UNAVAILABLE;case Oe.UNAUTHENTICATED:return M.UNAUTHENTICATED;case Oe.INVALID_ARGUMENT:return M.INVALID_ARGUMENT;case Oe.NOT_FOUND:return M.NOT_FOUND;case Oe.ALREADY_EXISTS:return M.ALREADY_EXISTS;case Oe.PERMISSION_DENIED:return M.PERMISSION_DENIED;case Oe.FAILED_PRECONDITION:return M.FAILED_PRECONDITION;case Oe.ABORTED:return M.ABORTED;case Oe.OUT_OF_RANGE:return M.OUT_OF_RANGE;case Oe.UNIMPLEMENTED:return M.UNIMPLEMENTED;case Oe.DATA_LOSS:return M.DATA_LOSS;default:return K(39323,{code:t})}}(oe=Oe||(Oe={}))[oe.OK=0]="OK",oe[oe.CANCELLED=1]="CANCELLED",oe[oe.UNKNOWN=2]="UNKNOWN",oe[oe.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",oe[oe.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",oe[oe.NOT_FOUND=5]="NOT_FOUND",oe[oe.ALREADY_EXISTS=6]="ALREADY_EXISTS",oe[oe.PERMISSION_DENIED=7]="PERMISSION_DENIED",oe[oe.UNAUTHENTICATED=16]="UNAUTHENTICATED",oe[oe.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",oe[oe.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",oe[oe.ABORTED=10]="ABORTED",oe[oe.OUT_OF_RANGE=11]="OUT_OF_RANGE",oe[oe.UNIMPLEMENTED=12]="UNIMPLEMENTED",oe[oe.INTERNAL=13]="INTERNAL",oe[oe.UNAVAILABLE=14]="UNAVAILABLE",oe[oe.DATA_LOSS=15]="DATA_LOSS";/**
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
 */function Sb(){return new TextEncoder}/**
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
 */const kb=new Ar([4294967295,4294967295],0);function O_(t){const e=Sb().encode(t),n=new NE;return n.update(e),new Uint8Array(n.digest())}function V_(t){const e=new DataView(t.buffer),n=e.getUint32(0,!0),r=e.getUint32(4,!0),s=e.getUint32(8,!0),i=e.getUint32(12,!0);return[new Ar([n,r],0),new Ar([s,i],0)]}class $p{constructor(e,n,r){if(this.bitmap=e,this.padding=n,this.hashCount=r,n<0||n>=8)throw new bo(`Invalid padding: ${n}`);if(r<0)throw new bo(`Invalid hash count: ${r}`);if(e.length>0&&this.hashCount===0)throw new bo(`Invalid hash count: ${r}`);if(e.length===0&&n!==0)throw new bo(`Invalid padding when bitmap length is 0: ${n}`);this.ge=8*e.length-n,this.pe=Ar.fromNumber(this.ge)}ye(e,n,r){let s=e.add(n.multiply(Ar.fromNumber(r)));return s.compare(kb)===1&&(s=new Ar([s.getBits(0),s.getBits(1)],0)),s.modulo(this.pe).toNumber()}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.ge===0)return!1;const n=O_(e),[r,s]=V_(n);for(let i=0;i<this.hashCount;i++){const o=this.ye(r,s,i);if(!this.we(o))return!1}return!0}static create(e,n,r){const s=e%8==0?0:8-e%8,i=new Uint8Array(Math.ceil(e/8)),o=new $p(i,s,n);return r.forEach(l=>o.insert(l)),o}insert(e){if(this.ge===0)return;const n=O_(e),[r,s]=V_(n);for(let i=0;i<this.hashCount;i++){const o=this.ye(r,s,i);this.Se(o)}}Se(e){const n=Math.floor(e/8),r=e%8;this.bitmap[n]|=1<<r}}class bo extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
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
 */class Va{constructor(e,n,r,s,i){this.snapshotVersion=e,this.targetChanges=n,this.targetMismatches=r,this.documentUpdates=s,this.resolvedLimboDocuments=i}static createSynthesizedRemoteEventForCurrentChange(e,n,r){const s=new Map;return s.set(e,La.createSynthesizedTargetChangeForCurrentChange(e,n,r)),new Va(X.min(),s,new Te(ee),Gn(),te())}}class La{constructor(e,n,r,s,i){this.resumeToken=e,this.current=n,this.addedDocuments=r,this.modifiedDocuments=s,this.removedDocuments=i}static createSynthesizedTargetChangeForCurrentChange(e,n,r){return new La(r,n,te(),te(),te())}}/**
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
 */class Xl{constructor(e,n,r,s){this.be=e,this.removedTargetIds=n,this.key=r,this.De=s}}class ET{constructor(e,n){this.targetId=e,this.Ce=n}}class TT{constructor(e,n,r=Ke.EMPTY_BYTE_STRING,s=null){this.state=e,this.targetIds=n,this.resumeToken=r,this.cause=s}}class L_{constructor(){this.ve=0,this.Fe=M_(),this.Me=Ke.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e)}ke(){let e=te(),n=te(),r=te();return this.Fe.forEach((s,i)=>{switch(i){case 0:e=e.add(s);break;case 2:n=n.add(s);break;case 1:r=r.add(s);break;default:K(38017,{changeType:i})}}),new La(this.Me,this.xe,e,n,r)}Ke(){this.Oe=!1,this.Fe=M_()}qe(e,n){this.Oe=!0,this.Fe=this.Fe.insert(e,n)}Ue(e){this.Oe=!0,this.Fe=this.Fe.remove(e)}$e(){this.ve+=1}We(){this.ve-=1,le(this.ve>=0,3241,{ve:this.ve})}Qe(){this.Oe=!0,this.xe=!0}}class Cb{constructor(e){this.Ge=e,this.ze=new Map,this.je=Gn(),this.Je=Cl(),this.He=Cl(),this.Ze=new Te(ee)}Xe(e){for(const n of e.be)e.De&&e.De.isFoundDocument()?this.Ye(n,e.De):this.et(n,e.key,e.De);for(const n of e.removedTargetIds)this.et(n,e.key,e.De)}tt(e){this.forEachTarget(e,n=>{const r=this.nt(n);switch(e.state){case 0:this.rt(n)&&r.Le(e.resumeToken);break;case 1:r.We(),r.Ne||r.Ke(),r.Le(e.resumeToken);break;case 2:r.We(),r.Ne||this.removeTarget(n);break;case 3:this.rt(n)&&(r.Qe(),r.Le(e.resumeToken));break;case 4:this.rt(n)&&(this.it(n),r.Le(e.resumeToken));break;default:K(56790,{state:e.state})}})}forEachTarget(e,n){e.targetIds.length>0?e.targetIds.forEach(n):this.ze.forEach((r,s)=>{this.rt(s)&&n(s)})}st(e){const n=e.targetId,r=e.Ce.count,s=this.ot(n);if(s){const i=s.target;if(ff(i))if(r===0){const o=new W(i.path);this.et(n,o,ot.newNoDocument(o,X.min()))}else le(r===1,20013,{expectedCount:r});else{const o=this._t(n);if(o!==r){const l=this.ut(e),u=l?this.ct(l,e,o):1;if(u!==0){this.it(n);const c=u===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ze=this.Ze.insert(n,c)}}}}}ut(e){const n=e.Ce.unchangedNames;if(!n||!n.bits)return null;const{bits:{bitmap:r="",padding:s=0},hashCount:i=0}=n;let o,l;try{o=Ur(r).toUint8Array()}catch(u){if(u instanceof WE)return Lr("Decoding the base64 bloom filter in existence filter failed ("+u.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw u}try{l=new $p(o,s,i)}catch(u){return Lr(u instanceof bo?"BloomFilter error: ":"Applying bloom filter failed: ",u),null}return l.ge===0?null:l}ct(e,n,r){return n.Ce.count===r-this.Pt(e,n.targetId)?0:2}Pt(e,n){const r=this.Ge.getRemoteKeysForTarget(n);let s=0;return r.forEach(i=>{const o=this.Ge.ht(),l=`projects/${o.projectId}/databases/${o.database}/documents/${i.path.canonicalString()}`;e.mightContain(l)||(this.et(n,i,null),s++)}),s}Tt(e){const n=new Map;this.ze.forEach((i,o)=>{const l=this.ot(o);if(l){if(i.current&&ff(l.target)){const u=new W(l.target.path);this.It(u).has(o)||this.Et(o,u)||this.et(o,u,ot.newNoDocument(u,e))}i.Be&&(n.set(o,i.ke()),i.Ke())}});let r=te();this.He.forEach((i,o)=>{let l=!0;o.forEachWhile(u=>{const c=this.ot(u);return!c||c.purpose==="TargetPurposeLimboResolution"||(l=!1,!1)}),l&&(r=r.add(i))}),this.je.forEach((i,o)=>o.setReadTime(e));const s=new Va(e,n,this.Ze,this.je,r);return this.je=Gn(),this.Je=Cl(),this.He=Cl(),this.Ze=new Te(ee),s}Ye(e,n){if(!this.rt(e))return;const r=this.Et(e,n.key)?2:0;this.nt(e).qe(n.key,r),this.je=this.je.insert(n.key,n),this.Je=this.Je.insert(n.key,this.It(n.key).add(e)),this.He=this.He.insert(n.key,this.Rt(n.key).add(e))}et(e,n,r){if(!this.rt(e))return;const s=this.nt(e);this.Et(e,n)?s.qe(n,1):s.Ue(n),this.He=this.He.insert(n,this.Rt(n).delete(e)),this.He=this.He.insert(n,this.Rt(n).add(e)),r&&(this.je=this.je.insert(n,r))}removeTarget(e){this.ze.delete(e)}_t(e){const n=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+n.addedDocuments.size-n.removedDocuments.size}$e(e){this.nt(e).$e()}nt(e){let n=this.ze.get(e);return n||(n=new L_,this.ze.set(e,n)),n}Rt(e){let n=this.He.get(e);return n||(n=new ze(ee),this.He=this.He.insert(e,n)),n}It(e){let n=this.Je.get(e);return n||(n=new ze(ee),this.Je=this.Je.insert(e,n)),n}rt(e){const n=this.ot(e)!==null;return n||q("WatchChangeAggregator","Detected inactive target",e),n}ot(e){const n=this.ze.get(e);return n&&n.Ne?null:this.Ge.At(e)}it(e){this.ze.set(e,new L_),this.Ge.getRemoteKeysForTarget(e).forEach(n=>{this.et(e,n,null)})}Et(e,n){return this.Ge.getRemoteKeysForTarget(e).has(n)}}function Cl(){return new Te(W.comparator)}function M_(){return new Te(W.comparator)}const Ab={asc:"ASCENDING",desc:"DESCENDING"},Rb={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},bb={and:"AND",or:"OR"};class Pb{constructor(e,n){this.databaseId=e,this.useProto3Json=n}}function mf(t,e){return t.useProto3Json||wc(e)?e:{value:e}}function Vu(t,e){return t.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function xT(t,e){return t.useProto3Json?e.toBase64():e.toUint8Array()}function Nb(t,e){return Vu(t,e.toTimestamp())}function wn(t){return le(!!t,49232),X.fromTimestamp(function(n){const r=jr(n);return new fe(r.seconds,r.nanos)}(t))}function qp(t,e){return gf(t,e).canonicalString()}function gf(t,e){const n=function(s){return new de(["projects",s.projectId,"databases",s.database])}(t).child("documents");return e===void 0?n:n.child(e)}function IT(t){const e=de.fromString(t);return le(RT(e),10190,{key:e.toString()}),e}function yf(t,e){return qp(t.databaseId,e.path)}function Kh(t,e){const n=IT(e);if(n.get(1)!==t.databaseId.projectId)throw new B(M.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+n.get(1)+" vs "+t.databaseId.projectId);if(n.get(3)!==t.databaseId.database)throw new B(M.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+n.get(3)+" vs "+t.databaseId.database);return new W(kT(n))}function ST(t,e){return qp(t.databaseId,e)}function Db(t){const e=IT(t);return e.length===4?de.emptyPath():kT(e)}function _f(t){return new de(["projects",t.databaseId.projectId,"databases",t.databaseId.database]).canonicalString()}function kT(t){return le(t.length>4&&t.get(4)==="documents",29091,{key:t.toString()}),t.popFirst(5)}function j_(t,e,n){return{name:yf(t,e),fields:n.value.mapValue.fields}}function Ob(t,e){let n;if("targetChange"in e){e.targetChange;const r=function(c){return c==="NO_CHANGE"?0:c==="ADD"?1:c==="REMOVE"?2:c==="CURRENT"?3:c==="RESET"?4:K(39313,{state:c})}(e.targetChange.targetChangeType||"NO_CHANGE"),s=e.targetChange.targetIds||[],i=function(c,f){return c.useProto3Json?(le(f===void 0||typeof f=="string",58123),Ke.fromBase64String(f||"")):(le(f===void 0||f instanceof Buffer||f instanceof Uint8Array,16193),Ke.fromUint8Array(f||new Uint8Array))}(t,e.targetChange.resumeToken),o=e.targetChange.cause,l=o&&function(c){const f=c.code===void 0?M.UNKNOWN:wT(c.code);return new B(f,c.message||"")}(o);n=new TT(r,s,i,l||null)}else if("documentChange"in e){e.documentChange;const r=e.documentChange;r.document,r.document.name,r.document.updateTime;const s=Kh(t,r.document.name),i=wn(r.document.updateTime),o=r.document.createTime?wn(r.document.createTime):X.min(),l=new Et({mapValue:{fields:r.document.fields}}),u=ot.newFoundDocument(s,i,o,l),c=r.targetIds||[],f=r.removedTargetIds||[];n=new Xl(c,f,u.key,u)}else if("documentDelete"in e){e.documentDelete;const r=e.documentDelete;r.document;const s=Kh(t,r.document),i=r.readTime?wn(r.readTime):X.min(),o=ot.newNoDocument(s,i),l=r.removedTargetIds||[];n=new Xl([],l,o.key,o)}else if("documentRemove"in e){e.documentRemove;const r=e.documentRemove;r.document;const s=Kh(t,r.document),i=r.removedTargetIds||[];n=new Xl([],i,s,null)}else{if(!("filter"in e))return K(11601,{Vt:e});{e.filter;const r=e.filter;r.targetId;const{count:s=0,unchangedNames:i}=r,o=new xb(s,i),l=r.targetId;n=new ET(l,o)}}return n}function Vb(t,e){let n;if(e instanceof Oa)n={update:j_(t,e.key,e.value)};else if(e instanceof Cc)n={delete:yf(t,e.key)};else if(e instanceof Xr)n={update:j_(t,e.key,e.data),updateMask:qb(e.fieldMask)};else{if(!(e instanceof wb))return K(16599,{dt:e.type});n={verify:yf(t,e.key)}}return e.fieldTransforms.length>0&&(n.updateTransforms=e.fieldTransforms.map(r=>function(i,o){const l=o.transform;if(l instanceof _a)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(l instanceof Ai)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:l.elements}};if(l instanceof va)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:l.elements}};if(l instanceof wa)return{fieldPath:o.field.canonicalString(),increment:l.Ae};throw K(20930,{transform:o.transform})}(0,r))),e.precondition.isNone||(n.currentDocument=function(s,i){return i.updateTime!==void 0?{updateTime:Nb(s,i.updateTime)}:i.exists!==void 0?{exists:i.exists}:K(27497)}(t,e.precondition)),n}function Lb(t,e){return t&&t.length>0?(le(e!==void 0,14353),t.map(n=>function(s,i){let o=s.updateTime?wn(s.updateTime):wn(i);return o.isEqual(X.min())&&(o=wn(i)),new yb(o,s.transformResults||[])}(n,e))):[]}function Mb(t,e){return{documents:[ST(t,e.path)]}}function jb(t,e){const n={structuredQuery:{}},r=e.path;let s;e.collectionGroup!==null?(s=r,n.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(s=r.popLast(),n.structuredQuery.from=[{collectionId:r.lastSegment()}]),n.parent=ST(t,s);const i=function(c){if(c.length!==0)return AT(on.create(c,"and"))}(e.filters);i&&(n.structuredQuery.where=i);const o=function(c){if(c.length!==0)return c.map(f=>function(g){return{field:qs(g.field),direction:zb(g.dir)}}(f))}(e.orderBy);o&&(n.structuredQuery.orderBy=o);const l=mf(t,e.limit);return l!==null&&(n.structuredQuery.limit=l),e.startAt&&(n.structuredQuery.startAt=function(c){return{before:c.inclusive,values:c.position}}(e.startAt)),e.endAt&&(n.structuredQuery.endAt=function(c){return{before:!c.inclusive,values:c.position}}(e.endAt)),{ft:n,parent:s}}function Ub(t){let e=Db(t.parent);const n=t.structuredQuery,r=n.from?n.from.length:0;let s=null;if(r>0){le(r===1,65062);const f=n.from[0];f.allDescendants?s=f.collectionId:e=e.child(f.collectionId)}let i=[];n.where&&(i=function(p){const g=CT(p);return g instanceof on&&nT(g)?g.getFilters():[g]}(n.where));let o=[];n.orderBy&&(o=function(p){return p.map(g=>function(x){return new ya(Hs(x.field),function(P){switch(P){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(x.direction))}(g))}(n.orderBy));let l=null;n.limit&&(l=function(p){let g;return g=typeof p=="object"?p.value:p,wc(g)?null:g}(n.limit));let u=null;n.startAt&&(u=function(p){const g=!!p.before,w=p.values||[];return new Du(w,g)}(n.startAt));let c=null;return n.endAt&&(c=function(p){const g=!p.before,w=p.values||[];return new Du(w,g)}(n.endAt)),rb(e,s,o,i,l,"F",u,c)}function Fb(t,e){const n=function(s){switch(s){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return K(28987,{purpose:s})}}(e.purpose);return n==null?null:{"goog-listen-tags":n}}function CT(t){return t.unaryFilter!==void 0?function(n){switch(n.unaryFilter.op){case"IS_NAN":const r=Hs(n.unaryFilter.field);return Le.create(r,"==",{doubleValue:NaN});case"IS_NULL":const s=Hs(n.unaryFilter.field);return Le.create(s,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const i=Hs(n.unaryFilter.field);return Le.create(i,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Hs(n.unaryFilter.field);return Le.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return K(61313);default:return K(60726)}}(t):t.fieldFilter!==void 0?function(n){return Le.create(Hs(n.fieldFilter.field),function(s){switch(s){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return K(58110);default:return K(50506)}}(n.fieldFilter.op),n.fieldFilter.value)}(t):t.compositeFilter!==void 0?function(n){return on.create(n.compositeFilter.filters.map(r=>CT(r)),function(s){switch(s){case"AND":return"and";case"OR":return"or";default:return K(1026)}}(n.compositeFilter.op))}(t):K(30097,{filter:t})}function zb(t){return Ab[t]}function Bb(t){return Rb[t]}function $b(t){return bb[t]}function qs(t){return{fieldPath:t.canonicalString()}}function Hs(t){return He.fromServerFormat(t.fieldPath)}function AT(t){return t instanceof Le?function(n){if(n.op==="=="){if(S_(n.value))return{unaryFilter:{field:qs(n.field),op:"IS_NAN"}};if(I_(n.value))return{unaryFilter:{field:qs(n.field),op:"IS_NULL"}}}else if(n.op==="!="){if(S_(n.value))return{unaryFilter:{field:qs(n.field),op:"IS_NOT_NAN"}};if(I_(n.value))return{unaryFilter:{field:qs(n.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:qs(n.field),op:Bb(n.op),value:n.value}}}(t):t instanceof on?function(n){const r=n.getFilters().map(s=>AT(s));return r.length===1?r[0]:{compositeFilter:{op:$b(n.op),filters:r}}}(t):K(54877,{filter:t})}function qb(t){const e=[];return t.fields.forEach(n=>e.push(n.canonicalString())),{fieldPaths:e}}function RT(t){return t.length>=4&&t.get(0)==="projects"&&t.get(2)==="databases"}function bT(t){return!!t&&typeof t._toProto=="function"&&t._protoValueType==="ProtoValue"}/**
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
 */class Dn{constructor(e,n,r,s,i=X.min(),o=X.min(),l=Ke.EMPTY_BYTE_STRING,u=null){this.target=e,this.targetId=n,this.purpose=r,this.sequenceNumber=s,this.snapshotVersion=i,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=l,this.expectedCount=u}withSequenceNumber(e){return new Dn(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,n){return new Dn(this.target,this.targetId,this.purpose,this.sequenceNumber,n,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new Dn(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new Dn(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
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
 */class Hb{constructor(e){this.yt=e}}function Wb(t){const e=Ub({parent:t.parent,structuredQuery:t.structuredQuery});return t.limitType==="LAST"?Ou(e,e.limit,"L"):e}/**
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
 */class Gb{constructor(){this.bn=new Kb}addToCollectionParentIndex(e,n){return this.bn.add(n),U.resolve()}getCollectionParents(e,n){return U.resolve(this.bn.getEntries(n))}addFieldIndex(e,n){return U.resolve()}deleteFieldIndex(e,n){return U.resolve()}deleteAllFieldIndexes(e){return U.resolve()}createTargetIndexes(e,n){return U.resolve()}getDocumentsMatchingTarget(e,n){return U.resolve(null)}getIndexType(e,n){return U.resolve(0)}getFieldIndexes(e,n){return U.resolve([])}getNextCollectionGroupToUpdate(e){return U.resolve(null)}getMinOffset(e,n){return U.resolve(Mr.min())}getMinOffsetFromCollectionGroup(e,n){return U.resolve(Mr.min())}updateCollectionGroup(e,n,r){return U.resolve()}updateIndexEntries(e,n){return U.resolve()}}class Kb{constructor(){this.index={}}add(e){const n=e.lastSegment(),r=e.popLast(),s=this.index[n]||new ze(de.comparator),i=!s.has(r);return this.index[n]=s.add(r),i}has(e){const n=e.lastSegment(),r=e.popLast(),s=this.index[n];return s&&s.has(r)}getEntries(e){return(this.index[e]||new ze(de.comparator)).toArray()}}/**
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
 */const U_={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},PT=41943040;class _t{static withCacheSize(e){return new _t(e,_t.DEFAULT_COLLECTION_PERCENTILE,_t.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,n,r){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=n,this.maximumSequenceNumbersToCollect=r}}/**
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
 */_t.DEFAULT_COLLECTION_PERCENTILE=10,_t.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,_t.DEFAULT=new _t(PT,_t.DEFAULT_COLLECTION_PERCENTILE,_t.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),_t.DISABLED=new _t(-1,0,0);/**
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
 */class zr{constructor(e){this.sr=e}next(){return this.sr+=2,this.sr}static _r(){return new zr(0)}static ar(){return new zr(-1)}}/**
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
 */const F_="LruGarbageCollector",Qb=1048576;function z_([t,e],[n,r]){const s=ee(t,n);return s===0?ee(e,r):s}class Xb{constructor(e){this.Pr=e,this.buffer=new ze(z_),this.Tr=0}Ir(){return++this.Tr}Er(e){const n=[e,this.Ir()];if(this.buffer.size<this.Pr)this.buffer=this.buffer.add(n);else{const r=this.buffer.last();z_(n,r)<0&&(this.buffer=this.buffer.delete(r).add(n))}}get maxValue(){return this.buffer.last()[0]}}class Yb{constructor(e,n,r){this.garbageCollector=e,this.asyncQueue=n,this.localStore=r,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Ar(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Ar(e){q(F_,`Garbage collection scheduled in ${e}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(n){Fi(n)?q(F_,"Ignoring IndexedDB error during garbage collection: ",n):await Ui(n)}await this.Ar(3e5)})}}class Jb{constructor(e,n){this.Vr=e,this.params=n}calculateTargetCount(e,n){return this.Vr.dr(e).next(r=>Math.floor(n/100*r))}nthSequenceNumber(e,n){if(n===0)return U.resolve(vc.ce);const r=new Xb(n);return this.Vr.forEachTarget(e,s=>r.Er(s.sequenceNumber)).next(()=>this.Vr.mr(e,s=>r.Er(s))).next(()=>r.maxValue)}removeTargets(e,n,r){return this.Vr.removeTargets(e,n,r)}removeOrphanedDocuments(e,n){return this.Vr.removeOrphanedDocuments(e,n)}collect(e,n){return this.params.cacheSizeCollectionThreshold===-1?(q("LruGarbageCollector","Garbage collection skipped; disabled"),U.resolve(U_)):this.getCacheSize(e).next(r=>r<this.params.cacheSizeCollectionThreshold?(q("LruGarbageCollector",`Garbage collection skipped; Cache size ${r} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),U_):this.gr(e,n))}getCacheSize(e){return this.Vr.getCacheSize(e)}gr(e,n){let r,s,i,o,l,u,c;const f=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(p=>(p>this.params.maximumSequenceNumbersToCollect?(q("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${p}`),s=this.params.maximumSequenceNumbersToCollect):s=p,o=Date.now(),this.nthSequenceNumber(e,s))).next(p=>(r=p,l=Date.now(),this.removeTargets(e,r,n))).next(p=>(i=p,u=Date.now(),this.removeOrphanedDocuments(e,r))).next(p=>(c=Date.now(),Bs()<=re.DEBUG&&q("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-f}ms
	Determined least recently used ${s} in `+(l-o)+`ms
	Removed ${i} targets in `+(u-l)+`ms
	Removed ${p} documents in `+(c-u)+`ms
Total Duration: ${c-f}ms`),U.resolve({didRun:!0,sequenceNumbersCollected:s,targetsRemoved:i,documentsRemoved:p})))}}function Zb(t,e){return new Jb(t,e)}/**
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
 */class eP{constructor(){this.changes=new Ps(e=>e.toString(),(e,n)=>e.isEqual(n)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,n){this.assertNotApplied(),this.changes.set(e,ot.newInvalidDocument(e).setReadTime(n))}getEntry(e,n){this.assertNotApplied();const r=this.changes.get(n);return r!==void 0?U.resolve(r):this.getFromCache(e,n)}getEntries(e,n){return this.getAllFromCache(e,n)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
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
 */class tP{constructor(e,n){this.overlayedDocument=e,this.mutatedFields=n}}/**
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
 */class nP{constructor(e,n,r,s){this.remoteDocumentCache=e,this.mutationQueue=n,this.documentOverlayCache=r,this.indexManager=s}getDocument(e,n){let r=null;return this.documentOverlayCache.getOverlay(e,n).next(s=>(r=s,this.remoteDocumentCache.getEntry(e,n))).next(s=>(r!==null&&$o(r.mutation,s,Pt.empty(),fe.now()),s))}getDocuments(e,n){return this.remoteDocumentCache.getEntries(e,n).next(r=>this.getLocalViewOfDocuments(e,r,te()).next(()=>r))}getLocalViewOfDocuments(e,n,r=te()){const s=ds();return this.populateOverlays(e,s,n).next(()=>this.computeViews(e,n,s,r).next(i=>{let o=Ro();return i.forEach((l,u)=>{o=o.insert(l,u.overlayedDocument)}),o}))}getOverlayedDocuments(e,n){const r=ds();return this.populateOverlays(e,r,n).next(()=>this.computeViews(e,n,r,te()))}populateOverlays(e,n,r){const s=[];return r.forEach(i=>{n.has(i)||s.push(i)}),this.documentOverlayCache.getOverlays(e,s).next(i=>{i.forEach((o,l)=>{n.set(o,l)})})}computeViews(e,n,r,s){let i=Gn();const o=Bo(),l=function(){return Bo()}();return n.forEach((u,c)=>{const f=r.get(c.key);s.has(c.key)&&(f===void 0||f.mutation instanceof Xr)?i=i.insert(c.key,c):f!==void 0?(o.set(c.key,f.mutation.getFieldMask()),$o(f.mutation,c,f.mutation.getFieldMask(),fe.now())):o.set(c.key,Pt.empty())}),this.recalculateAndSaveOverlays(e,i).next(u=>(u.forEach((c,f)=>o.set(c,f)),n.forEach((c,f)=>l.set(c,new tP(f,o.get(c)??null))),l))}recalculateAndSaveOverlays(e,n){const r=Bo();let s=new Te((o,l)=>o-l),i=te();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,n).next(o=>{for(const l of o)l.keys().forEach(u=>{const c=n.get(u);if(c===null)return;let f=r.get(u)||Pt.empty();f=l.applyToLocalView(c,f),r.set(u,f);const p=(s.get(l.batchId)||te()).add(u);s=s.insert(l.batchId,p)})}).next(()=>{const o=[],l=s.getReverseIterator();for(;l.hasNext();){const u=l.getNext(),c=u.key,f=u.value,p=hT();f.forEach(g=>{if(!i.has(g)){const w=_T(n.get(g),r.get(g));w!==null&&p.set(g,w),i=i.add(g)}}),o.push(this.documentOverlayCache.saveOverlays(e,c,p))}return U.waitFor(o)}).next(()=>r)}recalculateAndSaveOverlaysForDocumentKeys(e,n){return this.remoteDocumentCache.getEntries(e,n).next(r=>this.recalculateAndSaveOverlays(e,r))}getDocumentsMatchingQuery(e,n,r,s){return sb(n)?this.getDocumentsMatchingDocumentQuery(e,n.path):oT(n)?this.getDocumentsMatchingCollectionGroupQuery(e,n,r,s):this.getDocumentsMatchingCollectionQuery(e,n,r,s)}getNextDocuments(e,n,r,s){return this.remoteDocumentCache.getAllFromCollectionGroup(e,n,r,s).next(i=>{const o=s-i.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,n,r.largestBatchId,s-i.size):U.resolve(ds());let l=pa,u=i;return o.next(c=>U.forEach(c,(f,p)=>(l<p.largestBatchId&&(l=p.largestBatchId),i.get(f)?U.resolve():this.remoteDocumentCache.getEntry(e,f).next(g=>{u=u.insert(f,g)}))).next(()=>this.populateOverlays(e,c,i)).next(()=>this.computeViews(e,u,c,te())).next(f=>({batchId:l,changes:cT(f)})))})}getDocumentsMatchingDocumentQuery(e,n){return this.getDocument(e,new W(n)).next(r=>{let s=Ro();return r.isFoundDocument()&&(s=s.insert(r.key,r)),s})}getDocumentsMatchingCollectionGroupQuery(e,n,r,s){const i=n.collectionGroup;let o=Ro();return this.indexManager.getCollectionParents(e,i).next(l=>U.forEach(l,u=>{const c=function(p,g){return new zi(g,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt)}(n,u.child(i));return this.getDocumentsMatchingCollectionQuery(e,c,r,s).next(f=>{f.forEach((p,g)=>{o=o.insert(p,g)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,n,r,s){let i;return this.documentOverlayCache.getOverlaysForCollection(e,n.path,r.largestBatchId).next(o=>(i=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,n,r,i,s))).next(o=>{i.forEach((u,c)=>{const f=c.getKey();o.get(f)===null&&(o=o.insert(f,ot.newInvalidDocument(f)))});let l=Ro();return o.forEach((u,c)=>{const f=i.get(u);f!==void 0&&$o(f.mutation,c,Pt.empty(),fe.now()),Ic(n,c)&&(l=l.insert(u,c))}),l})}}/**
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
 */class rP{constructor(e){this.serializer=e,this.Nr=new Map,this.Br=new Map}getBundleMetadata(e,n){return U.resolve(this.Nr.get(n))}saveBundleMetadata(e,n){return this.Nr.set(n.id,function(s){return{id:s.id,version:s.version,createTime:wn(s.createTime)}}(n)),U.resolve()}getNamedQuery(e,n){return U.resolve(this.Br.get(n))}saveNamedQuery(e,n){return this.Br.set(n.name,function(s){return{name:s.name,query:Wb(s.bundledQuery),readTime:wn(s.readTime)}}(n)),U.resolve()}}/**
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
 */class sP{constructor(){this.overlays=new Te(W.comparator),this.Lr=new Map}getOverlay(e,n){return U.resolve(this.overlays.get(n))}getOverlays(e,n){const r=ds();return U.forEach(n,s=>this.getOverlay(e,s).next(i=>{i!==null&&r.set(s,i)})).next(()=>r)}saveOverlays(e,n,r){return r.forEach((s,i)=>{this.St(e,n,i)}),U.resolve()}removeOverlaysForBatchId(e,n,r){const s=this.Lr.get(r);return s!==void 0&&(s.forEach(i=>this.overlays=this.overlays.remove(i)),this.Lr.delete(r)),U.resolve()}getOverlaysForCollection(e,n,r){const s=ds(),i=n.length+1,o=new W(n.child("")),l=this.overlays.getIteratorFrom(o);for(;l.hasNext();){const u=l.getNext().value,c=u.getKey();if(!n.isPrefixOf(c.path))break;c.path.length===i&&u.largestBatchId>r&&s.set(u.getKey(),u)}return U.resolve(s)}getOverlaysForCollectionGroup(e,n,r,s){let i=new Te((c,f)=>c-f);const o=this.overlays.getIterator();for(;o.hasNext();){const c=o.getNext().value;if(c.getKey().getCollectionGroup()===n&&c.largestBatchId>r){let f=i.get(c.largestBatchId);f===null&&(f=ds(),i=i.insert(c.largestBatchId,f)),f.set(c.getKey(),c)}}const l=ds(),u=i.getIterator();for(;u.hasNext()&&(u.getNext().value.forEach((c,f)=>l.set(c,f)),!(l.size()>=s)););return U.resolve(l)}St(e,n,r){const s=this.overlays.get(r.key);if(s!==null){const o=this.Lr.get(s.largestBatchId).delete(r.key);this.Lr.set(s.largestBatchId,o)}this.overlays=this.overlays.insert(r.key,new Tb(n,r));let i=this.Lr.get(n);i===void 0&&(i=te(),this.Lr.set(n,i)),this.Lr.set(n,i.add(r.key))}}/**
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
 */class iP{constructor(){this.sessionToken=Ke.EMPTY_BYTE_STRING}getSessionToken(e){return U.resolve(this.sessionToken)}setSessionToken(e,n){return this.sessionToken=n,U.resolve()}}/**
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
 */class Hp{constructor(){this.kr=new ze($e.Kr),this.qr=new ze($e.Ur)}isEmpty(){return this.kr.isEmpty()}addReference(e,n){const r=new $e(e,n);this.kr=this.kr.add(r),this.qr=this.qr.add(r)}$r(e,n){e.forEach(r=>this.addReference(r,n))}removeReference(e,n){this.Wr(new $e(e,n))}Qr(e,n){e.forEach(r=>this.removeReference(r,n))}Gr(e){const n=new W(new de([])),r=new $e(n,e),s=new $e(n,e+1),i=[];return this.qr.forEachInRange([r,s],o=>{this.Wr(o),i.push(o.key)}),i}zr(){this.kr.forEach(e=>this.Wr(e))}Wr(e){this.kr=this.kr.delete(e),this.qr=this.qr.delete(e)}jr(e){const n=new W(new de([])),r=new $e(n,e),s=new $e(n,e+1);let i=te();return this.qr.forEachInRange([r,s],o=>{i=i.add(o.key)}),i}containsKey(e){const n=new $e(e,0),r=this.kr.firstAfterOrEqual(n);return r!==null&&e.isEqual(r.key)}}class $e{constructor(e,n){this.key=e,this.Jr=n}static Kr(e,n){return W.comparator(e.key,n.key)||ee(e.Jr,n.Jr)}static Ur(e,n){return ee(e.Jr,n.Jr)||W.comparator(e.key,n.key)}}/**
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
 */class oP{constructor(e,n){this.indexManager=e,this.referenceDelegate=n,this.mutationQueue=[],this.Yn=1,this.Hr=new ze($e.Kr)}checkEmpty(e){return U.resolve(this.mutationQueue.length===0)}addMutationBatch(e,n,r,s){const i=this.Yn;this.Yn++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new Eb(i,n,r,s);this.mutationQueue.push(o);for(const l of s)this.Hr=this.Hr.add(new $e(l.key,i)),this.indexManager.addToCollectionParentIndex(e,l.key.path.popLast());return U.resolve(o)}lookupMutationBatch(e,n){return U.resolve(this.Zr(n))}getNextMutationBatchAfterBatchId(e,n){const r=n+1,s=this.Xr(r),i=s<0?0:s;return U.resolve(this.mutationQueue.length>i?this.mutationQueue[i]:null)}getHighestUnacknowledgedBatchId(){return U.resolve(this.mutationQueue.length===0?Vp:this.Yn-1)}getAllMutationBatches(e){return U.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,n){const r=new $e(n,0),s=new $e(n,Number.POSITIVE_INFINITY),i=[];return this.Hr.forEachInRange([r,s],o=>{const l=this.Zr(o.Jr);i.push(l)}),U.resolve(i)}getAllMutationBatchesAffectingDocumentKeys(e,n){let r=new ze(ee);return n.forEach(s=>{const i=new $e(s,0),o=new $e(s,Number.POSITIVE_INFINITY);this.Hr.forEachInRange([i,o],l=>{r=r.add(l.Jr)})}),U.resolve(this.Yr(r))}getAllMutationBatchesAffectingQuery(e,n){const r=n.path,s=r.length+1;let i=r;W.isDocumentKey(i)||(i=i.child(""));const o=new $e(new W(i),0);let l=new ze(ee);return this.Hr.forEachWhile(u=>{const c=u.key.path;return!!r.isPrefixOf(c)&&(c.length===s&&(l=l.add(u.Jr)),!0)},o),U.resolve(this.Yr(l))}Yr(e){const n=[];return e.forEach(r=>{const s=this.Zr(r);s!==null&&n.push(s)}),n}removeMutationBatch(e,n){le(this.ei(n.batchId,"removed")===0,55003),this.mutationQueue.shift();let r=this.Hr;return U.forEach(n.mutations,s=>{const i=new $e(s.key,n.batchId);return r=r.delete(i),this.referenceDelegate.markPotentiallyOrphaned(e,s.key)}).next(()=>{this.Hr=r})}nr(e){}containsKey(e,n){const r=new $e(n,0),s=this.Hr.firstAfterOrEqual(r);return U.resolve(n.isEqual(s&&s.key))}performConsistencyCheck(e){return this.mutationQueue.length,U.resolve()}ei(e,n){return this.Xr(e)}Xr(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Zr(e){const n=this.Xr(e);return n<0||n>=this.mutationQueue.length?null:this.mutationQueue[n]}}/**
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
 */class aP{constructor(e){this.ti=e,this.docs=function(){return new Te(W.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,n){const r=n.key,s=this.docs.get(r),i=s?s.size:0,o=this.ti(n);return this.docs=this.docs.insert(r,{document:n.mutableCopy(),size:o}),this.size+=o-i,this.indexManager.addToCollectionParentIndex(e,r.path.popLast())}removeEntry(e){const n=this.docs.get(e);n&&(this.docs=this.docs.remove(e),this.size-=n.size)}getEntry(e,n){const r=this.docs.get(n);return U.resolve(r?r.document.mutableCopy():ot.newInvalidDocument(n))}getEntries(e,n){let r=Gn();return n.forEach(s=>{const i=this.docs.get(s);r=r.insert(s,i?i.document.mutableCopy():ot.newInvalidDocument(s))}),U.resolve(r)}getDocumentsMatchingQuery(e,n,r,s){let i=Gn();const o=n.path,l=new W(o.child("__id-9223372036854775808__")),u=this.docs.getIteratorFrom(l);for(;u.hasNext();){const{key:c,value:{document:f}}=u.getNext();if(!o.isPrefixOf(c.path))break;c.path.length>o.length+1||OR(DR(f),r)<=0||(s.has(f.key)||Ic(n,f))&&(i=i.insert(f.key,f.mutableCopy()))}return U.resolve(i)}getAllFromCollectionGroup(e,n,r,s){K(9500)}ni(e,n){return U.forEach(this.docs,r=>n(r))}newChangeBuffer(e){return new lP(this)}getSize(e){return U.resolve(this.size)}}class lP extends eP{constructor(e){super(),this.Mr=e}applyChanges(e){const n=[];return this.changes.forEach((r,s)=>{s.isValidDocument()?n.push(this.Mr.addEntry(e,s)):this.Mr.removeEntry(r)}),U.waitFor(n)}getFromCache(e,n){return this.Mr.getEntry(e,n)}getAllFromCache(e,n){return this.Mr.getEntries(e,n)}}/**
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
 */class uP{constructor(e){this.persistence=e,this.ri=new Ps(n=>jp(n),Up),this.lastRemoteSnapshotVersion=X.min(),this.highestTargetId=0,this.ii=0,this.si=new Hp,this.targetCount=0,this.oi=zr._r()}forEachTarget(e,n){return this.ri.forEach((r,s)=>n(s)),U.resolve()}getLastRemoteSnapshotVersion(e){return U.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return U.resolve(this.ii)}allocateTargetId(e){return this.highestTargetId=this.oi.next(),U.resolve(this.highestTargetId)}setTargetsMetadata(e,n,r){return r&&(this.lastRemoteSnapshotVersion=r),n>this.ii&&(this.ii=n),U.resolve()}lr(e){this.ri.set(e.target,e);const n=e.targetId;n>this.highestTargetId&&(this.oi=new zr(n),this.highestTargetId=n),e.sequenceNumber>this.ii&&(this.ii=e.sequenceNumber)}addTargetData(e,n){return this.lr(n),this.targetCount+=1,U.resolve()}updateTargetData(e,n){return this.lr(n),U.resolve()}removeTargetData(e,n){return this.ri.delete(n.target),this.si.Gr(n.targetId),this.targetCount-=1,U.resolve()}removeTargets(e,n,r){let s=0;const i=[];return this.ri.forEach((o,l)=>{l.sequenceNumber<=n&&r.get(l.targetId)===null&&(this.ri.delete(o),i.push(this.removeMatchingKeysForTargetId(e,l.targetId)),s++)}),U.waitFor(i).next(()=>s)}getTargetCount(e){return U.resolve(this.targetCount)}getTargetData(e,n){const r=this.ri.get(n)||null;return U.resolve(r)}addMatchingKeys(e,n,r){return this.si.$r(n,r),U.resolve()}removeMatchingKeys(e,n,r){this.si.Qr(n,r);const s=this.persistence.referenceDelegate,i=[];return s&&n.forEach(o=>{i.push(s.markPotentiallyOrphaned(e,o))}),U.waitFor(i)}removeMatchingKeysForTargetId(e,n){return this.si.Gr(n),U.resolve()}getMatchingKeysForTargetId(e,n){const r=this.si.jr(n);return U.resolve(r)}containsKey(e,n){return U.resolve(this.si.containsKey(n))}}/**
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
 */class NT{constructor(e,n){this._i={},this.overlays={},this.ai=new vc(0),this.ui=!1,this.ui=!0,this.ci=new iP,this.referenceDelegate=e(this),this.li=new uP(this),this.indexManager=new Gb,this.remoteDocumentCache=function(s){return new aP(s)}(r=>this.referenceDelegate.hi(r)),this.serializer=new Hb(n),this.Pi=new rP(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.ui=!1,Promise.resolve()}get started(){return this.ui}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let n=this.overlays[e.toKey()];return n||(n=new sP,this.overlays[e.toKey()]=n),n}getMutationQueue(e,n){let r=this._i[e.toKey()];return r||(r=new oP(n,this.referenceDelegate),this._i[e.toKey()]=r),r}getGlobalsCache(){return this.ci}getTargetCache(){return this.li}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Pi}runTransaction(e,n,r){q("MemoryPersistence","Starting transaction:",e);const s=new cP(this.ai.next());return this.referenceDelegate.Ti(),r(s).next(i=>this.referenceDelegate.Ii(s).next(()=>i)).toPromise().then(i=>(s.raiseOnCommittedEvent(),i))}Ei(e,n){return U.or(Object.values(this._i).map(r=>()=>r.containsKey(e,n)))}}class cP extends LR{constructor(e){super(),this.currentSequenceNumber=e}}class Wp{constructor(e){this.persistence=e,this.Ri=new Hp,this.Ai=null}static Vi(e){return new Wp(e)}get di(){if(this.Ai)return this.Ai;throw K(60996)}addReference(e,n,r){return this.Ri.addReference(r,n),this.di.delete(r.toString()),U.resolve()}removeReference(e,n,r){return this.Ri.removeReference(r,n),this.di.add(r.toString()),U.resolve()}markPotentiallyOrphaned(e,n){return this.di.add(n.toString()),U.resolve()}removeTarget(e,n){this.Ri.Gr(n.targetId).forEach(s=>this.di.add(s.toString()));const r=this.persistence.getTargetCache();return r.getMatchingKeysForTargetId(e,n.targetId).next(s=>{s.forEach(i=>this.di.add(i.toString()))}).next(()=>r.removeTargetData(e,n))}Ti(){this.Ai=new Set}Ii(e){const n=this.persistence.getRemoteDocumentCache().newChangeBuffer();return U.forEach(this.di,r=>{const s=W.fromPath(r);return this.mi(e,s).next(i=>{i||n.removeEntry(s,X.min())})}).next(()=>(this.Ai=null,n.apply(e)))}updateLimboDocument(e,n){return this.mi(e,n).next(r=>{r?this.di.delete(n.toString()):this.di.add(n.toString())})}hi(e){return 0}mi(e,n){return U.or([()=>U.resolve(this.Ri.containsKey(n)),()=>this.persistence.getTargetCache().containsKey(e,n),()=>this.persistence.Ei(e,n)])}}class Lu{constructor(e,n){this.persistence=e,this.fi=new Ps(r=>UR(r.path),(r,s)=>r.isEqual(s)),this.garbageCollector=Zb(this,n)}static Vi(e,n){return new Lu(e,n)}Ti(){}Ii(e){return U.resolve()}forEachTarget(e,n){return this.persistence.getTargetCache().forEachTarget(e,n)}dr(e){const n=this.pr(e);return this.persistence.getTargetCache().getTargetCount(e).next(r=>n.next(s=>r+s))}pr(e){let n=0;return this.mr(e,r=>{n++}).next(()=>n)}mr(e,n){return U.forEach(this.fi,(r,s)=>this.wr(e,r,s).next(i=>i?U.resolve():n(s)))}removeTargets(e,n,r){return this.persistence.getTargetCache().removeTargets(e,n,r)}removeOrphanedDocuments(e,n){let r=0;const s=this.persistence.getRemoteDocumentCache(),i=s.newChangeBuffer();return s.ni(e,o=>this.wr(e,o,n).next(l=>{l||(r++,i.removeEntry(o,X.min()))})).next(()=>i.apply(e)).next(()=>r)}markPotentiallyOrphaned(e,n){return this.fi.set(n,e.currentSequenceNumber),U.resolve()}removeTarget(e,n){const r=n.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,r)}addReference(e,n,r){return this.fi.set(r,e.currentSequenceNumber),U.resolve()}removeReference(e,n,r){return this.fi.set(r,e.currentSequenceNumber),U.resolve()}updateLimboDocument(e,n){return this.fi.set(n,e.currentSequenceNumber),U.resolve()}hi(e){let n=e.key.toString().length;return e.isFoundDocument()&&(n+=Gl(e.data.value)),n}wr(e,n,r){return U.or([()=>this.persistence.Ei(e,n),()=>this.persistence.getTargetCache().containsKey(e,n),()=>{const s=this.fi.get(n);return U.resolve(s!==void 0&&s>r)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
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
 */class Gp{constructor(e,n,r,s){this.targetId=e,this.fromCache=n,this.Ts=r,this.Is=s}static Es(e,n){let r=te(),s=te();for(const i of n.docChanges)switch(i.type){case 0:r=r.add(i.doc.key);break;case 1:s=s.add(i.doc.key)}return new Gp(e,n.fromCache,r,s)}}/**
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
 */class hP{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
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
 */class dP{constructor(){this.Rs=!1,this.As=!1,this.Vs=100,this.ds=function(){return sA()?8:MR(ut())>0?6:4}()}initialize(e,n){this.fs=e,this.indexManager=n,this.Rs=!0}getDocumentsMatchingQuery(e,n,r,s){const i={result:null};return this.gs(e,n).next(o=>{i.result=o}).next(()=>{if(!i.result)return this.ps(e,n,s,r).next(o=>{i.result=o})}).next(()=>{if(i.result)return;const o=new hP;return this.ys(e,n,o).next(l=>{if(i.result=l,this.As)return this.ws(e,n,o,l.size)})}).next(()=>i.result)}ws(e,n,r,s){return r.documentReadCount<this.Vs?(Bs()<=re.DEBUG&&q("QueryEngine","SDK will not create cache indexes for query:",$s(n),"since it only creates cache indexes for collection contains","more than or equal to",this.Vs,"documents"),U.resolve()):(Bs()<=re.DEBUG&&q("QueryEngine","Query:",$s(n),"scans",r.documentReadCount,"local documents and returns",s,"documents as results."),r.documentReadCount>this.ds*s?(Bs()<=re.DEBUG&&q("QueryEngine","The SDK decides to create cache indexes for query:",$s(n),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,vn(n))):U.resolve())}gs(e,n){if(R_(n))return U.resolve(null);let r=vn(n);return this.indexManager.getIndexType(e,r).next(s=>s===0?null:(n.limit!==null&&s===1&&(n=Ou(n,null,"F"),r=vn(n)),this.indexManager.getDocumentsMatchingTarget(e,r).next(i=>{const o=te(...i);return this.fs.getDocuments(e,o).next(l=>this.indexManager.getMinOffset(e,r).next(u=>{const c=this.Ss(n,l);return this.bs(n,c,o,u.readTime)?this.gs(e,Ou(n,null,"F")):this.Ds(e,c,n,u)}))})))}ps(e,n,r,s){return R_(n)||s.isEqual(X.min())?U.resolve(null):this.fs.getDocuments(e,r).next(i=>{const o=this.Ss(n,i);return this.bs(n,o,r,s)?U.resolve(null):(Bs()<=re.DEBUG&&q("QueryEngine","Re-using previous result from %s to execute query: %s",s.toString(),$s(n)),this.Ds(e,o,n,NR(s,pa)).next(l=>l))})}Ss(e,n){let r=new ze(lT(e));return n.forEach((s,i)=>{Ic(e,i)&&(r=r.add(i))}),r}bs(e,n,r,s){if(e.limit===null)return!1;if(r.size!==n.size)return!0;const i=e.limitType==="F"?n.last():n.first();return!!i&&(i.hasPendingWrites||i.version.compareTo(s)>0)}ys(e,n,r){return Bs()<=re.DEBUG&&q("QueryEngine","Using full collection scan to execute query:",$s(n)),this.fs.getDocumentsMatchingQuery(e,n,Mr.min(),r)}Ds(e,n,r,s){return this.fs.getDocumentsMatchingQuery(e,r,s).next(i=>(n.forEach(o=>{i=i.insert(o.key,o)}),i))}}/**
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
 */const Kp="LocalStore",fP=3e8;class pP{constructor(e,n,r,s){this.persistence=e,this.Cs=n,this.serializer=s,this.vs=new Te(ee),this.Fs=new Ps(i=>jp(i),Up),this.Ms=new Map,this.xs=e.getRemoteDocumentCache(),this.li=e.getTargetCache(),this.Pi=e.getBundleCache(),this.Os(r)}Os(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new nP(this.xs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.xs.setIndexManager(this.indexManager),this.Cs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",n=>e.collect(n,this.vs))}}function mP(t,e,n,r){return new pP(t,e,n,r)}async function DT(t,e){const n=Y(t);return await n.persistence.runTransaction("Handle user change","readonly",r=>{let s;return n.mutationQueue.getAllMutationBatches(r).next(i=>(s=i,n.Os(e),n.mutationQueue.getAllMutationBatches(r))).next(i=>{const o=[],l=[];let u=te();for(const c of s){o.push(c.batchId);for(const f of c.mutations)u=u.add(f.key)}for(const c of i){l.push(c.batchId);for(const f of c.mutations)u=u.add(f.key)}return n.localDocuments.getDocuments(r,u).next(c=>({Ns:c,removedBatchIds:o,addedBatchIds:l}))})})}function gP(t,e){const n=Y(t);return n.persistence.runTransaction("Acknowledge batch","readwrite-primary",r=>{const s=e.batch.keys(),i=n.xs.newChangeBuffer({trackRemovals:!0});return function(l,u,c,f){const p=c.batch,g=p.keys();let w=U.resolve();return g.forEach(x=>{w=w.next(()=>f.getEntry(u,x)).next(b=>{const P=c.docVersions.get(x);le(P!==null,48541),b.version.compareTo(P)<0&&(p.applyToRemoteDocument(b,c),b.isValidDocument()&&(b.setReadTime(c.commitVersion),f.addEntry(b)))})}),w.next(()=>l.mutationQueue.removeMutationBatch(u,p))}(n,r,e,i).next(()=>i.apply(r)).next(()=>n.mutationQueue.performConsistencyCheck(r)).next(()=>n.documentOverlayCache.removeOverlaysForBatchId(r,s,e.batch.batchId)).next(()=>n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(r,function(l){let u=te();for(let c=0;c<l.mutationResults.length;++c)l.mutationResults[c].transformResults.length>0&&(u=u.add(l.batch.mutations[c].key));return u}(e))).next(()=>n.localDocuments.getDocuments(r,s))})}function OT(t){const e=Y(t);return e.persistence.runTransaction("Get last remote snapshot version","readonly",n=>e.li.getLastRemoteSnapshotVersion(n))}function yP(t,e){const n=Y(t),r=e.snapshotVersion;let s=n.vs;return n.persistence.runTransaction("Apply remote event","readwrite-primary",i=>{const o=n.xs.newChangeBuffer({trackRemovals:!0});s=n.vs;const l=[];e.targetChanges.forEach((f,p)=>{const g=s.get(p);if(!g)return;l.push(n.li.removeMatchingKeys(i,f.removedDocuments,p).next(()=>n.li.addMatchingKeys(i,f.addedDocuments,p)));let w=g.withSequenceNumber(i.currentSequenceNumber);e.targetMismatches.get(p)!==null?w=w.withResumeToken(Ke.EMPTY_BYTE_STRING,X.min()).withLastLimboFreeSnapshotVersion(X.min()):f.resumeToken.approximateByteSize()>0&&(w=w.withResumeToken(f.resumeToken,r)),s=s.insert(p,w),function(b,P,S){return b.resumeToken.approximateByteSize()===0||P.snapshotVersion.toMicroseconds()-b.snapshotVersion.toMicroseconds()>=fP?!0:S.addedDocuments.size+S.modifiedDocuments.size+S.removedDocuments.size>0}(g,w,f)&&l.push(n.li.updateTargetData(i,w))});let u=Gn(),c=te();if(e.documentUpdates.forEach(f=>{e.resolvedLimboDocuments.has(f)&&l.push(n.persistence.referenceDelegate.updateLimboDocument(i,f))}),l.push(_P(i,o,e.documentUpdates).next(f=>{u=f.Bs,c=f.Ls})),!r.isEqual(X.min())){const f=n.li.getLastRemoteSnapshotVersion(i).next(p=>n.li.setTargetsMetadata(i,i.currentSequenceNumber,r));l.push(f)}return U.waitFor(l).next(()=>o.apply(i)).next(()=>n.localDocuments.getLocalViewOfDocuments(i,u,c)).next(()=>u)}).then(i=>(n.vs=s,i))}function _P(t,e,n){let r=te(),s=te();return n.forEach(i=>r=r.add(i)),e.getEntries(t,r).next(i=>{let o=Gn();return n.forEach((l,u)=>{const c=i.get(l);u.isFoundDocument()!==c.isFoundDocument()&&(s=s.add(l)),u.isNoDocument()&&u.version.isEqual(X.min())?(e.removeEntry(l,u.readTime),o=o.insert(l,u)):!c.isValidDocument()||u.version.compareTo(c.version)>0||u.version.compareTo(c.version)===0&&c.hasPendingWrites?(e.addEntry(u),o=o.insert(l,u)):q(Kp,"Ignoring outdated watch update for ",l,". Current version:",c.version," Watch version:",u.version)}),{Bs:o,Ls:s}})}function vP(t,e){const n=Y(t);return n.persistence.runTransaction("Get next mutation batch","readonly",r=>(e===void 0&&(e=Vp),n.mutationQueue.getNextMutationBatchAfterBatchId(r,e)))}function wP(t,e){const n=Y(t);return n.persistence.runTransaction("Allocate target","readwrite",r=>{let s;return n.li.getTargetData(r,e).next(i=>i?(s=i,U.resolve(s)):n.li.allocateTargetId(r).next(o=>(s=new Dn(e,o,"TargetPurposeListen",r.currentSequenceNumber),n.li.addTargetData(r,s).next(()=>s))))}).then(r=>{const s=n.vs.get(r.targetId);return(s===null||r.snapshotVersion.compareTo(s.snapshotVersion)>0)&&(n.vs=n.vs.insert(r.targetId,r),n.Fs.set(e,r.targetId)),r})}async function vf(t,e,n){const r=Y(t),s=r.vs.get(e),i=n?"readwrite":"readwrite-primary";try{n||await r.persistence.runTransaction("Release target",i,o=>r.persistence.referenceDelegate.removeTarget(o,s))}catch(o){if(!Fi(o))throw o;q(Kp,`Failed to update sequence numbers for target ${e}: ${o}`)}r.vs=r.vs.remove(e),r.Fs.delete(s.target)}function B_(t,e,n){const r=Y(t);let s=X.min(),i=te();return r.persistence.runTransaction("Execute query","readwrite",o=>function(u,c,f){const p=Y(u),g=p.Fs.get(f);return g!==void 0?U.resolve(p.vs.get(g)):p.li.getTargetData(c,f)}(r,o,vn(e)).next(l=>{if(l)return s=l.lastLimboFreeSnapshotVersion,r.li.getMatchingKeysForTargetId(o,l.targetId).next(u=>{i=u})}).next(()=>r.Cs.getDocumentsMatchingQuery(o,e,n?s:X.min(),n?i:te())).next(l=>(EP(r,ab(e),l),{documents:l,ks:i})))}function EP(t,e,n){let r=t.Ms.get(e)||X.min();n.forEach((s,i)=>{i.readTime.compareTo(r)>0&&(r=i.readTime)}),t.Ms.set(e,r)}class $_{constructor(){this.activeTargetIds=fb()}Qs(e){this.activeTargetIds=this.activeTargetIds.add(e)}Gs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Ws(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class TP{constructor(){this.vo=new $_,this.Fo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,n,r){}addLocalQueryTarget(e,n=!0){return n&&this.vo.Qs(e),this.Fo[e]||"not-current"}updateQueryState(e,n,r){this.Fo[e]=n}removeLocalQueryTarget(e){this.vo.Gs(e)}isLocalQueryTarget(e){return this.vo.activeTargetIds.has(e)}clearQueryState(e){delete this.Fo[e]}getAllActiveQueryTargets(){return this.vo.activeTargetIds}isActiveQueryTarget(e){return this.vo.activeTargetIds.has(e)}start(){return this.vo=new $_,Promise.resolve()}handleUserChange(e,n,r){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
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
 */class xP{Mo(e){}shutdown(){}}/**
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
 */const q_="ConnectivityMonitor";class H_{constructor(){this.xo=()=>this.Oo(),this.No=()=>this.Bo(),this.Lo=[],this.ko()}Mo(e){this.Lo.push(e)}shutdown(){window.removeEventListener("online",this.xo),window.removeEventListener("offline",this.No)}ko(){window.addEventListener("online",this.xo),window.addEventListener("offline",this.No)}Oo(){q(q_,"Network connectivity changed: AVAILABLE");for(const e of this.Lo)e(0)}Bo(){q(q_,"Network connectivity changed: UNAVAILABLE");for(const e of this.Lo)e(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
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
 */let Al=null;function wf(){return Al===null?Al=function(){return 268435456+Math.round(2147483648*Math.random())}():Al++,"0x"+Al.toString(16)}/**
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
 */const Qh="RestConnection",IP={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery",ExecutePipeline:"executePipeline"};class SP{get Ko(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const n=e.ssl?"https":"http",r=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.qo=n+"://"+e.host,this.Uo=`projects/${r}/databases/${s}`,this.$o=this.databaseId.database===Pu?`project_id=${r}`:`project_id=${r}&database_id=${s}`}Wo(e,n,r,s,i){const o=wf(),l=this.Qo(e,n.toUriEncodedString());q(Qh,`Sending RPC '${e}' ${o}:`,l,r);const u={"google-cloud-resource-prefix":this.Uo,"x-goog-request-params":this.$o};this.Go(u,s,i);const{host:c}=new URL(l),f=Rs(c);return this.zo(e,l,u,r,f).then(p=>(q(Qh,`Received RPC '${e}' ${o}: `,p),p),p=>{throw Lr(Qh,`RPC '${e}' ${o} failed with error: `,p,"url: ",l,"request:",r),p})}jo(e,n,r,s,i,o){return this.Wo(e,n,r,s,i)}Go(e,n,r){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+ji}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),n&&n.headers.forEach((s,i)=>e[i]=s),r&&r.headers.forEach((s,i)=>e[i]=s)}Qo(e,n){const r=IP[e];let s=`${this.qo}/v1/${n}:${r}`;return this.databaseInfo.apiKey&&(s=`${s}?key=${encodeURIComponent(this.databaseInfo.apiKey)}`),s}terminate(){}}/**
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
 */class kP{constructor(e){this.Jo=e.Jo,this.Ho=e.Ho}Zo(e){this.Xo=e}Yo(e){this.e_=e}t_(e){this.n_=e}onMessage(e){this.r_=e}close(){this.Ho()}send(e){this.Jo(e)}i_(){this.Xo()}s_(){this.e_()}o_(e){this.n_(e)}__(e){this.r_(e)}}/**
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
 */const rt="WebChannelConnection",wo=(t,e,n)=>{t.listen(e,r=>{try{n(r)}catch(s){setTimeout(()=>{throw s},0)}})};class hi extends SP{constructor(e){super(e),this.a_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}static u_(){if(!hi.c_){const e=LE();wo(e,VE.STAT_EVENT,n=>{n.stat===lf.PROXY?q(rt,"STAT_EVENT: detected buffering proxy"):n.stat===lf.NOPROXY&&q(rt,"STAT_EVENT: detected no buffering proxy")}),hi.c_=!0}}zo(e,n,r,s,i){const o=wf();return new Promise((l,u)=>{const c=new DE;c.setWithCredentials(!0),c.listenOnce(OE.COMPLETE,()=>{try{switch(c.getLastErrorCode()){case Wl.NO_ERROR:const p=c.getResponseJson();q(rt,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(p)),l(p);break;case Wl.TIMEOUT:q(rt,`RPC '${e}' ${o} timed out`),u(new B(M.DEADLINE_EXCEEDED,"Request time out"));break;case Wl.HTTP_ERROR:const g=c.getStatus();if(q(rt,`RPC '${e}' ${o} failed with status:`,g,"response text:",c.getResponseText()),g>0){let w=c.getResponseJson();Array.isArray(w)&&(w=w[0]);const x=w==null?void 0:w.error;if(x&&x.status&&x.message){const b=function(S){const v=S.toLowerCase().replace(/_/g,"-");return Object.values(M).indexOf(v)>=0?v:M.UNKNOWN}(x.status);u(new B(b,x.message))}else u(new B(M.UNKNOWN,"Server responded with status "+c.getStatus()))}else u(new B(M.UNAVAILABLE,"Connection failed."));break;default:K(9055,{l_:e,streamId:o,h_:c.getLastErrorCode(),P_:c.getLastError()})}}finally{q(rt,`RPC '${e}' ${o} completed.`)}});const f=JSON.stringify(s);q(rt,`RPC '${e}' ${o} sending request:`,s),c.send(n,"POST",f,r,15)})}T_(e,n,r){const s=wf(),i=[this.qo,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=this.createWebChannelTransport(),l={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;u!==void 0&&(l.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(l.useFetchStreams=!0),this.Go(l.initMessageHeaders,n,r),l.encodeInitMessageHeaders=!0;const c=i.join("");q(rt,`Creating RPC '${e}' stream ${s}: ${c}`,l);const f=o.createWebChannel(c,l);this.I_(f);let p=!1,g=!1;const w=new kP({Jo:x=>{g?q(rt,`Not sending because RPC '${e}' stream ${s} is closed:`,x):(p||(q(rt,`Opening RPC '${e}' stream ${s} transport.`),f.open(),p=!0),q(rt,`RPC '${e}' stream ${s} sending:`,x),f.send(x))},Ho:()=>f.close()});return wo(f,Ao.EventType.OPEN,()=>{g||(q(rt,`RPC '${e}' stream ${s} transport opened.`),w.i_())}),wo(f,Ao.EventType.CLOSE,()=>{g||(g=!0,q(rt,`RPC '${e}' stream ${s} transport closed`),w.o_(),this.E_(f))}),wo(f,Ao.EventType.ERROR,x=>{g||(g=!0,Lr(rt,`RPC '${e}' stream ${s} transport errored. Name:`,x.name,"Message:",x.message),w.o_(new B(M.UNAVAILABLE,"The operation could not be completed")))}),wo(f,Ao.EventType.MESSAGE,x=>{var b;if(!g){const P=x.data[0];le(!!P,16349);const S=P,v=(S==null?void 0:S.error)||((b=S[0])==null?void 0:b.error);if(v){q(rt,`RPC '${e}' stream ${s} received error:`,v);const C=v.status;let D=function(E){const _=Oe[E];if(_!==void 0)return wT(_)}(C),j=v.message;C==="NOT_FOUND"&&j.includes("database")&&j.includes("does not exist")&&j.includes(this.databaseId.database)&&Lr(`Database '${this.databaseId.database}' not found. Please check your project configuration.`),D===void 0&&(D=M.INTERNAL,j="Unknown error status: "+C+" with message "+v.message),g=!0,w.o_(new B(D,j)),f.close()}else q(rt,`RPC '${e}' stream ${s} received:`,P),w.__(P)}}),hi.u_(),setTimeout(()=>{w.s_()},0),w}terminate(){this.a_.forEach(e=>e.close()),this.a_=[]}I_(e){this.a_.push(e)}E_(e){this.a_=this.a_.filter(n=>n===e)}Go(e,n,r){super.Go(e,n,r),this.databaseInfo.apiKey&&(e["x-goog-api-key"]=this.databaseInfo.apiKey)}createWebChannelTransport(){return ME()}}/**
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
 */function CP(t){return new hi(t)}function Xh(){return typeof document<"u"?document:null}/**
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
 */function Ac(t){return new Pb(t,!0)}/**
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
 */hi.c_=!1;class VT{constructor(e,n,r=1e3,s=1.5,i=6e4){this.Ci=e,this.timerId=n,this.R_=r,this.A_=s,this.V_=i,this.d_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.d_=0}g_(){this.d_=this.V_}p_(e){this.cancel();const n=Math.floor(this.d_+this.y_()),r=Math.max(0,Date.now()-this.f_),s=Math.max(0,n-r);s>0&&q("ExponentialBackoff",`Backing off for ${s} ms (base delay: ${this.d_} ms, delay with jitter: ${n} ms, last attempt: ${r} ms ago)`),this.m_=this.Ci.enqueueAfterDelay(this.timerId,s,()=>(this.f_=Date.now(),e())),this.d_*=this.A_,this.d_<this.R_&&(this.d_=this.R_),this.d_>this.V_&&(this.d_=this.V_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.d_}}/**
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
 */const W_="PersistentStream";class LT{constructor(e,n,r,s,i,o,l,u){this.Ci=e,this.S_=r,this.b_=s,this.connection=i,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=l,this.listener=u,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new VT(e,n)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Ci.enqueueAfterDelay(this.S_,6e4,()=>this.k_()))}K_(e){this.q_(),this.stream.send(e)}async k_(){if(this.O_())return this.close(0)}q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,n){this.q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():n&&n.code===M.RESOURCE_EXHAUSTED?(Wn(n.toString()),Wn("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):n&&n.code===M.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.W_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.t_(n)}W_(){}auth(){this.state=1;const e=this.Q_(this.D_),n=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([r,s])=>{this.D_===n&&this.G_(r,s)},r=>{e(()=>{const s=new B(M.UNKNOWN,"Fetching auth token failed: "+r.message);return this.z_(s)})})}G_(e,n){const r=this.Q_(this.D_);this.stream=this.j_(e,n),this.stream.Zo(()=>{r(()=>this.listener.Zo())}),this.stream.Yo(()=>{r(()=>(this.state=2,this.v_=this.Ci.enqueueAfterDelay(this.b_,1e4,()=>(this.O_()&&(this.state=3),Promise.resolve())),this.listener.Yo()))}),this.stream.t_(s=>{r(()=>this.z_(s))}),this.stream.onMessage(s=>{r(()=>++this.F_==1?this.J_(s):this.onNext(s))})}N_(){this.state=5,this.M_.p_(async()=>{this.state=0,this.start()})}z_(e){return q(W_,`close with error: ${e}`),this.stream=null,this.close(4,e)}Q_(e){return n=>{this.Ci.enqueueAndForget(()=>this.D_===e?n():(q(W_,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class AP extends LT{constructor(e,n,r,s,i,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",n,r,s,o),this.serializer=i}j_(e,n){return this.connection.T_("Listen",e,n)}J_(e){return this.onNext(e)}onNext(e){this.M_.reset();const n=Ob(this.serializer,e),r=function(i){if(!("targetChange"in i))return X.min();const o=i.targetChange;return o.targetIds&&o.targetIds.length?X.min():o.readTime?wn(o.readTime):X.min()}(e);return this.listener.H_(n,r)}Z_(e){const n={};n.database=_f(this.serializer),n.addTarget=function(i,o){let l;const u=o.target;if(l=ff(u)?{documents:Mb(i,u)}:{query:jb(i,u).ft},l.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){l.resumeToken=xT(i,o.resumeToken);const c=mf(i,o.expectedCount);c!==null&&(l.expectedCount=c)}else if(o.snapshotVersion.compareTo(X.min())>0){l.readTime=Vu(i,o.snapshotVersion.toTimestamp());const c=mf(i,o.expectedCount);c!==null&&(l.expectedCount=c)}return l}(this.serializer,e);const r=Fb(this.serializer,e);r&&(n.labels=r),this.K_(n)}X_(e){const n={};n.database=_f(this.serializer),n.removeTarget=e,this.K_(n)}}class RP extends LT{constructor(e,n,r,s,i,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",n,r,s,o),this.serializer=i}get Y_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}W_(){this.Y_&&this.ea([])}j_(e,n){return this.connection.T_("Write",e,n)}J_(e){return le(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,le(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta()}onNext(e){le(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();const n=Lb(e.writeResults,e.commitTime),r=wn(e.commitTime);return this.listener.na(r,n)}ra(){const e={};e.database=_f(this.serializer),this.K_(e)}ea(e){const n={streamToken:this.lastStreamToken,writes:e.map(r=>Vb(this.serializer,r))};this.K_(n)}}/**
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
 */class bP{}class PP extends bP{constructor(e,n,r,s){super(),this.authCredentials=e,this.appCheckCredentials=n,this.connection=r,this.serializer=s,this.ia=!1}sa(){if(this.ia)throw new B(M.FAILED_PRECONDITION,"The client has already been terminated.")}Wo(e,n,r,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([i,o])=>this.connection.Wo(e,gf(n,r),s,i,o)).catch(i=>{throw i.name==="FirebaseError"?(i.code===M.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),i):new B(M.UNKNOWN,i.toString())})}jo(e,n,r,s,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,l])=>this.connection.jo(e,gf(n,r),s,o,l,i)).catch(o=>{throw o.name==="FirebaseError"?(o.code===M.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new B(M.UNKNOWN,o.toString())})}terminate(){this.ia=!0,this.connection.terminate()}}function NP(t,e,n,r){return new PP(t,e,n,r)}class DP{constructor(e,n){this.asyncQueue=e,this.onlineStateHandler=n,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve())))}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ca("Offline")))}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e)}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}la(e){const n=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.aa?(Wn(n),this.aa=!1):q("OnlineStateTracker",n)}Pa(){this._a!==null&&(this._a.cancel(),this._a=null)}}/**
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
 */const xn="RemoteStore";class OP{constructor(e,n,r,s,i){this.localStore=e,this.datastore=n,this.asyncQueue=r,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Map,this.Ra=new Map,this.Aa=new zr(1e3),this.Va=new zr(1001),this.da=new Set,this.ma=[],this.fa=i,this.fa.Mo(o=>{r.enqueueAndForget(async()=>{Ns(this)&&(q(xn,"Restarting streams for network reachability change."),await async function(u){const c=Y(u);c.da.add(4),await Ma(c),c.ga.set("Unknown"),c.da.delete(4),await Rc(c)}(this))})}),this.ga=new DP(r,s)}}async function Rc(t){if(Ns(t))for(const e of t.ma)await e(!0)}async function Ma(t){for(const e of t.ma)await e(!1)}function Ef(t,e){return t.Ea.get(e)||void 0}function MT(t,e){const n=Y(t),r=Ef(n,e.targetId);if(r!==void 0&&n.Ia.has(r))return;const s=function(l,u){const c=Ef(l,u);c!==void 0&&l.Ra.delete(c);const f=function(g,w){return w%2!=0?g.Va.next():g.Aa.next()}(l,u);return l.Ea.set(u,f),l.Ra.set(f,u),f}(n,e.targetId);q(xn,"remoteStoreListen mapping SDK target ID to remote",e.targetId,s);const i=new Dn(e.target,s,e.purpose,e.sequenceNumber,e.snapshotVersion,e.lastLimboFreeSnapshotVersion,e.resumeToken);n.Ia.set(s,i),Jp(n)?Yp(n):Bi(n).O_()&&Xp(n,i)}function Qp(t,e){const n=Y(t),r=Bi(n),s=Ef(n,e);q(xn,"remoteStoreUnlisten removing mapping of SDK target ID to remote",e,s),n.Ia.delete(s),n.Ea.delete(e),n.Ra.delete(s),r.O_()&&jT(n,s),n.Ia.size===0&&(r.O_()?r.L_():Ns(n)&&n.ga.set("Unknown"))}function Xp(t,e){if(t.pa.$e(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(X.min())>0){const n=t.Ra.get(e.targetId);if(n===void 0)return void q(xn,"SDK target ID not found for remote ID: "+e.targetId);const r=t.remoteSyncer.getRemoteKeysForTarget(n).size;e=e.withExpectedCount(r)}Bi(t).Z_(e)}function jT(t,e){t.pa.$e(e),Bi(t).X_(e)}function Yp(t){t.pa=new Cb({getRemoteKeysForTarget:e=>{const n=t.Ra.get(e);return n!==void 0?t.remoteSyncer.getRemoteKeysForTarget(n):te()},At:e=>t.Ia.get(e)||null,ht:()=>t.datastore.serializer.databaseId}),Bi(t).start(),t.ga.ua()}function Jp(t){return Ns(t)&&!Bi(t).x_()&&t.Ia.size>0}function Ns(t){return Y(t).da.size===0}function UT(t){t.pa=void 0}async function VP(t){t.ga.set("Online")}async function LP(t){t.Ia.forEach((e,n)=>{Xp(t,e)})}async function MP(t,e){UT(t),Jp(t)?(t.ga.ha(e),Yp(t)):t.ga.set("Unknown")}async function jP(t,e,n){if(t.ga.set("Online"),e instanceof TT&&e.state===2&&e.cause)try{await async function(s,i){const o=i.cause;for(const l of i.targetIds){if(s.Ia.has(l)){const u=s.Ra.get(l);u!==void 0&&(await s.remoteSyncer.rejectListen(u,o),s.Ea.delete(u),s.Ra.delete(l)),s.Ia.delete(l)}s.pa.removeTarget(l)}}(t,e)}catch(r){q(xn,"Failed to remove targets %s: %s ",e.targetIds.join(","),r),await Mu(t,r)}else if(e instanceof Xl?t.pa.Xe(e):e instanceof ET?t.pa.st(e):t.pa.tt(e),!n.isEqual(X.min()))try{const r=await OT(t.localStore);n.compareTo(r)>=0&&await function(i,o){const l=i.pa.Tt(o);l.targetChanges.forEach((c,f)=>{if(c.resumeToken.approximateByteSize()>0){const p=i.Ia.get(f);p&&i.Ia.set(f,p.withResumeToken(c.resumeToken,o))}}),l.targetMismatches.forEach((c,f)=>{const p=i.Ia.get(c);if(!p)return;i.Ia.set(c,p.withResumeToken(Ke.EMPTY_BYTE_STRING,p.snapshotVersion)),jT(i,c);const g=new Dn(p.target,c,f,p.sequenceNumber);Xp(i,g)});const u=function(f,p){const g=new Map;p.targetChanges.forEach((x,b)=>{const P=f.Ra.get(b);P!==void 0&&g.set(P,x)});let w=new Te(ee);return p.targetMismatches.forEach((x,b)=>{const P=f.Ra.get(x);P!==void 0&&(w=w.insert(P,b))}),new Va(p.snapshotVersion,g,w,p.documentUpdates,p.resolvedLimboDocuments)}(i,l);return i.remoteSyncer.applyRemoteEvent(u)}(t,n)}catch(r){q(xn,"Failed to raise snapshot:",r),await Mu(t,r)}}async function Mu(t,e,n){if(!Fi(e))throw e;t.da.add(1),await Ma(t),t.ga.set("Offline"),n||(n=()=>OT(t.localStore)),t.asyncQueue.enqueueRetryable(async()=>{q(xn,"Retrying IndexedDB access"),await n(),t.da.delete(1),await Rc(t)})}function FT(t,e){return e().catch(n=>Mu(t,n,e))}async function bc(t){const e=Y(t),n=Br(e);let r=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:Vp;for(;UP(e);)try{const s=await vP(e.localStore,r);if(s===null){e.Ta.length===0&&n.L_();break}r=s.batchId,FP(e,s)}catch(s){await Mu(e,s)}zT(e)&&BT(e)}function UP(t){return Ns(t)&&t.Ta.length<10}function FP(t,e){t.Ta.push(e);const n=Br(t);n.O_()&&n.Y_&&n.ea(e.mutations)}function zT(t){return Ns(t)&&!Br(t).x_()&&t.Ta.length>0}function BT(t){Br(t).start()}async function zP(t){Br(t).ra()}async function BP(t){const e=Br(t);for(const n of t.Ta)e.ea(n.mutations)}async function $P(t,e,n){const r=t.Ta.shift(),s=Bp.from(r,e,n);await FT(t,()=>t.remoteSyncer.applySuccessfulWrite(s)),await bc(t)}async function qP(t,e){e&&Br(t).Y_&&await async function(r,s){if(function(o){return Ib(o)&&o!==M.ABORTED}(s.code)){const i=r.Ta.shift();Br(r).B_(),await FT(r,()=>r.remoteSyncer.rejectFailedWrite(i.batchId,s)),await bc(r)}}(t,e),zT(t)&&BT(t)}async function G_(t,e){const n=Y(t);n.asyncQueue.verifyOperationInProgress(),q(xn,"RemoteStore received new credentials");const r=Ns(n);n.da.add(3),await Ma(n),r&&n.ga.set("Unknown"),await n.remoteSyncer.handleCredentialChange(e),n.da.delete(3),await Rc(n)}async function HP(t,e){const n=Y(t);e?(n.da.delete(2),await Rc(n)):e||(n.da.add(2),await Ma(n),n.ga.set("Unknown"))}function Bi(t){return t.ya||(t.ya=function(n,r,s){const i=Y(n);return i.sa(),new AP(r,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(t.datastore,t.asyncQueue,{Zo:VP.bind(null,t),Yo:LP.bind(null,t),t_:MP.bind(null,t),H_:jP.bind(null,t)}),t.ma.push(async e=>{e?(t.ya.B_(),Jp(t)?Yp(t):t.ga.set("Unknown")):(await t.ya.stop(),UT(t))})),t.ya}function Br(t){return t.wa||(t.wa=function(n,r,s){const i=Y(n);return i.sa(),new RP(r,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(t.datastore,t.asyncQueue,{Zo:()=>Promise.resolve(),Yo:zP.bind(null,t),t_:qP.bind(null,t),ta:BP.bind(null,t),na:$P.bind(null,t)}),t.ma.push(async e=>{e?(t.wa.B_(),await bc(t)):(await t.wa.stop(),t.Ta.length>0&&(q(xn,`Stopping write stream with ${t.Ta.length} pending writes`),t.Ta=[]))})),t.wa}/**
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
 */class Zp{constructor(e,n,r,s,i){this.asyncQueue=e,this.timerId=n,this.targetTimeMs=r,this.op=s,this.removalCallback=i,this.deferred=new Mn,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,n,r,s,i){const o=Date.now()+r,l=new Zp(e,n,o,s,i);return l.start(r),l}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new B(M.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function em(t,e){if(Wn("AsyncQueue",`${e}: ${t}`),Fi(t))return new B(M.UNAVAILABLE,`${e}: ${t}`);throw t}/**
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
 */class di{static emptySet(e){return new di(e.comparator)}constructor(e){this.comparator=e?(n,r)=>e(n,r)||W.comparator(n.key,r.key):(n,r)=>W.comparator(n.key,r.key),this.keyedMap=Ro(),this.sortedSet=new Te(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const n=this.keyedMap.get(e);return n?this.sortedSet.indexOf(n):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((n,r)=>(e(n),!1))}add(e){const n=this.delete(e.key);return n.copy(n.keyedMap.insert(e.key,e),n.sortedSet.insert(e,null))}delete(e){const n=this.get(e);return n?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(n)):this}isEqual(e){if(!(e instanceof di)||this.size!==e.size)return!1;const n=this.sortedSet.getIterator(),r=e.sortedSet.getIterator();for(;n.hasNext();){const s=n.getNext().key,i=r.getNext().key;if(!s.isEqual(i))return!1}return!0}toString(){const e=[];return this.forEach(n=>{e.push(n.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,n){const r=new di;return r.comparator=this.comparator,r.keyedMap=e,r.sortedSet=n,r}}/**
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
 */class K_{constructor(){this.Sa=new Te(W.comparator)}track(e){const n=e.doc.key,r=this.Sa.get(n);r?e.type!==0&&r.type===3?this.Sa=this.Sa.insert(n,e):e.type===3&&r.type!==1?this.Sa=this.Sa.insert(n,{type:r.type,doc:e.doc}):e.type===2&&r.type===2?this.Sa=this.Sa.insert(n,{type:2,doc:e.doc}):e.type===2&&r.type===0?this.Sa=this.Sa.insert(n,{type:0,doc:e.doc}):e.type===1&&r.type===0?this.Sa=this.Sa.remove(n):e.type===1&&r.type===2?this.Sa=this.Sa.insert(n,{type:1,doc:r.doc}):e.type===0&&r.type===1?this.Sa=this.Sa.insert(n,{type:2,doc:e.doc}):K(63341,{Vt:e,ba:r}):this.Sa=this.Sa.insert(n,e)}Da(){const e=[];return this.Sa.inorderTraversal((n,r)=>{e.push(r)}),e}}class Ri{constructor(e,n,r,s,i,o,l,u,c){this.query=e,this.docs=n,this.oldDocs=r,this.docChanges=s,this.mutatedKeys=i,this.fromCache=o,this.syncStateChanged=l,this.excludesMetadataChanges=u,this.hasCachedResults=c}static fromInitialDocuments(e,n,r,s,i){const o=[];return n.forEach(l=>{o.push({type:0,doc:l})}),new Ri(e,n,di.emptySet(n),o,r,s,!0,!1,i)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&xc(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const n=this.docChanges,r=e.docChanges;if(n.length!==r.length)return!1;for(let s=0;s<n.length;s++)if(n[s].type!==r[s].type||!n[s].doc.isEqual(r[s].doc))return!1;return!0}}/**
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
 */class WP{constructor(){this.Ca=void 0,this.va=[]}Fa(){return this.va.some(e=>e.Ma())}}class GP{constructor(){this.queries=Q_(),this.onlineState="Unknown",this.xa=new Set}terminate(){(function(n,r){const s=Y(n),i=s.queries;s.queries=Q_(),i.forEach((o,l)=>{for(const u of l.va)u.onError(r)})})(this,new B(M.ABORTED,"Firestore shutting down"))}}function Q_(){return new Ps(t=>aT(t),xc)}async function tm(t,e){const n=Y(t);let r=3;const s=e.query;let i=n.queries.get(s);i?!i.Fa()&&e.Ma()&&(r=2):(i=new WP,r=e.Ma()?0:1);try{switch(r){case 0:i.Ca=await n.onListen(s,!0);break;case 1:i.Ca=await n.onListen(s,!1);break;case 2:await n.onFirstRemoteStoreListen(s)}}catch(o){const l=em(o,`Initialization of query '${$s(e.query)}' failed`);return void e.onError(l)}n.queries.set(s,i),i.va.push(e),e.Oa(n.onlineState),i.Ca&&e.Na(i.Ca)&&rm(n)}async function nm(t,e){const n=Y(t),r=e.query;let s=3;const i=n.queries.get(r);if(i){const o=i.va.indexOf(e);o>=0&&(i.va.splice(o,1),i.va.length===0?s=e.Ma()?0:1:!i.Fa()&&e.Ma()&&(s=2))}switch(s){case 0:return n.queries.delete(r),n.onUnlisten(r,!0);case 1:return n.queries.delete(r),n.onUnlisten(r,!1);case 2:return n.onLastRemoteStoreUnlisten(r);default:return}}function KP(t,e){const n=Y(t);let r=!1;for(const s of e){const i=s.query,o=n.queries.get(i);if(o){for(const l of o.va)l.Na(s)&&(r=!0);o.Ca=s}}r&&rm(n)}function QP(t,e,n){const r=Y(t),s=r.queries.get(e);if(s)for(const i of s.va)i.onError(n);r.queries.delete(e)}function rm(t){t.xa.forEach(e=>{e.next()})}var Tf,X_;(X_=Tf||(Tf={})).Ba="default",X_.Cache="cache";class sm{constructor(e,n,r){this.query=e,this.La=n,this.ka=!1,this.Ka=null,this.onlineState="Unknown",this.options=r||{}}Na(e){if(!this.options.includeMetadataChanges){const r=[];for(const s of e.docChanges)s.type!==3&&r.push(s);e=new Ri(e.query,e.docs,e.oldDocs,r,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let n=!1;return this.ka?this.qa(e)&&(this.La.next(e),n=!0):this.Ua(e,this.onlineState)&&(this.$a(e),n=!0),this.Ka=e,n}onError(e){this.La.error(e)}Oa(e){this.onlineState=e;let n=!1;return this.Ka&&!this.ka&&this.Ua(this.Ka,e)&&(this.$a(this.Ka),n=!0),n}Ua(e,n){if(!e.fromCache||!this.Ma())return!0;const r=n!=="Offline";return(!this.options.Wa||!r)&&(!e.docs.isEmpty()||e.hasCachedResults||n==="Offline")}qa(e){if(e.docChanges.length>0)return!0;const n=this.Ka&&this.Ka.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!n)&&this.options.includeMetadataChanges===!0}$a(e){e=Ri.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.ka=!0,this.La.next(e)}Ma(){return this.options.source!==Tf.Cache}}/**
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
 */class $T{constructor(e){this.key=e}}class qT{constructor(e){this.key=e}}class XP{constructor(e,n){this.query=e,this.tu=n,this.nu=null,this.hasCachedResults=!1,this.current=!1,this.ru=te(),this.mutatedKeys=te(),this.iu=lT(e),this.su=new di(this.iu)}get ou(){return this.tu}_u(e,n){const r=n?n.au:new K_,s=n?n.su:this.su;let i=n?n.mutatedKeys:this.mutatedKeys,o=s,l=!1;const u=this.query.limitType==="F"&&s.size===this.query.limit?s.last():null,c=this.query.limitType==="L"&&s.size===this.query.limit?s.first():null;if(e.inorderTraversal((f,p)=>{const g=s.get(f),w=Ic(this.query,p)?p:null,x=!!g&&this.mutatedKeys.has(g.key),b=!!w&&(w.hasLocalMutations||this.mutatedKeys.has(w.key)&&w.hasCommittedMutations);let P=!1;g&&w?g.data.isEqual(w.data)?x!==b&&(r.track({type:3,doc:w}),P=!0):this.uu(g,w)||(r.track({type:2,doc:w}),P=!0,(u&&this.iu(w,u)>0||c&&this.iu(w,c)<0)&&(l=!0)):!g&&w?(r.track({type:0,doc:w}),P=!0):g&&!w&&(r.track({type:1,doc:g}),P=!0,(u||c)&&(l=!0)),P&&(w?(o=o.add(w),i=b?i.add(f):i.delete(f)):(o=o.delete(f),i=i.delete(f)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const f=this.query.limitType==="F"?o.last():o.first();o=o.delete(f.key),i=i.delete(f.key),r.track({type:1,doc:f})}return{su:o,au:r,bs:l,mutatedKeys:i}}uu(e,n){return e.hasLocalMutations&&n.hasCommittedMutations&&!n.hasLocalMutations}applyChanges(e,n,r,s){const i=this.su;this.su=e.su,this.mutatedKeys=e.mutatedKeys;const o=e.au.Da();o.sort((f,p)=>function(w,x){const b=P=>{switch(P){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return K(20277,{Vt:P})}};return b(w)-b(x)}(f.type,p.type)||this.iu(f.doc,p.doc)),this.cu(r),s=s??!1;const l=n&&!s?this.lu():[],u=this.ru.size===0&&this.current&&!s?1:0,c=u!==this.nu;return this.nu=u,o.length!==0||c?{snapshot:new Ri(this.query,e.su,i,o,e.mutatedKeys,u===0,c,!1,!!r&&r.resumeToken.approximateByteSize()>0),hu:l}:{hu:l}}Oa(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({su:this.su,au:new K_,mutatedKeys:this.mutatedKeys,bs:!1},!1)):{hu:[]}}Pu(e){return!this.tu.has(e)&&!!this.su.has(e)&&!this.su.get(e).hasLocalMutations}cu(e){e&&(e.addedDocuments.forEach(n=>this.tu=this.tu.add(n)),e.modifiedDocuments.forEach(n=>{}),e.removedDocuments.forEach(n=>this.tu=this.tu.delete(n)),this.current=e.current)}lu(){if(!this.current)return[];const e=this.ru;this.ru=te(),this.su.forEach(r=>{this.Pu(r.key)&&(this.ru=this.ru.add(r.key))});const n=[];return e.forEach(r=>{this.ru.has(r)||n.push(new qT(r))}),this.ru.forEach(r=>{e.has(r)||n.push(new $T(r))}),n}Tu(e){this.tu=e.ks,this.ru=te();const n=this._u(e.documents);return this.applyChanges(n,!0)}Iu(){return Ri.fromInitialDocuments(this.query,this.su,this.mutatedKeys,this.nu===0,this.hasCachedResults)}}const im="SyncEngine";class YP{constructor(e,n,r){this.query=e,this.targetId=n,this.view=r}}class JP{constructor(e){this.key=e,this.Eu=!1}}class ZP{constructor(e,n,r,s,i,o){this.localStore=e,this.remoteStore=n,this.eventManager=r,this.sharedClientState=s,this.currentUser=i,this.maxConcurrentLimboResolutions=o,this.Ru={},this.Au=new Ps(l=>aT(l),xc),this.Vu=new Map,this.du=new Set,this.mu=new Te(W.comparator),this.fu=new Map,this.gu=new Hp,this.pu={},this.yu=new Map,this.wu=zr.ar(),this.onlineState="Unknown",this.Su=void 0}get isPrimaryClient(){return this.Su===!0}}async function eN(t,e,n=!0){const r=XT(t);let s;const i=r.Au.get(e);return i?(r.sharedClientState.addLocalQueryTarget(i.targetId),s=i.view.Iu()):s=await HT(r,e,n,!0),s}async function tN(t,e){const n=XT(t);await HT(n,e,!0,!1)}async function HT(t,e,n,r){const s=await wP(t.localStore,vn(e)),i=s.targetId,o=t.sharedClientState.addLocalQueryTarget(i,n);let l;return r&&(l=await nN(t,e,i,o==="current",s.resumeToken)),t.isPrimaryClient&&n&&MT(t.remoteStore,s),l}async function nN(t,e,n,r,s){t.bu=(p,g,w)=>async function(b,P,S,v){let C=P.view._u(S);C.bs&&(C=await B_(b.localStore,P.query,!1).then(({documents:E})=>P.view._u(E,C)));const D=v&&v.targetChanges.get(P.targetId),j=v&&v.targetMismatches.get(P.targetId)!=null,L=P.view.applyChanges(C,b.isPrimaryClient,D,j);return J_(b,P.targetId,L.hu),L.snapshot}(t,p,g,w);const i=await B_(t.localStore,e,!0),o=new XP(e,i.ks),l=o._u(i.documents),u=La.createSynthesizedTargetChangeForCurrentChange(n,r&&t.onlineState!=="Offline",s),c=o.applyChanges(l,t.isPrimaryClient,u);J_(t,n,c.hu);const f=new YP(e,n,o);return t.Au.set(e,f),t.Vu.has(n)?t.Vu.get(n).push(e):t.Vu.set(n,[e]),c.snapshot}async function rN(t,e,n){const r=Y(t),s=r.Au.get(e),i=r.Vu.get(s.targetId);if(i.length>1)return r.Vu.set(s.targetId,i.filter(o=>!xc(o,e))),void r.Au.delete(e);r.isPrimaryClient?(r.sharedClientState.removeLocalQueryTarget(s.targetId),r.sharedClientState.isActiveQueryTarget(s.targetId)||await vf(r.localStore,s.targetId,!1).then(()=>{r.sharedClientState.clearQueryState(s.targetId),n&&Qp(r.remoteStore,s.targetId),xf(r,s.targetId)}).catch(Ui)):(xf(r,s.targetId),await vf(r.localStore,s.targetId,!0))}async function sN(t,e){const n=Y(t),r=n.Au.get(e),s=n.Vu.get(r.targetId);n.isPrimaryClient&&s.length===1&&(n.sharedClientState.removeLocalQueryTarget(r.targetId),Qp(n.remoteStore,r.targetId))}async function iN(t,e,n){const r=dN(t);try{const s=await function(o,l){const u=Y(o),c=fe.now(),f=l.reduce((w,x)=>w.add(x.key),te());let p,g;return u.persistence.runTransaction("Locally write mutations","readwrite",w=>{let x=Gn(),b=te();return u.xs.getEntries(w,f).next(P=>{x=P,x.forEach((S,v)=>{v.isValidDocument()||(b=b.add(S))})}).next(()=>u.localDocuments.getOverlayedDocuments(w,x)).next(P=>{p=P;const S=[];for(const v of l){const C=vb(v,p.get(v.key).overlayedDocument);C!=null&&S.push(new Xr(v.key,C,ZE(C.value.mapValue),mt.exists(!0)))}return u.mutationQueue.addMutationBatch(w,c,S,l)}).next(P=>{g=P;const S=P.applyToLocalDocumentSet(p,b);return u.documentOverlayCache.saveOverlays(w,P.batchId,S)})}).then(()=>({batchId:g.batchId,changes:cT(p)}))}(r.localStore,e);r.sharedClientState.addPendingMutation(s.batchId),function(o,l,u){let c=o.pu[o.currentUser.toKey()];c||(c=new Te(ee)),c=c.insert(l,u),o.pu[o.currentUser.toKey()]=c}(r,s.batchId,n),await ja(r,s.changes),await bc(r.remoteStore)}catch(s){const i=em(s,"Failed to persist write");n.reject(i)}}async function WT(t,e){const n=Y(t);try{const r=await yP(n.localStore,e);e.targetChanges.forEach((s,i)=>{const o=n.fu.get(i);o&&(le(s.addedDocuments.size+s.modifiedDocuments.size+s.removedDocuments.size<=1,22616),s.addedDocuments.size>0?o.Eu=!0:s.modifiedDocuments.size>0?le(o.Eu,14607):s.removedDocuments.size>0&&(le(o.Eu,42227),o.Eu=!1))}),await ja(n,r,e)}catch(r){await Ui(r)}}function Y_(t,e,n){const r=Y(t);if(r.isPrimaryClient&&n===0||!r.isPrimaryClient&&n===1){const s=[];r.Au.forEach((i,o)=>{const l=o.view.Oa(e);l.snapshot&&s.push(l.snapshot)}),function(o,l){const u=Y(o);u.onlineState=l;let c=!1;u.queries.forEach((f,p)=>{for(const g of p.va)g.Oa(l)&&(c=!0)}),c&&rm(u)}(r.eventManager,e),s.length&&r.Ru.H_(s),r.onlineState=e,r.isPrimaryClient&&r.sharedClientState.setOnlineState(e)}}async function oN(t,e,n){const r=Y(t);r.sharedClientState.updateQueryState(e,"rejected",n);const s=r.fu.get(e),i=s&&s.key;if(i){let o=new Te(W.comparator);o=o.insert(i,ot.newNoDocument(i,X.min()));const l=te().add(i),u=new Va(X.min(),new Map,new Te(ee),o,l);await WT(r,u),r.mu=r.mu.remove(i),r.fu.delete(e),om(r)}else await vf(r.localStore,e,!1).then(()=>xf(r,e,n)).catch(Ui)}async function aN(t,e){const n=Y(t),r=e.batch.batchId;try{const s=await gP(n.localStore,e);KT(n,r,null),GT(n,r),n.sharedClientState.updateMutationState(r,"acknowledged"),await ja(n,s)}catch(s){await Ui(s)}}async function lN(t,e,n){const r=Y(t);try{const s=await function(o,l){const u=Y(o);return u.persistence.runTransaction("Reject batch","readwrite-primary",c=>{let f;return u.mutationQueue.lookupMutationBatch(c,l).next(p=>(le(p!==null,37113),f=p.keys(),u.mutationQueue.removeMutationBatch(c,p))).next(()=>u.mutationQueue.performConsistencyCheck(c)).next(()=>u.documentOverlayCache.removeOverlaysForBatchId(c,f,l)).next(()=>u.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(c,f)).next(()=>u.localDocuments.getDocuments(c,f))})}(r.localStore,e);KT(r,e,n),GT(r,e),r.sharedClientState.updateMutationState(e,"rejected",n),await ja(r,s)}catch(s){await Ui(s)}}function GT(t,e){(t.yu.get(e)||[]).forEach(n=>{n.resolve()}),t.yu.delete(e)}function KT(t,e,n){const r=Y(t);let s=r.pu[r.currentUser.toKey()];if(s){const i=s.get(e);i&&(n?i.reject(n):i.resolve(),s=s.remove(e)),r.pu[r.currentUser.toKey()]=s}}function xf(t,e,n=null){t.sharedClientState.removeLocalQueryTarget(e);for(const r of t.Vu.get(e))t.Au.delete(r),n&&t.Ru.Du(r,n);t.Vu.delete(e),t.isPrimaryClient&&t.gu.Gr(e).forEach(r=>{t.gu.containsKey(r)||QT(t,r)})}function QT(t,e){t.du.delete(e.path.canonicalString());const n=t.mu.get(e);n!==null&&(Qp(t.remoteStore,n),t.mu=t.mu.remove(e),t.fu.delete(n),om(t))}function J_(t,e,n){for(const r of n)r instanceof $T?(t.gu.addReference(r.key,e),uN(t,r)):r instanceof qT?(q(im,"Document no longer in limbo: "+r.key),t.gu.removeReference(r.key,e),t.gu.containsKey(r.key)||QT(t,r.key)):K(19791,{Cu:r})}function uN(t,e){const n=e.key,r=n.path.canonicalString();t.mu.get(n)||t.du.has(r)||(q(im,"New document in limbo: "+n),t.du.add(r),om(t))}function om(t){for(;t.du.size>0&&t.mu.size<t.maxConcurrentLimboResolutions;){const e=t.du.values().next().value;t.du.delete(e);const n=new W(de.fromString(e)),r=t.wu.next();t.fu.set(r,new JP(n)),t.mu=t.mu.insert(n,r),MT(t.remoteStore,new Dn(vn(Tc(n.path)),r,"TargetPurposeLimboResolution",vc.ce))}}async function ja(t,e,n){const r=Y(t),s=[],i=[],o=[];r.Au.isEmpty()||(r.Au.forEach((l,u)=>{o.push(r.bu(u,e,n).then(c=>{var f;if((c||n)&&r.isPrimaryClient){const p=c?!c.fromCache:(f=n==null?void 0:n.targetChanges.get(u.targetId))==null?void 0:f.current;r.sharedClientState.updateQueryState(u.targetId,p?"current":"not-current")}if(c){s.push(c);const p=Gp.Es(u.targetId,c);i.push(p)}}))}),await Promise.all(o),r.Ru.H_(s),await async function(u,c){const f=Y(u);try{await f.persistence.runTransaction("notifyLocalViewChanges","readwrite",p=>U.forEach(c,g=>U.forEach(g.Ts,w=>f.persistence.referenceDelegate.addReference(p,g.targetId,w)).next(()=>U.forEach(g.Is,w=>f.persistence.referenceDelegate.removeReference(p,g.targetId,w)))))}catch(p){if(!Fi(p))throw p;q(Kp,"Failed to update sequence numbers: "+p)}for(const p of c){const g=p.targetId;if(!p.fromCache){const w=f.vs.get(g),x=w.snapshotVersion,b=w.withLastLimboFreeSnapshotVersion(x);f.vs=f.vs.insert(g,b)}}}(r.localStore,i))}async function cN(t,e){const n=Y(t);if(!n.currentUser.isEqual(e)){q(im,"User change. New user:",e.toKey());const r=await DT(n.localStore,e);n.currentUser=e,function(i,o){i.yu.forEach(l=>{l.forEach(u=>{u.reject(new B(M.CANCELLED,o))})}),i.yu.clear()}(n,"'waitForPendingWrites' promise is rejected due to a user change."),n.sharedClientState.handleUserChange(e,r.removedBatchIds,r.addedBatchIds),await ja(n,r.Ns)}}function hN(t,e){const n=Y(t),r=n.fu.get(e);if(r&&r.Eu)return te().add(r.key);{let s=te();const i=n.Vu.get(e);if(!i)return s;for(const o of i){const l=n.Au.get(o);s=s.unionWith(l.view.ou)}return s}}function XT(t){const e=Y(t);return e.remoteStore.remoteSyncer.applyRemoteEvent=WT.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=hN.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=oN.bind(null,e),e.Ru.H_=KP.bind(null,e.eventManager),e.Ru.Du=QP.bind(null,e.eventManager),e}function dN(t){const e=Y(t);return e.remoteStore.remoteSyncer.applySuccessfulWrite=aN.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=lN.bind(null,e),e}class ju{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=Ac(e.databaseInfo.databaseId),this.sharedClientState=this.Mu(e),this.persistence=this.xu(e),await this.persistence.start(),this.localStore=this.Ou(e),this.gcScheduler=this.Nu(e,this.localStore),this.indexBackfillerScheduler=this.Bu(e,this.localStore)}Nu(e,n){return null}Bu(e,n){return null}Ou(e){return mP(this.persistence,new dP,e.initialUser,this.serializer)}xu(e){return new NT(Wp.Vi,this.serializer)}Mu(e){return new TP}async terminate(){var e,n;(e=this.gcScheduler)==null||e.stop(),(n=this.indexBackfillerScheduler)==null||n.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}ju.provider={build:()=>new ju};class fN extends ju{constructor(e){super(),this.cacheSizeBytes=e}Nu(e,n){le(this.persistence.referenceDelegate instanceof Lu,46915);const r=this.persistence.referenceDelegate.garbageCollector;return new Yb(r,e.asyncQueue,n)}xu(e){const n=this.cacheSizeBytes!==void 0?_t.withCacheSize(this.cacheSizeBytes):_t.DEFAULT;return new NT(r=>Lu.Vi(r,n),this.serializer)}}class If{async initialize(e,n){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(n),this.remoteStore=this.createRemoteStore(n),this.eventManager=this.createEventManager(n),this.syncEngine=this.createSyncEngine(n,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=r=>Y_(this.syncEngine,r,1),this.remoteStore.remoteSyncer.handleCredentialChange=cN.bind(null,this.syncEngine),await HP(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new GP}()}createDatastore(e){const n=Ac(e.databaseInfo.databaseId),r=CP(e.databaseInfo);return NP(e.authCredentials,e.appCheckCredentials,r,n)}createRemoteStore(e){return function(r,s,i,o,l){return new OP(r,s,i,o,l)}(this.localStore,this.datastore,e.asyncQueue,n=>Y_(this.syncEngine,n,0),function(){return H_.v()?new H_:new xP}())}createSyncEngine(e,n){return function(s,i,o,l,u,c,f){const p=new ZP(s,i,o,l,u,c);return f&&(p.Su=!0),p}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,n)}async terminate(){var e,n;await async function(s){const i=Y(s);q(xn,"RemoteStore shutting down."),i.da.add(5),await Ma(i),i.fa.shutdown(),i.ga.set("Unknown")}(this.remoteStore),(e=this.datastore)==null||e.terminate(),(n=this.eventManager)==null||n.terminate()}}If.provider={build:()=>new If};/**
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
 */class am{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.ku(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.ku(this.observer.error,e):Wn("Uncaught Error in snapshot listener:",e.toString()))}Ku(){this.muted=!0}ku(e,n){setTimeout(()=>{this.muted||e(n)},0)}}/**
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
 */const $r="FirestoreClient";class pN{constructor(e,n,r,s,i){this.authCredentials=e,this.appCheckCredentials=n,this.asyncQueue=r,this._databaseInfo=s,this.user=st.UNAUTHENTICATED,this.clientId=yc.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=i,this.authCredentials.start(r,async o=>{q($r,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(r,o=>(q($r,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this._databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new Mn;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(n){const r=em(n,"Failed to shutdown persistence");e.reject(r)}}),e.promise}}async function Yh(t,e){t.asyncQueue.verifyOperationInProgress(),q($r,"Initializing OfflineComponentProvider");const n=t.configuration;await e.initialize(n);let r=n.initialUser;t.setCredentialChangeListener(async s=>{r.isEqual(s)||(await DT(e.localStore,s),r=s)}),e.persistence.setDatabaseDeletedListener(()=>t.terminate()),t._offlineComponents=e}async function Z_(t,e){t.asyncQueue.verifyOperationInProgress();const n=await mN(t);q($r,"Initializing OnlineComponentProvider"),await e.initialize(n,t.configuration),t.setCredentialChangeListener(r=>G_(e.remoteStore,r)),t.setAppCheckTokenChangeListener((r,s)=>G_(e.remoteStore,s)),t._onlineComponents=e}async function mN(t){if(!t._offlineComponents)if(t._uninitializedComponentsProvider){q($r,"Using user provided OfflineComponentProvider");try{await Yh(t,t._uninitializedComponentsProvider._offline)}catch(e){const n=e;if(!function(s){return s.name==="FirebaseError"?s.code===M.FAILED_PRECONDITION||s.code===M.UNIMPLEMENTED:!(typeof DOMException<"u"&&s instanceof DOMException)||s.code===22||s.code===20||s.code===11}(n))throw n;Lr("Error using user provided cache. Falling back to memory cache: "+n),await Yh(t,new ju)}}else q($r,"Using default OfflineComponentProvider"),await Yh(t,new fN(void 0));return t._offlineComponents}async function YT(t){return t._onlineComponents||(t._uninitializedComponentsProvider?(q($r,"Using user provided OnlineComponentProvider"),await Z_(t,t._uninitializedComponentsProvider._online)):(q($r,"Using default OnlineComponentProvider"),await Z_(t,new If))),t._onlineComponents}function gN(t){return YT(t).then(e=>e.syncEngine)}async function Uu(t){const e=await YT(t),n=e.eventManager;return n.onListen=eN.bind(null,e.syncEngine),n.onUnlisten=rN.bind(null,e.syncEngine),n.onFirstRemoteStoreListen=tN.bind(null,e.syncEngine),n.onLastRemoteStoreUnlisten=sN.bind(null,e.syncEngine),n}function yN(t,e,n,r){const s=new am(r),i=new sm(e,s,n);return t.asyncQueue.enqueueAndForget(async()=>tm(await Uu(t),i)),()=>{s.Ku(),t.asyncQueue.enqueueAndForget(async()=>nm(await Uu(t),i))}}function _N(t,e,n={}){const r=new Mn;return t.asyncQueue.enqueueAndForget(async()=>function(i,o,l,u,c){const f=new am({next:g=>{f.Ku(),o.enqueueAndForget(()=>nm(i,p));const w=g.docs.has(l);!w&&g.fromCache?c.reject(new B(M.UNAVAILABLE,"Failed to get document because the client is offline.")):w&&g.fromCache&&u&&u.source==="server"?c.reject(new B(M.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):c.resolve(g)},error:g=>c.reject(g)}),p=new sm(Tc(l.path),f,{includeMetadataChanges:!0,Wa:!0});return tm(i,p)}(await Uu(t),t.asyncQueue,e,n,r)),r.promise}function vN(t,e,n={}){const r=new Mn;return t.asyncQueue.enqueueAndForget(async()=>function(i,o,l,u,c){const f=new am({next:g=>{f.Ku(),o.enqueueAndForget(()=>nm(i,p)),g.fromCache&&u.source==="server"?c.reject(new B(M.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):c.resolve(g)},error:g=>c.reject(g)}),p=new sm(l,f,{includeMetadataChanges:!0,Wa:!0});return tm(i,p)}(await Uu(t),t.asyncQueue,e,n,r)),r.promise}function wN(t,e){const n=new Mn;return t.asyncQueue.enqueueAndForget(async()=>iN(await gN(t),e,n)),n.promise}/**
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
 */function JT(t){const e={};return t.timeoutSeconds!==void 0&&(e.timeoutSeconds=t.timeoutSeconds),e}/**
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
 */const EN="ComponentProvider",ev=new Map;function TN(t,e,n,r,s){return new BR(t,e,n,s.host,s.ssl,s.experimentalForceLongPolling,s.experimentalAutoDetectLongPolling,JT(s.experimentalLongPollingOptions),s.useFetchStreams,s.isUsingEmulator,r)}/**
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
 */const ZT="firestore.googleapis.com",tv=!0;class nv{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new B(M.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=ZT,this.ssl=tv}else this.host=e.host,this.ssl=e.ssl??tv;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=PT;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<Qb)throw new B(M.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}BE("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=JT(e.experimentalLongPollingOptions??{}),function(r){if(r.timeoutSeconds!==void 0){if(isNaN(r.timeoutSeconds))throw new B(M.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (must not be NaN)`);if(r.timeoutSeconds<5)throw new B(M.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (minimum allowed value is 5)`);if(r.timeoutSeconds>30)throw new B(M.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(r,s){return r.timeoutSeconds===s.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class Pc{constructor(e,n,r,s){this._authCredentials=e,this._appCheckCredentials=n,this._databaseId=r,this._app=s,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new nv({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new B(M.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new B(M.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new nv(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(r){if(!r)return new FE;switch(r.type){case"firstParty":return new kR(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new B(M.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(n){const r=ev.get(n);r&&(q(EN,"Removing Datastore"),ev.delete(n),r.terminate())}(this),Promise.resolve()}}function ex(t,e,n,r={}){var c;t=at(t,Pc);const s=Rs(e),i=t._getSettings(),o={...i,emulatorOptions:t._getEmulatorOptions()},l=`${e}:${n}`;s&&bp(`https://${l}`),i.host!==ZT&&i.host!==l&&Lr("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const u={...i,host:l,ssl:s,emulatorOptions:r};if(!Or(u,o)&&(t._setSettings(u),r.mockUserToken)){let f,p;if(typeof r.mockUserToken=="string")f=r.mockUserToken,p=st.MOCK_USER;else{f=kE(r.mockUserToken,(c=t._app)==null?void 0:c.options.projectId);const g=r.mockUserToken.sub||r.mockUserToken.user_id;if(!g)throw new B(M.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");p=new st(g)}t._authCredentials=new xR(new UE(f,p))}}/**
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
 */class kn{constructor(e,n,r){this.converter=n,this._query=r,this.type="query",this.firestore=e}withConverter(e){return new kn(this.firestore,e,this._query)}}class Ie{constructor(e,n,r){this.converter=n,this._key=r,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new jn(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new Ie(this.firestore,e,this._key)}toJSON(){return{type:Ie._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,n,r){if(Da(n,Ie._jsonSchema))return new Ie(e,r||null,new W(de.fromString(n.referencePath)))}}Ie._jsonSchemaVersion="firestore/documentReference/1.0",Ie._jsonSchema={type:Me("string",Ie._jsonSchemaVersion),referencePath:Me("string")};class jn extends kn{constructor(e,n,r){super(e,n,Tc(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new Ie(this.firestore,null,new W(e))}withConverter(e){return new jn(this.firestore,e,this._path)}}function Sf(t,e,...n){if(t=ce(t),zE("collection","path",e),t instanceof Pc){const r=de.fromString(e,...n);return m_(r),new jn(t,null,r)}{if(!(t instanceof Ie||t instanceof jn))throw new B(M.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=t._path.child(de.fromString(e,...n));return m_(r),new jn(t.firestore,null,r)}}function We(t,e,...n){if(t=ce(t),arguments.length===1&&(e=yc.newId()),zE("doc","path",e),t instanceof Pc){const r=de.fromString(e,...n);return p_(r),new Ie(t,null,new W(r))}{if(!(t instanceof Ie||t instanceof jn))throw new B(M.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=t._path.child(de.fromString(e,...n));return p_(r),new Ie(t.firestore,t instanceof jn?t.converter:null,new W(r))}}/**
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
 */const rv="AsyncQueue";class sv{constructor(e=Promise.resolve()){this.rc=[],this.sc=!1,this.oc=[],this._c=null,this.ac=!1,this.uc=!1,this.cc=[],this.M_=new VT(this,"async_queue_retry"),this.lc=()=>{const r=Xh();r&&q(rv,"Visibility state changed to "+r.visibilityState),this.M_.w_()},this.hc=e;const n=Xh();n&&typeof n.addEventListener=="function"&&n.addEventListener("visibilitychange",this.lc)}get isShuttingDown(){return this.sc}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.Pc(),this.Tc(e)}enterRestrictedMode(e){if(!this.sc){this.sc=!0,this.uc=e||!1;const n=Xh();n&&typeof n.removeEventListener=="function"&&n.removeEventListener("visibilitychange",this.lc)}}enqueue(e){if(this.Pc(),this.sc)return new Promise(()=>{});const n=new Mn;return this.Tc(()=>this.sc&&this.uc?Promise.resolve():(e().then(n.resolve,n.reject),n.promise)).then(()=>n.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.rc.push(e),this.Ic()))}async Ic(){if(this.rc.length!==0){try{await this.rc[0](),this.rc.shift(),this.M_.reset()}catch(e){if(!Fi(e))throw e;q(rv,"Operation failed with retryable error: "+e)}this.rc.length>0&&this.M_.p_(()=>this.Ic())}}Tc(e){const n=this.hc.then(()=>(this.ac=!0,e().catch(r=>{throw this._c=r,this.ac=!1,Wn("INTERNAL UNHANDLED ERROR: ",iv(r)),r}).then(r=>(this.ac=!1,r))));return this.hc=n,n}enqueueAfterDelay(e,n,r){this.Pc(),this.cc.indexOf(e)>-1&&(n=0);const s=Zp.createAndSchedule(this,e,n,r,i=>this.Ec(i));return this.oc.push(s),s}Pc(){this._c&&K(47125,{Rc:iv(this._c)})}verifyOperationInProgress(){}async Ac(){let e;do e=this.hc,await e;while(e!==this.hc)}Vc(e){for(const n of this.oc)if(n.timerId===e)return!0;return!1}dc(e){return this.Ac().then(()=>{this.oc.sort((n,r)=>n.targetTimeMs-r.targetTimeMs);for(const n of this.oc)if(n.skipDelay(),e!=="all"&&n.timerId===e)break;return this.Ac()})}mc(e){this.cc.push(e)}Ec(e){const n=this.oc.indexOf(e);this.oc.splice(n,1)}}function iv(t){let e=t.message||"";return t.stack&&(e=t.stack.includes(t.message)?t.stack:t.message+`
`+t.stack),e}class an extends Pc{constructor(e,n,r,s){super(e,n,r,s),this.type="firestore",this._queue=new sv,this._persistenceKey=(s==null?void 0:s.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new sv(e),this._firestoreClient=void 0,await e}}}function tx(t,e){const n=typeof t=="object"?t:Dp(),r=typeof t=="string"?t:Pu,s=gc(n,"firestore").getImmediate({identifier:r});if(!s._initialized){const i=xE("firestore");i&&ex(s,...i)}return s}function $i(t){if(t._terminated)throw new B(M.FAILED_PRECONDITION,"The client has already been terminated.");return t._firestoreClient||xN(t),t._firestoreClient}function xN(t){var r,s,i,o;const e=t._freezeSettings(),n=TN(t._databaseId,((r=t._app)==null?void 0:r.options.appId)||"",t._persistenceKey,(s=t._app)==null?void 0:s.options.apiKey,e);t._componentsProvider||(i=e.localCache)!=null&&i._offlineComponentProvider&&((o=e.localCache)!=null&&o._onlineComponentProvider)&&(t._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),t._firestoreClient=new pN(t._authCredentials,t._appCheckCredentials,t._queue,n,t._componentsProvider&&function(u){const c=u==null?void 0:u._online.build();return{_offline:u==null?void 0:u._offline.build(c),_online:c}}(t._componentsProvider))}/**
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
 */class Rt{constructor(e){this._byteString=e}static fromBase64String(e){try{return new Rt(Ke.fromBase64String(e))}catch(n){throw new B(M.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+n)}}static fromUint8Array(e){return new Rt(Ke.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:Rt._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(Da(e,Rt._jsonSchema))return Rt.fromBase64String(e.bytes)}}Rt._jsonSchemaVersion="firestore/bytes/1.0",Rt._jsonSchema={type:Me("string",Rt._jsonSchemaVersion),bytes:Me("string")};/**
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
 */class Ua{constructor(...e){for(let n=0;n<e.length;++n)if(e[n].length===0)throw new B(M.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new He(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}/**
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
 */class Ds{constructor(e){this._methodName=e}}/**
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
 */class nn{constructor(e,n){if(!isFinite(e)||e<-90||e>90)throw new B(M.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(n)||n<-180||n>180)throw new B(M.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+n);this._lat=e,this._long=n}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return ee(this._lat,e._lat)||ee(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:nn._jsonSchemaVersion}}static fromJSON(e){if(Da(e,nn._jsonSchema))return new nn(e.latitude,e.longitude)}}nn._jsonSchemaVersion="firestore/geoPoint/1.0",nn._jsonSchema={type:Me("string",nn._jsonSchemaVersion),latitude:Me("number"),longitude:Me("number")};/**
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
 */class $t{constructor(e){this._values=(e||[]).map(n=>n)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(r,s){if(r.length!==s.length)return!1;for(let i=0;i<r.length;++i)if(r[i]!==s[i])return!1;return!0}(this._values,e._values)}toJSON(){return{type:$t._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(Da(e,$t._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(n=>typeof n=="number"))return new $t(e.vectorValues);throw new B(M.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}$t._jsonSchemaVersion="firestore/vectorValue/1.0",$t._jsonSchema={type:Me("string",$t._jsonSchemaVersion),vectorValues:Me("object")};/**
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
 */const IN=/^__.*__$/;class SN{constructor(e,n,r){this.data=e,this.fieldMask=n,this.fieldTransforms=r}toMutation(e,n){return this.fieldMask!==null?new Xr(e,this.data,this.fieldMask,n,this.fieldTransforms):new Oa(e,this.data,n,this.fieldTransforms)}}class nx{constructor(e,n,r){this.data=e,this.fieldMask=n,this.fieldTransforms=r}toMutation(e,n){return new Xr(e,this.data,this.fieldMask,n,this.fieldTransforms)}}function rx(t){switch(t){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw K(40011,{dataSource:t})}}class Nc{constructor(e,n,r,s,i,o){this.settings=e,this.databaseId=n,this.serializer=r,this.ignoreUndefinedProperties=s,i===void 0&&this.fc(),this.fieldTransforms=i||[],this.fieldMask=o||[]}get path(){return this.settings.path}get dataSource(){return this.settings.dataSource}i(e){return new Nc({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}yc(e){var s;const n=(s=this.path)==null?void 0:s.child(e),r=this.i({path:n,arrayElement:!1});return r.wc(e),r}Sc(e){var s;const n=(s=this.path)==null?void 0:s.child(e),r=this.i({path:n,arrayElement:!1});return r.fc(),r}bc(e){return this.i({path:void 0,arrayElement:!0})}Dc(e){return Fu(e,this.settings.methodName,this.settings.hasConverter||!1,this.path,this.settings.targetDoc)}contains(e){return this.fieldMask.find(n=>e.isPrefixOf(n))!==void 0||this.fieldTransforms.find(n=>e.isPrefixOf(n.field))!==void 0}fc(){if(this.path)for(let e=0;e<this.path.length;e++)this.wc(this.path.get(e))}wc(e){if(e.length===0)throw this.Dc("Document fields must not be empty");if(rx(this.dataSource)&&IN.test(e))throw this.Dc('Document fields cannot begin and end with "__"')}}class kN{constructor(e,n,r){this.databaseId=e,this.ignoreUndefinedProperties=n,this.serializer=r||Ac(e)}V(e,n,r,s=!1){return new Nc({dataSource:e,methodName:n,targetDoc:r,path:He.emptyPath(),arrayElement:!1,hasConverter:s},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function Fa(t){const e=t._freezeSettings(),n=Ac(t._databaseId);return new kN(t._databaseId,!!e.ignoreUndefinedProperties,n)}function lm(t,e,n,r,s,i={}){const o=t.V(i.merge||i.mergeFields?2:0,e,n,s);dm("Data must be an object, but it was:",o,r);const l=ox(r,o);let u,c;if(i.merge)u=new Pt(o.fieldMask),c=o.fieldTransforms;else if(i.mergeFields){const f=[];for(const p of i.mergeFields){const g=Is(e,p,n);if(!o.contains(g))throw new B(M.INVALID_ARGUMENT,`Field '${g}' is specified in your field mask but missing from your input data.`);ux(f,g)||f.push(g)}u=new Pt(f),c=o.fieldTransforms.filter(p=>u.covers(p.field))}else u=null,c=o.fieldTransforms;return new SN(new Et(l),u,c)}class Dc extends Ds{_toFieldTransform(e){if(e.dataSource!==2)throw e.dataSource===1?e.Dc(`${this._methodName}() can only appear at the top level of your update data`):e.Dc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof Dc}}function CN(t,e,n){return new Nc({dataSource:3,targetDoc:e.settings.targetDoc,methodName:t._methodName,arrayElement:n},e.databaseId,e.serializer,e.ignoreUndefinedProperties)}class um extends Ds{_toFieldTransform(e){return new zp(e.path,new _a)}isEqual(e){return e instanceof um}}class cm extends Ds{constructor(e,n){super(e),this.vc=n}_toFieldTransform(e){const n=CN(this,e,!0),r=this.vc.map(i=>qi(i,n)),s=new Ai(r);return new zp(e.path,s)}isEqual(e){return e instanceof cm&&Or(this.vc,e.vc)}}class hm extends Ds{constructor(e,n){super(e),this.Fc=n}_toFieldTransform(e){const n=new wa(e.serializer,fT(e.serializer,this.Fc));return new zp(e.path,n)}isEqual(e){return e instanceof hm&&this.Fc===e.Fc}}function sx(t,e,n,r){const s=t.V(1,e,n);dm("Data must be an object, but it was:",s,r);const i=[],o=Et.empty();Qr(r,(u,c)=>{const f=lx(e,u,n);c=ce(c);const p=s.Sc(f);if(c instanceof Dc)i.push(f);else{const g=qi(c,p);g!=null&&(i.push(f),o.set(f,g))}});const l=new Pt(i);return new nx(o,l,s.fieldTransforms)}function ix(t,e,n,r,s,i){const o=t.V(1,e,n),l=[Is(e,r,n)],u=[s];if(i.length%2!=0)throw new B(M.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let g=0;g<i.length;g+=2)l.push(Is(e,i[g])),u.push(i[g+1]);const c=[],f=Et.empty();for(let g=l.length-1;g>=0;--g)if(!ux(c,l[g])){const w=l[g];let x=u[g];x=ce(x);const b=o.Sc(w);if(x instanceof Dc)c.push(w);else{const P=qi(x,b);P!=null&&(c.push(w),f.set(w,P))}}const p=new Pt(c);return new nx(f,p,o.fieldTransforms)}function AN(t,e,n,r=!1){return qi(n,t.V(r?4:3,e))}function qi(t,e){if(ax(t=ce(t)))return dm("Unsupported field value:",e,t),ox(t,e);if(t instanceof Ds)return function(r,s){if(!rx(s.dataSource))throw s.Dc(`${r._methodName}() can only be used with update() and set()`);if(!s.path)throw s.Dc(`${r._methodName}() is not currently supported inside arrays`);const i=r._toFieldTransform(s);i&&s.fieldTransforms.push(i)}(t,e),null;if(t===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),t instanceof Array){if(e.settings.arrayElement&&e.dataSource!==4)throw e.Dc("Nested arrays are not supported");return function(r,s){const i=[];let o=0;for(const l of r){let u=qi(l,s.bc(o));u==null&&(u={nullValue:"NULL_VALUE"}),i.push(u),o++}return{arrayValue:{values:i}}}(t,e)}return function(r,s){if((r=ce(r))===null)return{nullValue:"NULL_VALUE"};if(typeof r=="number")return fT(s.serializer,r);if(typeof r=="boolean")return{booleanValue:r};if(typeof r=="string")return{stringValue:r};if(r instanceof Date){const i=fe.fromDate(r);return{timestampValue:Vu(s.serializer,i)}}if(r instanceof fe){const i=new fe(r.seconds,1e3*Math.floor(r.nanoseconds/1e3));return{timestampValue:Vu(s.serializer,i)}}if(r instanceof nn)return{geoPointValue:{latitude:r.latitude,longitude:r.longitude}};if(r instanceof Rt)return{bytesValue:xT(s.serializer,r._byteString)};if(r instanceof Ie){const i=s.databaseId,o=r.firestore._databaseId;if(!o.isEqual(i))throw s.Dc(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${i.projectId}/${i.database}`);return{referenceValue:qp(r.firestore._databaseId||s.databaseId,r._key.path)}}if(r instanceof $t)return function(o,l){const u=o instanceof $t?o.toArray():o;return{mapValue:{fields:{[YE]:{stringValue:JE},[Nu]:{arrayValue:{values:u.map(f=>{if(typeof f!="number")throw l.Dc("VectorValues must only contain numeric values.");return Fp(l.serializer,f)})}}}}}}(r,s);if(bT(r))return r._toProto(s.serializer);throw s.Dc(`Unsupported field value: ${_c(r)}`)}(t,e)}function ox(t,e){const n={};return HE(t)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Qr(t,(r,s)=>{const i=qi(s,e.yc(r));i!=null&&(n[r]=i)}),{mapValue:{fields:n}}}function ax(t){return!(typeof t!="object"||t===null||t instanceof Array||t instanceof Date||t instanceof fe||t instanceof nn||t instanceof Rt||t instanceof Ie||t instanceof Ds||t instanceof $t||bT(t))}function dm(t,e,n){if(!ax(n)||!$E(n)){const r=_c(n);throw r==="an object"?e.Dc(t+" a custom object"):e.Dc(t+" "+r)}}function Is(t,e,n){if((e=ce(e))instanceof Ua)return e._internalPath;if(typeof e=="string")return lx(t,e);throw Fu("Field path arguments must be of type string or ",t,!1,void 0,n)}const RN=new RegExp("[~\\*/\\[\\]]");function lx(t,e,n){if(e.search(RN)>=0)throw Fu(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,t,!1,void 0,n);try{return new Ua(...e.split("."))._internalPath}catch{throw Fu(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,t,!1,void 0,n)}}function Fu(t,e,n,r,s){const i=r&&!r.isEmpty(),o=s!==void 0;let l=`Function ${e}() called with invalid data`;n&&(l+=" (via `toFirestore()`)"),l+=". ";let u="";return(i||o)&&(u+=" (found",i&&(u+=` in field ${r}`),o&&(u+=` in document ${s}`),u+=")"),new B(M.INVALID_ARGUMENT,l+t+u)}function ux(t,e){return t.some(n=>n.isEqual(e))}/**
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
 */class cx{convertValue(e,n="none"){switch(Fr(e)){case 0:return null;case 1:return e.booleanValue;case 2:return Ne(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,n);case 5:return e.stringValue;case 6:return this.convertBytes(Ur(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,n);case 11:return this.convertObject(e.mapValue,n);case 10:return this.convertVectorValue(e.mapValue);default:throw K(62114,{value:e})}}convertObject(e,n){return this.convertObjectMap(e.fields,n)}convertObjectMap(e,n="none"){const r={};return Qr(e,(s,i)=>{r[s]=this.convertValue(i,n)}),r}convertVectorValue(e){var r,s,i;const n=(i=(s=(r=e.fields)==null?void 0:r[Nu].arrayValue)==null?void 0:s.values)==null?void 0:i.map(o=>Ne(o.doubleValue));return new $t(n)}convertGeoPoint(e){return new nn(Ne(e.latitude),Ne(e.longitude))}convertArray(e,n){return(e.values||[]).map(r=>this.convertValue(r,n))}convertServerTimestamp(e,n){switch(n){case"previous":const r=Ec(e);return r==null?null:this.convertValue(r,n);case"estimate":return this.convertTimestamp(ma(e));default:return null}}convertTimestamp(e){const n=jr(e);return new fe(n.seconds,n.nanos)}convertDocumentKey(e,n){const r=de.fromString(e);le(RT(r),9688,{name:e});const s=new Si(r.get(1),r.get(3)),i=new W(r.popFirst(5));return s.isEqual(n)||Wn(`Document ${i} contains a document reference within a different database (${s.projectId}/${s.database}) which is not supported. It will be treated as a reference in the current database (${n.projectId}/${n.database}) instead.`),i}}/**
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
 */class fm extends cx{constructor(e){super(),this.firestore=e}convertBytes(e){return new Rt(e)}convertReference(e){const n=this.convertDocumentKey(e,this.firestore._databaseId);return new Ie(this.firestore,null,n)}}function qr(){return new um("serverTimestamp")}function Yl(...t){return new cm("arrayUnion",t)}function Jl(t){return new hm("increment",t)}const ov="@firebase/firestore",av="4.14.1";/**
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
 */function lv(t){return function(n,r){if(typeof n!="object"||n===null)return!1;const s=n;for(const i of r)if(i in s&&typeof s[i]=="function")return!0;return!1}(t,["next","error","complete"])}/**
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
 */class hx{constructor(e,n,r,s,i){this._firestore=e,this._userDataWriter=n,this._key=r,this._document=s,this._converter=i}get id(){return this._key.path.lastSegment()}get ref(){return new Ie(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new bN(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}_fieldsProto(){var e;return((e=this._document)==null?void 0:e.data.clone().value.mapValue.fields)??void 0}get(e){if(this._document){const n=this._document.data.field(Is("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n)}}}class bN extends hx{data(){return super.data()}}/**
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
 */function dx(t){if(t.limitType==="L"&&t.explicitOrderBy.length===0)throw new B(M.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class pm{}class Oc extends pm{}function mm(t,e,...n){let r=[];e instanceof pm&&r.push(e),r=r.concat(n),function(i){const o=i.filter(u=>u instanceof Vc).length,l=i.filter(u=>u instanceof za).length;if(o>1||o>0&&l>0)throw new B(M.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(r);for(const s of r)t=s._apply(t);return t}class za extends Oc{constructor(e,n,r){super(),this._field=e,this._op=n,this._value=r,this.type="where"}static _create(e,n,r){return new za(e,n,r)}_apply(e){const n=this._parse(e);return px(e._query,n),new kn(e.firestore,e.converter,pf(e._query,n))}_parse(e){const n=Fa(e.firestore);return function(i,o,l,u,c,f,p){let g;if(c.isKeyField()){if(f==="array-contains"||f==="array-contains-any")throw new B(M.INVALID_ARGUMENT,`Invalid Query. You can't perform '${f}' queries on documentId().`);if(f==="in"||f==="not-in"){cv(p,f);const x=[];for(const b of p)x.push(uv(u,i,b));g={arrayValue:{values:x}}}else g=uv(u,i,p)}else f!=="in"&&f!=="not-in"&&f!=="array-contains-any"||cv(p,f),g=AN(l,o,p,f==="in"||f==="not-in");return Le.create(c,f,g)}(e._query,"where",n,e.firestore._databaseId,this._field,this._op,this._value)}}function gm(t,e,n){const r=e,s=Is("where",t);return za._create(s,r,n)}class Vc extends pm{constructor(e,n){super(),this.type=e,this._queryConstraints=n}static _create(e,n){return new Vc(e,n)}_parse(e){const n=this._queryConstraints.map(r=>r._parse(e)).filter(r=>r.getFilters().length>0);return n.length===1?n[0]:on.create(n,this._getOperator())}_apply(e){const n=this._parse(e);return n.getFilters().length===0?e:(function(s,i){let o=s;const l=i.getFlattenedFilters();for(const u of l)px(o,u),o=pf(o,u)}(e._query,n),new kn(e.firestore,e.converter,pf(e._query,n)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class Lc extends Oc{constructor(e,n){super(),this._field=e,this._direction=n,this.type="orderBy"}static _create(e,n){return new Lc(e,n)}_apply(e){const n=function(s,i,o){if(s.startAt!==null)throw new B(M.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(s.endAt!==null)throw new B(M.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new ya(i,o)}(e._query,this._field,this._direction);return new kn(e.firestore,e.converter,ob(e._query,n))}}function Ba(t,e="asc"){const n=e,r=Is("orderBy",t);return Lc._create(r,n)}class Mc extends Oc{constructor(e,n,r){super(),this.type=e,this._limit=n,this._limitType=r}static _create(e,n,r){return new Mc(e,n,r)}_apply(e){return new kn(e.firestore,e.converter,Ou(e._query,this._limit,this._limitType))}}function fx(t){return Mc._create("limit",t,"F")}function uv(t,e,n){if(typeof(n=ce(n))=="string"){if(n==="")throw new B(M.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!oT(e)&&n.indexOf("/")!==-1)throw new B(M.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${n}' contains a '/' character.`);const r=e.path.child(de.fromString(n));if(!W.isDocumentKey(r))throw new B(M.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${r}' is not because it has an odd number of segments (${r.length}).`);return x_(t,new W(r))}if(n instanceof Ie)return x_(t,n._key);throw new B(M.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${_c(n)}.`)}function cv(t,e){if(!Array.isArray(t)||t.length===0)throw new B(M.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function px(t,e){const n=function(s,i){for(const o of s)for(const l of o.getFlattenedFilters())if(i.indexOf(l.op)>=0)return l.op;return null}(t.filters,function(s){switch(s){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(n!==null)throw n===e.op?new B(M.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new B(M.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${n.toString()}' filters.`)}function ym(t,e,n){let r;return r=t?n&&(n.merge||n.mergeFields)?t.toFirestore(e,n):t.toFirestore(e):e,r}class si{constructor(e,n){this.hasPendingWrites=e,this.fromCache=n}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class Rr extends hx{constructor(e,n,r,s,i,o){super(e,n,r,s,o),this._firestore=e,this._firestoreImpl=e,this.metadata=i}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const n=new qo(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(n,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,n={}){if(this._document){const r=this._document.data.field(Is("DocumentSnapshot.get",e));if(r!==null)return this._userDataWriter.convertValue(r,n.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new B(M.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,n={};return n.type=Rr._jsonSchemaVersion,n.bundle="",n.bundleSource="DocumentSnapshot",n.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?n:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),n.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),n)}}Rr._jsonSchemaVersion="firestore/documentSnapshot/1.0",Rr._jsonSchema={type:Me("string",Rr._jsonSchemaVersion),bundleSource:Me("string","DocumentSnapshot"),bundleName:Me("string"),bundle:Me("string")};class qo extends Rr{data(e={}){return super.data(e)}}class br{constructor(e,n,r,s){this._firestore=e,this._userDataWriter=n,this._snapshot=s,this.metadata=new si(s.hasPendingWrites,s.fromCache),this.query=r}get docs(){const e=[];return this.forEach(n=>e.push(n)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,n){this._snapshot.docs.forEach(r=>{e.call(n,new qo(this._firestore,this._userDataWriter,r.key,r,new si(this._snapshot.mutatedKeys.has(r.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const n=!!e.includeMetadataChanges;if(n&&this._snapshot.excludesMetadataChanges)throw new B(M.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===n||(this._cachedChanges=function(s,i){if(s._snapshot.oldDocs.isEmpty()){let o=0;return s._snapshot.docChanges.map(l=>{const u=new qo(s._firestore,s._userDataWriter,l.doc.key,l.doc,new si(s._snapshot.mutatedKeys.has(l.doc.key),s._snapshot.fromCache),s.query.converter);return l.doc,{type:"added",doc:u,oldIndex:-1,newIndex:o++}})}{let o=s._snapshot.oldDocs;return s._snapshot.docChanges.filter(l=>i||l.type!==3).map(l=>{const u=new qo(s._firestore,s._userDataWriter,l.doc.key,l.doc,new si(s._snapshot.mutatedKeys.has(l.doc.key),s._snapshot.fromCache),s.query.converter);let c=-1,f=-1;return l.type!==0&&(c=o.indexOf(l.doc.key),o=o.delete(l.doc.key)),l.type!==1&&(o=o.add(l.doc),f=o.indexOf(l.doc.key)),{type:PN(l.type),doc:u,oldIndex:c,newIndex:f}})}}(this,n),this._cachedChangesIncludeMetadataChanges=n),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new B(M.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=br._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=yc.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const n=[],r=[],s=[];return this.docs.forEach(i=>{i._document!==null&&(n.push(i._document),r.push(this._userDataWriter.convertObjectMap(i._document.data.value.mapValue.fields,"previous")),s.push(i.ref.path))}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function PN(t){switch(t){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return K(61501,{type:t})}}/**
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
 */br._jsonSchemaVersion="firestore/querySnapshot/1.0",br._jsonSchema={type:Me("string",br._jsonSchemaVersion),bundleSource:Me("string","QuerySnapshot"),bundleName:Me("string"),bundle:Me("string")};/**
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
 */class mx{constructor(e,n){this._firestore=e,this._commitHandler=n,this._mutations=[],this._committed=!1,this._dataReader=Fa(e)}set(e,n,r){this._verifyNotCommitted();const s=Jh(e,this._firestore),i=ym(s.converter,n,r),o=lm(this._dataReader,"WriteBatch.set",s._key,i,s.converter!==null,r);return this._mutations.push(o.toMutation(s._key,mt.none())),this}update(e,n,r,...s){this._verifyNotCommitted();const i=Jh(e,this._firestore);let o;return o=typeof(n=ce(n))=="string"||n instanceof Ua?ix(this._dataReader,"WriteBatch.update",i._key,n,r,s):sx(this._dataReader,"WriteBatch.update",i._key,n),this._mutations.push(o.toMutation(i._key,mt.exists(!0))),this}delete(e){this._verifyNotCommitted();const n=Jh(e,this._firestore);return this._mutations=this._mutations.concat(new Cc(n._key,mt.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new B(M.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function Jh(t,e){if((t=ce(t)).firestore!==e)throw new B(M.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return t}/**
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
 */function kf(t){t=at(t,Ie);const e=at(t.firestore,an),n=$i(e);return _N(n,t._key).then(r=>yx(e,t,r))}function zu(t){t=at(t,kn);const e=at(t.firestore,an),n=$i(e),r=new fm(e);return dx(t._query),vN(n,t._query).then(s=>new br(e,r,t,s))}function gx(t,e,n){t=at(t,Ie);const r=at(t.firestore,an),s=ym(t.converter,e,n),i=Fa(r);return Hi(r,[lm(i,"setDoc",t._key,s,t.converter!==null,n).toMutation(t._key,mt.none())])}function Un(t,e,n,...r){t=at(t,Ie);const s=at(t.firestore,an),i=Fa(s);let o;return o=typeof(e=ce(e))=="string"||e instanceof Ua?ix(i,"updateDoc",t._key,e,n,r):sx(i,"updateDoc",t._key,e),Hi(s,[o.toMutation(t._key,mt.exists(!0))])}function $a(t){return Hi(at(t.firestore,an),[new Cc(t._key,mt.none())])}function qa(t,e){const n=at(t.firestore,an),r=We(t),s=ym(t.converter,e),i=Fa(t.firestore);return Hi(n,[lm(i,"addDoc",r._key,s,t.converter!==null,{}).toMutation(r._key,mt.exists(!1))]).then(()=>r)}function jc(t,...e){var c,f,p;t=ce(t);let n={includeMetadataChanges:!1,source:"default"},r=0;typeof e[r]!="object"||lv(e[r])||(n=e[r++]);const s={includeMetadataChanges:n.includeMetadataChanges,source:n.source};if(lv(e[r])){const g=e[r];e[r]=(c=g.next)==null?void 0:c.bind(g),e[r+1]=(f=g.error)==null?void 0:f.bind(g),e[r+2]=(p=g.complete)==null?void 0:p.bind(g)}let i,o,l;if(t instanceof Ie)o=at(t.firestore,an),l=Tc(t._key.path),i={next:g=>{e[r]&&e[r](yx(o,t,g))},error:e[r+1],complete:e[r+2]};else{const g=at(t,kn);o=at(g.firestore,an),l=g._query;const w=new fm(o);i={next:x=>{e[r]&&e[r](new br(o,w,g,x))},error:e[r+1],complete:e[r+2]},dx(t._query)}const u=$i(o);return yN(u,l,s,i)}function Hi(t,e){const n=$i(t);return wN(n,e)}function yx(t,e,n){const r=n.docs.get(e._key),s=new fm(t);return new Rr(t,s,e._key,r,new si(n.hasPendingWrites,n.fromCache),e.converter)}function _x(t){return t=at(t,an),$i(t),new mx(t,e=>Hi(t,e))}(function(e,n=!0){TR(bs),Ts(new Vr("firestore",(r,{instanceIdentifier:s,options:i})=>{const o=r.getProvider("app").getImmediate(),l=new an(new IR(r.getProvider("auth-internal")),new CR(o,r.getProvider("app-check-internal")),$R(o,s),o);return i={useFetchStreams:n,...i},l._setSettings(i),l},"PUBLIC").setMultipleInstances(!0)),_n(ov,av,e),_n(ov,av,"esm2020")})();const vx=Object.freeze(Object.defineProperty({__proto__:null,AbstractUserDataWriter:cx,Bytes:Rt,CollectionReference:jn,DocumentReference:Ie,DocumentSnapshot:Rr,FieldPath:Ua,FieldValue:Ds,Firestore:an,FirestoreError:B,GeoPoint:nn,Query:kn,QueryCompositeFilterConstraint:Vc,QueryConstraint:Oc,QueryDocumentSnapshot:qo,QueryFieldFilterConstraint:za,QueryLimitConstraint:Mc,QueryOrderByConstraint:Lc,QuerySnapshot:br,SnapshotMetadata:si,Timestamp:fe,VectorValue:$t,WriteBatch:mx,_AutoId:yc,_ByteString:Ke,_DatabaseId:Si,_DocumentKey:W,_EmptyAuthCredentialsProvider:FE,_FieldPath:He,_cast:at,_logWarn:Lr,_validateIsNotUsedTogether:BE,addDoc:qa,arrayUnion:Yl,collection:Sf,connectFirestoreEmulator:ex,deleteDoc:$a,doc:We,ensureFirestoreConfigured:$i,executeWrite:Hi,getDoc:kf,getDocs:zu,getFirestore:tx,increment:Jl,limit:fx,onSnapshot:jc,orderBy:Ba,query:mm,serverTimestamp:qr,setDoc:gx,updateDoc:Un,where:gm,writeBatch:_x},Symbol.toStringTag,{value:"Module"}));var NN="firebase",DN="12.13.0";/**
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
 */_n(NN,DN,"app");function wx(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const ON=wx,Ex=new Pa("auth","Firebase",wx());/**
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
 */const Bu=new Pp("@firebase/auth");function VN(t,...e){Bu.logLevel<=re.WARN&&Bu.warn(`Auth (${bs}): ${t}`,...e)}function Zl(t,...e){Bu.logLevel<=re.ERROR&&Bu.error(`Auth (${bs}): ${t}`,...e)}/**
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
 */function Wt(t,...e){throw vm(t,...e)}function rn(t,...e){return vm(t,...e)}function _m(t,e,n){const r={...ON(),[e]:n};return new Pa("auth","Firebase",r).create(e,{appName:t.name})}function Pr(t){return _m(t,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function LN(t,e,n){const r=n;if(!(e instanceof r))throw r.name!==e.constructor.name&&Wt(t,"argument-error"),_m(t,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function vm(t,...e){if(typeof t!="string"){const n=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=t.name),t._errorFactory.create(n,...r)}return Ex.create(t,...e)}function G(t,e,...n){if(!t)throw vm(e,...n)}function On(t){const e="INTERNAL ASSERTION FAILED: "+t;throw Zl(e),new Error(e)}function Kn(t,e){t||On(e)}/**
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
 */function Cf(){var t;return typeof self<"u"&&((t=self.location)==null?void 0:t.href)||""}function MN(){return hv()==="http:"||hv()==="https:"}function hv(){var t;return typeof self<"u"&&((t=self.location)==null?void 0:t.protocol)||null}/**
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
 */function jN(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(MN()||tA()||"connection"in navigator)?navigator.onLine:!0}function UN(){if(typeof navigator>"u")return null;const t=navigator;return t.languages&&t.languages[0]||t.language||null}/**
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
 */class Ha{constructor(e,n){this.shortDelay=e,this.longDelay=n,Kn(n>e,"Short delay should be less than long delay!"),this.isMobile=JC()||nA()}get(){return jN()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
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
 */function wm(t,e){Kn(t.emulator,"Emulator should always be set here");const{url:n}=t.emulator;return e?`${n}${e.startsWith("/")?e.slice(1):e}`:n}/**
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
 */class Tx{static initialize(e,n,r){this.fetchImpl=e,n&&(this.headersImpl=n),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;On("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;On("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;On("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
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
 */const FN={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
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
 */const zN=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],BN=new Ha(3e4,6e4);function Os(t,e){return t.tenantId&&!e.tenantId?{...e,tenantId:t.tenantId}:e}async function Yr(t,e,n,r,s={}){return xx(t,s,async()=>{let i={},o={};r&&(e==="GET"?o=r:i={body:JSON.stringify(r)});const l=Na({key:t.config.apiKey,...o}).slice(1),u=await t._getAdditionalHeaders();u["Content-Type"]="application/json",t.languageCode&&(u["X-Firebase-Locale"]=t.languageCode);const c={method:e,headers:u,...i};return eA()||(c.referrerPolicy="no-referrer"),t.emulatorConfig&&Rs(t.emulatorConfig.host)&&(c.credentials="include"),Tx.fetch()(await Ix(t,t.config.apiHost,n,l),c)})}async function xx(t,e,n){t._canInitEmulator=!1;const r={...FN,...e};try{const s=new qN(t),i=await Promise.race([n(),s.promise]);s.clearNetworkTimeout();const o=await i.json();if("needConfirmation"in o)throw Rl(t,"account-exists-with-different-credential",o);if(i.ok&&!("errorMessage"in o))return o;{const l=i.ok?o.errorMessage:o.error.message,[u,c]=l.split(" : ");if(u==="FEDERATED_USER_ID_ALREADY_LINKED")throw Rl(t,"credential-already-in-use",o);if(u==="EMAIL_EXISTS")throw Rl(t,"email-already-in-use",o);if(u==="USER_DISABLED")throw Rl(t,"user-disabled",o);const f=r[u]||u.toLowerCase().replace(/[_\s]+/g,"-");if(c)throw _m(t,f,c);Wt(t,f)}}catch(s){if(s instanceof Sn)throw s;Wt(t,"network-request-failed",{message:String(s)})}}async function Uc(t,e,n,r,s={}){const i=await Yr(t,e,n,r,s);return"mfaPendingCredential"in i&&Wt(t,"multi-factor-auth-required",{_serverResponse:i}),i}async function Ix(t,e,n,r){const s=`${e}${n}?${r}`,i=t,o=i.config.emulator?wm(t.config,s):`${t.config.apiScheme}://${s}`;return zN.includes(n)&&(await i._persistenceManagerAvailable,i._getPersistenceType()==="COOKIE")?i._getPersistence()._getFinalTarget(o).toString():o}function $N(t){switch(t){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class qN{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((n,r)=>{this.timer=setTimeout(()=>r(rn(this.auth,"network-request-failed")),BN.get())})}}function Rl(t,e,n){const r={appName:t.name};n.email&&(r.email=n.email),n.phoneNumber&&(r.phoneNumber=n.phoneNumber);const s=rn(t,e,r);return s.customData._tokenResponse=n,s}function dv(t){return t!==void 0&&t.enterprise!==void 0}class HN{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const n of this.recaptchaEnforcementState)if(n.provider&&n.provider===e)return $N(n.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}async function WN(t,e){return Yr(t,"GET","/v2/recaptchaConfig",Os(t,e))}/**
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
 */async function GN(t,e){return Yr(t,"POST","/v1/accounts:delete",e)}async function $u(t,e){return Yr(t,"POST","/v1/accounts:lookup",e)}/**
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
 */function Ho(t){if(t)try{const e=new Date(Number(t));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function KN(t,e=!1){const n=ce(t),r=await n.getIdToken(e),s=Em(r);G(s&&s.exp&&s.auth_time&&s.iat,n.auth,"internal-error");const i=typeof s.firebase=="object"?s.firebase:void 0,o=i==null?void 0:i.sign_in_provider;return{claims:s,token:r,authTime:Ho(Zh(s.auth_time)),issuedAtTime:Ho(Zh(s.iat)),expirationTime:Ho(Zh(s.exp)),signInProvider:o||null,signInSecondFactor:(i==null?void 0:i.sign_in_second_factor)||null}}function Zh(t){return Number(t)*1e3}function Em(t){const[e,n,r]=t.split(".");if(e===void 0||n===void 0||r===void 0)return Zl("JWT malformed, contained fewer than 3 sections"),null;try{const s=EE(n);return s?JSON.parse(s):(Zl("Failed to decode base64 JWT payload"),null)}catch(s){return Zl("Caught error parsing JWT payload as JSON",s==null?void 0:s.toString()),null}}function fv(t){const e=Em(t);return G(e,"internal-error"),G(typeof e.exp<"u","internal-error"),G(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
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
 */async function Ea(t,e,n=!1){if(n)return e;try{return await e}catch(r){throw r instanceof Sn&&QN(r)&&t.auth.currentUser===t&&await t.auth.signOut(),r}}function QN({code:t}){return t==="auth/user-disabled"||t==="auth/user-token-expired"}/**
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
 */class XN{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const n=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),n}else{this.errorBackoff=3e4;const r=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,r)}}schedule(e=!1){if(!this.isRunning)return;const n=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},n)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
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
 */class Af{constructor(e,n){this.createdAt=e,this.lastLoginAt=n,this._initializeTime()}_initializeTime(){this.lastSignInTime=Ho(this.lastLoginAt),this.creationTime=Ho(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
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
 */async function qu(t){var p;const e=t.auth,n=await t.getIdToken(),r=await Ea(t,$u(e,{idToken:n}));G(r==null?void 0:r.users.length,e,"internal-error");const s=r.users[0];t._notifyReloadListener(s);const i=(p=s.providerUserInfo)!=null&&p.length?Sx(s.providerUserInfo):[],o=JN(t.providerData,i),l=t.isAnonymous,u=!(t.email&&s.passwordHash)&&!(o!=null&&o.length),c=l?u:!1,f={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:o,metadata:new Af(s.createdAt,s.lastLoginAt),isAnonymous:c};Object.assign(t,f)}async function YN(t){const e=ce(t);await qu(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function JN(t,e){return[...t.filter(r=>!e.some(s=>s.providerId===r.providerId)),...e]}function Sx(t){return t.map(({providerId:e,...n})=>({providerId:e,uid:n.rawId||"",displayName:n.displayName||null,email:n.email||null,phoneNumber:n.phoneNumber||null,photoURL:n.photoUrl||null}))}/**
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
 */async function ZN(t,e){const n=await xx(t,{},async()=>{const r=Na({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:s,apiKey:i}=t.config,o=await Ix(t,s,"/v1/token",`key=${i}`),l=await t._getAdditionalHeaders();l["Content-Type"]="application/x-www-form-urlencoded";const u={method:"POST",headers:l,body:r};return t.emulatorConfig&&Rs(t.emulatorConfig.host)&&(u.credentials="include"),Tx.fetch()(o,u)});return{accessToken:n.access_token,expiresIn:n.expires_in,refreshToken:n.refresh_token}}async function e2(t,e){return Yr(t,"POST","/v2/accounts:revokeToken",Os(t,e))}/**
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
 */class fi{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){G(e.idToken,"internal-error"),G(typeof e.idToken<"u","internal-error"),G(typeof e.refreshToken<"u","internal-error");const n="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):fv(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,n)}updateFromIdToken(e){G(e.length!==0,"internal-error");const n=fv(e);this.updateTokensAndExpiration(e,null,n)}async getToken(e,n=!1){return!n&&this.accessToken&&!this.isExpired?this.accessToken:(G(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,n){const{accessToken:r,refreshToken:s,expiresIn:i}=await ZN(e,n);this.updateTokensAndExpiration(r,s,Number(i))}updateTokensAndExpiration(e,n,r){this.refreshToken=n||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,n){const{refreshToken:r,accessToken:s,expirationTime:i}=n,o=new fi;return r&&(G(typeof r=="string","internal-error",{appName:e}),o.refreshToken=r),s&&(G(typeof s=="string","internal-error",{appName:e}),o.accessToken=s),i&&(G(typeof i=="number","internal-error",{appName:e}),o.expirationTime=i),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new fi,this.toJSON())}_performRefresh(){return On("not implemented")}}/**
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
 */function ir(t,e){G(typeof t=="string"||typeof t>"u","internal-error",{appName:e})}class Zt{constructor({uid:e,auth:n,stsTokenManager:r,...s}){this.providerId="firebase",this.proactiveRefresh=new XN(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=n,this.stsTokenManager=r,this.accessToken=r.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new Af(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const n=await Ea(this,this.stsTokenManager.getToken(this.auth,e));return G(n,this.auth,"internal-error"),this.accessToken!==n&&(this.accessToken=n,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),n}getIdTokenResult(e){return KN(this,e)}reload(){return YN(this)}_assign(e){this!==e&&(G(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(n=>({...n})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const n=new Zt({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return n.metadata._copy(this.metadata),n}_onReload(e){G(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,n=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),n&&await qu(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(At(this.auth.app))return Promise.reject(Pr(this.auth));const e=await this.getIdToken();return await Ea(this,GN(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,n){const r=n.displayName??void 0,s=n.email??void 0,i=n.phoneNumber??void 0,o=n.photoURL??void 0,l=n.tenantId??void 0,u=n._redirectEventId??void 0,c=n.createdAt??void 0,f=n.lastLoginAt??void 0,{uid:p,emailVerified:g,isAnonymous:w,providerData:x,stsTokenManager:b}=n;G(p&&b,e,"internal-error");const P=fi.fromJSON(this.name,b);G(typeof p=="string",e,"internal-error"),ir(r,e.name),ir(s,e.name),G(typeof g=="boolean",e,"internal-error"),G(typeof w=="boolean",e,"internal-error"),ir(i,e.name),ir(o,e.name),ir(l,e.name),ir(u,e.name),ir(c,e.name),ir(f,e.name);const S=new Zt({uid:p,auth:e,email:s,emailVerified:g,displayName:r,isAnonymous:w,photoURL:o,phoneNumber:i,tenantId:l,stsTokenManager:P,createdAt:c,lastLoginAt:f});return x&&Array.isArray(x)&&(S.providerData=x.map(v=>({...v}))),u&&(S._redirectEventId=u),S}static async _fromIdTokenResponse(e,n,r=!1){const s=new fi;s.updateFromServerResponse(n);const i=new Zt({uid:n.localId,auth:e,stsTokenManager:s,isAnonymous:r});return await qu(i),i}static async _fromGetAccountInfoResponse(e,n,r){const s=n.users[0];G(s.localId!==void 0,"internal-error");const i=s.providerUserInfo!==void 0?Sx(s.providerUserInfo):[],o=!(s.email&&s.passwordHash)&&!(i!=null&&i.length),l=new fi;l.updateFromIdToken(r);const u=new Zt({uid:s.localId,auth:e,stsTokenManager:l,isAnonymous:o}),c={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:i,metadata:new Af(s.createdAt,s.lastLoginAt),isAnonymous:!(s.email&&s.passwordHash)&&!(i!=null&&i.length)};return Object.assign(u,c),u}}/**
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
 */const pv=new Map;function Vn(t){Kn(t instanceof Function,"Expected a class definition");let e=pv.get(t);return e?(Kn(e instanceof t,"Instance stored in cache mismatched with class"),e):(e=new t,pv.set(t,e),e)}/**
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
 */class kx{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,n){this.storage[e]=n}async _get(e){const n=this.storage[e];return n===void 0?null:n}async _remove(e){delete this.storage[e]}_addListener(e,n){}_removeListener(e,n){}}kx.type="NONE";const mv=kx;/**
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
 */function eu(t,e,n){return`firebase:${t}:${e}:${n}`}class pi{constructor(e,n,r){this.persistence=e,this.auth=n,this.userKey=r;const{config:s,name:i}=this.auth;this.fullUserKey=eu(this.userKey,s.apiKey,i),this.fullPersistenceKey=eu("persistence",s.apiKey,i),this.boundEventHandler=n._onStorageEvent.bind(n),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const n=await $u(this.auth,{idToken:e}).catch(()=>{});return n?Zt._fromGetAccountInfoResponse(this.auth,n,e):null}return Zt._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const n=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,n)return this.setCurrentUser(n)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,n,r="authUser"){if(!n.length)return new pi(Vn(mv),e,r);const s=(await Promise.all(n.map(async c=>{if(await c._isAvailable())return c}))).filter(c=>c);let i=s[0]||Vn(mv);const o=eu(r,e.config.apiKey,e.name);let l=null;for(const c of n)try{const f=await c._get(o);if(f){let p;if(typeof f=="string"){const g=await $u(e,{idToken:f}).catch(()=>{});if(!g)break;p=await Zt._fromGetAccountInfoResponse(e,g,f)}else p=Zt._fromJSON(e,f);c!==i&&(l=p),i=c;break}}catch{}const u=s.filter(c=>c._shouldAllowMigration);return!i._shouldAllowMigration||!u.length?new pi(i,e,r):(i=u[0],l&&await i._set(o,l.toJSON()),await Promise.all(n.map(async c=>{if(c!==i)try{await c._remove(o)}catch{}})),new pi(i,e,r))}}/**
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
 */function gv(t){const e=t.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(bx(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(Cx(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(Nx(e))return"Blackberry";if(Dx(e))return"Webos";if(Ax(e))return"Safari";if((e.includes("chrome/")||Rx(e))&&!e.includes("edge/"))return"Chrome";if(Px(e))return"Android";{const n=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=t.match(n);if((r==null?void 0:r.length)===2)return r[1]}return"Other"}function Cx(t=ut()){return/firefox\//i.test(t)}function Ax(t=ut()){const e=t.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function Rx(t=ut()){return/crios\//i.test(t)}function bx(t=ut()){return/iemobile/i.test(t)}function Px(t=ut()){return/android/i.test(t)}function Nx(t=ut()){return/blackberry/i.test(t)}function Dx(t=ut()){return/webos/i.test(t)}function Tm(t=ut()){return/iphone|ipad|ipod/i.test(t)||/macintosh/i.test(t)&&/mobile/i.test(t)}function t2(t=ut()){var e;return Tm(t)&&!!((e=window.navigator)!=null&&e.standalone)}function n2(){return rA()&&document.documentMode===10}function Ox(t=ut()){return Tm(t)||Px(t)||Dx(t)||Nx(t)||/windows phone/i.test(t)||bx(t)}/**
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
 */function Vx(t,e=[]){let n;switch(t){case"Browser":n=gv(ut());break;case"Worker":n=`${gv(ut())}-${t}`;break;default:n=t}const r=e.length?e.join(","):"FirebaseCore-web";return`${n}/JsCore/${bs}/${r}`}/**
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
 */class r2{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,n){const r=i=>new Promise((o,l)=>{try{const u=e(i);o(u)}catch(u){l(u)}});r.onAbort=n,this.queue.push(r);const s=this.queue.length-1;return()=>{this.queue[s]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const n=[];try{for(const r of this.queue)await r(e),r.onAbort&&n.push(r.onAbort)}catch(r){n.reverse();for(const s of n)try{s()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r==null?void 0:r.message})}}}/**
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
 */async function s2(t,e={}){return Yr(t,"GET","/v2/passwordPolicy",Os(t,e))}/**
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
 */const i2=6;class o2{constructor(e){var r;const n=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=n.minPasswordLength??i2,n.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=n.maxPasswordLength),n.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=n.containsLowercaseCharacter),n.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=n.containsUppercaseCharacter),n.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=n.containsNumericCharacter),n.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=n.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((r=e.allowedNonAlphanumericCharacters)==null?void 0:r.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const n={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,n),this.validatePasswordCharacterOptions(e,n),n.isValid&&(n.isValid=n.meetsMinPasswordLength??!0),n.isValid&&(n.isValid=n.meetsMaxPasswordLength??!0),n.isValid&&(n.isValid=n.containsLowercaseLetter??!0),n.isValid&&(n.isValid=n.containsUppercaseLetter??!0),n.isValid&&(n.isValid=n.containsNumericCharacter??!0),n.isValid&&(n.isValid=n.containsNonAlphanumericCharacter??!0),n}validatePasswordLengthOptions(e,n){const r=this.customStrengthOptions.minPasswordLength,s=this.customStrengthOptions.maxPasswordLength;r&&(n.meetsMinPasswordLength=e.length>=r),s&&(n.meetsMaxPasswordLength=e.length<=s)}validatePasswordCharacterOptions(e,n){this.updatePasswordCharacterOptionsStatuses(n,!1,!1,!1,!1);let r;for(let s=0;s<e.length;s++)r=e.charAt(s),this.updatePasswordCharacterOptionsStatuses(n,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,n,r,s,i){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=n)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=s)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=i))}}/**
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
 */class a2{constructor(e,n,r,s){this.app=e,this.heartbeatServiceProvider=n,this.appCheckServiceProvider=r,this.config=s,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new yv(this),this.idTokenSubscription=new yv(this),this.beforeStateQueue=new r2(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=Ex,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=s.sdkClientVersion,this._persistenceManagerAvailable=new Promise(i=>this._resolvePersistenceManagerAvailable=i)}_initializeWithPersistence(e,n){return n&&(this._popupRedirectResolver=Vn(n)),this._initializationPromise=this.queue(async()=>{var r,s,i;if(!this._deleted&&(this.persistenceManager=await pi.create(this,e),(r=this._resolvePersistenceManagerAvailable)==null||r.call(this),!this._deleted)){if((s=this._popupRedirectResolver)!=null&&s._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(n),this.lastNotifiedUid=((i=this.currentUser)==null?void 0:i.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const n=await $u(this,{idToken:e}),r=await Zt._fromGetAccountInfoResponse(this,n,e);await this.directlySetCurrentUser(r)}catch(n){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",n),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var i;if(At(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(l=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(l,l))}):this.directlySetCurrentUser(null)}const n=await this.assertedPersistence.getCurrentUser();let r=n,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(i=this.redirectUser)==null?void 0:i._redirectEventId,l=r==null?void 0:r._redirectEventId,u=await this.tryRedirectSignIn(e);(!o||o===l)&&(u!=null&&u.user)&&(r=u.user,s=!0)}if(!r)return this.directlySetCurrentUser(null);if(!r._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(r)}catch(o){r=n,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return r?this.reloadAndSetCurrentUserOrClear(r):this.directlySetCurrentUser(null)}return G(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===r._redirectEventId?this.directlySetCurrentUser(r):this.reloadAndSetCurrentUserOrClear(r)}async tryRedirectSignIn(e){let n=null;try{n=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return n}async reloadAndSetCurrentUserOrClear(e){try{await qu(e)}catch(n){if((n==null?void 0:n.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=UN()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(At(this.app))return Promise.reject(Pr(this));const n=e?ce(e):null;return n&&G(n.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(n&&n._clone(this))}async _updateCurrentUser(e,n=!1){if(!this._deleted)return e&&G(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),n||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return At(this.app)?Promise.reject(Pr(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return At(this.app)?Promise.reject(Pr(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(Vn(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const n=this._getPasswordPolicyInternal();return n.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):n.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await s2(this),n=new o2(e);this.tenantId===null?this._projectPasswordPolicy=n:this._tenantPasswordPolicies[this.tenantId]=n}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new Pa("auth","Firebase",e())}onAuthStateChanged(e,n,r){return this.registerStateListener(this.authStateSubscription,e,n,r)}beforeAuthStateChanged(e,n){return this.beforeStateQueue.pushCallback(e,n)}onIdTokenChanged(e,n,r){return this.registerStateListener(this.idTokenSubscription,e,n,r)}authStateReady(){return new Promise((e,n)=>{if(this.currentUser)e();else{const r=this.onAuthStateChanged(()=>{r(),e()},n)}})}async revokeAccessToken(e){if(this.currentUser){const n=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:n};this.tenantId!=null&&(r.tenantId=this.tenantId),await e2(this,r)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,n){const r=await this.getOrInitRedirectPersistenceManager(n);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const n=e&&Vn(e)||this._popupRedirectResolver;G(n,this,"argument-error"),this.redirectPersistenceManager=await pi.create(this,[Vn(n._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var n,r;return this._isInitialized&&await this.queue(async()=>{}),((n=this._currentUser)==null?void 0:n._redirectEventId)===e?this._currentUser:((r=this.redirectUser)==null?void 0:r._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var n;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((n=this.currentUser)==null?void 0:n.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,n,r,s){if(this._deleted)return()=>{};const i=typeof n=="function"?n:n.next.bind(n);let o=!1;const l=this._isInitialized?Promise.resolve():this._initializationPromise;if(G(l,this,"internal-error"),l.then(()=>{o||i(this.currentUser)}),typeof n=="function"){const u=e.addObserver(n,r,s);return()=>{o=!0,u()}}else{const u=e.addObserver(n);return()=>{o=!0,u()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return G(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=Vx(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var s;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const n=await((s=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:s.getHeartbeatsHeader());n&&(e["X-Firebase-Client"]=n);const r=await this._getAppCheckToken();return r&&(e["X-Firebase-AppCheck"]=r),e}async _getAppCheckToken(){var n;if(At(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((n=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:n.getToken());return e!=null&&e.error&&VN(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function Vs(t){return ce(t)}class yv{constructor(e){this.auth=e,this.observer=null,this.addObserver=hA(n=>this.observer=n)}get next(){return G(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
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
 */let Fc={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function l2(t){Fc=t}function Lx(t){return Fc.loadJS(t)}function u2(){return Fc.recaptchaEnterpriseScript}function c2(){return Fc.gapiScript}function h2(t){return`__${t}${Math.floor(Math.random()*1e6)}`}class d2{constructor(){this.enterprise=new f2}ready(e){e()}execute(e,n){return Promise.resolve("token")}render(e,n){return""}}class f2{ready(e){e()}execute(e,n){return Promise.resolve("token")}render(e,n){return""}}const p2="recaptcha-enterprise",Mx="NO_RECAPTCHA";class m2{constructor(e){this.type=p2,this.auth=Vs(e)}async verify(e="verify",n=!1){async function r(i){if(!n){if(i.tenantId==null&&i._agentRecaptchaConfig!=null)return i._agentRecaptchaConfig.siteKey;if(i.tenantId!=null&&i._tenantRecaptchaConfigs[i.tenantId]!==void 0)return i._tenantRecaptchaConfigs[i.tenantId].siteKey}return new Promise(async(o,l)=>{WN(i,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(u=>{if(u.recaptchaKey===void 0)l(new Error("recaptcha Enterprise site key undefined"));else{const c=new HN(u);return i.tenantId==null?i._agentRecaptchaConfig=c:i._tenantRecaptchaConfigs[i.tenantId]=c,o(c.siteKey)}}).catch(u=>{l(u)})})}function s(i,o,l){const u=window.grecaptcha;dv(u)?u.enterprise.ready(()=>{u.enterprise.execute(i,{action:e}).then(c=>{o(c)}).catch(()=>{o(Mx)})}):l(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new d2().execute("siteKey",{action:"verify"}):new Promise((i,o)=>{r(this.auth).then(l=>{if(!n&&dv(window.grecaptcha))s(l,i,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let u=u2();u.length!==0&&(u+=l),Lx(u).then(()=>{s(l,i,o)}).catch(c=>{o(c)})}}).catch(l=>{o(l)})})}}async function _v(t,e,n,r=!1,s=!1){const i=new m2(t);let o;if(s)o=Mx;else try{o=await i.verify(n)}catch{o=await i.verify(n,!0)}const l={...e};if(n==="mfaSmsEnrollment"||n==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in l){const u=l.phoneEnrollmentInfo.phoneNumber,c=l.phoneEnrollmentInfo.recaptchaToken;Object.assign(l,{phoneEnrollmentInfo:{phoneNumber:u,recaptchaToken:c,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in l){const u=l.phoneSignInInfo.recaptchaToken;Object.assign(l,{phoneSignInInfo:{recaptchaToken:u,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return l}return r?Object.assign(l,{captchaResp:o}):Object.assign(l,{captchaResponse:o}),Object.assign(l,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(l,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),l}async function vv(t,e,n,r,s){var i;if((i=t._getRecaptchaConfig())!=null&&i.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const o=await _v(t,e,n,n==="getOobCode");return r(t,o)}else return r(t,e).catch(async o=>{if(o.code==="auth/missing-recaptcha-token"){console.log(`${n} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const l=await _v(t,e,n,n==="getOobCode");return r(t,l)}else return Promise.reject(o)})}/**
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
 */function g2(t,e){const n=gc(t,"auth");if(n.isInitialized()){const s=n.getImmediate(),i=n.getOptions();if(Or(i,e??{}))return s;Wt(s,"already-initialized")}return n.initialize({options:e})}function y2(t,e){const n=(e==null?void 0:e.persistence)||[],r=(Array.isArray(n)?n:[n]).map(Vn);e!=null&&e.errorMap&&t._updateErrorMap(e.errorMap),t._initializeWithPersistence(r,e==null?void 0:e.popupRedirectResolver)}function _2(t,e,n){const r=Vs(t);G(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");const s=!1,i=jx(e),{host:o,port:l}=v2(e),u=l===null?"":`:${l}`,c={url:`${i}//${o}${u}/`},f=Object.freeze({host:o,port:l,protocol:i.replace(":",""),options:Object.freeze({disableWarnings:s})});if(!r._canInitEmulator){G(r.config.emulator&&r.emulatorConfig,r,"emulator-config-failed"),G(Or(c,r.config.emulator)&&Or(f,r.emulatorConfig),r,"emulator-config-failed");return}r.config.emulator=c,r.emulatorConfig=f,r.settings.appVerificationDisabledForTesting=!0,Rs(o)?bp(`${i}//${o}${u}`):w2()}function jx(t){const e=t.indexOf(":");return e<0?"":t.substr(0,e+1)}function v2(t){const e=jx(t),n=/(\/\/)?([^?#/]+)/.exec(t.substr(e.length));if(!n)return{host:"",port:null};const r=n[2].split("@").pop()||"",s=/^(\[[^\]]+\])(:|$)/.exec(r);if(s){const i=s[1];return{host:i,port:wv(r.substr(i.length+1))}}else{const[i,o]=r.split(":");return{host:i,port:wv(o)}}}function wv(t){if(!t)return null;const e=Number(t);return isNaN(e)?null:e}function w2(){function t(){const e=document.createElement("p"),n=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",n.position="fixed",n.width="100%",n.backgroundColor="#ffffff",n.border=".1em solid #000000",n.color="#b50000",n.bottom="0px",n.left="0px",n.margin="0px",n.zIndex="10000",n.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",t):t())}/**
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
 */class xm{constructor(e,n){this.providerId=e,this.signInMethod=n}toJSON(){return On("not implemented")}_getIdTokenResponse(e){return On("not implemented")}_linkToIdToken(e,n){return On("not implemented")}_getReauthenticationResolver(e){return On("not implemented")}}async function E2(t,e){return Yr(t,"POST","/v1/accounts:signUp",e)}/**
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
 */async function T2(t,e){return Uc(t,"POST","/v1/accounts:signInWithPassword",Os(t,e))}/**
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
 */async function x2(t,e){return Uc(t,"POST","/v1/accounts:signInWithEmailLink",Os(t,e))}async function I2(t,e){return Uc(t,"POST","/v1/accounts:signInWithEmailLink",Os(t,e))}/**
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
 */class Ta extends xm{constructor(e,n,r,s=null){super("password",r),this._email=e,this._password=n,this._tenantId=s}static _fromEmailAndPassword(e,n){return new Ta(e,n,"password")}static _fromEmailAndCode(e,n,r=null){return new Ta(e,n,"emailLink",r)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const n=typeof e=="string"?JSON.parse(e):e;if(n!=null&&n.email&&(n!=null&&n.password)){if(n.signInMethod==="password")return this._fromEmailAndPassword(n.email,n.password);if(n.signInMethod==="emailLink")return this._fromEmailAndCode(n.email,n.password,n.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const n={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return vv(e,n,"signInWithPassword",T2);case"emailLink":return x2(e,{email:this._email,oobCode:this._password});default:Wt(e,"internal-error")}}async _linkToIdToken(e,n){switch(this.signInMethod){case"password":const r={idToken:n,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return vv(e,r,"signUpPassword",E2);case"emailLink":return I2(e,{idToken:n,email:this._email,oobCode:this._password});default:Wt(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
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
 */async function mi(t,e){return Uc(t,"POST","/v1/accounts:signInWithIdp",Os(t,e))}/**
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
 */const S2="http://localhost";class Ss extends xm{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const n=new Ss(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(n.idToken=e.idToken),e.accessToken&&(n.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(n.nonce=e.nonce),e.pendingToken&&(n.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(n.accessToken=e.oauthToken,n.secret=e.oauthTokenSecret):Wt("argument-error"),n}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const n=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:s,...i}=n;if(!r||!s)return null;const o=new Ss(r,s);return o.idToken=i.idToken||void 0,o.accessToken=i.accessToken||void 0,o.secret=i.secret,o.nonce=i.nonce,o.pendingToken=i.pendingToken||null,o}_getIdTokenResponse(e){const n=this.buildRequest();return mi(e,n)}_linkToIdToken(e,n){const r=this.buildRequest();return r.idToken=n,mi(e,r)}_getReauthenticationResolver(e){const n=this.buildRequest();return n.autoCreate=!1,mi(e,n)}buildRequest(){const e={requestUri:S2,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const n={};this.idToken&&(n.id_token=this.idToken),this.accessToken&&(n.access_token=this.accessToken),this.secret&&(n.oauth_token_secret=this.secret),n.providerId=this.providerId,this.nonce&&!this.pendingToken&&(n.nonce=this.nonce),e.postBody=Na(n)}return e}}/**
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
 */function k2(t){switch(t){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function C2(t){const e=ko(Co(t)).link,n=e?ko(Co(e)).deep_link_id:null,r=ko(Co(t)).deep_link_id;return(r?ko(Co(r)).link:null)||r||n||e||t}class Im{constructor(e){const n=ko(Co(e)),r=n.apiKey??null,s=n.oobCode??null,i=k2(n.mode??null);G(r&&s&&i,"argument-error"),this.apiKey=r,this.operation=i,this.code=s,this.continueUrl=n.continueUrl??null,this.languageCode=n.lang??null,this.tenantId=n.tenantId??null}static parseLink(e){const n=C2(e);try{return new Im(n)}catch{return null}}}/**
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
 */class Wi{constructor(){this.providerId=Wi.PROVIDER_ID}static credential(e,n){return Ta._fromEmailAndPassword(e,n)}static credentialWithLink(e,n){const r=Im.parseLink(n);return G(r,"argument-error"),Ta._fromEmailAndCode(e,r.code,r.tenantId)}}Wi.PROVIDER_ID="password";Wi.EMAIL_PASSWORD_SIGN_IN_METHOD="password";Wi.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
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
 */class Sm{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
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
 */class Wa extends Sm{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
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
 */class cr extends Wa{constructor(){super("facebook.com")}static credential(e){return Ss._fromParams({providerId:cr.PROVIDER_ID,signInMethod:cr.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return cr.credentialFromTaggedObject(e)}static credentialFromError(e){return cr.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return cr.credential(e.oauthAccessToken)}catch{return null}}}cr.FACEBOOK_SIGN_IN_METHOD="facebook.com";cr.PROVIDER_ID="facebook.com";/**
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
 */class Rn extends Wa{constructor(){super("google.com"),this.addScope("profile")}static credential(e,n){return Ss._fromParams({providerId:Rn.PROVIDER_ID,signInMethod:Rn.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:n})}static credentialFromResult(e){return Rn.credentialFromTaggedObject(e)}static credentialFromError(e){return Rn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:n,oauthAccessToken:r}=e;if(!n&&!r)return null;try{return Rn.credential(n,r)}catch{return null}}}Rn.GOOGLE_SIGN_IN_METHOD="google.com";Rn.PROVIDER_ID="google.com";/**
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
 */class hr extends Wa{constructor(){super("github.com")}static credential(e){return Ss._fromParams({providerId:hr.PROVIDER_ID,signInMethod:hr.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return hr.credentialFromTaggedObject(e)}static credentialFromError(e){return hr.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return hr.credential(e.oauthAccessToken)}catch{return null}}}hr.GITHUB_SIGN_IN_METHOD="github.com";hr.PROVIDER_ID="github.com";/**
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
 */class dr extends Wa{constructor(){super("twitter.com")}static credential(e,n){return Ss._fromParams({providerId:dr.PROVIDER_ID,signInMethod:dr.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:n})}static credentialFromResult(e){return dr.credentialFromTaggedObject(e)}static credentialFromError(e){return dr.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:n,oauthTokenSecret:r}=e;if(!n||!r)return null;try{return dr.credential(n,r)}catch{return null}}}dr.TWITTER_SIGN_IN_METHOD="twitter.com";dr.PROVIDER_ID="twitter.com";/**
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
 */class bi{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,n,r,s=!1){const i=await Zt._fromIdTokenResponse(e,r,s),o=Ev(r);return new bi({user:i,providerId:o,_tokenResponse:r,operationType:n})}static async _forOperation(e,n,r){await e._updateTokensIfNecessary(r,!0);const s=Ev(r);return new bi({user:e,providerId:s,_tokenResponse:r,operationType:n})}}function Ev(t){return t.providerId?t.providerId:"phoneNumber"in t?"phone":null}/**
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
 */class Hu extends Sn{constructor(e,n,r,s){super(n.code,n.message),this.operationType=r,this.user=s,Object.setPrototypeOf(this,Hu.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:n.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,n,r,s){return new Hu(e,n,r,s)}}function Ux(t,e,n,r){return(e==="reauthenticate"?n._getReauthenticationResolver(t):n._getIdTokenResponse(t)).catch(i=>{throw i.code==="auth/multi-factor-auth-required"?Hu._fromErrorAndOperation(t,i,e,r):i})}async function A2(t,e,n=!1){const r=await Ea(t,e._linkToIdToken(t.auth,await t.getIdToken()),n);return bi._forOperation(t,"link",r)}/**
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
 */async function R2(t,e,n=!1){const{auth:r}=t;if(At(r.app))return Promise.reject(Pr(r));const s="reauthenticate";try{const i=await Ea(t,Ux(r,s,e,t),n);G(i.idToken,r,"internal-error");const o=Em(i.idToken);G(o,r,"internal-error");const{sub:l}=o;return G(t.uid===l,r,"user-mismatch"),bi._forOperation(t,s,i)}catch(i){throw(i==null?void 0:i.code)==="auth/user-not-found"&&Wt(r,"user-mismatch"),i}}/**
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
 */async function Fx(t,e,n=!1){if(At(t.app))return Promise.reject(Pr(t));const r="signIn",s=await Ux(t,r,e),i=await bi._fromIdTokenResponse(t,r,s);return n||await t._updateCurrentUser(i.user),i}async function b2(t,e){return Fx(Vs(t),e)}/**
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
 */async function P2(t){const e=Vs(t);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}function N2(t,e,n){return At(t.app)?Promise.reject(Pr(t)):b2(ce(t),Wi.credential(e,n)).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&P2(t),r})}/**
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
 */function D2(t,e){return ce(t).setPersistence(e)}function O2(t,e,n,r){return ce(t).onIdTokenChanged(e,n,r)}function V2(t,e,n){return ce(t).beforeAuthStateChanged(e,n)}function L2(t,e,n,r){return ce(t).onAuthStateChanged(e,n,r)}function M2(t){return ce(t).signOut()}const Wu="__sak";/**
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
 */class zx{constructor(e,n){this.storageRetriever=e,this.type=n}_isAvailable(){try{return this.storage?(this.storage.setItem(Wu,"1"),this.storage.removeItem(Wu),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,n){return this.storage.setItem(e,JSON.stringify(n)),Promise.resolve()}_get(e){const n=this.storage.getItem(e);return Promise.resolve(n?JSON.parse(n):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
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
 */const j2=1e3,U2=10;class Bx extends zx{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,n)=>this.onStorageEvent(e,n),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=Ox(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const n of Object.keys(this.listeners)){const r=this.storage.getItem(n),s=this.localCache[n];r!==s&&e(n,s,r)}}onStorageEvent(e,n=!1){if(!e.key){this.forAllChangedKeys((o,l,u)=>{this.notifyListeners(o,u)});return}const r=e.key;n?this.detachListener():this.stopPolling();const s=()=>{const o=this.storage.getItem(r);!n&&this.localCache[r]===o||this.notifyListeners(r,o)},i=this.storage.getItem(r);n2()&&i!==e.newValue&&e.newValue!==e.oldValue?setTimeout(s,U2):s()}notifyListeners(e,n){this.localCache[e]=n;const r=this.listeners[e];if(r)for(const s of Array.from(r))s(n&&JSON.parse(n))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,n,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:n,newValue:r}),!0)})},j2)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,n){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(n)}_removeListener(e,n){this.listeners[e]&&(this.listeners[e].delete(n),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,n){await super._set(e,n),this.localCache[e]=JSON.stringify(n)}async _get(e){const n=await super._get(e);return this.localCache[e]=JSON.stringify(n),n}async _remove(e){await super._remove(e),delete this.localCache[e]}}Bx.type="LOCAL";const $x=Bx;/**
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
 */class qx extends zx{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,n){}_removeListener(e,n){}}qx.type="SESSION";const Hx=qx;/**
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
 */function F2(t){return Promise.all(t.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(n){return{fulfilled:!1,reason:n}}}))}/**
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
 */class zc{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const n=this.receivers.find(s=>s.isListeningto(e));if(n)return n;const r=new zc(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const n=e,{eventId:r,eventType:s,data:i}=n.data,o=this.handlersMap[s];if(!(o!=null&&o.size))return;n.ports[0].postMessage({status:"ack",eventId:r,eventType:s});const l=Array.from(o).map(async c=>c(n.origin,i)),u=await F2(l);n.ports[0].postMessage({status:"done",eventId:r,eventType:s,response:u})}_subscribe(e,n){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(n)}_unsubscribe(e,n){this.handlersMap[e]&&n&&this.handlersMap[e].delete(n),(!n||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}zc.receivers=[];/**
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
 */function km(t="",e=10){let n="";for(let r=0;r<e;r++)n+=Math.floor(Math.random()*10);return t+n}/**
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
 */class z2{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,n,r=50){const s=typeof MessageChannel<"u"?new MessageChannel:null;if(!s)throw new Error("connection_unavailable");let i,o;return new Promise((l,u)=>{const c=km("",20);s.port1.start();const f=setTimeout(()=>{u(new Error("unsupported_event"))},r);o={messageChannel:s,onMessage(p){const g=p;if(g.data.eventId===c)switch(g.data.status){case"ack":clearTimeout(f),i=setTimeout(()=>{u(new Error("timeout"))},3e3);break;case"done":clearTimeout(i),l(g.data.response);break;default:clearTimeout(f),clearTimeout(i),u(new Error("invalid_response"));break}}},this.handlers.add(o),s.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:c,data:n},[s.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
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
 */function En(){return window}function B2(t){En().location.href=t}/**
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
 */function Wx(){return typeof En().WorkerGlobalScope<"u"&&typeof En().importScripts=="function"}async function $2(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function q2(){var t;return((t=navigator==null?void 0:navigator.serviceWorker)==null?void 0:t.controller)||null}function H2(){return Wx()?self:null}/**
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
 */const Gx="firebaseLocalStorageDb",W2=1,Gu="firebaseLocalStorage",Kx="fbase_key";class Ga{constructor(e){this.request=e}toPromise(){return new Promise((e,n)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{n(this.request.error)})})}}function Bc(t,e){return t.transaction([Gu],e?"readwrite":"readonly").objectStore(Gu)}function G2(){const t=indexedDB.deleteDatabase(Gx);return new Ga(t).toPromise()}function Rf(){const t=indexedDB.open(Gx,W2);return new Promise((e,n)=>{t.addEventListener("error",()=>{n(t.error)}),t.addEventListener("upgradeneeded",()=>{const r=t.result;try{r.createObjectStore(Gu,{keyPath:Kx})}catch(s){n(s)}}),t.addEventListener("success",async()=>{const r=t.result;r.objectStoreNames.contains(Gu)?e(r):(r.close(),await G2(),e(await Rf()))})})}async function Tv(t,e,n){const r=Bc(t,!0).put({[Kx]:e,value:n});return new Ga(r).toPromise()}async function K2(t,e){const n=Bc(t,!1).get(e),r=await new Ga(n).toPromise();return r===void 0?null:r.value}function xv(t,e){const n=Bc(t,!0).delete(e);return new Ga(n).toPromise()}const Q2=800,X2=3;class Qx{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await Rf(),this.db)}async _withRetries(e){let n=0;for(;;)try{const r=await this._openDb();return await e(r)}catch(r){if(n++>X2)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Wx()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=zc._getInstance(H2()),this.receiver._subscribe("keyChanged",async(e,n)=>({keyProcessed:(await this._poll()).includes(n.key)})),this.receiver._subscribe("ping",async(e,n)=>["keyChanged"])}async initializeSender(){var n,r;if(this.activeServiceWorker=await $2(),!this.activeServiceWorker)return;this.sender=new z2(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(n=e[0])!=null&&n.fulfilled&&(r=e[0])!=null&&r.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||q2()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await Rf();return await Tv(e,Wu,"1"),await xv(e,Wu),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,n){return this._withPendingWrite(async()=>(await this._withRetries(r=>Tv(r,e,n)),this.localCache[e]=n,this.notifyServiceWorker(e)))}async _get(e){const n=await this._withRetries(r=>K2(r,e));return this.localCache[e]=n,n}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(n=>xv(n,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(s=>{const i=Bc(s,!1).getAll();return new Ga(i).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const n=[],r=new Set;if(e.length!==0)for(const{fbase_key:s,value:i}of e)r.add(s),JSON.stringify(this.localCache[s])!==JSON.stringify(i)&&(this.notifyListeners(s,i),n.push(s));for(const s of Object.keys(this.localCache))this.localCache[s]&&!r.has(s)&&(this.notifyListeners(s,null),n.push(s));return n}notifyListeners(e,n){this.localCache[e]=n;const r=this.listeners[e];if(r)for(const s of Array.from(r))s(n)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),Q2)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,n){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(n)}_removeListener(e,n){this.listeners[e]&&(this.listeners[e].delete(n),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}Qx.type="LOCAL";const Y2=Qx;new Ha(3e4,6e4);/**
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
 */function Xx(t,e){return e?Vn(e):(G(t._popupRedirectResolver,t,"argument-error"),t._popupRedirectResolver)}/**
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
 */class Cm extends xm{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return mi(e,this._buildIdpRequest())}_linkToIdToken(e,n){return mi(e,this._buildIdpRequest(n))}_getReauthenticationResolver(e){return mi(e,this._buildIdpRequest())}_buildIdpRequest(e){const n={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(n.idToken=e),n}}function J2(t){return Fx(t.auth,new Cm(t),t.bypassAuthState)}function Z2(t){const{auth:e,user:n}=t;return G(n,e,"internal-error"),R2(n,new Cm(t),t.bypassAuthState)}async function eD(t){const{auth:e,user:n}=t;return G(n,e,"internal-error"),A2(n,new Cm(t),t.bypassAuthState)}/**
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
 */class Yx{constructor(e,n,r,s,i=!1){this.auth=e,this.resolver=r,this.user=s,this.bypassAuthState=i,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(n)?n:[n]}execute(){return new Promise(async(e,n)=>{this.pendingPromise={resolve:e,reject:n};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){const{urlResponse:n,sessionId:r,postBody:s,tenantId:i,error:o,type:l}=e;if(o){this.reject(o);return}const u={auth:this.auth,requestUri:n,sessionId:r,tenantId:i||void 0,postBody:s||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(l)(u))}catch(c){this.reject(c)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return J2;case"linkViaPopup":case"linkViaRedirect":return eD;case"reauthViaPopup":case"reauthViaRedirect":return Z2;default:Wt(this.auth,"internal-error")}}resolve(e){Kn(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){Kn(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
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
 */const tD=new Ha(2e3,1e4);async function nD(t,e,n){if(At(t.app))return Promise.reject(rn(t,"operation-not-supported-in-this-environment"));const r=Vs(t);LN(t,e,Sm);const s=Xx(r,n);return new fs(r,"signInViaPopup",e,s).executeNotNull()}class fs extends Yx{constructor(e,n,r,s,i){super(e,n,s,i),this.provider=r,this.authWindow=null,this.pollId=null,fs.currentPopupAction&&fs.currentPopupAction.cancel(),fs.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return G(e,this.auth,"internal-error"),e}async onExecution(){Kn(this.filter.length===1,"Popup operations only handle one event");const e=km();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(n=>{this.reject(n)}),this.resolver._isIframeWebStorageSupported(this.auth,n=>{n||this.reject(rn(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(rn(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,fs.currentPopupAction=null}pollUserCancellation(){const e=()=>{var n,r;if((r=(n=this.authWindow)==null?void 0:n.window)!=null&&r.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(rn(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,tD.get())};e()}}fs.currentPopupAction=null;/**
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
 */const rD="pendingRedirect",tu=new Map;class sD extends Yx{constructor(e,n,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],n,void 0,r),this.eventId=null}async execute(){let e=tu.get(this.auth._key());if(!e){try{const r=await iD(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(n){e=()=>Promise.reject(n)}tu.set(this.auth._key(),e)}return this.bypassAuthState||tu.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const n=await this.auth._redirectUserForId(e.eventId);if(n)return this.user=n,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function iD(t,e){const n=lD(e),r=aD(t);if(!await r._isAvailable())return!1;const s=await r._get(n)==="true";return await r._remove(n),s}function oD(t,e){tu.set(t._key(),e)}function aD(t){return Vn(t._redirectPersistence)}function lD(t){return eu(rD,t.config.apiKey,t.name)}async function uD(t,e,n=!1){if(At(t.app))return Promise.reject(Pr(t));const r=Vs(t),s=Xx(r,e),o=await new sD(r,s,n).execute();return o&&!n&&(delete o.user._redirectEventId,await r._persistUserIfCurrent(o.user),await r._setRedirectUser(null,e)),o}/**
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
 */const cD=10*60*1e3;class hD{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let n=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(n=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!dD(e)||(this.hasHandledPotentialRedirect=!0,n||(this.queuedRedirectEvent=e,n=!0)),n}sendToConsumer(e,n){var r;if(e.error&&!Jx(e)){const s=((r=e.error.code)==null?void 0:r.split("auth/")[1])||"internal-error";n.onError(rn(this.auth,s))}else n.onAuthEvent(e)}isEventForConsumer(e,n){const r=n.eventId===null||!!e.eventId&&e.eventId===n.eventId;return n.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=cD&&this.cachedEventUids.clear(),this.cachedEventUids.has(Iv(e))}saveEventToCache(e){this.cachedEventUids.add(Iv(e)),this.lastProcessedEventTime=Date.now()}}function Iv(t){return[t.type,t.eventId,t.sessionId,t.tenantId].filter(e=>e).join("-")}function Jx({type:t,error:e}){return t==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function dD(t){switch(t.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return Jx(t);default:return!1}}/**
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
 */async function fD(t,e={}){return Yr(t,"GET","/v1/projects",e)}/**
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
 */const pD=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,mD=/^https?/;async function gD(t){if(t.config.emulator)return;const{authorizedDomains:e}=await fD(t);for(const n of e)try{if(yD(n))return}catch{}Wt(t,"unauthorized-domain")}function yD(t){const e=Cf(),{protocol:n,hostname:r}=new URL(e);if(t.startsWith("chrome-extension://")){const o=new URL(t);return o.hostname===""&&r===""?n==="chrome-extension:"&&t.replace("chrome-extension://","")===e.replace("chrome-extension://",""):n==="chrome-extension:"&&o.hostname===r}if(!mD.test(n))return!1;if(pD.test(t))return r===t;const s=t.replace(/\./g,"\\.");return new RegExp("^(.+\\."+s+"|"+s+")$","i").test(r)}/**
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
 */const _D=new Ha(3e4,6e4);function Sv(){const t=En().___jsl;if(t!=null&&t.H){for(const e of Object.keys(t.H))if(t.H[e].r=t.H[e].r||[],t.H[e].L=t.H[e].L||[],t.H[e].r=[...t.H[e].L],t.CP)for(let n=0;n<t.CP.length;n++)t.CP[n]=null}}function vD(t){return new Promise((e,n)=>{var s,i,o;function r(){Sv(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{Sv(),n(rn(t,"network-request-failed"))},timeout:_D.get()})}if((i=(s=En().gapi)==null?void 0:s.iframes)!=null&&i.Iframe)e(gapi.iframes.getContext());else if((o=En().gapi)!=null&&o.load)r();else{const l=h2("iframefcb");return En()[l]=()=>{gapi.load?r():n(rn(t,"network-request-failed"))},Lx(`${c2()}?onload=${l}`).catch(u=>n(u))}}).catch(e=>{throw nu=null,e})}let nu=null;function wD(t){return nu=nu||vD(t),nu}/**
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
 */const ED=new Ha(5e3,15e3),TD="__/auth/iframe",xD="emulator/auth/iframe",ID={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},SD=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function kD(t){const e=t.config;G(e.authDomain,t,"auth-domain-config-required");const n=e.emulator?wm(e,xD):`https://${t.config.authDomain}/${TD}`,r={apiKey:e.apiKey,appName:t.name,v:bs},s=SD.get(t.config.apiHost);s&&(r.eid=s);const i=t._getFrameworks();return i.length&&(r.fw=i.join(",")),`${n}?${Na(r).slice(1)}`}async function CD(t){const e=await wD(t),n=En().gapi;return G(n,t,"internal-error"),e.open({where:document.body,url:kD(t),messageHandlersFilter:n.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:ID,dontclear:!0},r=>new Promise(async(s,i)=>{await r.restyle({setHideOnLeave:!1});const o=rn(t,"network-request-failed"),l=En().setTimeout(()=>{i(o)},ED.get());function u(){En().clearTimeout(l),s(r)}r.ping(u).then(u,()=>{i(o)})}))}/**
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
 */const AD={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},RD=500,bD=600,PD="_blank",ND="http://localhost";class kv{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function DD(t,e,n,r=RD,s=bD){const i=Math.max((window.screen.availHeight-s)/2,0).toString(),o=Math.max((window.screen.availWidth-r)/2,0).toString();let l="";const u={...AD,width:r.toString(),height:s.toString(),top:i,left:o},c=ut().toLowerCase();n&&(l=Rx(c)?PD:n),Cx(c)&&(e=e||ND,u.scrollbars="yes");const f=Object.entries(u).reduce((g,[w,x])=>`${g}${w}=${x},`,"");if(t2(c)&&l!=="_self")return OD(e||"",l),new kv(null);const p=window.open(e||"",l,f);G(p,t,"popup-blocked");try{p.focus()}catch{}return new kv(p)}function OD(t,e){const n=document.createElement("a");n.href=t,n.target=e;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),n.dispatchEvent(r)}/**
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
 */const VD="__/auth/handler",LD="emulator/auth/handler",MD=encodeURIComponent("fac");async function Cv(t,e,n,r,s,i){G(t.config.authDomain,t,"auth-domain-config-required"),G(t.config.apiKey,t,"invalid-api-key");const o={apiKey:t.config.apiKey,appName:t.name,authType:n,redirectUrl:r,v:bs,eventId:s};if(e instanceof Sm){e.setDefaultLanguage(t.languageCode),o.providerId=e.providerId||"",cA(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[f,p]of Object.entries({}))o[f]=p}if(e instanceof Wa){const f=e.getScopes().filter(p=>p!=="");f.length>0&&(o.scopes=f.join(","))}t.tenantId&&(o.tid=t.tenantId);const l=o;for(const f of Object.keys(l))l[f]===void 0&&delete l[f];const u=await t._getAppCheckToken(),c=u?`#${MD}=${encodeURIComponent(u)}`:"";return`${jD(t)}?${Na(l).slice(1)}${c}`}function jD({config:t}){return t.emulator?wm(t,LD):`https://${t.authDomain}/${VD}`}/**
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
 */const ed="webStorageSupport";class UD{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=Hx,this._completeRedirectFn=uD,this._overrideRedirectResult=oD}async _openPopup(e,n,r,s){var o;Kn((o=this.eventManagers[e._key()])==null?void 0:o.manager,"_initialize() not called before _openPopup()");const i=await Cv(e,n,r,Cf(),s);return DD(e,i,km())}async _openRedirect(e,n,r,s){await this._originValidation(e);const i=await Cv(e,n,r,Cf(),s);return B2(i),new Promise(()=>{})}_initialize(e){const n=e._key();if(this.eventManagers[n]){const{manager:s,promise:i}=this.eventManagers[n];return s?Promise.resolve(s):(Kn(i,"If manager is not set, promise should be"),i)}const r=this.initAndGetManager(e);return this.eventManagers[n]={promise:r},r.catch(()=>{delete this.eventManagers[n]}),r}async initAndGetManager(e){const n=await CD(e),r=new hD(e);return n.register("authEvent",s=>(G(s==null?void 0:s.authEvent,e,"invalid-auth-event"),{status:r.onEvent(s.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=n,r}_isIframeWebStorageSupported(e,n){this.iframes[e._key()].send(ed,{type:ed},s=>{var o;const i=(o=s==null?void 0:s[0])==null?void 0:o[ed];i!==void 0&&n(!!i),Wt(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const n=e._key();return this.originValidationPromises[n]||(this.originValidationPromises[n]=gD(e)),this.originValidationPromises[n]}get _shouldInitProactively(){return Ox()||Ax()||Tm()}}const FD=UD;var Av="@firebase/auth",Rv="1.13.1";/**
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
 */class zD{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const n=this.auth.onIdTokenChanged(r=>{e((r==null?void 0:r.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,n),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const n=this.internalListeners.get(e);n&&(this.internalListeners.delete(e),n(),this.updateProactiveRefresh())}assertAuthConfigured(){G(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
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
 */function BD(t){switch(t){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function $D(t){Ts(new Vr("auth",(e,{options:n})=>{const r=e.getProvider("app").getImmediate(),s=e.getProvider("heartbeat"),i=e.getProvider("app-check-internal"),{apiKey:o,authDomain:l}=r.options;G(o&&!o.includes(":"),"invalid-api-key",{appName:r.name});const u={apiKey:o,authDomain:l,clientPlatform:t,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:Vx(t)},c=new a2(r,s,i,u);return y2(c,n),c},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,n,r)=>{e.getProvider("auth-internal").initialize()})),Ts(new Vr("auth-internal",e=>{const n=Vs(e.getProvider("auth").getImmediate());return(r=>new zD(r))(n)},"PRIVATE").setInstantiationMode("EXPLICIT")),_n(Av,Rv,BD(t)),_n(Av,Rv,"esm2020")}/**
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
 */const qD=5*60,HD=SE("authIdTokenMaxAge")||qD;let bv=null;const WD=t=>async e=>{const n=e&&await e.getIdTokenResult(),r=n&&(new Date().getTime()-Date.parse(n.issuedAtTime))/1e3;if(r&&r>HD)return;const s=n==null?void 0:n.token;bv!==s&&(bv=s,await fetch(t,{method:s?"POST":"DELETE",headers:s?{Authorization:`Bearer ${s}`}:{}}))};function GD(t=Dp()){const e=gc(t,"auth");if(e.isInitialized())return e.getImmediate();const n=g2(t,{popupRedirectResolver:FD,persistence:[Y2,$x,Hx]}),r=SE("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){const i=new URL(r,location.origin);if(location.origin===i.origin){const o=WD(i.toString());V2(n,o,()=>o(n.currentUser)),O2(n,l=>o(l))}}const s=TE("auth");return s&&_2(n,`http://${s}`),n}function KD(){var t;return((t=document.getElementsByTagName("head"))==null?void 0:t[0])??document}l2({loadJS(t){return new Promise((e,n)=>{const r=document.createElement("script");r.setAttribute("src",t),r.onload=e,r.onerror=s=>{const i=rn("internal-error");i.customData=s,n(i)},r.type="text/javascript",r.charset="UTF-8",KD().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});$D("Browser");/**
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
 */const Zx="firebasestorage.googleapis.com",eI="storageBucket",QD=2*60*1e3,XD=10*60*1e3,YD=1e3;/**
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
 */class Ae extends Sn{constructor(e,n,r=0){super(td(e),`Firebase Storage: ${n} (${td(e)})`),this.status_=r,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,Ae.prototype)}get status(){return this.status_}set status(e){this.status_=e}_codeEquals(e){return td(e)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var _e;(function(t){t.UNKNOWN="unknown",t.OBJECT_NOT_FOUND="object-not-found",t.BUCKET_NOT_FOUND="bucket-not-found",t.PROJECT_NOT_FOUND="project-not-found",t.QUOTA_EXCEEDED="quota-exceeded",t.UNAUTHENTICATED="unauthenticated",t.UNAUTHORIZED="unauthorized",t.UNAUTHORIZED_APP="unauthorized-app",t.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",t.INVALID_CHECKSUM="invalid-checksum",t.CANCELED="canceled",t.INVALID_EVENT_NAME="invalid-event-name",t.INVALID_URL="invalid-url",t.INVALID_DEFAULT_BUCKET="invalid-default-bucket",t.NO_DEFAULT_BUCKET="no-default-bucket",t.CANNOT_SLICE_BLOB="cannot-slice-blob",t.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",t.NO_DOWNLOAD_URL="no-download-url",t.INVALID_ARGUMENT="invalid-argument",t.INVALID_ARGUMENT_COUNT="invalid-argument-count",t.APP_DELETED="app-deleted",t.INVALID_ROOT_OPERATION="invalid-root-operation",t.INVALID_FORMAT="invalid-format",t.INTERNAL_ERROR="internal-error",t.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(_e||(_e={}));function td(t){return"storage/"+t}function Am(){const t="An unknown error occurred, please check the error payload for server response.";return new Ae(_e.UNKNOWN,t)}function JD(t){return new Ae(_e.OBJECT_NOT_FOUND,"Object '"+t+"' does not exist.")}function ZD(t){return new Ae(_e.QUOTA_EXCEEDED,"Quota for bucket '"+t+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}function eO(){const t="User is not authenticated, please authenticate using Firebase Authentication and try again.";return new Ae(_e.UNAUTHENTICATED,t)}function tO(){return new Ae(_e.UNAUTHORIZED_APP,"This app does not have permission to access Firebase Storage on this project.")}function nO(t){return new Ae(_e.UNAUTHORIZED,"User does not have permission to access '"+t+"'.")}function tI(){return new Ae(_e.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function nI(){return new Ae(_e.CANCELED,"User canceled the upload/download.")}function rO(t){return new Ae(_e.INVALID_URL,"Invalid URL '"+t+"'.")}function sO(t){return new Ae(_e.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+t+"'.")}function iO(){return new Ae(_e.NO_DEFAULT_BUCKET,"No default bucket found. Did you set the '"+eI+"' property when initializing the app?")}function rI(){return new Ae(_e.CANNOT_SLICE_BLOB,"Cannot slice blob for upload. Please retry the upload.")}function oO(){return new Ae(_e.SERVER_FILE_WRONG_SIZE,"Server recorded incorrect upload file size, please retry the upload.")}function aO(){return new Ae(_e.NO_DOWNLOAD_URL,"The given file does not have any download URLs.")}function lO(t){return new Ae(_e.UNSUPPORTED_ENVIRONMENT,`${t} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`)}function bf(t){return new Ae(_e.INVALID_ARGUMENT,t)}function sI(){return new Ae(_e.APP_DELETED,"The Firebase app was deleted.")}function uO(t){return new Ae(_e.INVALID_ROOT_OPERATION,"The operation '"+t+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}function Wo(t,e){return new Ae(_e.INVALID_FORMAT,"String does not match format '"+t+"': "+e)}function Eo(t){throw new Ae(_e.INTERNAL_ERROR,"Internal error: "+t)}/**
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
 */class Nt{constructor(e,n){this.bucket=e,this.path_=n}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const e=encodeURIComponent;return"/b/"+e(this.bucket)+"/o/"+e(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(e,n){let r;try{r=Nt.makeFromUrl(e,n)}catch{return new Nt(e,"")}if(r.path==="")return r;throw sO(e)}static makeFromUrl(e,n){let r=null;const s="([A-Za-z0-9.\\-_]+)";function i(D){D.path.charAt(D.path.length-1)==="/"&&(D.path_=D.path_.slice(0,-1))}const o="(/(.*))?$",l=new RegExp("^gs://"+s+o,"i"),u={bucket:1,path:3};function c(D){D.path_=decodeURIComponent(D.path)}const f="v[A-Za-z0-9_]+",p=n.replace(/[.]/g,"\\."),g="(/([^?#]*).*)?$",w=new RegExp(`^https?://${p}/${f}/b/${s}/o${g}`,"i"),x={bucket:1,path:3},b=n===Zx?"(?:storage.googleapis.com|storage.cloud.google.com)":n,P="([^?#]*)",S=new RegExp(`^https?://${b}/${s}/${P}`,"i"),C=[{regex:l,indices:u,postModify:i},{regex:w,indices:x,postModify:c},{regex:S,indices:{bucket:1,path:2},postModify:c}];for(let D=0;D<C.length;D++){const j=C[D],L=j.regex.exec(e);if(L){const E=L[j.indices.bucket];let _=L[j.indices.path];_||(_=""),r=new Nt(E,_),j.postModify(r);break}}if(r==null)throw rO(e);return r}}class cO{constructor(e){this.promise_=Promise.reject(e)}getPromise(){return this.promise_}cancel(e=!1){}}/**
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
 */function hO(t,e,n){let r=1,s=null,i=null,o=!1,l=0;function u(){return l===2}let c=!1;function f(...P){c||(c=!0,e.apply(null,P))}function p(P){s=setTimeout(()=>{s=null,t(w,u())},P)}function g(){i&&clearTimeout(i)}function w(P,...S){if(c){g();return}if(P){g(),f.call(null,P,...S);return}if(u()||o){g(),f.call(null,P,...S);return}r<64&&(r*=2);let C;l===1?(l=2,C=0):C=(r+Math.random())*1e3,p(C)}let x=!1;function b(P){x||(x=!0,g(),!c&&(s!==null?(P||(l=2),clearTimeout(s),p(0)):P||(l=1)))}return p(0),i=setTimeout(()=>{o=!0,b(!0)},n),b}function dO(t){t(!1)}/**
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
 */function fO(t){return t!==void 0}function pO(t){return typeof t=="function"}function mO(t){return typeof t=="object"&&!Array.isArray(t)}function $c(t){return typeof t=="string"||t instanceof String}function Pv(t){return Rm()&&t instanceof Blob}function Rm(){return typeof Blob<"u"}function Nv(t,e,n,r){if(r<e)throw bf(`Invalid value for '${t}'. Expected ${e} or greater.`);if(r>n)throw bf(`Invalid value for '${t}'. Expected ${n} or less.`)}/**
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
 */function Gi(t,e,n){let r=e;return n==null&&(r=`https://${e}`),`${n}://${r}/v0${t}`}function iI(t){const e=encodeURIComponent;let n="?";for(const r in t)if(t.hasOwnProperty(r)){const s=e(r)+"="+e(t[r]);n=n+s+"&"}return n=n.slice(0,-1),n}var gs;(function(t){t[t.NO_ERROR=0]="NO_ERROR",t[t.NETWORK_ERROR=1]="NETWORK_ERROR",t[t.ABORT=2]="ABORT"})(gs||(gs={}));/**
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
 */function oI(t,e){const n=t>=500&&t<600,s=[408,429].indexOf(t)!==-1,i=e.indexOf(t)!==-1;return n||s||i}/**
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
 */class gO{constructor(e,n,r,s,i,o,l,u,c,f,p,g=!0,w=!1){this.url_=e,this.method_=n,this.headers_=r,this.body_=s,this.successCodes_=i,this.additionalRetryCodes_=o,this.callback_=l,this.errorCallback_=u,this.timeout_=c,this.progressCallback_=f,this.connectionFactory_=p,this.retry=g,this.isUsingEmulator=w,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((x,b)=>{this.resolve_=x,this.reject_=b,this.start_()})}start_(){const e=(r,s)=>{if(s){r(!1,new bl(!1,null,!0));return}const i=this.connectionFactory_();this.pendingConnection_=i;const o=l=>{const u=l.loaded,c=l.lengthComputable?l.total:-1;this.progressCallback_!==null&&this.progressCallback_(u,c)};this.progressCallback_!==null&&i.addUploadProgressListener(o),i.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&i.removeUploadProgressListener(o),this.pendingConnection_=null;const l=i.getErrorCode()===gs.NO_ERROR,u=i.getStatus();if(!l||oI(u,this.additionalRetryCodes_)&&this.retry){const f=i.getErrorCode()===gs.ABORT;r(!1,new bl(!1,null,f));return}const c=this.successCodes_.indexOf(u)!==-1;r(!0,new bl(c,i))})},n=(r,s)=>{const i=this.resolve_,o=this.reject_,l=s.connection;if(s.wasSuccessCode)try{const u=this.callback_(l,l.getResponse());fO(u)?i(u):i()}catch(u){o(u)}else if(l!==null){const u=Am();u.serverResponse=l.getErrorText(),this.errorCallback_?o(this.errorCallback_(l,u)):o(u)}else if(s.canceled){const u=this.appDelete_?sI():nI();o(u)}else{const u=tI();o(u)}};this.canceled_?n(!1,new bl(!1,null,!0)):this.backoffId_=hO(e,n,this.timeout_)}getPromise(){return this.promise_}cancel(e){this.canceled_=!0,this.appDelete_=e||!1,this.backoffId_!==null&&dO(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class bl{constructor(e,n,r){this.wasSuccessCode=e,this.connection=n,this.canceled=!!r}}function yO(t,e){e!==null&&e.length>0&&(t.Authorization="Firebase "+e)}function _O(t,e){t["X-Firebase-Storage-Version"]="webjs/"+(e??"AppManager")}function vO(t,e){e&&(t["X-Firebase-GMPID"]=e)}function wO(t,e){e!==null&&(t["X-Firebase-AppCheck"]=e)}function EO(t,e,n,r,s,i,o=!0,l=!1){const u=iI(t.urlParams),c=t.url+u,f=Object.assign({},t.headers);return vO(f,e),yO(f,n),_O(f,i),wO(f,r),new gO(c,t.method,f,t.body,t.successCodes,t.additionalRetryCodes,t.handler,t.errorHandler,t.timeout,t.progressCallback,s,o,l)}/**
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
 */function TO(){return typeof BlobBuilder<"u"?BlobBuilder:typeof WebKitBlobBuilder<"u"?WebKitBlobBuilder:void 0}function xO(...t){const e=TO();if(e!==void 0){const n=new e;for(let r=0;r<t.length;r++)n.append(t[r]);return n.getBlob()}else{if(Rm())return new Blob(t);throw new Ae(_e.UNSUPPORTED_ENVIRONMENT,"This browser doesn't seem to support creating Blobs")}}function IO(t,e,n){return t.webkitSlice?t.webkitSlice(e,n):t.mozSlice?t.mozSlice(e,n):t.slice?t.slice(e,n):null}/**
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
 */function SO(t){if(typeof atob>"u")throw lO("base-64");return atob(t)}/**
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
 */const mn={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"};class nd{constructor(e,n){this.data=e,this.contentType=n||null}}function kO(t,e){switch(t){case mn.RAW:return new nd(aI(e));case mn.BASE64:case mn.BASE64URL:return new nd(lI(t,e));case mn.DATA_URL:return new nd(AO(e),RO(e))}throw Am()}function aI(t){const e=[];for(let n=0;n<t.length;n++){let r=t.charCodeAt(n);if(r<=127)e.push(r);else if(r<=2047)e.push(192|r>>6,128|r&63);else if((r&64512)===55296)if(!(n<t.length-1&&(t.charCodeAt(n+1)&64512)===56320))e.push(239,191,189);else{const i=r,o=t.charCodeAt(++n);r=65536|(i&1023)<<10|o&1023,e.push(240|r>>18,128|r>>12&63,128|r>>6&63,128|r&63)}else(r&64512)===56320?e.push(239,191,189):e.push(224|r>>12,128|r>>6&63,128|r&63)}return new Uint8Array(e)}function CO(t){let e;try{e=decodeURIComponent(t)}catch{throw Wo(mn.DATA_URL,"Malformed data URL.")}return aI(e)}function lI(t,e){switch(t){case mn.BASE64:{const s=e.indexOf("-")!==-1,i=e.indexOf("_")!==-1;if(s||i)throw Wo(t,"Invalid character '"+(s?"-":"_")+"' found: is it base64url encoded?");break}case mn.BASE64URL:{const s=e.indexOf("+")!==-1,i=e.indexOf("/")!==-1;if(s||i)throw Wo(t,"Invalid character '"+(s?"+":"/")+"' found: is it base64 encoded?");e=e.replace(/-/g,"+").replace(/_/g,"/");break}}let n;try{n=SO(e)}catch(s){throw s.message.includes("polyfill")?s:Wo(t,"Invalid character found")}const r=new Uint8Array(n.length);for(let s=0;s<n.length;s++)r[s]=n.charCodeAt(s);return r}class uI{constructor(e){this.base64=!1,this.contentType=null;const n=e.match(/^data:([^,]+)?,/);if(n===null)throw Wo(mn.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");const r=n[1]||null;r!=null&&(this.base64=bO(r,";base64"),this.contentType=this.base64?r.substring(0,r.length-7):r),this.rest=e.substring(e.indexOf(",")+1)}}function AO(t){const e=new uI(t);return e.base64?lI(mn.BASE64,e.rest):CO(e.rest)}function RO(t){return new uI(t).contentType}function bO(t,e){return t.length>=e.length?t.substring(t.length-e.length)===e:!1}/**
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
 */class bn{constructor(e,n){let r=0,s="";Pv(e)?(this.data_=e,r=e.size,s=e.type):e instanceof ArrayBuffer?(n?this.data_=new Uint8Array(e):(this.data_=new Uint8Array(e.byteLength),this.data_.set(new Uint8Array(e))),r=this.data_.length):e instanceof Uint8Array&&(n?this.data_=e:(this.data_=new Uint8Array(e.length),this.data_.set(e)),r=e.length),this.size_=r,this.type_=s}size(){return this.size_}type(){return this.type_}slice(e,n){if(Pv(this.data_)){const r=this.data_,s=IO(r,e,n);return s===null?null:new bn(s)}else{const r=new Uint8Array(this.data_.buffer,e,n-e);return new bn(r,!0)}}static getBlob(...e){if(Rm()){const n=e.map(r=>r instanceof bn?r.data_:r);return new bn(xO.apply(null,n))}else{const n=e.map(o=>$c(o)?kO(mn.RAW,o).data:o.data_);let r=0;n.forEach(o=>{r+=o.byteLength});const s=new Uint8Array(r);let i=0;return n.forEach(o=>{for(let l=0;l<o.length;l++)s[i++]=o[l]}),new bn(s,!0)}}uploadData(){return this.data_}}/**
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
 */function cI(t){let e;try{e=JSON.parse(t)}catch{return null}return mO(e)?e:null}/**
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
 */function PO(t){if(t.length===0)return null;const e=t.lastIndexOf("/");return e===-1?"":t.slice(0,e)}function NO(t,e){const n=e.split("/").filter(r=>r.length>0).join("/");return t.length===0?n:t+"/"+n}function hI(t){const e=t.lastIndexOf("/",t.length-2);return e===-1?t:t.slice(e+1)}/**
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
 */function DO(t,e){return e}class dt{constructor(e,n,r,s){this.server=e,this.local=n||e,this.writable=!!r,this.xform=s||DO}}let Pl=null;function OO(t){return!$c(t)||t.length<2?t:hI(t)}function bm(){if(Pl)return Pl;const t=[];t.push(new dt("bucket")),t.push(new dt("generation")),t.push(new dt("metageneration")),t.push(new dt("name","fullPath",!0));function e(i,o){return OO(o)}const n=new dt("name");n.xform=e,t.push(n);function r(i,o){return o!==void 0?Number(o):o}const s=new dt("size");return s.xform=r,t.push(s),t.push(new dt("timeCreated")),t.push(new dt("updated")),t.push(new dt("md5Hash",null,!0)),t.push(new dt("cacheControl",null,!0)),t.push(new dt("contentDisposition",null,!0)),t.push(new dt("contentEncoding",null,!0)),t.push(new dt("contentLanguage",null,!0)),t.push(new dt("contentType",null,!0)),t.push(new dt("metadata","customMetadata",!0)),Pl=t,Pl}function VO(t,e){function n(){const r=t.bucket,s=t.fullPath,i=new Nt(r,s);return e._makeStorageReference(i)}Object.defineProperty(t,"ref",{get:n})}function LO(t,e,n){const r={};r.type="file";const s=n.length;for(let i=0;i<s;i++){const o=n[i];r[o.local]=o.xform(r,e[o.server])}return VO(r,t),r}function dI(t,e,n){const r=cI(e);return r===null?null:LO(t,r,n)}function MO(t,e,n,r){const s=cI(e);if(s===null||!$c(s.downloadTokens))return null;const i=s.downloadTokens;if(i.length===0)return null;const o=encodeURIComponent;return i.split(",").map(c=>{const f=t.bucket,p=t.fullPath,g="/b/"+o(f)+"/o/"+o(p),w=Gi(g,n,r),x=iI({alt:"media",token:c});return w+x})[0]}function fI(t,e){const n={},r=e.length;for(let s=0;s<r;s++){const i=e[s];i.writable&&(n[i.server]=t[i.local])}return JSON.stringify(n)}class Ls{constructor(e,n,r,s){this.url=e,this.method=n,this.handler=r,this.timeout=s,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[]}}/**
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
 */function Fn(t){if(!t)throw Am()}function Pm(t,e){function n(r,s){const i=dI(t,s,e);return Fn(i!==null),i}return n}function jO(t,e){function n(r,s){const i=dI(t,s,e);return Fn(i!==null),MO(i,s,t.host,t._protocol)}return n}function Ka(t){function e(n,r){let s;return n.getStatus()===401?n.getErrorText().includes("Firebase App Check token is invalid")?s=tO():s=eO():n.getStatus()===402?s=ZD(t.bucket):n.getStatus()===403?s=nO(t.path):s=r,s.status=n.getStatus(),s.serverResponse=r.serverResponse,s}return e}function Nm(t){const e=Ka(t);function n(r,s){let i=e(r,s);return r.getStatus()===404&&(i=JD(t.path)),i.serverResponse=s.serverResponse,i}return n}function UO(t,e,n){const r=e.fullServerUrl(),s=Gi(r,t.host,t._protocol),i="GET",o=t.maxOperationRetryTime,l=new Ls(s,i,Pm(t,n),o);return l.errorHandler=Nm(e),l}function FO(t,e,n){const r=e.fullServerUrl(),s=Gi(r,t.host,t._protocol),i="GET",o=t.maxOperationRetryTime,l=new Ls(s,i,jO(t,n),o);return l.errorHandler=Nm(e),l}function zO(t,e){const n=e.fullServerUrl(),r=Gi(n,t.host,t._protocol),s="DELETE",i=t.maxOperationRetryTime;function o(u,c){}const l=new Ls(r,s,o,i);return l.successCodes=[200,204],l.errorHandler=Nm(e),l}function BO(t,e){return t&&t.contentType||e&&e.type()||"application/octet-stream"}function pI(t,e,n){const r=Object.assign({},n);return r.fullPath=t.path,r.size=e.size(),r.contentType||(r.contentType=BO(null,e)),r}function mI(t,e,n,r,s){const i=e.bucketOnlyServerUrl(),o={"X-Goog-Upload-Protocol":"multipart"};function l(){let C="";for(let D=0;D<2;D++)C=C+Math.random().toString().slice(2);return C}const u=l();o["Content-Type"]="multipart/related; boundary="+u;const c=pI(e,r,s),f=fI(c,n),p="--"+u+`\r
Content-Type: application/json; charset=utf-8\r
\r
`+f+`\r
--`+u+`\r
Content-Type: `+c.contentType+`\r
\r
`,g=`\r
--`+u+"--",w=bn.getBlob(p,r,g);if(w===null)throw rI();const x={name:c.fullPath},b=Gi(i,t.host,t._protocol),P="POST",S=t.maxUploadRetryTime,v=new Ls(b,P,Pm(t,n),S);return v.urlParams=x,v.headers=o,v.body=w.uploadData(),v.errorHandler=Ka(e),v}class Ku{constructor(e,n,r,s){this.current=e,this.total=n,this.finalized=!!r,this.metadata=s||null}}function Dm(t,e){let n=null;try{n=t.getResponseHeader("X-Goog-Upload-Status")}catch{Fn(!1)}return Fn(!!n&&(e||["active"]).indexOf(n)!==-1),n}function $O(t,e,n,r,s){const i=e.bucketOnlyServerUrl(),o=pI(e,r,s),l={name:o.fullPath},u=Gi(i,t.host,t._protocol),c="POST",f={"X-Goog-Upload-Protocol":"resumable","X-Goog-Upload-Command":"start","X-Goog-Upload-Header-Content-Length":`${r.size()}`,"X-Goog-Upload-Header-Content-Type":o.contentType,"Content-Type":"application/json; charset=utf-8"},p=fI(o,n),g=t.maxUploadRetryTime;function w(b){Dm(b);let P;try{P=b.getResponseHeader("X-Goog-Upload-URL")}catch{Fn(!1)}return Fn($c(P)),P}const x=new Ls(u,c,w,g);return x.urlParams=l,x.headers=f,x.body=p,x.errorHandler=Ka(e),x}function qO(t,e,n,r){const s={"X-Goog-Upload-Command":"query"};function i(c){const f=Dm(c,["active","final"]);let p=null;try{p=c.getResponseHeader("X-Goog-Upload-Size-Received")}catch{Fn(!1)}p||Fn(!1);const g=Number(p);return Fn(!isNaN(g)),new Ku(g,r.size(),f==="final")}const o="POST",l=t.maxUploadRetryTime,u=new Ls(n,o,i,l);return u.headers=s,u.errorHandler=Ka(e),u}const Dv=256*1024;function HO(t,e,n,r,s,i,o,l){const u=new Ku(0,0);if(o?(u.current=o.current,u.total=o.total):(u.current=0,u.total=r.size()),r.size()!==u.total)throw oO();const c=u.total-u.current;let f=c;s>0&&(f=Math.min(f,s));const p=u.current,g=p+f;let w="";f===0?w="finalize":c===f?w="upload, finalize":w="upload";const x={"X-Goog-Upload-Command":w,"X-Goog-Upload-Offset":`${u.current}`},b=r.slice(p,g);if(b===null)throw rI();function P(D,j){const L=Dm(D,["active","final"]),E=u.current+f,_=r.size();let I;return L==="final"?I=Pm(e,i)(D,j):I=null,new Ku(E,_,L==="final",I)}const S="POST",v=e.maxUploadRetryTime,C=new Ls(n,S,P,v);return C.headers=x,C.body=b.uploadData(),C.progressCallback=l||null,C.errorHandler=Ka(t),C}const vt={RUNNING:"running",PAUSED:"paused",SUCCESS:"success",CANCELED:"canceled",ERROR:"error"};function rd(t){switch(t){case"running":case"pausing":case"canceling":return vt.RUNNING;case"paused":return vt.PAUSED;case"success":return vt.SUCCESS;case"canceled":return vt.CANCELED;case"error":return vt.ERROR;default:return vt.ERROR}}/**
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
 */class WO{constructor(e,n,r){if(pO(e)||n!=null||r!=null)this.next=e,this.error=n??void 0,this.complete=r??void 0;else{const i=e;this.next=i.next,this.error=i.error,this.complete=i.complete}}}/**
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
 */function zs(t){return(...e)=>{Promise.resolve().then(()=>t(...e))}}class GO{constructor(){this.sent_=!1,this.xhr_=new XMLHttpRequest,this.initXhr(),this.errorCode_=gs.NO_ERROR,this.sendPromise_=new Promise(e=>{this.xhr_.addEventListener("abort",()=>{this.errorCode_=gs.ABORT,e()}),this.xhr_.addEventListener("error",()=>{this.errorCode_=gs.NETWORK_ERROR,e()}),this.xhr_.addEventListener("load",()=>{e()})})}send(e,n,r,s,i){if(this.sent_)throw Eo("cannot .send() more than once");if(Rs(e)&&r&&(this.xhr_.withCredentials=!0),this.sent_=!0,this.xhr_.open(n,e,!0),i!==void 0)for(const o in i)i.hasOwnProperty(o)&&this.xhr_.setRequestHeader(o,i[o].toString());return s!==void 0?this.xhr_.send(s):this.xhr_.send(),this.sendPromise_}getErrorCode(){if(!this.sent_)throw Eo("cannot .getErrorCode() before sending");return this.errorCode_}getStatus(){if(!this.sent_)throw Eo("cannot .getStatus() before sending");try{return this.xhr_.status}catch{return-1}}getResponse(){if(!this.sent_)throw Eo("cannot .getResponse() before sending");return this.xhr_.response}getErrorText(){if(!this.sent_)throw Eo("cannot .getErrorText() before sending");return this.xhr_.statusText}abort(){this.xhr_.abort()}getResponseHeader(e){return this.xhr_.getResponseHeader(e)}addUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.addEventListener("progress",e)}removeUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.removeEventListener("progress",e)}}class KO extends GO{initXhr(){this.xhr_.responseType="text"}}function fr(){return new KO}/**
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
 */class QO{isExponentialBackoffExpired(){return this.sleepTime>this.maxSleepTime}constructor(e,n,r=null){this._transferred=0,this._needToFetchStatus=!1,this._needToFetchMetadata=!1,this._observers=[],this._error=void 0,this._uploadUrl=void 0,this._request=void 0,this._chunkMultiplier=1,this._resolve=void 0,this._reject=void 0,this._ref=e,this._blob=n,this._metadata=r,this._mappings=bm(),this._resumable=this._shouldDoResumable(this._blob),this._state="running",this._errorHandler=s=>{if(this._request=void 0,this._chunkMultiplier=1,s._codeEquals(_e.CANCELED))this._needToFetchStatus=!0,this.completeTransitions_();else{const i=this.isExponentialBackoffExpired();if(oI(s.status,[]))if(i)s=tI();else{this.sleepTime=Math.max(this.sleepTime*2,YD),this._needToFetchStatus=!0,this.completeTransitions_();return}this._error=s,this._transition("error")}},this._metadataErrorHandler=s=>{this._request=void 0,s._codeEquals(_e.CANCELED)?this.completeTransitions_():(this._error=s,this._transition("error"))},this.sleepTime=0,this.maxSleepTime=this._ref.storage.maxUploadRetryTime,this._promise=new Promise((s,i)=>{this._resolve=s,this._reject=i,this._start()}),this._promise.then(null,()=>{})}_makeProgressCallback(){const e=this._transferred;return n=>this._updateProgress(e+n)}_shouldDoResumable(e){return e.size()>256*1024}_start(){this._state==="running"&&this._request===void 0&&(this._resumable?this._uploadUrl===void 0?this._createResumable():this._needToFetchStatus?this._fetchStatus():this._needToFetchMetadata?this._fetchMetadata():this.pendingTimeout=setTimeout(()=>{this.pendingTimeout=void 0,this._continueUpload()},this.sleepTime):this._oneShotUpload())}_resolveToken(e){Promise.all([this._ref.storage._getAuthToken(),this._ref.storage._getAppCheckToken()]).then(([n,r])=>{switch(this._state){case"running":e(n,r);break;case"canceling":this._transition("canceled");break;case"pausing":this._transition("paused");break}})}_createResumable(){this._resolveToken((e,n)=>{const r=$O(this._ref.storage,this._ref._location,this._mappings,this._blob,this._metadata),s=this._ref.storage._makeRequest(r,fr,e,n);this._request=s,s.getPromise().then(i=>{this._request=void 0,this._uploadUrl=i,this._needToFetchStatus=!1,this.completeTransitions_()},this._errorHandler)})}_fetchStatus(){const e=this._uploadUrl;this._resolveToken((n,r)=>{const s=qO(this._ref.storage,this._ref._location,e,this._blob),i=this._ref.storage._makeRequest(s,fr,n,r);this._request=i,i.getPromise().then(o=>{o=o,this._request=void 0,this._updateProgress(o.current),this._needToFetchStatus=!1,o.finalized&&(this._needToFetchMetadata=!0),this.completeTransitions_()},this._errorHandler)})}_continueUpload(){const e=Dv*this._chunkMultiplier,n=new Ku(this._transferred,this._blob.size()),r=this._uploadUrl;this._resolveToken((s,i)=>{let o;try{o=HO(this._ref._location,this._ref.storage,r,this._blob,e,this._mappings,n,this._makeProgressCallback())}catch(u){this._error=u,this._transition("error");return}const l=this._ref.storage._makeRequest(o,fr,s,i,!1);this._request=l,l.getPromise().then(u=>{this._increaseMultiplier(),this._request=void 0,this._updateProgress(u.current),u.finalized?(this._metadata=u.metadata,this._transition("success")):this.completeTransitions_()},this._errorHandler)})}_increaseMultiplier(){Dv*this._chunkMultiplier*2<32*1024*1024&&(this._chunkMultiplier*=2)}_fetchMetadata(){this._resolveToken((e,n)=>{const r=UO(this._ref.storage,this._ref._location,this._mappings),s=this._ref.storage._makeRequest(r,fr,e,n);this._request=s,s.getPromise().then(i=>{this._request=void 0,this._metadata=i,this._transition("success")},this._metadataErrorHandler)})}_oneShotUpload(){this._resolveToken((e,n)=>{const r=mI(this._ref.storage,this._ref._location,this._mappings,this._blob,this._metadata),s=this._ref.storage._makeRequest(r,fr,e,n);this._request=s,s.getPromise().then(i=>{this._request=void 0,this._metadata=i,this._updateProgress(this._blob.size()),this._transition("success")},this._errorHandler)})}_updateProgress(e){const n=this._transferred;this._transferred=e,this._transferred!==n&&this._notifyObservers()}_transition(e){if(this._state!==e)switch(e){case"canceling":case"pausing":this._state=e,this._request!==void 0?this._request.cancel():this.pendingTimeout&&(clearTimeout(this.pendingTimeout),this.pendingTimeout=void 0,this.completeTransitions_());break;case"running":const n=this._state==="paused";this._state=e,n&&(this._notifyObservers(),this._start());break;case"paused":this._state=e,this._notifyObservers();break;case"canceled":this._error=nI(),this._state=e,this._notifyObservers();break;case"error":this._state=e,this._notifyObservers();break;case"success":this._state=e,this._notifyObservers();break}}completeTransitions_(){switch(this._state){case"pausing":this._transition("paused");break;case"canceling":this._transition("canceled");break;case"running":this._start();break}}get snapshot(){const e=rd(this._state);return{bytesTransferred:this._transferred,totalBytes:this._blob.size(),state:e,metadata:this._metadata,task:this,ref:this._ref}}on(e,n,r,s){const i=new WO(n||void 0,r||void 0,s||void 0);return this._addObserver(i),()=>{this._removeObserver(i)}}then(e,n){return this._promise.then(e,n)}catch(e){return this.then(null,e)}_addObserver(e){this._observers.push(e),this._notifyObserver(e)}_removeObserver(e){const n=this._observers.indexOf(e);n!==-1&&this._observers.splice(n,1)}_notifyObservers(){this._finishPromise(),this._observers.slice().forEach(n=>{this._notifyObserver(n)})}_finishPromise(){if(this._resolve!==void 0){let e=!0;switch(rd(this._state)){case vt.SUCCESS:zs(this._resolve.bind(null,this.snapshot))();break;case vt.CANCELED:case vt.ERROR:const n=this._reject;zs(n.bind(null,this._error))();break;default:e=!1;break}e&&(this._resolve=void 0,this._reject=void 0)}}_notifyObserver(e){switch(rd(this._state)){case vt.RUNNING:case vt.PAUSED:e.next&&zs(e.next.bind(e,this.snapshot))();break;case vt.SUCCESS:e.complete&&zs(e.complete.bind(e))();break;case vt.CANCELED:case vt.ERROR:e.error&&zs(e.error.bind(e,this._error))();break;default:e.error&&zs(e.error.bind(e,this._error))()}}resume(){const e=this._state==="paused"||this._state==="pausing";return e&&this._transition("running"),e}pause(){const e=this._state==="running";return e&&this._transition("pausing"),e}cancel(){const e=this._state==="running"||this._state==="pausing";return e&&this._transition("canceling"),e}}/**
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
 */class ks{constructor(e,n){this._service=e,n instanceof Nt?this._location=n:this._location=Nt.makeFromUrl(n,e.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(e,n){return new ks(e,n)}get root(){const e=new Nt(this._location.bucket,"");return this._newRef(this._service,e)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return hI(this._location.path)}get storage(){return this._service}get parent(){const e=PO(this._location.path);if(e===null)return null;const n=new Nt(this._location.bucket,e);return new ks(this._service,n)}_throwIfRoot(e){if(this._location.path==="")throw uO(e)}}function XO(t,e,n){t._throwIfRoot("uploadBytes");const r=mI(t.storage,t._location,bm(),new bn(e,!0),n);return t.storage.makeRequestWithTokens(r,fr).then(s=>({metadata:s,ref:t}))}function YO(t,e,n){return t._throwIfRoot("uploadBytesResumable"),new QO(t,new bn(e),n)}function JO(t){t._throwIfRoot("getDownloadURL");const e=FO(t.storage,t._location,bm());return t.storage.makeRequestWithTokens(e,fr).then(n=>{if(n===null)throw aO();return n})}function ZO(t){t._throwIfRoot("deleteObject");const e=zO(t.storage,t._location);return t.storage.makeRequestWithTokens(e,fr)}function eV(t,e){const n=NO(t._location.path,e),r=new Nt(t._location.bucket,n);return new ks(t.storage,r)}/**
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
 */function tV(t){return/^[A-Za-z]+:\/\//.test(t)}function nV(t,e){return new ks(t,e)}function gI(t,e){if(t instanceof Om){const n=t;if(n._bucket==null)throw iO();const r=new ks(n,n._bucket);return e!=null?gI(r,e):r}else return e!==void 0?eV(t,e):t}function rV(t,e){if(e&&tV(e)){if(t instanceof Om)return nV(t,e);throw bf("To use ref(service, url), the first argument must be a Storage instance.")}else return gI(t,e)}function Ov(t,e){const n=e==null?void 0:e[eI];return n==null?null:Nt.makeFromBucketSpec(n,t)}function sV(t,e,n,r={}){t.host=`${e}:${n}`;const s=Rs(e);s&&bp(`https://${t.host}/b`),t._isUsingEmulator=!0,t._protocol=s?"https":"http";const{mockUserToken:i}=r;i&&(t._overrideAuthToken=typeof i=="string"?i:kE(i,t.app.options.projectId))}class Om{constructor(e,n,r,s,i,o=!1){this.app=e,this._authProvider=n,this._appCheckProvider=r,this._url=s,this._firebaseVersion=i,this._isUsingEmulator=o,this._bucket=null,this._host=Zx,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=QD,this._maxUploadRetryTime=XD,this._requests=new Set,s!=null?this._bucket=Nt.makeFromBucketSpec(s,this._host):this._bucket=Ov(this._host,this.app.options)}get host(){return this._host}set host(e){this._host=e,this._url!=null?this._bucket=Nt.makeFromBucketSpec(this._url,e):this._bucket=Ov(e,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(e){Nv("time",0,Number.POSITIVE_INFINITY,e),this._maxUploadRetryTime=e}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(e){Nv("time",0,Number.POSITIVE_INFINITY,e),this._maxOperationRetryTime=e}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const e=this._authProvider.getImmediate({optional:!0});if(e){const n=await e.getToken();if(n!==null)return n.accessToken}return null}async _getAppCheckToken(){if(At(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=this._appCheckProvider.getImmediate({optional:!0});return e?(await e.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(e=>e.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(e){return new ks(this,e)}_makeRequest(e,n,r,s,i=!0){if(this._deleted)return new cO(sI());{const o=EO(e,this._appId,r,s,n,this._firebaseVersion,i,this._isUsingEmulator);return this._requests.add(o),o.getPromise().then(()=>this._requests.delete(o),()=>this._requests.delete(o)),o}}async makeRequestWithTokens(e,n){const[r,s]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(e,n,r,s).getPromise()}}const Vv="@firebase/storage",Lv="0.14.3";/**
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
 */const yI="storage";function iV(t,e,n){return t=ce(t),XO(t,e,n)}function oV(t,e,n){return t=ce(t),YO(t,e,n)}function _I(t){return t=ce(t),JO(t)}function aV(t){return t=ce(t),ZO(t)}function Pf(t,e){return t=ce(t),rV(t,e)}function lV(t=Dp(),e){t=ce(t);const r=gc(t,yI).getImmediate({identifier:e}),s=xE("storage");return s&&uV(r,...s),r}function uV(t,e,n,r={}){sV(t,e,n,r)}function cV(t,{instanceIdentifier:e}){const n=t.getProvider("app").getImmediate(),r=t.getProvider("auth-internal"),s=t.getProvider("app-check-internal");return new Om(n,r,s,e,bs)}function hV(){Ts(new Vr(yI,cV,"PUBLIC").setMultipleInstances(!0)),_n(Vv,Lv,""),_n(Vv,Lv,"esm2020")}hV();const dV={apiKey:"AIzaSyDqVkAhkXALm3hLcrmzjiaS3flUezPFe2Q",authDomain:"barberia-elegance.firebaseapp.com",projectId:"barberia-elegance",storageBucket:"barberia-elegance.firebasestorage.app",messagingSenderId:"515311607907",appId:"1:515311607907:web:8add6005144015c5e85856"},Vm=a_().length?a_()[0]:RE(dV),xa=GD(Vm);D2(xa,$x).catch(()=>{});const Pi=tx(Vm),Nf=lV(Vm),fV={"barberiaelegance.synaptechspa.cl":"elegance","barberiaferraza.synaptechspa.cl":"ferraza","gitananails.synaptechspa.cl":"gitana"};function qc(){const e=new URL(window.location.href).searchParams.get("local");if(e)return sessionStorage.setItem("saas_current_tenant",e),e;const n=fV[window.location.hostname.toLowerCase()];return n||sessionStorage.getItem("saas_current_tenant")||"elegance"}function Ee(t){const e=qc();return e==="elegance"?Sf(Pi,t):Sf(Pi,`tenants/${e}/${t}`)}function Qu(t,e){return We(Ee(t),e)}const Mv={elegance:{name:"𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐁𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩",accent:"emerald",emoji:"✂️"},ferraza:{name:"Barbería Ferraza",accent:"slate",emoji:"✂️"},gitana:{name:"Gitana Nails Studio",accent:"pink",emoji:"💅"}},vI=O.createContext(null);function pV({children:t}){const e=O.useMemo(()=>qc(),[]),n=Mv[e]??Mv.elegance;return d.jsx(vI.Provider,{value:{id:e,...n},children:t})}const wI=()=>O.useContext(vI),EI=O.createContext(null);function mV({children:t}){const[e,n]=O.useState(void 0),[r,s]=O.useState(null),[i,o]=O.useState(!0);return O.useEffect(()=>L2(xa,async u=>{if(!u){n(null),s(null),o(!1);return}n(u);try{const c=await kf(Qu("barberos",u.uid));if(c.exists()){const f=c.data();if(f._mainDocId){const p=await kf(Qu("barberos",f._mainDocId));s(p.exists()&&p.data().rol||"barbero")}else s(f.rol||"barbero")}else s("barbero")}catch{s("barbero")}o(!1)}),[]),d.jsx(EI.Provider,{value:{user:e,role:r,loading:i},children:t})}const TI=()=>O.useContext(EI);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gV=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),xI=(...t)=>t.filter((e,n,r)=>!!e&&r.indexOf(e)===n).join(" ");/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var yV={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _V=O.forwardRef(({color:t="currentColor",size:e=24,strokeWidth:n=2,absoluteStrokeWidth:r,className:s="",children:i,iconNode:o,...l},u)=>O.createElement("svg",{ref:u,...yV,width:e,height:e,stroke:t,strokeWidth:r?Number(n)*24/Number(e):n,className:xI("lucide",s),...l},[...o.map(([c,f])=>O.createElement(c,f)),...Array.isArray(i)?i:[i]]));/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ie=(t,e)=>{const n=O.forwardRef(({className:r,...s},i)=>O.createElement(_V,{ref:i,iconNode:e,className:xI(`lucide-${gV(t)}`,r),...s}));return n.displayName=`${t}`,n};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const II=ie("BarChart3",[["path",{d:"M3 3v18h18",key:"1s2lah"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vV=ie("CalendarCheck",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"m9 16 2 2 4-4",key:"19s6y9"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wV=ie("CalendarDays",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const EV=ie("Calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const TV=ie("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const SI=ie("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xV=ie("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const IV=ie("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const SV=ie("DollarSign",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kV=ie("Ellipsis",[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"19",cy:"12",r:"1",key:"1wjl8i"}],["circle",{cx:"5",cy:"12",r:"1",key:"1pcz8c"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const CV=ie("Gift",[["rect",{x:"3",y:"8",width:"18",height:"4",rx:"1",key:"bkv52"}],["path",{d:"M12 8v13",key:"1c76mn"}],["path",{d:"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7",key:"6wjy6b"}],["path",{d:"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5",key:"1ihvrl"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kI=ie("ImageOff",[["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}],["path",{d:"M10.41 10.41a2 2 0 1 1-2.83-2.83",key:"1bzlo9"}],["line",{x1:"13.5",x2:"6",y1:"13.5",y2:"21",key:"1q0aeu"}],["line",{x1:"18",x2:"21",y1:"12",y2:"15",key:"5mozeu"}],["path",{d:"M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59",key:"mmje98"}],["path",{d:"M21 15V5a2 2 0 0 0-2-2H9",key:"43el77"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const CI=ie("Images",[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18",key:"nf6bnh"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2",key:"12espp"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const AV=ie("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const RV=ie("Menu",[["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6",key:"1owob3"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18",key:"yk5zj1"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bV=ie("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const PV=ie("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lm=ie("Pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const NV=ie("Phone",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ki=ie("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const DV=ie("PowerOff",[["path",{d:"M18.36 6.64A9 9 0 0 1 20.77 15",key:"dxknvb"}],["path",{d:"M6.16 6.16a9 9 0 1 0 12.68 12.68",key:"1x7qb5"}],["path",{d:"M12 2v4",key:"3427ic"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const OV=ie("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const AI=ie("Scissors",[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const VV=ie("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const LV=ie("ShieldCheck",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const RI=ie("ShoppingBag",[["path",{d:"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z",key:"hou9p0"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M16 10a4 4 0 0 1-8 0",key:"1ltviw"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const MV=ie("Star",[["polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",key:"8f66p6"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jV=ie("Tag",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hc=ie("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const UV=ie("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ia=ie("Trophy",[["path",{d:"M6 9H4.5a2.5 2.5 0 0 1 0-5H6",key:"17hqa7"}],["path",{d:"M18 9h1.5a2.5 2.5 0 0 0 0-5H18",key:"lmptdp"}],["path",{d:"M4 22h16",key:"57wxv0"}],["path",{d:"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",key:"1nw9bq"}],["path",{d:"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",key:"1np0yb"}],["path",{d:"M18 2H6v7a6 6 0 0 0 12 0V2Z",key:"u46fv3"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bI=ie("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const PI=ie("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const FV=ie("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mm=ie("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]),zV=[{to:"agenda",label:"Agenda",Icon:wV,adminOnly:!1},{to:"servicios",label:"Servicios",Icon:AI},{to:"equipo",label:"Equipo",Icon:FV},{to:"clientes",label:"Clientes",Icon:MV},{to:"premios",label:"Premios",Icon:Ia},{to:"productos",label:"Productos",Icon:RI},{to:"lookbook",label:"Lookbook",Icon:CI},{to:"metricas",label:"Métricas",Icon:II}];function jv({onClose:t}){const e=wI(),{role:n}=TI(),r=n==="admin"||n==="jefe",s=zV.filter(i=>!(i.to==="agenda"&&r));return d.jsxs("aside",{className:"flex flex-col h-full bg-slate-900 border-r border-slate-800",children:[d.jsxs("div",{className:"px-5 pt-6 pb-5 border-b border-slate-800",children:[d.jsx("p",{className:"text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1",children:"Panel Admin"}),d.jsx("h1",{className:"text-sm font-bold text-white leading-tight",children:e.name})]}),d.jsx("nav",{className:"flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar",children:s.map(({to:i,label:o,Icon:l})=>d.jsx(UC,{to:i,onClick:t,className:({isActive:u})=>`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${u?"bg-emerald-500/10 text-emerald-400":"text-slate-400 hover:text-white hover:bg-slate-800"}`,children:({isActive:u})=>d.jsxs(d.Fragment,{children:[d.jsx(l,{size:17,strokeWidth:u?2.5:2}),d.jsx("span",{className:"flex-1",children:o}),u&&d.jsx(SI,{size:14,className:"text-emerald-500 opacity-60"})]})},i))}),d.jsx("div",{className:"px-3 py-4 border-t border-slate-800",children:d.jsxs("button",{onClick:()=>M2(xa),className:"flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all",children:[d.jsx(AV,{size:17}),"Cerrar sesión"]})})]})}function BV({children:t}){const[e,n]=O.useState(!1);return d.jsxs("div",{className:"flex h-screen bg-slate-950 overflow-hidden",children:[d.jsx("div",{className:"hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0",children:d.jsx(jv,{})}),e&&d.jsxs("div",{className:"fixed inset-0 z-50 flex lg:hidden animate-fade-in",children:[d.jsx("div",{className:"absolute inset-0 bg-black/60 backdrop-blur-sm",onClick:()=>n(!1)}),d.jsx("div",{className:"relative z-10 w-64 flex flex-col animate-slide-in-right",children:d.jsx(jv,{onClose:()=>n(!1)})})]}),d.jsxs("div",{className:"flex-1 flex flex-col min-w-0 overflow-hidden",children:[d.jsxs("header",{className:"lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0",children:[d.jsx("button",{onClick:()=>n(!0),className:"p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all",children:d.jsx(RV,{size:20})}),d.jsx("span",{className:"text-sm font-semibold text-white",children:"Panel Admin"})]}),d.jsx("main",{className:"flex-1 overflow-y-auto bg-slate-950 p-5 lg:p-7",children:t})]})]})}function In(t,e=[]){const[n,r]=O.useState([]),[s,i]=O.useState(!0),[o,l]=O.useState(null);return O.useEffect(()=>{const u=Ee(t),c=e.length?mm(u,...e):u;return jc(c,p=>{r(p.docs.map(g=>({id:g.id,...g.data()}))),i(!1)},p=>{l(p),i(!1)})},[t]),{data:n,loading:s,error:o}}const sd={categoriasServicio:["Otro","Cortes","Combo","Barba","Extras"]};function $V(){const[t,e]=O.useState(sd),[n,r]=O.useState(!0);return O.useEffect(()=>{const i=Qu("configuracion","main");return jc(i,l=>{e(l.exists()?{...sd,...l.data()}:sd),r(!1)},()=>r(!1))},[]),{config:t,loading:n,updateConfig:i=>gx(Qu("configuracion","main"),i,{merge:!0})}}function Wc({isOpen:t,onClose:e,title:n,subtitle:r,children:s,footer:i,maxWidth:o="max-w-md"}){return O.useEffect(()=>{if(!t)return;const l=u=>u.key==="Escape"&&e();return window.addEventListener("keydown",l),()=>window.removeEventListener("keydown",l)},[t,e]),t?d.jsxs("div",{className:"fixed inset-0 z-50 flex justify-end animate-fade-in",children:[d.jsx("div",{className:"absolute inset-0 bg-black/55 backdrop-blur-sm",onClick:e}),d.jsxs("div",{className:`relative z-10 w-full ${o} flex flex-col bg-slate-900 shadow-2xl border-l border-slate-800 animate-slide-in-right`,children:[d.jsxs("div",{className:"flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-slate-800 shrink-0",children:[d.jsxs("div",{children:[d.jsx("h2",{className:"text-base font-semibold text-white",children:n}),r&&d.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:r})]}),d.jsx("button",{onClick:e,className:"p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all shrink-0",children:d.jsx(Mm,{size:18})})]}),d.jsx("div",{className:"flex-1 overflow-y-auto px-6 py-5 no-scrollbar",children:s}),i&&d.jsx("div",{className:"px-6 py-4 border-t border-slate-800 shrink-0",children:i})]})]}):null}const qV=["ph-scissors","ph-user-focus","ph-mask-happy","ph-magic-wand","ph-sparkle","ph-star","ph-crown","ph-fire","ph-drop","ph-wave","ph-lightning","ph-paint-brush","ph-gift","ph-eye","ph-smiley","ph-flower","ph-leaf","ph-diamond","ph-trophy","ph-confetti","ph-clock","ph-sun","ph-moon","ph-wind"],Uv={nombre:"",categoria:"Otro",precio:"",duracion:"",icono:"ph-scissors"};function HV({value:t,onChange:e}){const[n,r]=O.useState(!1);return d.jsxs("div",{children:[d.jsxs("button",{type:"button",onClick:()=>r(s=>!s),className:"flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-slate-600 transition-colors",children:[d.jsx("i",{className:`ph ${t} text-base text-emerald-400`}),d.jsx("span",{children:"Elegir ícono"})]}),n&&d.jsx("div",{className:"mt-2 bg-slate-800 border border-slate-700 rounded-xl p-3 grid grid-cols-8 gap-1.5",children:qV.map(s=>d.jsx("button",{type:"button",title:s.replace("ph-",""),onClick:()=>{e(s),r(!1)},className:`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${t===s?"border-emerald-500 bg-emerald-500/10":"border-slate-600 hover:border-slate-400"}`,children:d.jsx("i",{className:`ph ${s} text-base ${t===s?"text-emerald-400":"text-slate-400"}`})},s))})]})}function WV(){const{data:t,loading:e}=In("servicios",[Ba("orden")]),{config:n,updateConfig:r}=$V(),s=n.categoriasServicio??["Otro"],[i,o]=O.useState(!1),[l,u]=O.useState(null),[c,f]=O.useState(Uv),[p,g]=O.useState(!1),[w,x]=O.useState(""),[b,P]=O.useState(null),S=O.useRef(null),v=()=>{u(null),f({...Uv,categoria:s[0]||"Otro"}),o(!0)},C=T=>{u(T.id),f({nombre:T.nombre,categoria:T.categoria||"Otro",precio:T.precio,duracion:T.duracion,icono:T.icono||"ph-scissors"}),o(!0)},D=async()=>{if(!(!c.nombre||!c.precio||!c.duracion)){g(!0);try{const T={nombre:c.nombre,categoria:c.categoria,precio:Number(c.precio),duracion:Number(c.duracion),icono:c.icono||"ph-scissors",updatedAt:qr()};l?await Un(We(Ee("servicios"),l),T):await qa(Ee("servicios"),{...T,orden:t.length,createdAt:qr()}),o(!1)}finally{g(!1)}}},j=async T=>{confirm("¿Eliminar este servicio?")&&await $a(We(Ee("servicios"),T))},L=async T=>{if(!S.current||S.current===T)return;const A=[...t],k=A.findIndex(Gt=>Gt.id===S.current),se=A.findIndex(Gt=>Gt.id===T);if(k===-1||se===-1)return;const[Ze]=A.splice(k,1);A.splice(se,0,Ze),S.current=null,P(null);const ln=_x(Pi);A.forEach((Gt,$)=>ln.update(We(Ee("servicios"),Gt.id),{orden:$})),await ln.commit()},E=async()=>{const T=w.trim();T&&(s.map(A=>A.toLowerCase()).includes(T.toLowerCase())||(await r({categoriasServicio:[...s,T]}),x("")))},_=async T=>r({categoriasServicio:s.filter(A=>A!==T)}),I="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",R="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5";return d.jsxs("div",{className:"flex flex-col lg:flex-row gap-6 items-start",children:[d.jsxs("div",{className:"flex-1 min-w-0",children:[d.jsxs("div",{className:"flex items-center justify-between mb-4",children:[d.jsxs("div",{children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Servicios"}),d.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:"Arrastra para reordenar. El orden se guarda en Firestore."})]}),d.jsxs("button",{onClick:v,className:"flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors",children:[d.jsx(Ki,{size:16})," Nuevo servicio"]})]}),e?d.jsx("div",{className:"flex justify-center py-16",children:d.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):t.length===0?d.jsxs("div",{className:"flex flex-col items-center py-16 text-slate-600",children:[d.jsx(jV,{size:32,className:"mb-3"}),d.jsx("p",{className:"text-sm",children:"No hay servicios creados."})]}):d.jsx("div",{className:"space-y-2",children:t.map(T=>d.jsxs("div",{draggable:!0,onDragStart:()=>{S.current=T.id},onDragEnd:()=>{S.current=null,P(null)},onDragOver:A=>{A.preventDefault(),P(T.id)},onDragLeave:()=>P(null),onDrop:()=>L(T.id),className:`flex items-center gap-4 bg-slate-900 border rounded-xl p-4 transition-all cursor-grab active:cursor-grabbing select-none ${b===T.id?"border-emerald-500 bg-emerald-500/5":"border-slate-800 hover:border-slate-700"}`,children:[d.jsxs("svg",{className:"text-slate-600 shrink-0",width:"12",height:"18",viewBox:"0 0 12 18",fill:"currentColor",children:[d.jsx("circle",{cx:"3",cy:"3",r:"1.5"}),d.jsx("circle",{cx:"9",cy:"3",r:"1.5"}),d.jsx("circle",{cx:"3",cy:"9",r:"1.5"}),d.jsx("circle",{cx:"9",cy:"9",r:"1.5"}),d.jsx("circle",{cx:"3",cy:"15",r:"1.5"}),d.jsx("circle",{cx:"9",cy:"15",r:"1.5"})]}),d.jsx("div",{className:"w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0",children:d.jsx("i",{className:`ph ${T.icono||"ph-scissors"} text-base text-emerald-400`})}),d.jsxs("div",{className:"flex-1 min-w-0",children:[d.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[d.jsx("h4",{className:"font-bold text-white text-sm",children:T.nombre}),d.jsx("span",{className:"text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-950 text-slate-400 border-slate-700",children:T.categoria||"Otro"})]}),d.jsxs("p",{className:"text-xs text-slate-400 mt-0.5",children:["$",Number(T.precio||0).toLocaleString("es-CL")," · ",T.duracion," min"]})]}),d.jsxs("div",{className:"flex items-center gap-2 shrink-0",children:[d.jsx("button",{onClick:()=>C(T),className:"p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-colors",children:d.jsx("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:d.jsx("path",{d:"M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"})})}),d.jsx("button",{onClick:()=>j(T.id),className:"p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors",children:d.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[d.jsx("polyline",{points:"3,6 5,6 21,6"}),d.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"})]})})]})]},T.id))})]}),d.jsx("div",{className:"w-full lg:w-60 shrink-0",children:d.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-4",children:[d.jsx("h2",{className:"text-sm font-semibold text-white mb-3",children:"Categorías"}),d.jsx("div",{className:"space-y-1.5 mb-3",children:s.map(T=>d.jsxs("div",{className:"flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2",children:[d.jsx("span",{className:"text-xs text-white",children:T}),d.jsx("button",{onClick:()=>_(T),className:"text-slate-600 hover:text-red-400 transition-colors p-0.5 rounded",children:d.jsxs("svg",{width:"11",height:"11",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:[d.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),d.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]})})]},T))}),d.jsxs("div",{className:"flex gap-1.5",children:[d.jsx("input",{className:"flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",placeholder:"Nueva categoría...",value:w,onChange:T=>x(T.target.value),onKeyDown:T=>T.key==="Enter"&&E()}),d.jsx("button",{onClick:E,className:"px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors",children:"+"})]})]})}),d.jsx(Wc,{isOpen:i,onClose:()=>o(!1),title:l?"Editar servicio":"Nuevo servicio",footer:d.jsxs("div",{className:"flex gap-3 justify-end",children:[d.jsx("button",{onClick:()=>o(!1),className:"px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),d.jsxs("button",{onClick:D,disabled:p||!c.nombre||!c.precio||!c.duracion,className:"px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2",children:[p&&d.jsx("span",{className:"w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"}),l?"Guardar":"Crear servicio"]})]}),children:d.jsxs("div",{className:"space-y-4",children:[d.jsxs("div",{children:[d.jsx("label",{className:R,children:"Nombre del servicio"}),d.jsx("input",{className:I,placeholder:"Corte clásico",value:c.nombre,onChange:T=>f(A=>({...A,nombre:T.target.value}))})]}),d.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[d.jsxs("div",{children:[d.jsx("label",{className:R,children:"Precio ($)"}),d.jsx("input",{className:I,type:"number",placeholder:"12000",value:c.precio,onChange:T=>f(A=>({...A,precio:T.target.value}))})]}),d.jsxs("div",{children:[d.jsx("label",{className:R,children:"Duración (min)"}),d.jsx("input",{className:I,type:"number",placeholder:"45",value:c.duracion,onChange:T=>f(A=>({...A,duracion:T.target.value}))})]})]}),d.jsxs("div",{children:[d.jsx("label",{className:R,children:"Categoría"}),d.jsx("select",{className:I,value:c.categoria,onChange:T=>f(A=>({...A,categoria:T.target.value})),children:s.map(T=>d.jsx("option",{value:T,children:T},T))})]}),d.jsxs("div",{children:[d.jsx("label",{className:R,children:"Ícono"}),d.jsx(HV,{value:c.icono,onChange:T=>f(A=>({...A,icono:T}))})]})]})})]})}const jm=8,GV=20,Sa=30,Fv=(GV-jm)*(60/Sa);function KV(t){return t.toISOString().split("T")[0]}function QV(t){const[e,n]=t.split(":").map(Number);return(e-jm)*(60/Sa)+Math.floor(n/Sa)}function XV(t){return Math.max(1,Math.round(t/Sa))}const zv={Confirmada:"bg-emerald-500/20 border-emerald-500/40 text-emerald-300",Cancelada:"bg-red-500/10     border-red-500/30     text-red-400",Completada:"bg-blue-500/10    border-blue-500/30    text-blue-400"};function YV({cita:t}){const e=QV(t.hora),n=XV(t.duracion||30),r=zv[t.estado]??zv.Confirmada;return d.jsxs("div",{title:`${t.servicioNombre} · ${t.clienteNombre}`,className:`absolute inset-x-0.5 rounded-md border px-2 py-1 overflow-hidden cursor-pointer hover:brightness-110 transition-all text-xs ${r}`,style:{top:`${e*40}px`,height:`${n*40-4}px`},children:[d.jsx("p",{className:"font-semibold truncate leading-tight",children:t.clienteNombre||"Cliente"}),d.jsx("p",{className:"truncate text-[10px] opacity-75",children:t.servicioNombre})]})}function JV(){const[t,e]=O.useState(new Date),n=KV(t),{data:r}=In("barberos"),{data:s}=In("citas",[gm("fecha","==",n)]),i=O.useMemo(()=>r.filter(u=>u.disponible!==!1),[r]),o=u=>{const c=new Date(t);c.setDate(c.getDate()+u),e(c)},l=Array.from({length:Fv},(u,c)=>{const f=c*Sa,p=jm+Math.floor(f/60),g=f%60;return`${String(p).padStart(2,"0")}:${String(g).padStart(2,"0")}`});return d.jsxs("div",{className:"flex flex-col h-full gap-4",children:[d.jsxs("div",{className:"flex items-center justify-between shrink-0",children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Agenda"}),d.jsxs("div",{className:"flex items-center gap-2",children:[d.jsx("button",{onClick:()=>o(-1),className:"p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all",children:d.jsx(TV,{size:18})}),d.jsx("span",{className:"text-sm font-semibold text-white min-w-[130px] text-center capitalize",children:t.toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"})}),d.jsx("button",{onClick:()=>o(1),className:"p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all",children:d.jsx(SI,{size:18})}),d.jsx("button",{onClick:()=>e(new Date),className:"ml-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all",children:"Hoy"})]})]}),d.jsx("div",{className:"flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-auto no-scrollbar",children:d.jsxs("div",{className:"flex min-w-max",children:[d.jsxs("div",{className:"w-16 shrink-0 sticky left-0 bg-slate-900 z-10 border-r border-slate-800",children:[d.jsx("div",{className:"h-10 border-b border-slate-800"})," ",l.map((u,c)=>d.jsx("div",{className:"h-10 flex items-center justify-end pr-3 text-[10px] font-mono text-slate-600 border-b border-slate-800/60",children:u.endsWith(":00")?u:""},c))]}),i.length===0?d.jsx("div",{className:"flex-1 flex items-center justify-center py-20 text-slate-600 text-sm",children:"Sin barberos activos"}):i.map(u=>{var f;const c=s.filter(p=>p.barberoId===u.id||p.barbero===u.nombre);return d.jsxs("div",{className:"flex-1 min-w-[160px] border-r border-slate-800 last:border-r-0",children:[d.jsxs("div",{className:"h-10 px-3 flex items-center gap-2 border-b border-slate-800 sticky top-0 bg-slate-900 z-10",children:[d.jsx("div",{className:"w-6 h-6 rounded-full overflow-hidden bg-emerald-500/20 flex items-center justify-center shrink-0",children:u.foto?d.jsx("img",{src:u.foto,alt:u.nombre,className:"w-full h-full object-cover"}):d.jsx("span",{className:"text-[10px] font-bold text-emerald-400",children:((f=u.nombre)==null?void 0:f[0])??"?"})}),d.jsx("span",{className:"text-xs font-semibold text-white truncate",children:u.nombre})]}),d.jsxs("div",{className:"relative",style:{height:`${Fv*40}px`},children:[l.map((p,g)=>d.jsx("div",{className:`absolute inset-x-0 h-10 border-b border-slate-800/40 ${g%2===0?"":"bg-slate-800/10"}`,style:{top:`${g*40}px`}},g)),c.map(p=>d.jsx(YV,{cita:p},p.id))]})]},u.id)})]})})]})}const ZV="modulepreload",e4=function(t){return"/gestion-interna/"+t},Bv={},NI=function(e,n,r){let s=Promise.resolve();if(n&&n.length>0){document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),l=(o==null?void 0:o.nonce)||(o==null?void 0:o.getAttribute("nonce"));s=Promise.allSettled(n.map(u=>{if(u=e4(u),u in Bv)return;Bv[u]=!0;const c=u.endsWith(".css"),f=c?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${u}"]${f}`))return;const p=document.createElement("link");if(p.rel=c?"stylesheet":ZV,c||(p.as="script"),p.crossOrigin="",p.href=u,l&&p.setAttribute("nonce",l),document.head.appendChild(p),c)return new Promise((g,w)=>{p.addEventListener("load",g),p.addEventListener("error",()=>w(new Error(`Unable to preload CSS for ${u}`)))})}))}function i(o){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=o,window.dispatchEvent(l),!l.defaultPrevented)throw o}return s.then(o=>{for(const l of o||[])l.status==="rejected"&&i(l.reason);return e().catch(i)})},$v={active:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20",inactive:"bg-slate-700/50   text-slate-400   border-slate-600/30",pending:"bg-amber-500/10   text-amber-400   border-amber-500/20",cancelled:"bg-red-500/10     text-red-400     border-red-500/20",completed:"bg-blue-500/10    text-blue-400    border-blue-500/20",admin:"bg-purple-500/10  text-purple-400  border-purple-500/20"};function t4({variant:t="active",children:e,className:n=""}){return d.jsx("span",{className:`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${$v[t]??$v.active} ${n}`,children:e})}function n4({items:t,align:e="right"}){const[n,r]=O.useState(!1),s=O.useRef(null);return O.useEffect(()=>{if(!n)return;const i=o=>{var l;(l=s.current)!=null&&l.contains(o.target)||r(!1)};return document.addEventListener("mousedown",i),()=>document.removeEventListener("mousedown",i)},[n]),d.jsxs("div",{ref:s,className:"relative",children:[d.jsx("button",{onClick:i=>{i.stopPropagation(),r(o=>!o)},className:"p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-all",children:d.jsx(kV,{size:16})}),n&&d.jsx("div",{className:`absolute z-30 mt-1 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fade-in ${e==="right"?"right-0":"left-0"}`,children:t.map((i,o)=>i==="separator"?d.jsx("div",{className:"h-px bg-slate-700 my-1"},o):d.jsxs("button",{onClick:l=>{var u;l.stopPropagation(),r(!1),(u=i.onClick)==null||u.call(i)},className:`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left transition-colors ${i.danger?"text-red-400 hover:bg-red-950/40":"text-slate-300 hover:text-white hover:bg-slate-700"}`,children:[i.Icon&&d.jsx(i.Icon,{size:15}),i.label]},o))})]})}const r4="ignaciiio.mate@gmail.com",s4="https://wa.me/56983568212?text=Hola%2C%20te%20escribo%20desde%20la%20agenda%2C%20necesito%20soporte.";function i4({barber:t,onEdit:e}){const n=t.disponible!==!1,r=t.rol==="admin"||t.rol==="jefe",s=(t.email||"").toLowerCase().trim()===r4,i=Ee("barberos").path,u=[{label:"Editar datos",Icon:Lm,onClick:()=>e(t)},{label:"Configurar horario",Icon:IV,onClick:()=>{}},"separator",{label:n?"Desactivar":"Activar",Icon:DV,onClick:()=>Un(We(Pi,`${i}/${t.id}`),{disponible:!n})},{label:"Eliminar",Icon:Hc,onClick:async()=>{if(!confirm(`¿Eliminar a ${t.nombre}?`))return;const{deleteDoc:c}=await NI(async()=>{const{deleteDoc:f}=await Promise.resolve().then(()=>vx);return{deleteDoc:f}},void 0);await c(We(Pi,`${i}/${t.id}`))},danger:!0}];return d.jsxs("div",{className:"relative bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center gap-3 hover:border-slate-700 transition-all group",children:[!r&&d.jsx("div",{className:"absolute top-3 right-3",children:d.jsx(n4,{items:u})}),r&&d.jsx("div",{className:"absolute top-3 right-3 text-emerald-500/60",title:"Administrador",children:d.jsx(LV,{size:16})}),d.jsx("div",{className:"w-20 h-20 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0",children:t.foto?d.jsx("img",{src:t.foto,alt:t.nombre,className:"w-full h-full object-cover"}):d.jsx("div",{className:"w-full h-full flex items-center justify-center text-2xl font-bold text-slate-600",children:d.jsx(PI,{size:32})})}),d.jsxs("div",{className:"text-center",children:[d.jsx("p",{className:"font-semibold text-white text-sm",children:t.nombre}),r&&d.jsx("p",{className:"text-xs text-emerald-500/70 font-semibold mt-0.5 uppercase tracking-wide",children:t.rol==="jefe"?"Jefe":"Admin"}),!r&&t.especialidad&&d.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:t.especialidad}),d.jsx("div",{className:"mt-2",children:d.jsx(t4,{variant:n?"active":"inactive",children:n?"Activo":"Inactivo"})})]}),s?d.jsxs("a",{href:s4,target:"_blank",rel:"noopener noreferrer",className:"mt-1 flex items-center gap-1.5 w-full justify-center px-4 py-2 bg-green-600/10 hover:bg-green-600/20 text-green-400 text-xs font-semibold rounded-lg transition-all border border-green-600/30",children:[d.jsx(bV,{size:13})," Soporte vía WhatsApp"]}):d.jsxs("button",{className:"mt-1 flex items-center gap-1.5 w-full justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-all border border-slate-700",children:[d.jsx(EV,{size:13})," Ver Agenda"]})]})}const qv={nombre:"",especialidad:""};function o4(){const{data:t,loading:e}=In("barberos"),n=t.filter(x=>!x._mainDocId),[r,s]=O.useState(!1),[i,o]=O.useState(null),[l,u]=O.useState(qv),c=x=>{o(x),u({nombre:x.nombre,especialidad:x.especialidad||""}),s(!0)},f=()=>{o(null),u(qv),s(!0)},p=async()=>{const x=Ee("barberos").path;if(i)await Un(We(Pi,`${x}/${i.id}`),l);else{const{addDoc:b,serverTimestamp:P}=await NI(async()=>{const{addDoc:S,serverTimestamp:v}=await Promise.resolve().then(()=>vx);return{addDoc:S,serverTimestamp:v}},void 0);await b(Ee("barberos"),{...l,disponible:!0,createdAt:P()})}s(!1)},g="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",w="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5";return d.jsxs("div",{children:[d.jsxs("div",{className:"flex items-center justify-between mb-6",children:[d.jsxs("div",{children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Equipo"}),d.jsxs("p",{className:"text-sm text-slate-500 mt-0.5",children:[n.length," miembros"]})]}),d.jsxs("button",{onClick:f,className:"flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors",children:[d.jsx(Ki,{size:16})," Agregar"]})]}),e?d.jsx("div",{className:"flex justify-center py-20",children:d.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):d.jsx("div",{className:"grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",children:n.map(x=>d.jsx(i4,{barber:x,onEdit:c},x.id))}),d.jsx(Wc,{isOpen:r,onClose:()=>s(!1),title:i?"Editar barbero":"Nuevo barbero",footer:d.jsxs("div",{className:"flex gap-3 justify-end",children:[d.jsx("button",{onClick:()=>s(!1),className:"px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),d.jsx("button",{onClick:p,className:"px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all",children:i?"Guardar":"Crear"})]}),children:d.jsxs("div",{className:"space-y-4",children:[d.jsxs("div",{children:[d.jsx("label",{className:w,children:"Nombre"}),d.jsx("input",{className:g,placeholder:"Nicolás Fabián",value:l.nombre,onChange:x=>u(b=>({...b,nombre:x.target.value}))})]}),d.jsxs("div",{children:[d.jsx("label",{className:w,children:"Especialidad"}),d.jsx("input",{className:g,placeholder:"Cortes y barba clásica",value:l.especialidad,onChange:x=>u(b=>({...b,especialidad:x.target.value}))})]})]})})]})}function DI(t=""){return t.trim().split(/\s+/).map(e=>{var n;return(n=e[0])==null?void 0:n.toUpperCase()}).slice(0,2).join("")}function Hv(t){return t?new Date(t).toLocaleDateString("es-CL",{day:"numeric",month:"short",year:"numeric"}):"—"}function a4({stamps:t,premios:e}){const n=e.length?Math.max(...e.map(i=>i.costoSellos)):10,r=Math.max(n,t,10),s=r<=10?10:r<=15?15:20;return d.jsx("div",{className:"grid gap-1",style:{gridTemplateColumns:`repeat(${s}, minmax(0, 1fr))`},children:Array.from({length:r},(i,o)=>{const l=o+1,u=l<=t,c=e.some(f=>f.costoSellos===l);return d.jsxs("div",{className:`relative aspect-square rounded-md border flex items-center justify-center text-[9px] font-bold ${u?"bg-emerald-500/15 border-emerald-500/40 text-emerald-400":"bg-white/3 border-white/8 text-slate-600"}`,children:[u?d.jsx("i",{className:"ph-fill ph-scissors text-[9px]"}):l,c&&d.jsx("span",{className:"absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-400 border border-slate-950"})]},l)})})}function l4({cliente:t,premios:e,onClose:n}){var T;const[r,s]=O.useState(t),[i,o]=O.useState([]),[l,u]=O.useState(null),[c,f]=O.useState(!1),[p,g]=O.useState(""),[w,x]=O.useState(!1);O.useEffect(()=>{const A=We(Ee("users"),t.uid);return jc(A,se=>{se.exists()&&(s({uid:se.id,...se.data()}),u(null))})},[t.uid]),O.useEffect(()=>{t.email&&zu(mm(Ee("citas"),gm("clienteEmail","==",t.email),fx(10))).then(A=>{const k=A.docs.map(se=>({id:se.id,...se.data()}));k.sort((se,Ze)=>(Ze.fecha||"").localeCompare(se.fecha||"")||(Ze.hora||"").localeCompare(se.hora||"")),o(k)}).catch(()=>{})},[t.uid,t.email]);const b=r.stamps||0,P=[...e].sort((A,k)=>A.costoSellos-k.costoSellos),S=P.find(A=>b<A.costoSellos),v=P.length?P[P.length-1].costoSellos:10,C=S?S.costoSellos:v,D=Math.min(b/Math.max(C,1)*100,100),j=(r.telefono||"").replace(/\D/g,""),L=j.length>=8?`https://wa.me/${j.startsWith("56")?j:"56"+j}`:null,E=async A=>{f(!0);try{await Un(We(Ee("users"),r.uid),{stamps:Jl(A),...A>0?{ultimoSello:new Date().toISOString()}:{},historialSellos:Yl({fecha:new Date().toISOString(),tipo:A>0?"suma":"resta",cantidad:A,nota:A>0?"Sello añadido manualmente":"Sello quitado manualmente"})})}finally{f(!1)}},_=async()=>{if(!l){g("Selecciona un premio primero.");return}if(b<l.costoSellos){g("Sellos insuficientes.");return}f(!0);try{await Un(We(Ee("users"),r.uid),{stamps:Jl(-l.costoSellos),historialSellos:Yl({fecha:new Date().toISOString(),tipo:"canje",cantidad:-l.costoSellos,nota:l.nombre})}),g(`✓ ${l.nombre} canjeado`)}catch(A){g(A.message)}finally{f(!1)}},I=async()=>{if(!b){x(!1);return}f(!0);try{await Un(We(Ee("users"),r.uid),{stamps:Jl(-b),historialSellos:Yl({fecha:new Date().toISOString(),tipo:"resta",cantidad:-b,nota:"Reset manual por admin"})})}finally{f(!1),x(!1)}},R=[...r.historialSellos||[]].sort((A,k)=>new Date(k.fecha)-new Date(A.fecha)).slice(0,20);return d.jsxs("div",{className:"space-y-6",children:[d.jsxs("div",{className:"flex items-start gap-4",children:[d.jsx("div",{className:"w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0",children:r.photoURL?d.jsx("img",{src:r.photoURL,alt:"",className:"w-full h-full object-cover"}):d.jsx("span",{className:"text-sm font-bold text-slate-400",children:DI(r.nombre||r.email||"?")})}),d.jsxs("div",{className:"flex-1 min-w-0",children:[d.jsx("p",{className:"font-semibold text-white",children:r.nombre||"—"}),d.jsx("p",{className:"text-xs text-slate-500 truncate",children:r.email}),r.telefono&&d.jsxs("div",{className:"flex items-center gap-2 mt-1",children:[d.jsx("p",{className:"text-xs text-slate-400",children:r.telefono}),L&&d.jsx("a",{href:L,target:"_blank",rel:"noreferrer",className:"text-[10px] font-bold text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md hover:bg-emerald-500/10 transition-colors",children:"WhatsApp ↗"})]}),d.jsxs("p",{className:"text-[10px] text-slate-600 mt-1",children:["Miembro desde ",Hv((T=r.creadoEn)!=null&&T.toDate?r.creadoEn.toDate().toISOString():r.creadoEn)]})]})]}),d.jsxs("div",{className:"bg-slate-950 border border-slate-800 rounded-xl p-4",children:[d.jsxs("div",{className:"flex items-end gap-1 mb-1",children:[d.jsx("span",{className:"text-4xl font-black text-emerald-400 leading-none",children:b}),d.jsxs("span",{className:"text-lg font-bold text-slate-600 mb-0.5",children:["/",C]})]}),d.jsx("p",{className:"text-[10px] text-slate-500 mb-2",children:S?`${C-b} sello${C-b!==1?"s":""} para: ${S.nombre}`:b>0?"¡Premios disponibles!":"Sin sellos aún"}),d.jsx("div",{className:"w-full bg-white/5 rounded-full h-1.5 overflow-hidden mb-4",children:d.jsx("div",{className:"h-1.5 rounded-full bg-emerald-500 transition-all",style:{width:`${D}%`}})}),d.jsx(a4,{stamps:b,premios:e}),d.jsxs("div",{className:"flex gap-2 mt-4",children:[d.jsxs("button",{onClick:()=>E(-1),disabled:c||b<=0,className:"flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all",children:[d.jsx(PV,{size:13})," Quitar sello"]}),d.jsxs("button",{onClick:()=>E(1),disabled:c,className:"flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all",children:[d.jsx(Ki,{size:13})," Añadir sello"]})]})]}),e.length>0&&d.jsxs("div",{children:[d.jsx("p",{className:"text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2",children:"Canjear premio"}),d.jsx("div",{className:"space-y-1.5 mb-3",children:e.map(A=>{const k=b>=A.costoSellos,se=(l==null?void 0:l.id)===A.id;return d.jsxs("button",{disabled:!k,onClick:()=>u(se?null:A),className:`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left ${se?"border-yellow-400/60 bg-yellow-400/10 text-white":k?"border-slate-700 hover:border-slate-500 bg-slate-800/40 text-white":"border-slate-800/40 bg-transparent text-slate-600 cursor-not-allowed opacity-50"}`,children:[d.jsx(Ia,{size:14,className:k?"text-yellow-400":"text-slate-600"}),d.jsx("span",{className:"flex-1",children:A.nombre}),d.jsxs("span",{className:`text-xs font-bold ${k?"text-yellow-400":"text-slate-600"}`,children:[A.costoSellos," ✂"]})]},A.id)})}),p&&d.jsx("p",{className:`text-xs text-center font-bold mb-2 ${p.startsWith("✓")?"text-emerald-400":"text-red-400"}`,children:p}),d.jsxs("button",{onClick:_,disabled:c||!l,className:"w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 disabled:opacity-40 border border-yellow-500/30 text-yellow-400 text-sm font-semibold rounded-lg transition-all",children:[d.jsx(CV,{size:15})," Canjear premio"]})]}),R.length>0&&d.jsxs("div",{children:[d.jsx("p",{className:"text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2",children:"Historial de sellos"}),d.jsx("div",{className:"space-y-px max-h-44 overflow-y-auto",children:R.map((A,k)=>{const se=A.tipo==="suma"?"ph-plus-circle":A.tipo==="canje"?"ph-gift":"ph-minus-circle",Ze=A.tipo==="suma"?"text-emerald-400":A.tipo==="canje"?"text-yellow-400":"text-red-400",ln=A.tipo==="suma"?`+${A.cantidad} sello`:A.tipo==="canje"?`Canje: ${A.nota}`:`${A.cantidad} sello`;return d.jsxs("div",{className:"flex items-start gap-2 py-1.5 border-b border-white/4 last:border-0",children:[d.jsx("i",{className:`ph-fill ${se} ${Ze} text-sm shrink-0 mt-0.5`}),d.jsxs("div",{className:"flex-1 min-w-0",children:[d.jsx("p",{className:"text-xs font-semibold text-white truncate",children:ln}),d.jsx("p",{className:"text-[10px] text-slate-600",children:Hv(A.fecha)})]})]},k)})})]}),i.length>0&&d.jsxs("div",{children:[d.jsx("p",{className:"text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2",children:"Citas recientes"}),d.jsx("div",{className:"space-y-1.5",children:i.map(A=>{const k=A.estado==="Completada"?"text-emerald-400":A.estado==="Cancelada"?"text-red-400":"text-yellow-400";return d.jsxs("div",{className:"flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5",children:[d.jsxs("div",{className:"flex-1 min-w-0",children:[d.jsx("p",{className:"text-xs font-semibold text-white truncate",children:A.servicioNombre||"—"}),d.jsxs("p",{className:"text-[10px] text-slate-500 mt-0.5",children:[A.fecha," · ",A.hora," · ",A.barbero||"—"]})]}),d.jsx("span",{className:`text-[10px] font-bold ${k} shrink-0`,children:A.estado})]},A.id)})})]}),d.jsx("div",{className:"pt-2 border-t border-slate-800",children:w?d.jsxs("div",{className:"flex items-center gap-2",children:[d.jsxs("p",{className:"text-xs text-red-400 flex-1",children:["¿Resetear ",b," sellos a 0?"]}),d.jsx("button",{onClick:()=>x(!1),className:"px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),d.jsx("button",{onClick:I,disabled:c,className:"px-3 py-1.5 text-xs font-bold text-red-400 hover:text-white rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all",children:"Confirmar"})]}):d.jsxs("button",{onClick:()=>x(!0),disabled:!b,className:"flex items-center gap-2 text-xs text-slate-600 hover:text-red-400 disabled:opacity-30 transition-colors",children:[d.jsx(OV,{size:13})," Resetear todos los sellos"]})})]})}function u4(){const{data:t,loading:e}=In("users"),{data:n}=In("premios",[Ba("costoSellos")]),[r,s]=O.useState(""),[i,o]=O.useState(null),l=O.useMemo(()=>[...t].sort((g,w)=>(w.stamps||0)-(g.stamps||0)||(g.nombre||"").localeCompare(w.nombre||"")),[t]),u=O.useMemo(()=>{const g=r.toLowerCase();return g?l.filter(w=>{var x,b,P;return((x=w.nombre)==null?void 0:x.toLowerCase().includes(g))||((b=w.email)==null?void 0:b.toLowerCase().includes(g))||((P=w.telefono)==null?void 0:P.includes(g))}):l},[l,r]),c=t.length,f=c?(t.reduce((g,w)=>g+(w.stamps||0),0)/c).toFixed(1):0,p=n.length?t.filter(g=>{var w;return(g.stamps||0)>=((w=n[0])==null?void 0:w.costoSellos)}).length:t.filter(g=>(g.stamps||0)>=5).length;return d.jsxs("div",{className:"max-w-4xl mx-auto",children:[d.jsxs("div",{className:"mb-6",children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Clientes y Fidelización"}),d.jsx("p",{className:"text-sm text-slate-500 mt-0.5",children:"Gestiona sellos y premios de cada cliente."})]}),d.jsx("div",{className:"grid grid-cols-3 gap-3 mb-5",children:[{label:"Clientes",value:c,color:"text-white"},{label:"Avg Sellos",value:f,color:"text-emerald-400"},{label:"Con premios",value:p,color:"text-yellow-400"}].map(({label:g,value:w,color:x})=>d.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center",children:[d.jsx("p",{className:`text-2xl font-black ${x}`,children:w}),d.jsx("p",{className:"text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5",children:g})]},g))}),d.jsxs("div",{className:"relative mb-4",children:[d.jsx(VV,{size:15,className:"absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"}),d.jsx("input",{placeholder:"Buscar por nombre, correo o teléfono…",value:r,onChange:g=>s(g.target.value),className:"w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-600 transition-colors"}),r&&d.jsx("button",{onClick:()=>s(""),className:"absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white",children:d.jsx(Mm,{size:14})})]}),d.jsx("div",{className:"bg-slate-900 border border-slate-800 rounded-xl overflow-hidden",children:e?d.jsx("div",{className:"flex justify-center py-16",children:d.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):u.length===0?d.jsxs("div",{className:"flex flex-col items-center py-16 text-slate-600",children:[d.jsx(PI,{size:28,className:"mb-3"}),d.jsx("p",{className:"text-sm",children:"Sin clientes"})]}):d.jsx("div",{className:"divide-y divide-slate-800/60",children:u.map(g=>{var v;const w=g.stamps||0,x=n.length?(v=n[n.length-1])==null?void 0:v.costoSellos:10,b=Math.min(w/Math.max(x,1)*100,100),P=w>=(x||10)?"text-yellow-400 border-yellow-400/40 bg-yellow-400/10":w>=5?"text-emerald-400 border-emerald-500/40 bg-emerald-500/10":"text-slate-500 border-slate-700",S=n.some(C=>w>=C.costoSellos);return d.jsxs("div",{onClick:()=>o(g),className:"grid grid-cols-12 items-center px-5 py-4 hover:bg-white/2 transition-colors cursor-pointer group",children:[d.jsxs("div",{className:"col-span-5 flex items-center gap-3 min-w-0",children:[d.jsx("div",{className:"w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0",children:g.photoURL?d.jsx("img",{src:g.photoURL,alt:"",className:"w-full h-full object-cover"}):d.jsx("span",{className:"text-xs font-bold text-slate-400",children:DI(g.nombre||g.email||"?")})}),d.jsxs("div",{className:"min-w-0",children:[d.jsx("p",{className:"font-semibold text-white text-sm truncate group-hover:text-emerald-400 transition-colors",children:g.nombre||"—"}),d.jsx("p",{className:"text-xs text-slate-500 truncate",children:g.email})]})]}),d.jsx("div",{className:"col-span-3 hidden sm:block",children:d.jsxs("p",{className:"text-xs text-slate-500 truncate flex items-center gap-1",children:[d.jsx(NV,{size:10})," ",g.telefono||"—"]})}),d.jsxs("div",{className:"col-span-5 sm:col-span-3",children:[d.jsxs("div",{className:"flex items-center gap-1.5 mb-1",children:[d.jsxs("span",{className:`text-xs font-bold px-2 py-0.5 rounded-full border ${P}`,children:[w," sellos"]}),S&&d.jsx(Ia,{size:11,className:"text-yellow-400"})]}),d.jsx("div",{className:"w-full bg-white/5 rounded-full h-1",children:d.jsx("div",{className:"h-1 rounded-full bg-emerald-500 transition-all",style:{width:`${b}%`}})})]}),d.jsx("div",{className:"col-span-2 sm:col-span-1 flex justify-end",children:d.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",className:"text-slate-600 group-hover:text-emerald-400 transition-colors",children:d.jsx("polyline",{points:"9 18 15 12 9 6"})})})]},g.uid||g.id)})})}),d.jsx(Wc,{isOpen:!!i,onClose:()=>o(null),title:(i==null?void 0:i.nombre)||"Cliente",subtitle:i==null?void 0:i.email,maxWidth:"max-w-lg",children:i&&d.jsx(l4,{cliente:{uid:i.uid||i.id,...i},premios:n,onClose:()=>o(null)},i.uid||i.id)})]})}function Nl({title:t,subtitle:e}){return d.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3",children:[d.jsxs("div",{children:[d.jsx("p",{className:"text-sm font-semibold text-white",children:t}),e&&d.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:e})]}),d.jsxs("div",{className:"flex-1 min-h-[160px] flex flex-col items-center justify-center gap-2 border border-dashed border-slate-700 rounded-lg",children:[d.jsx(II,{size:28,className:"text-slate-700"}),d.jsx("p",{className:"text-xs text-slate-600 font-medium",children:"Integra Recharts aquí"})]})]})}function Dl({Icon:t,label:e,value:n,sub:r,color:s="emerald"}){const i={emerald:"bg-emerald-500/10 text-emerald-400",blue:"bg-blue-500/10    text-blue-400",red:"bg-red-500/10     text-red-400",amber:"bg-amber-500/10   text-amber-400"};return d.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4",children:[d.jsx("div",{className:`p-2.5 rounded-lg ${i[s]}`,children:d.jsx(t,{size:20})}),d.jsxs("div",{children:[d.jsx("p",{className:"text-xs font-semibold text-slate-500 uppercase tracking-wide",children:e}),d.jsx("p",{className:"text-2xl font-bold text-white mt-0.5",children:n}),r&&d.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:r})]})]})}function c4(){const{data:t}=In("citas"),e=O.useMemo(()=>{const n=new Date().toISOString().slice(0,7),r=t.filter(u=>{var c;return(c=u.fecha)==null?void 0:c.startsWith(n)}),s=r.filter(u=>u.estado==="Completada"),i=r.filter(u=>u.estado==="Cancelada"),o=s.reduce((u,c)=>u+(c.precio||0),0),l=s.length?o/s.length:0;return{total:r.length,completadas:s.length,canceladas:i.length,ingresos:o,ticket:l}},[t]);return d.jsxs("div",{className:"max-w-5xl mx-auto",children:[d.jsxs("div",{className:"mb-6",children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Métricas"}),d.jsx("p",{className:"text-sm text-slate-500 mt-0.5",children:new Date().toLocaleDateString("es-CL",{month:"long",year:"numeric"})})]}),d.jsxs("div",{className:"grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6",children:[d.jsx(Dl,{Icon:SV,label:"Ingresos",value:`$${e.ingresos.toLocaleString("es-CL")}`,sub:"Citas completadas",color:"emerald"}),d.jsx(Dl,{Icon:vV,label:"Citas",value:e.completadas,sub:`${e.total} agendadas`,color:"blue"}),d.jsx(Dl,{Icon:UV,label:"Ticket prom.",value:`$${Math.round(e.ticket).toLocaleString("es-CL")}`,sub:"Por servicio",color:"amber"}),d.jsx(Dl,{Icon:xV,label:"Cancelaciones",value:e.canceladas,sub:e.total?`${Math.round(e.canceladas/e.total*100)}% del total`:"—",color:"red"})]}),d.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-4",children:[d.jsx(Nl,{title:"Ingresos mensuales",subtitle:"Últimos 6 meses · LineChart (Recharts)"}),d.jsx(Nl,{title:"Horas pico",subtitle:"Distribución de citas por hora · BarChart (Recharts)"}),d.jsx(Nl,{title:"Servicios más vendidos",subtitle:"Top 5 servicios del mes · PieChart (Recharts)"}),d.jsx(Nl,{title:"Rendimiento por barbero",subtitle:"Citas completadas por profesional · BarChart (Recharts)"})]})]})}const id={nombre:"",costoSellos:""},Wv=["text-yellow-400","text-emerald-400","text-blue-400","text-purple-400","text-rose-400","text-amber-400"];function h4(){const{data:t,loading:e}=In("premios",[Ba("costoSellos")]),[n,r]=O.useState(id),[s,i]=O.useState(null),[o,l]=O.useState(!1),u=x=>{i(x.id),r({nombre:x.nombre,costoSellos:x.costoSellos})},c=()=>{i(null),r(id)},f=async()=>{const x=n.nombre.trim(),b=parseInt(n.costoSellos);if(!(!x||!b||b<1)){l(!0);try{s?(await Un(We(Ee("premios"),s),{nombre:x,costoSellos:b,updatedAt:qr()}),c()):(await qa(Ee("premios"),{nombre:x,costoSellos:b,creadoEn:qr()}),r(id))}finally{l(!1)}}},p=async x=>{confirm("¿Eliminar este premio?")&&await $a(We(Ee("premios"),x))},g="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",w="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5";return d.jsxs("div",{className:"max-w-2xl mx-auto",children:[d.jsxs("div",{className:"mb-6",children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Premios del Club"}),d.jsx("p",{className:"text-sm text-slate-500 mt-0.5",children:"Define los premios globales que obtienen los clientes por acumular sellos."})]}),d.jsx("div",{className:"bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6",children:e?d.jsx("div",{className:"flex justify-center py-10",children:d.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):t.length===0?d.jsxs("div",{className:"flex flex-col items-center py-10 text-slate-600",children:[d.jsx(Ia,{size:28,className:"mb-2"}),d.jsx("p",{className:"text-sm",children:"Sin premios configurados."}),d.jsx("p",{className:"text-xs mt-0.5 text-slate-700",children:"Crea el primero con el formulario de abajo."})]}):d.jsx("div",{className:"divide-y divide-slate-800/60",children:t.map((x,b)=>d.jsxs("div",{className:"flex items-center gap-3 px-5 py-3.5 hover:bg-slate-800/30 transition-colors",children:[d.jsx(Ia,{size:16,className:`shrink-0 ${Wv[b%Wv.length]}`}),d.jsxs("div",{className:"flex-1 min-w-0",children:[d.jsx("p",{className:"text-sm font-semibold text-white truncate",children:x.nombre}),d.jsxs("p",{className:"text-xs text-slate-500 mt-0.5",children:[x.costoSellos," sello",x.costoSellos!==1?"s":""]})]}),d.jsxs("div",{className:"flex items-center gap-2 shrink-0",children:[d.jsx("button",{onClick:()=>u(x),className:"p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors",children:d.jsx(Lm,{size:13})}),d.jsx("button",{onClick:()=>p(x.id),className:"p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors",children:d.jsx(Hc,{size:13})})]})]},x.id))})}),d.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-5",children:[d.jsxs("div",{className:"flex items-center justify-between mb-4",children:[d.jsx("h2",{className:"text-sm font-semibold text-white",children:s?"Editar premio":"Nuevo premio"}),s&&d.jsx("button",{onClick:c,className:"p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all",children:d.jsx(Mm,{size:15})})]}),d.jsxs("div",{className:"grid grid-cols-2 gap-3 mb-4",children:[d.jsxs("div",{children:[d.jsx("label",{className:w,children:"Nombre"}),d.jsx("input",{className:g,placeholder:"Ej. Corte gratis",value:n.nombre,onChange:x=>r(b=>({...b,nombre:x.target.value})),onKeyDown:x=>x.key==="Enter"&&f()})]}),d.jsxs("div",{children:[d.jsx("label",{className:w,children:"Sellos requeridos"}),d.jsx("input",{className:g,type:"number",min:"1",max:"99",placeholder:"10",value:n.costoSellos,onChange:x=>r(b=>({...b,costoSellos:x.target.value})),onKeyDown:x=>x.key==="Enter"&&f()})]})]}),d.jsxs("div",{className:"flex gap-3 justify-end",children:[s&&d.jsx("button",{onClick:c,className:"px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),d.jsxs("button",{onClick:f,disabled:o||!n.nombre||!n.costoSellos,className:"flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all",children:[o&&d.jsx("span",{className:"w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"}),s?"Guardar":d.jsxs(d.Fragment,{children:[d.jsx(Ki,{size:15})," Agregar"]})]})]})]})]})}const Gv={nombre:"",descripcion:"",precio:"",stock:"",imagen:""};function d4({producto:t,onEdit:e,onDelete:n}){return d.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all group",children:[d.jsx("div",{className:"h-40 bg-slate-800 flex items-center justify-center overflow-hidden",children:t.imagen?d.jsx("img",{src:t.imagen,alt:t.nombre,className:"w-full h-full object-cover"}):d.jsx(kI,{size:28,className:"text-slate-600"})}),d.jsxs("div",{className:"p-4",children:[d.jsx("h3",{className:"font-semibold text-white text-sm",children:t.nombre}),t.descripcion&&d.jsx("p",{className:"text-xs text-slate-500 mt-0.5 line-clamp-2",children:t.descripcion}),d.jsxs("div",{className:"flex items-center justify-between mt-3",children:[d.jsxs("span",{className:"text-emerald-400 font-bold text-sm",children:["$",Number(t.precio||0).toLocaleString("es-CL")]}),d.jsxs("span",{className:`text-xs font-semibold px-2 py-0.5 rounded-full border ${(t.stock||0)>0?"text-slate-400 border-slate-700":"text-red-400 border-red-500/30 bg-red-500/5"}`,children:["Stock: ",t.stock??"—"]})]}),d.jsxs("div",{className:"flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity",children:[d.jsxs("button",{onClick:()=>e(t),className:"flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-semibold transition-colors",children:[d.jsx(Lm,{size:12})," Editar"]}),d.jsxs("button",{onClick:()=>n(t.id),className:"flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-semibold transition-colors",children:[d.jsx(Hc,{size:12})," Eliminar"]})]})]})]})}function f4(){const{data:t,loading:e}=In("productos"),[n,r]=O.useState(!1),[s,i]=O.useState(null),[o,l]=O.useState(Gv),[u,c]=O.useState(!1),[f,p]=O.useState(""),[g,w]=O.useState(!1),x=O.useRef(null),b=()=>{i(null),l(Gv),p(""),r(!0)},P=L=>{i(L.id),l({nombre:L.nombre||"",descripcion:L.descripcion||"",precio:L.precio||"",stock:L.stock??"",imagen:L.imagen||""}),p(L.imagen||""),r(!0)},S=async L=>{var _;const E=(_=L.target.files)==null?void 0:_[0];if(E){p(URL.createObjectURL(E)),w(!0);try{const I=qc(),R=`${I==="elegance"?"":`tenants/${I}/`}productos/${Date.now()}_${E.name}`,T=await iV(Pf(Nf,R),E),A=await _I(T.ref);l(k=>({...k,imagen:A})),p(A)}catch(I){console.error("Upload error:",I)}finally{w(!1)}}},v=async()=>{if(o.nombre){c(!0);try{const L={nombre:o.nombre,descripcion:o.descripcion,precio:Number(o.precio)||0,stock:o.stock!==""?Number(o.stock):null,imagen:o.imagen,updatedAt:qr()};s?await Un(We(Ee("productos"),s),L):await qa(Ee("productos"),{...L,createdAt:qr()}),r(!1)}finally{c(!1)}}},C=async L=>{confirm("¿Eliminar este producto?")&&await $a(We(Ee("productos"),L))},D="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",j="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5";return d.jsxs("div",{className:"max-w-5xl mx-auto",children:[d.jsxs("div",{className:"flex items-center justify-between mb-6",children:[d.jsxs("div",{children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Productos"}),d.jsx("p",{className:"text-sm text-slate-500 mt-0.5",children:"Productos disponibles en el local · visibles en el dashboard de clientes."})]}),d.jsxs("button",{onClick:b,className:"flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors",children:[d.jsx(Ki,{size:16})," Agregar producto"]})]}),e?d.jsx("div",{className:"flex justify-center py-20",children:d.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):t.length===0?d.jsxs("div",{className:"flex flex-col items-center py-20 text-slate-600",children:[d.jsx(RI,{size:40,className:"mb-3"}),d.jsx("p",{className:"text-sm font-medium",children:"Sin productos aún"}),d.jsx("p",{className:"text-xs mt-0.5",children:"Agrega el primero con el botón de arriba."})]}):d.jsx("div",{className:"grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4",children:t.map(L=>d.jsx(d4,{producto:L,onEdit:P,onDelete:C},L.id))}),d.jsx(Wc,{isOpen:n,onClose:()=>r(!1),title:s?"Editar producto":"Nuevo producto",footer:d.jsxs("div",{className:"flex gap-3 justify-end",children:[d.jsx("button",{onClick:()=>r(!1),className:"px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),d.jsxs("button",{onClick:v,disabled:u||!o.nombre||g,className:"px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2",children:[u&&d.jsx("span",{className:"w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"}),s?"Guardar":"Crear producto"]})]}),children:d.jsxs("div",{className:"space-y-4",children:[d.jsxs("div",{children:[d.jsx("label",{className:j,children:"Imagen"}),d.jsxs("div",{className:"flex gap-3 items-start",children:[d.jsx("div",{className:"w-20 h-20 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0",children:f?d.jsx("img",{src:f,alt:"preview",className:"w-full h-full object-cover"}):d.jsx(kI,{size:20,className:"text-slate-600"})}),d.jsxs("div",{className:"flex-1 space-y-2",children:[d.jsx("input",{className:D,placeholder:"https://... o sube una imagen",value:o.imagen,onChange:L=>{l(E=>({...E,imagen:L.target.value})),p(L.target.value)}}),d.jsxs("button",{type:"button",onClick:()=>{var L;return(L=x.current)==null?void 0:L.click()},disabled:g,className:"flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50",children:[g?d.jsx("span",{className:"w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"}):d.jsx(bI,{size:12}),g?"Subiendo...":"Subir imagen"]}),d.jsx("input",{ref:x,type:"file",accept:"image/*",className:"hidden",onChange:S})]})]})]}),d.jsxs("div",{children:[d.jsx("label",{className:j,children:"Nombre"}),d.jsx("input",{className:D,placeholder:"Pomada para el cabello",value:o.nombre,onChange:L=>l(E=>({...E,nombre:L.target.value}))})]}),d.jsxs("div",{children:[d.jsx("label",{className:j,children:"Descripción"}),d.jsx("textarea",{className:`${D} resize-none`,rows:2,placeholder:"Descripción breve del producto...",value:o.descripcion,onChange:L=>l(E=>({...E,descripcion:L.target.value}))})]}),d.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[d.jsxs("div",{children:[d.jsx("label",{className:j,children:"Precio ($)"}),d.jsx("input",{className:D,type:"number",placeholder:"9900",value:o.precio,onChange:L=>l(E=>({...E,precio:L.target.value}))})]}),d.jsxs("div",{children:[d.jsx("label",{className:j,children:"Stock"}),d.jsx("input",{className:D,type:"number",placeholder:"0",min:"0",value:o.stock,onChange:L=>l(E=>({...E,stock:L.target.value}))})]})]})]})})]})}const is=8,p4=5*1024*1024;function m4(){const{data:t,loading:e}=In("lookbook",[Ba("order","asc")]),[n,r]=O.useState(!1),[s,i]=O.useState(0),[o,l]=O.useState(""),u=O.useRef(null),c=async p=>{let g=Array.from(p.target.files||[]).filter(v=>v.size<=p4);if(p.target.value="",!g.length)return;const w=await zu(Ee("lookbook")),x=is-w.size;if(x<=0){alert("Límite de 8 fotos alcanzado. Elimina una para subir más.");return}g=g.slice(0,x);const P=(await zu(Ee("lookbook"))).docs.map(v=>v.data().order??0);let S=P.length?Math.max(...P)+1:0;r(!0),i(0);try{for(let v=0;v<g.length;v++){const C=g[v];l(`Subiendo ${v+1} de ${g.length}…`);const D=qc(),j=`${Date.now()}_${C.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`,L=D==="elegance"?`lookbook/${j}`:`tenants/${D}/lookbook/${j}`,E=await new Promise((_,I)=>{const R=oV(Pf(Nf,L),C);R.on("state_changed",T=>i(Math.round(T.bytesTransferred/T.totalBytes*100)),I,async()=>_(await _I(R.snapshot.ref)))});await qa(Ee("lookbook"),{url:E,filename:j,order:S++,createdAt:qr()})}}catch(v){console.error("[Lookbook upload]",v),alert("Error al subir la foto. Revisa los permisos de Storage.")}finally{r(!1),i(0),l("")}},f=async p=>{if(confirm("¿Eliminar esta foto del lookbook?"))try{await $a(We(Ee("lookbook"),p.id));try{await aV(Pf(Nf,p.url))}catch{}}catch(g){console.error("[Lookbook delete]",g)}};return d.jsxs("div",{className:"max-w-4xl mx-auto",children:[d.jsxs("div",{className:"flex items-center justify-between mb-6",children:[d.jsxs("div",{children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Lookbook"}),d.jsxs("p",{className:"text-sm text-slate-500 mt-0.5",children:["Fotos de cortes reales · se muestran en el portal de clientes · máx. ",is," fotos."]})]}),d.jsxs("button",{onClick:()=>{var p;return(p=u.current)==null?void 0:p.click()},disabled:n||t.length>=is,className:"flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors",children:[d.jsx(Ki,{size:16})," Subir fotos"]})]}),d.jsx("input",{ref:u,type:"file",accept:"image/*",multiple:!0,className:"hidden",onChange:c}),n&&d.jsxs("div",{className:"mb-5 bg-slate-800 border border-slate-700 rounded-xl p-4",children:[d.jsxs("div",{className:"flex justify-between text-xs text-slate-400 mb-2",children:[d.jsx("span",{children:o}),d.jsxs("span",{children:[s,"%"]})]}),d.jsx("div",{className:"w-full bg-slate-700 rounded-full h-1.5",children:d.jsx("div",{className:"bg-emerald-500 h-1.5 rounded-full transition-all duration-300",style:{width:`${s}%`}})})]}),e?d.jsx("div",{className:"columns-2 sm:columns-3 gap-3 space-y-3",children:[1,2,3,4].map(p=>d.jsx("div",{className:"break-inside-avoid rounded-xl aspect-[3/4] bg-slate-800 animate-pulse mb-3"},p))}):t.length===0?d.jsxs("div",{onClick:()=>{var p;return(p=u.current)==null?void 0:p.click()},className:"flex flex-col items-center justify-center h-60 border-2 border-dashed border-slate-700 rounded-2xl text-slate-600 cursor-pointer hover:border-emerald-500/40 hover:text-slate-500 transition-all",children:[d.jsx(CI,{size:40,className:"mb-3"}),d.jsx("p",{className:"text-sm font-medium",children:"Sin fotos aún"}),d.jsx("p",{className:"text-xs mt-1",children:"Toca para subir las primeras"})]}):d.jsxs(d.Fragment,{children:[d.jsx("div",{className:"columns-2 sm:columns-3 gap-3 space-y-3",children:t.map(p=>d.jsxs("div",{className:"break-inside-avoid mb-3 relative group rounded-xl overflow-hidden",children:[d.jsx("img",{src:p.url,alt:"",className:"w-full object-cover rounded-xl"}),d.jsx("div",{className:"absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center",children:d.jsxs("button",{onClick:()=>f(p),className:"flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors",children:[d.jsx(Hc,{size:13})," Eliminar"]})})]},p.id))}),d.jsxs("p",{className:"text-xs text-slate-600 text-right mt-3",children:[t.length," / ",is," fotos"]})]}),!e&&t.length>0&&t.length<is&&d.jsxs("div",{onClick:()=>{var p;return(p=u.current)==null?void 0:p.click()},className:"mt-4 flex items-center justify-center gap-2 h-16 border border-dashed border-slate-700 rounded-xl text-slate-600 text-sm cursor-pointer hover:border-emerald-500/40 hover:text-slate-400 transition-all",children:[d.jsx(bI,{size:16})," Subir más fotos (",is-t.length," disponible",is-t.length!==1?"s":"",")"]})]})}function g4(){const t=wI(),[e,n]=O.useState(""),[r,s]=O.useState(""),[i,o]=O.useState(""),[l,u]=O.useState(!1),c="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",f=w=>async x=>{x==null||x.preventDefault(),o(""),u(!0);try{await w()}catch(b){o(b.message)}finally{u(!1)}},p=f(()=>N2(xa,e,r)),g=f(()=>nD(xa,new Rn));return d.jsx("div",{className:"min-h-screen bg-slate-950 flex items-center justify-center px-4",children:d.jsxs("div",{className:"w-full max-w-sm",children:[d.jsxs("div",{className:"flex flex-col items-center mb-8",children:[d.jsx("div",{className:"w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4",children:d.jsx(AI,{size:22,className:"text-emerald-400"})}),d.jsx("h1",{className:"text-lg font-bold text-white",children:"Panel Admin"}),d.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:t.name})]}),d.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-2xl p-6",children:[d.jsxs("form",{onSubmit:p,className:"space-y-3",children:[d.jsx("input",{type:"email",className:c,placeholder:"Correo electrónico",value:e,onChange:w=>n(w.target.value)}),d.jsx("input",{type:"password",className:c,placeholder:"Contraseña",value:r,onChange:w=>s(w.target.value)}),i&&d.jsx("p",{className:"text-xs text-red-400",children:i}),d.jsxs("button",{type:"submit",disabled:l,className:"w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2",children:[l&&d.jsx("span",{className:"w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"}),"Ingresar"]})]}),d.jsxs("div",{className:"flex items-center gap-3 my-4",children:[d.jsx("div",{className:"flex-1 h-px bg-slate-800"}),d.jsx("span",{className:"text-xs text-slate-600 uppercase tracking-widest",children:"o"}),d.jsx("div",{className:"flex-1 h-px bg-slate-800"})]}),d.jsxs("button",{onClick:g,className:"w-full flex items-center justify-center gap-2.5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-all",children:[d.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 48 48",children:[d.jsx("path",{fill:"#EA4335",d:"M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.3 30.2 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.8 6C12.3 13.2 17.7 9.5 24 9.5z"}),d.jsx("path",{fill:"#4285F4",d:"M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"}),d.jsx("path",{fill:"#FBBC05",d:"M10.5 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.8-6z"}),d.jsx("path",{fill:"#34A853",d:"M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.3 0-11.6-4.3-13.5-10l-7.8 6C6.7 42.6 14.7 48 24 48z"})]}),"Continuar con Google"]})]})]})})}function y4(){const{user:t,role:e,loading:n}=TI();if(n)return d.jsx("div",{className:"min-h-screen bg-slate-900 flex items-center justify-center",children:d.jsx("div",{className:"w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})});if(!t)return d.jsx(g4,{});const r=e==="admin"||e==="jefe",s=r?"servicios":"agenda";return d.jsx(BV,{children:d.jsxs(yE,{children:[d.jsx(jt,{index:!0,element:d.jsx(zh,{to:s,replace:!0})}),d.jsx(jt,{path:"agenda",element:r?d.jsx(zh,{to:"servicios",replace:!0}):d.jsx(JV,{})}),d.jsx(jt,{path:"servicios",element:d.jsx(WV,{})}),d.jsx(jt,{path:"equipo",element:d.jsx(o4,{})}),d.jsx(jt,{path:"clientes",element:d.jsx(u4,{})}),d.jsx(jt,{path:"premios",element:d.jsx(h4,{})}),d.jsx(jt,{path:"productos",element:d.jsx(f4,{})}),d.jsx(jt,{path:"lookbook",element:d.jsx(m4,{})}),d.jsx(jt,{path:"metricas",element:d.jsx(c4,{})}),d.jsx(jt,{path:"*",element:d.jsx(zh,{to:s,replace:!0})})]})})}function _4(){return d.jsx(pV,{children:d.jsx(mV,{children:d.jsx(VC,{basename:"/gestion-interna",children:d.jsx(yE,{children:d.jsx(jt,{path:"/*",element:d.jsx(y4,{})})})})})})}oE(document.getElementById("root")).render(d.jsx(O.StrictMode,{children:d.jsx(_4,{})}));

function l1(t,e){for(var n=0;n<e.length;n++){const r=e[n];if(typeof r!="string"&&!Array.isArray(r)){for(const s in r)if(s!=="default"&&!(s in t)){const i=Object.getOwnPropertyDescriptor(r,s);i&&Object.defineProperty(t,s,i.get?i:{enumerable:!0,get:()=>r[s]})}}}return Object.freeze(Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}))}(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&r(o)}).observe(document,{childList:!0,subtree:!0});function n(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function r(s){if(s.ep)return;s.ep=!0;const i=n(s);fetch(s.href,i)}})();function u1(t){return t&&t.__esModule&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t}var Gv={exports:{}},Qu={},Kv={exports:{}},ne={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var ka=Symbol.for("react.element"),c1=Symbol.for("react.portal"),h1=Symbol.for("react.fragment"),d1=Symbol.for("react.strict_mode"),f1=Symbol.for("react.profiler"),p1=Symbol.for("react.provider"),m1=Symbol.for("react.context"),g1=Symbol.for("react.forward_ref"),y1=Symbol.for("react.suspense"),_1=Symbol.for("react.memo"),v1=Symbol.for("react.lazy"),Og=Symbol.iterator;function w1(t){return t===null||typeof t!="object"?null:(t=Og&&t[Og]||t["@@iterator"],typeof t=="function"?t:null)}var Qv={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},Xv=Object.assign,Yv={};function Ni(t,e,n){this.props=t,this.context=e,this.refs=Yv,this.updater=n||Qv}Ni.prototype.isReactComponent={};Ni.prototype.setState=function(t,e){if(typeof t!="object"&&typeof t!="function"&&t!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,t,e,"setState")};Ni.prototype.forceUpdate=function(t){this.updater.enqueueForceUpdate(this,t,"forceUpdate")};function Jv(){}Jv.prototype=Ni.prototype;function bf(t,e,n){this.props=t,this.context=e,this.refs=Yv,this.updater=n||Qv}var Pf=bf.prototype=new Jv;Pf.constructor=bf;Xv(Pf,Ni.prototype);Pf.isPureReactComponent=!0;var Vg=Array.isArray,Zv=Object.prototype.hasOwnProperty,Nf={current:null},e0={key:!0,ref:!0,__self:!0,__source:!0};function t0(t,e,n){var r,s={},i=null,o=null;if(e!=null)for(r in e.ref!==void 0&&(o=e.ref),e.key!==void 0&&(i=""+e.key),e)Zv.call(e,r)&&!e0.hasOwnProperty(r)&&(s[r]=e[r]);var l=arguments.length-2;if(l===1)s.children=n;else if(1<l){for(var u=Array(l),c=0;c<l;c++)u[c]=arguments[c+2];s.children=u}if(t&&t.defaultProps)for(r in l=t.defaultProps,l)s[r]===void 0&&(s[r]=l[r]);return{$$typeof:ka,type:t,key:i,ref:o,props:s,_owner:Nf.current}}function E1(t,e){return{$$typeof:ka,type:t.type,key:e,ref:t.ref,props:t.props,_owner:t._owner}}function Df(t){return typeof t=="object"&&t!==null&&t.$$typeof===ka}function T1(t){var e={"=":"=0",":":"=2"};return"$"+t.replace(/[=:]/g,function(n){return e[n]})}var Lg=/\/+/g;function fh(t,e){return typeof t=="object"&&t!==null&&t.key!=null?T1(""+t.key):e.toString(36)}function Ol(t,e,n,r,s){var i=typeof t;(i==="undefined"||i==="boolean")&&(t=null);var o=!1;if(t===null)o=!0;else switch(i){case"string":case"number":o=!0;break;case"object":switch(t.$$typeof){case ka:case c1:o=!0}}if(o)return o=t,s=s(o),t=r===""?"."+fh(o,0):r,Vg(s)?(n="",t!=null&&(n=t.replace(Lg,"$&/")+"/"),Ol(s,e,n,"",function(c){return c})):s!=null&&(Df(s)&&(s=E1(s,n+(!s.key||o&&o.key===s.key?"":(""+s.key).replace(Lg,"$&/")+"/")+t)),e.push(s)),1;if(o=0,r=r===""?".":r+":",Vg(t))for(var l=0;l<t.length;l++){i=t[l];var u=r+fh(i,l);o+=Ol(i,e,n,u,s)}else if(u=w1(t),typeof u=="function")for(t=u.call(t),l=0;!(i=t.next()).done;)i=i.value,u=r+fh(i,l++),o+=Ol(i,e,n,u,s);else if(i==="object")throw e=String(t),Error("Objects are not valid as a React child (found: "+(e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e)+"). If you meant to render a collection of children, use an array instead.");return o}function al(t,e,n){if(t==null)return t;var r=[],s=0;return Ol(t,r,"","",function(i){return e.call(n,i,s++)}),r}function x1(t){if(t._status===-1){var e=t._result;e=e(),e.then(function(n){(t._status===0||t._status===-1)&&(t._status=1,t._result=n)},function(n){(t._status===0||t._status===-1)&&(t._status=2,t._result=n)}),t._status===-1&&(t._status=0,t._result=e)}if(t._status===1)return t._result.default;throw t._result}var gt={current:null},Vl={transition:null},I1={ReactCurrentDispatcher:gt,ReactCurrentBatchConfig:Vl,ReactCurrentOwner:Nf};function n0(){throw Error("act(...) is not supported in production builds of React.")}ne.Children={map:al,forEach:function(t,e,n){al(t,function(){e.apply(this,arguments)},n)},count:function(t){var e=0;return al(t,function(){e++}),e},toArray:function(t){return al(t,function(e){return e})||[]},only:function(t){if(!Df(t))throw Error("React.Children.only expected to receive a single React element child.");return t}};ne.Component=Ni;ne.Fragment=h1;ne.Profiler=f1;ne.PureComponent=bf;ne.StrictMode=d1;ne.Suspense=y1;ne.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=I1;ne.act=n0;ne.cloneElement=function(t,e,n){if(t==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+t+".");var r=Xv({},t.props),s=t.key,i=t.ref,o=t._owner;if(e!=null){if(e.ref!==void 0&&(i=e.ref,o=Nf.current),e.key!==void 0&&(s=""+e.key),t.type&&t.type.defaultProps)var l=t.type.defaultProps;for(u in e)Zv.call(e,u)&&!e0.hasOwnProperty(u)&&(r[u]=e[u]===void 0&&l!==void 0?l[u]:e[u])}var u=arguments.length-2;if(u===1)r.children=n;else if(1<u){l=Array(u);for(var c=0;c<u;c++)l[c]=arguments[c+2];r.children=l}return{$$typeof:ka,type:t.type,key:s,ref:i,props:r,_owner:o}};ne.createContext=function(t){return t={$$typeof:m1,_currentValue:t,_currentValue2:t,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},t.Provider={$$typeof:p1,_context:t},t.Consumer=t};ne.createElement=t0;ne.createFactory=function(t){var e=t0.bind(null,t);return e.type=t,e};ne.createRef=function(){return{current:null}};ne.forwardRef=function(t){return{$$typeof:g1,render:t}};ne.isValidElement=Df;ne.lazy=function(t){return{$$typeof:v1,_payload:{_status:-1,_result:t},_init:x1}};ne.memo=function(t,e){return{$$typeof:_1,type:t,compare:e===void 0?null:e}};ne.startTransition=function(t){var e=Vl.transition;Vl.transition={};try{t()}finally{Vl.transition=e}};ne.unstable_act=n0;ne.useCallback=function(t,e){return gt.current.useCallback(t,e)};ne.useContext=function(t){return gt.current.useContext(t)};ne.useDebugValue=function(){};ne.useDeferredValue=function(t){return gt.current.useDeferredValue(t)};ne.useEffect=function(t,e){return gt.current.useEffect(t,e)};ne.useId=function(){return gt.current.useId()};ne.useImperativeHandle=function(t,e,n){return gt.current.useImperativeHandle(t,e,n)};ne.useInsertionEffect=function(t,e){return gt.current.useInsertionEffect(t,e)};ne.useLayoutEffect=function(t,e){return gt.current.useLayoutEffect(t,e)};ne.useMemo=function(t,e){return gt.current.useMemo(t,e)};ne.useReducer=function(t,e,n){return gt.current.useReducer(t,e,n)};ne.useRef=function(t){return gt.current.useRef(t)};ne.useState=function(t){return gt.current.useState(t)};ne.useSyncExternalStore=function(t,e,n){return gt.current.useSyncExternalStore(t,e,n)};ne.useTransition=function(){return gt.current.useTransition()};ne.version="18.3.1";Kv.exports=ne;var O=Kv.exports;const S1=u1(O),k1=l1({__proto__:null,default:S1},[O]);/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var C1=O,A1=Symbol.for("react.element"),R1=Symbol.for("react.fragment"),b1=Object.prototype.hasOwnProperty,P1=C1.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,N1={key:!0,ref:!0,__self:!0,__source:!0};function r0(t,e,n){var r,s={},i=null,o=null;n!==void 0&&(i=""+n),e.key!==void 0&&(i=""+e.key),e.ref!==void 0&&(o=e.ref);for(r in e)b1.call(e,r)&&!N1.hasOwnProperty(r)&&(s[r]=e[r]);if(t&&t.defaultProps)for(r in e=t.defaultProps,e)s[r]===void 0&&(s[r]=e[r]);return{$$typeof:A1,type:t,key:i,ref:o,props:s,_owner:P1.current}}Qu.Fragment=R1;Qu.jsx=r0;Qu.jsxs=r0;Gv.exports=Qu;var d=Gv.exports,s0={exports:{}},Vt={},i0={exports:{}},o0={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */(function(t){function e($,Q){var J=$.length;$.push(Q);e:for(;0<J;){var ve=J-1>>>1,Pe=$[ve];if(0<s(Pe,Q))$[ve]=Q,$[J]=Pe,J=ve;else break e}}function n($){return $.length===0?null:$[0]}function r($){if($.length===0)return null;var Q=$[0],J=$.pop();if(J!==Q){$[0]=J;e:for(var ve=0,Pe=$.length,Jr=Pe>>>1;ve<Jr;){var Mt=2*(ve+1)-1,Zr=$[Mt],Kt=Mt+1,Yn=$[Kt];if(0>s(Zr,J))Kt<Pe&&0>s(Yn,Zr)?($[ve]=Yn,$[Kt]=J,ve=Kt):($[ve]=Zr,$[Mt]=J,ve=Mt);else if(Kt<Pe&&0>s(Yn,J))$[ve]=Yn,$[Kt]=J,ve=Kt;else break e}}return Q}function s($,Q){var J=$.sortIndex-Q.sortIndex;return J!==0?J:$.id-Q.id}if(typeof performance=="object"&&typeof performance.now=="function"){var i=performance;t.unstable_now=function(){return i.now()}}else{var o=Date,l=o.now();t.unstable_now=function(){return o.now()-l}}var u=[],c=[],f=1,p=null,g=3,w=!1,S=!1,b=!1,P=typeof setTimeout=="function"?setTimeout:null,I=typeof clearTimeout=="function"?clearTimeout:null,v=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function C($){for(var Q=n(c);Q!==null;){if(Q.callback===null)r(c);else if(Q.startTime<=$)r(c),Q.sortIndex=Q.expirationTime,e(u,Q);else break;Q=n(c)}}function D($){if(b=!1,C($),!S)if(n(u)!==null)S=!0,ln(j);else{var Q=n(c);Q!==null&&Gt(D,Q.startTime-$)}}function j($,Q){S=!1,b&&(b=!1,I(_),_=-1),w=!0;var J=g;try{for(C(Q),p=n(u);p!==null&&(!(p.expirationTime>Q)||$&&!T());){var ve=p.callback;if(typeof ve=="function"){p.callback=null,g=p.priorityLevel;var Pe=ve(p.expirationTime<=Q);Q=t.unstable_now(),typeof Pe=="function"?p.callback=Pe:p===n(u)&&r(u),C(Q)}else r(u);p=n(u)}if(p!==null)var Jr=!0;else{var Mt=n(c);Mt!==null&&Gt(D,Mt.startTime-Q),Jr=!1}return Jr}finally{p=null,g=J,w=!1}}var L=!1,E=null,_=-1,x=5,R=-1;function T(){return!(t.unstable_now()-R<x)}function A(){if(E!==null){var $=t.unstable_now();R=$;var Q=!0;try{Q=E(!0,$)}finally{Q?k():(L=!1,E=null)}}else L=!1}var k;if(typeof v=="function")k=function(){v(A)};else if(typeof MessageChannel<"u"){var se=new MessageChannel,Ze=se.port2;se.port1.onmessage=A,k=function(){Ze.postMessage(null)}}else k=function(){P(A,0)};function ln($){E=$,L||(L=!0,k())}function Gt($,Q){_=P(function(){$(t.unstable_now())},Q)}t.unstable_IdlePriority=5,t.unstable_ImmediatePriority=1,t.unstable_LowPriority=4,t.unstable_NormalPriority=3,t.unstable_Profiling=null,t.unstable_UserBlockingPriority=2,t.unstable_cancelCallback=function($){$.callback=null},t.unstable_continueExecution=function(){S||w||(S=!0,ln(j))},t.unstable_forceFrameRate=function($){0>$||125<$?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):x=0<$?Math.floor(1e3/$):5},t.unstable_getCurrentPriorityLevel=function(){return g},t.unstable_getFirstCallbackNode=function(){return n(u)},t.unstable_next=function($){switch(g){case 1:case 2:case 3:var Q=3;break;default:Q=g}var J=g;g=Q;try{return $()}finally{g=J}},t.unstable_pauseExecution=function(){},t.unstable_requestPaint=function(){},t.unstable_runWithPriority=function($,Q){switch($){case 1:case 2:case 3:case 4:case 5:break;default:$=3}var J=g;g=$;try{return Q()}finally{g=J}},t.unstable_scheduleCallback=function($,Q,J){var ve=t.unstable_now();switch(typeof J=="object"&&J!==null?(J=J.delay,J=typeof J=="number"&&0<J?ve+J:ve):J=ve,$){case 1:var Pe=-1;break;case 2:Pe=250;break;case 5:Pe=1073741823;break;case 4:Pe=1e4;break;default:Pe=5e3}return Pe=J+Pe,$={id:f++,callback:Q,priorityLevel:$,startTime:J,expirationTime:Pe,sortIndex:-1},J>ve?($.sortIndex=J,e(c,$),n(u)===null&&$===n(c)&&(b?(I(_),_=-1):b=!0,Gt(D,J-ve))):($.sortIndex=Pe,e(u,$),S||w||(S=!0,ln(j))),$},t.unstable_shouldYield=T,t.unstable_wrapCallback=function($){var Q=g;return function(){var J=g;g=Q;try{return $.apply(this,arguments)}finally{g=J}}}})(o0);i0.exports=o0;var D1=i0.exports;/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var O1=O,Ot=D1;function F(t){for(var e="https://reactjs.org/docs/error-decoder.html?invariant="+t,n=1;n<arguments.length;n++)e+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+t+"; visit "+e+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var a0=new Set,Go={};function As(t,e){yi(t,e),yi(t+"Capture",e)}function yi(t,e){for(Go[t]=e,t=0;t<e.length;t++)a0.add(e[t])}var zn=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),sd=Object.prototype.hasOwnProperty,V1=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,Mg={},jg={};function L1(t){return sd.call(jg,t)?!0:sd.call(Mg,t)?!1:V1.test(t)?jg[t]=!0:(Mg[t]=!0,!1)}function M1(t,e,n,r){if(n!==null&&n.type===0)return!1;switch(typeof e){case"function":case"symbol":return!0;case"boolean":return r?!1:n!==null?!n.acceptsBooleans:(t=t.toLowerCase().slice(0,5),t!=="data-"&&t!=="aria-");default:return!1}}function j1(t,e,n,r){if(e===null||typeof e>"u"||M1(t,e,n,r))return!0;if(r)return!1;if(n!==null)switch(n.type){case 3:return!e;case 4:return e===!1;case 5:return isNaN(e);case 6:return isNaN(e)||1>e}return!1}function yt(t,e,n,r,s,i,o){this.acceptsBooleans=e===2||e===3||e===4,this.attributeName=r,this.attributeNamespace=s,this.mustUseProperty=n,this.propertyName=t,this.type=e,this.sanitizeURL=i,this.removeEmptyString=o}var Je={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(t){Je[t]=new yt(t,0,!1,t,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(t){var e=t[0];Je[e]=new yt(e,1,!1,t[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(t){Je[t]=new yt(t,2,!1,t.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(t){Je[t]=new yt(t,2,!1,t,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(t){Je[t]=new yt(t,3,!1,t.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(t){Je[t]=new yt(t,3,!0,t,null,!1,!1)});["capture","download"].forEach(function(t){Je[t]=new yt(t,4,!1,t,null,!1,!1)});["cols","rows","size","span"].forEach(function(t){Je[t]=new yt(t,6,!1,t,null,!1,!1)});["rowSpan","start"].forEach(function(t){Je[t]=new yt(t,5,!1,t.toLowerCase(),null,!1,!1)});var Of=/[\-:]([a-z])/g;function Vf(t){return t[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(t){var e=t.replace(Of,Vf);Je[e]=new yt(e,1,!1,t,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t){var e=t.replace(Of,Vf);Je[e]=new yt(e,1,!1,t,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(t){var e=t.replace(Of,Vf);Je[e]=new yt(e,1,!1,t,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(t){Je[t]=new yt(t,1,!1,t.toLowerCase(),null,!1,!1)});Je.xlinkHref=new yt("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(t){Je[t]=new yt(t,1,!1,t.toLowerCase(),null,!0,!0)});function Lf(t,e,n,r){var s=Je.hasOwnProperty(e)?Je[e]:null;(s!==null?s.type!==0:r||!(2<e.length)||e[0]!=="o"&&e[0]!=="O"||e[1]!=="n"&&e[1]!=="N")&&(j1(e,n,s,r)&&(n=null),r||s===null?L1(e)&&(n===null?t.removeAttribute(e):t.setAttribute(e,""+n)):s.mustUseProperty?t[s.propertyName]=n===null?s.type===3?!1:"":n:(e=s.attributeName,r=s.attributeNamespace,n===null?t.removeAttribute(e):(s=s.type,n=s===3||s===4&&n===!0?"":""+n,r?t.setAttributeNS(r,e,n):t.setAttribute(e,n))))}var Qn=O1.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,ll=Symbol.for("react.element"),Gs=Symbol.for("react.portal"),Ks=Symbol.for("react.fragment"),Mf=Symbol.for("react.strict_mode"),id=Symbol.for("react.profiler"),l0=Symbol.for("react.provider"),u0=Symbol.for("react.context"),jf=Symbol.for("react.forward_ref"),od=Symbol.for("react.suspense"),ad=Symbol.for("react.suspense_list"),Uf=Symbol.for("react.memo"),or=Symbol.for("react.lazy"),c0=Symbol.for("react.offscreen"),Ug=Symbol.iterator;function ho(t){return t===null||typeof t!="object"?null:(t=Ug&&t[Ug]||t["@@iterator"],typeof t=="function"?t:null)}var Ce=Object.assign,ph;function To(t){if(ph===void 0)try{throw Error()}catch(n){var e=n.stack.trim().match(/\n( *(at )?)/);ph=e&&e[1]||""}return`
`+ph+t}var mh=!1;function gh(t,e){if(!t||mh)return"";mh=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(e)if(e=function(){throw Error()},Object.defineProperty(e.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(e,[])}catch(c){var r=c}Reflect.construct(t,[],e)}else{try{e.call()}catch(c){r=c}t.call(e.prototype)}else{try{throw Error()}catch(c){r=c}t()}}catch(c){if(c&&r&&typeof c.stack=="string"){for(var s=c.stack.split(`
`),i=r.stack.split(`
`),o=s.length-1,l=i.length-1;1<=o&&0<=l&&s[o]!==i[l];)l--;for(;1<=o&&0<=l;o--,l--)if(s[o]!==i[l]){if(o!==1||l!==1)do if(o--,l--,0>l||s[o]!==i[l]){var u=`
`+s[o].replace(" at new "," at ");return t.displayName&&u.includes("<anonymous>")&&(u=u.replace("<anonymous>",t.displayName)),u}while(1<=o&&0<=l);break}}}finally{mh=!1,Error.prepareStackTrace=n}return(t=t?t.displayName||t.name:"")?To(t):""}function U1(t){switch(t.tag){case 5:return To(t.type);case 16:return To("Lazy");case 13:return To("Suspense");case 19:return To("SuspenseList");case 0:case 2:case 15:return t=gh(t.type,!1),t;case 11:return t=gh(t.type.render,!1),t;case 1:return t=gh(t.type,!0),t;default:return""}}function ld(t){if(t==null)return null;if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t;switch(t){case Ks:return"Fragment";case Gs:return"Portal";case id:return"Profiler";case Mf:return"StrictMode";case od:return"Suspense";case ad:return"SuspenseList"}if(typeof t=="object")switch(t.$$typeof){case u0:return(t.displayName||"Context")+".Consumer";case l0:return(t._context.displayName||"Context")+".Provider";case jf:var e=t.render;return t=t.displayName,t||(t=e.displayName||e.name||"",t=t!==""?"ForwardRef("+t+")":"ForwardRef"),t;case Uf:return e=t.displayName||null,e!==null?e:ld(t.type)||"Memo";case or:e=t._payload,t=t._init;try{return ld(t(e))}catch{}}return null}function F1(t){var e=t.type;switch(t.tag){case 24:return"Cache";case 9:return(e.displayName||"Context")+".Consumer";case 10:return(e._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return t=e.render,t=t.displayName||t.name||"",e.displayName||(t!==""?"ForwardRef("+t+")":"ForwardRef");case 7:return"Fragment";case 5:return e;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return ld(e);case 8:return e===Mf?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e}return null}function Nr(t){switch(typeof t){case"boolean":case"number":case"string":case"undefined":return t;case"object":return t;default:return""}}function h0(t){var e=t.type;return(t=t.nodeName)&&t.toLowerCase()==="input"&&(e==="checkbox"||e==="radio")}function z1(t){var e=h0(t)?"checked":"value",n=Object.getOwnPropertyDescriptor(t.constructor.prototype,e),r=""+t[e];if(!t.hasOwnProperty(e)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var s=n.get,i=n.set;return Object.defineProperty(t,e,{configurable:!0,get:function(){return s.call(this)},set:function(o){r=""+o,i.call(this,o)}}),Object.defineProperty(t,e,{enumerable:n.enumerable}),{getValue:function(){return r},setValue:function(o){r=""+o},stopTracking:function(){t._valueTracker=null,delete t[e]}}}}function ul(t){t._valueTracker||(t._valueTracker=z1(t))}function d0(t){if(!t)return!1;var e=t._valueTracker;if(!e)return!0;var n=e.getValue(),r="";return t&&(r=h0(t)?t.checked?"true":"false":t.value),t=r,t!==n?(e.setValue(t),!0):!1}function ru(t){if(t=t||(typeof document<"u"?document:void 0),typeof t>"u")return null;try{return t.activeElement||t.body}catch{return t.body}}function ud(t,e){var n=e.checked;return Ce({},e,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??t._wrapperState.initialChecked})}function Fg(t,e){var n=e.defaultValue==null?"":e.defaultValue,r=e.checked!=null?e.checked:e.defaultChecked;n=Nr(e.value!=null?e.value:n),t._wrapperState={initialChecked:r,initialValue:n,controlled:e.type==="checkbox"||e.type==="radio"?e.checked!=null:e.value!=null}}function f0(t,e){e=e.checked,e!=null&&Lf(t,"checked",e,!1)}function cd(t,e){f0(t,e);var n=Nr(e.value),r=e.type;if(n!=null)r==="number"?(n===0&&t.value===""||t.value!=n)&&(t.value=""+n):t.value!==""+n&&(t.value=""+n);else if(r==="submit"||r==="reset"){t.removeAttribute("value");return}e.hasOwnProperty("value")?hd(t,e.type,n):e.hasOwnProperty("defaultValue")&&hd(t,e.type,Nr(e.defaultValue)),e.checked==null&&e.defaultChecked!=null&&(t.defaultChecked=!!e.defaultChecked)}function zg(t,e,n){if(e.hasOwnProperty("value")||e.hasOwnProperty("defaultValue")){var r=e.type;if(!(r!=="submit"&&r!=="reset"||e.value!==void 0&&e.value!==null))return;e=""+t._wrapperState.initialValue,n||e===t.value||(t.value=e),t.defaultValue=e}n=t.name,n!==""&&(t.name=""),t.defaultChecked=!!t._wrapperState.initialChecked,n!==""&&(t.name=n)}function hd(t,e,n){(e!=="number"||ru(t.ownerDocument)!==t)&&(n==null?t.defaultValue=""+t._wrapperState.initialValue:t.defaultValue!==""+n&&(t.defaultValue=""+n))}var xo=Array.isArray;function oi(t,e,n,r){if(t=t.options,e){e={};for(var s=0;s<n.length;s++)e["$"+n[s]]=!0;for(n=0;n<t.length;n++)s=e.hasOwnProperty("$"+t[n].value),t[n].selected!==s&&(t[n].selected=s),s&&r&&(t[n].defaultSelected=!0)}else{for(n=""+Nr(n),e=null,s=0;s<t.length;s++){if(t[s].value===n){t[s].selected=!0,r&&(t[s].defaultSelected=!0);return}e!==null||t[s].disabled||(e=t[s])}e!==null&&(e.selected=!0)}}function dd(t,e){if(e.dangerouslySetInnerHTML!=null)throw Error(F(91));return Ce({},e,{value:void 0,defaultValue:void 0,children:""+t._wrapperState.initialValue})}function Bg(t,e){var n=e.value;if(n==null){if(n=e.children,e=e.defaultValue,n!=null){if(e!=null)throw Error(F(92));if(xo(n)){if(1<n.length)throw Error(F(93));n=n[0]}e=n}e==null&&(e=""),n=e}t._wrapperState={initialValue:Nr(n)}}function p0(t,e){var n=Nr(e.value),r=Nr(e.defaultValue);n!=null&&(n=""+n,n!==t.value&&(t.value=n),e.defaultValue==null&&t.defaultValue!==n&&(t.defaultValue=n)),r!=null&&(t.defaultValue=""+r)}function $g(t){var e=t.textContent;e===t._wrapperState.initialValue&&e!==""&&e!==null&&(t.value=e)}function m0(t){switch(t){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function fd(t,e){return t==null||t==="http://www.w3.org/1999/xhtml"?m0(e):t==="http://www.w3.org/2000/svg"&&e==="foreignObject"?"http://www.w3.org/1999/xhtml":t}var cl,g0=function(t){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(e,n,r,s){MSApp.execUnsafeLocalFunction(function(){return t(e,n,r,s)})}:t}(function(t,e){if(t.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in t)t.innerHTML=e;else{for(cl=cl||document.createElement("div"),cl.innerHTML="<svg>"+e.valueOf().toString()+"</svg>",e=cl.firstChild;t.firstChild;)t.removeChild(t.firstChild);for(;e.firstChild;)t.appendChild(e.firstChild)}});function Ko(t,e){if(e){var n=t.firstChild;if(n&&n===t.lastChild&&n.nodeType===3){n.nodeValue=e;return}}t.textContent=e}var Po={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},B1=["Webkit","ms","Moz","O"];Object.keys(Po).forEach(function(t){B1.forEach(function(e){e=e+t.charAt(0).toUpperCase()+t.substring(1),Po[e]=Po[t]})});function y0(t,e,n){return e==null||typeof e=="boolean"||e===""?"":n||typeof e!="number"||e===0||Po.hasOwnProperty(t)&&Po[t]?(""+e).trim():e+"px"}function _0(t,e){t=t.style;for(var n in e)if(e.hasOwnProperty(n)){var r=n.indexOf("--")===0,s=y0(n,e[n],r);n==="float"&&(n="cssFloat"),r?t.setProperty(n,s):t[n]=s}}var $1=Ce({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function pd(t,e){if(e){if($1[t]&&(e.children!=null||e.dangerouslySetInnerHTML!=null))throw Error(F(137,t));if(e.dangerouslySetInnerHTML!=null){if(e.children!=null)throw Error(F(60));if(typeof e.dangerouslySetInnerHTML!="object"||!("__html"in e.dangerouslySetInnerHTML))throw Error(F(61))}if(e.style!=null&&typeof e.style!="object")throw Error(F(62))}}function md(t,e){if(t.indexOf("-")===-1)return typeof e.is=="string";switch(t){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var gd=null;function Ff(t){return t=t.target||t.srcElement||window,t.correspondingUseElement&&(t=t.correspondingUseElement),t.nodeType===3?t.parentNode:t}var yd=null,ai=null,li=null;function qg(t){if(t=Ra(t)){if(typeof yd!="function")throw Error(F(280));var e=t.stateNode;e&&(e=ec(e),yd(t.stateNode,t.type,e))}}function v0(t){ai?li?li.push(t):li=[t]:ai=t}function w0(){if(ai){var t=ai,e=li;if(li=ai=null,qg(t),e)for(t=0;t<e.length;t++)qg(e[t])}}function E0(t,e){return t(e)}function T0(){}var yh=!1;function x0(t,e,n){if(yh)return t(e,n);yh=!0;try{return E0(t,e,n)}finally{yh=!1,(ai!==null||li!==null)&&(T0(),w0())}}function Qo(t,e){var n=t.stateNode;if(n===null)return null;var r=ec(n);if(r===null)return null;n=r[e];e:switch(e){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(r=!r.disabled)||(t=t.type,r=!(t==="button"||t==="input"||t==="select"||t==="textarea")),t=!r;break e;default:t=!1}if(t)return null;if(n&&typeof n!="function")throw Error(F(231,e,typeof n));return n}var _d=!1;if(zn)try{var fo={};Object.defineProperty(fo,"passive",{get:function(){_d=!0}}),window.addEventListener("test",fo,fo),window.removeEventListener("test",fo,fo)}catch{_d=!1}function q1(t,e,n,r,s,i,o,l,u){var c=Array.prototype.slice.call(arguments,3);try{e.apply(n,c)}catch(f){this.onError(f)}}var No=!1,su=null,iu=!1,vd=null,H1={onError:function(t){No=!0,su=t}};function W1(t,e,n,r,s,i,o,l,u){No=!1,su=null,q1.apply(H1,arguments)}function G1(t,e,n,r,s,i,o,l,u){if(W1.apply(this,arguments),No){if(No){var c=su;No=!1,su=null}else throw Error(F(198));iu||(iu=!0,vd=c)}}function Rs(t){var e=t,n=t;if(t.alternate)for(;e.return;)e=e.return;else{t=e;do e=t,e.flags&4098&&(n=e.return),t=e.return;while(t)}return e.tag===3?n:null}function I0(t){if(t.tag===13){var e=t.memoizedState;if(e===null&&(t=t.alternate,t!==null&&(e=t.memoizedState)),e!==null)return e.dehydrated}return null}function Hg(t){if(Rs(t)!==t)throw Error(F(188))}function K1(t){var e=t.alternate;if(!e){if(e=Rs(t),e===null)throw Error(F(188));return e!==t?null:t}for(var n=t,r=e;;){var s=n.return;if(s===null)break;var i=s.alternate;if(i===null){if(r=s.return,r!==null){n=r;continue}break}if(s.child===i.child){for(i=s.child;i;){if(i===n)return Hg(s),t;if(i===r)return Hg(s),e;i=i.sibling}throw Error(F(188))}if(n.return!==r.return)n=s,r=i;else{for(var o=!1,l=s.child;l;){if(l===n){o=!0,n=s,r=i;break}if(l===r){o=!0,r=s,n=i;break}l=l.sibling}if(!o){for(l=i.child;l;){if(l===n){o=!0,n=i,r=s;break}if(l===r){o=!0,r=i,n=s;break}l=l.sibling}if(!o)throw Error(F(189))}}if(n.alternate!==r)throw Error(F(190))}if(n.tag!==3)throw Error(F(188));return n.stateNode.current===n?t:e}function S0(t){return t=K1(t),t!==null?k0(t):null}function k0(t){if(t.tag===5||t.tag===6)return t;for(t=t.child;t!==null;){var e=k0(t);if(e!==null)return e;t=t.sibling}return null}var C0=Ot.unstable_scheduleCallback,Wg=Ot.unstable_cancelCallback,Q1=Ot.unstable_shouldYield,X1=Ot.unstable_requestPaint,De=Ot.unstable_now,Y1=Ot.unstable_getCurrentPriorityLevel,zf=Ot.unstable_ImmediatePriority,A0=Ot.unstable_UserBlockingPriority,ou=Ot.unstable_NormalPriority,J1=Ot.unstable_LowPriority,R0=Ot.unstable_IdlePriority,Xu=null,gn=null;function Z1(t){if(gn&&typeof gn.onCommitFiberRoot=="function")try{gn.onCommitFiberRoot(Xu,t,void 0,(t.current.flags&128)===128)}catch{}}var en=Math.clz32?Math.clz32:nS,eS=Math.log,tS=Math.LN2;function nS(t){return t>>>=0,t===0?32:31-(eS(t)/tS|0)|0}var hl=64,dl=4194304;function Io(t){switch(t&-t){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return t&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return t}}function au(t,e){var n=t.pendingLanes;if(n===0)return 0;var r=0,s=t.suspendedLanes,i=t.pingedLanes,o=n&268435455;if(o!==0){var l=o&~s;l!==0?r=Io(l):(i&=o,i!==0&&(r=Io(i)))}else o=n&~s,o!==0?r=Io(o):i!==0&&(r=Io(i));if(r===0)return 0;if(e!==0&&e!==r&&!(e&s)&&(s=r&-r,i=e&-e,s>=i||s===16&&(i&4194240)!==0))return e;if(r&4&&(r|=n&16),e=t.entangledLanes,e!==0)for(t=t.entanglements,e&=r;0<e;)n=31-en(e),s=1<<n,r|=t[n],e&=~s;return r}function rS(t,e){switch(t){case 1:case 2:case 4:return e+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function sS(t,e){for(var n=t.suspendedLanes,r=t.pingedLanes,s=t.expirationTimes,i=t.pendingLanes;0<i;){var o=31-en(i),l=1<<o,u=s[o];u===-1?(!(l&n)||l&r)&&(s[o]=rS(l,e)):u<=e&&(t.expiredLanes|=l),i&=~l}}function wd(t){return t=t.pendingLanes&-1073741825,t!==0?t:t&1073741824?1073741824:0}function b0(){var t=hl;return hl<<=1,!(hl&4194240)&&(hl=64),t}function _h(t){for(var e=[],n=0;31>n;n++)e.push(t);return e}function Ca(t,e,n){t.pendingLanes|=e,e!==536870912&&(t.suspendedLanes=0,t.pingedLanes=0),t=t.eventTimes,e=31-en(e),t[e]=n}function iS(t,e){var n=t.pendingLanes&~e;t.pendingLanes=e,t.suspendedLanes=0,t.pingedLanes=0,t.expiredLanes&=e,t.mutableReadLanes&=e,t.entangledLanes&=e,e=t.entanglements;var r=t.eventTimes;for(t=t.expirationTimes;0<n;){var s=31-en(n),i=1<<s;e[s]=0,r[s]=-1,t[s]=-1,n&=~i}}function Bf(t,e){var n=t.entangledLanes|=e;for(t=t.entanglements;n;){var r=31-en(n),s=1<<r;s&e|t[r]&e&&(t[r]|=e),n&=~s}}var ue=0;function P0(t){return t&=-t,1<t?4<t?t&268435455?16:536870912:4:1}var N0,$f,D0,O0,V0,Ed=!1,fl=[],yr=null,_r=null,vr=null,Xo=new Map,Yo=new Map,lr=[],oS="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function Gg(t,e){switch(t){case"focusin":case"focusout":yr=null;break;case"dragenter":case"dragleave":_r=null;break;case"mouseover":case"mouseout":vr=null;break;case"pointerover":case"pointerout":Xo.delete(e.pointerId);break;case"gotpointercapture":case"lostpointercapture":Yo.delete(e.pointerId)}}function po(t,e,n,r,s,i){return t===null||t.nativeEvent!==i?(t={blockedOn:e,domEventName:n,eventSystemFlags:r,nativeEvent:i,targetContainers:[s]},e!==null&&(e=Ra(e),e!==null&&$f(e)),t):(t.eventSystemFlags|=r,e=t.targetContainers,s!==null&&e.indexOf(s)===-1&&e.push(s),t)}function aS(t,e,n,r,s){switch(e){case"focusin":return yr=po(yr,t,e,n,r,s),!0;case"dragenter":return _r=po(_r,t,e,n,r,s),!0;case"mouseover":return vr=po(vr,t,e,n,r,s),!0;case"pointerover":var i=s.pointerId;return Xo.set(i,po(Xo.get(i)||null,t,e,n,r,s)),!0;case"gotpointercapture":return i=s.pointerId,Yo.set(i,po(Yo.get(i)||null,t,e,n,r,s)),!0}return!1}function L0(t){var e=us(t.target);if(e!==null){var n=Rs(e);if(n!==null){if(e=n.tag,e===13){if(e=I0(n),e!==null){t.blockedOn=e,V0(t.priority,function(){D0(n)});return}}else if(e===3&&n.stateNode.current.memoizedState.isDehydrated){t.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}t.blockedOn=null}function Ll(t){if(t.blockedOn!==null)return!1;for(var e=t.targetContainers;0<e.length;){var n=Td(t.domEventName,t.eventSystemFlags,e[0],t.nativeEvent);if(n===null){n=t.nativeEvent;var r=new n.constructor(n.type,n);gd=r,n.target.dispatchEvent(r),gd=null}else return e=Ra(n),e!==null&&$f(e),t.blockedOn=n,!1;e.shift()}return!0}function Kg(t,e,n){Ll(t)&&n.delete(e)}function lS(){Ed=!1,yr!==null&&Ll(yr)&&(yr=null),_r!==null&&Ll(_r)&&(_r=null),vr!==null&&Ll(vr)&&(vr=null),Xo.forEach(Kg),Yo.forEach(Kg)}function mo(t,e){t.blockedOn===e&&(t.blockedOn=null,Ed||(Ed=!0,Ot.unstable_scheduleCallback(Ot.unstable_NormalPriority,lS)))}function Jo(t){function e(s){return mo(s,t)}if(0<fl.length){mo(fl[0],t);for(var n=1;n<fl.length;n++){var r=fl[n];r.blockedOn===t&&(r.blockedOn=null)}}for(yr!==null&&mo(yr,t),_r!==null&&mo(_r,t),vr!==null&&mo(vr,t),Xo.forEach(e),Yo.forEach(e),n=0;n<lr.length;n++)r=lr[n],r.blockedOn===t&&(r.blockedOn=null);for(;0<lr.length&&(n=lr[0],n.blockedOn===null);)L0(n),n.blockedOn===null&&lr.shift()}var ui=Qn.ReactCurrentBatchConfig,lu=!0;function uS(t,e,n,r){var s=ue,i=ui.transition;ui.transition=null;try{ue=1,qf(t,e,n,r)}finally{ue=s,ui.transition=i}}function cS(t,e,n,r){var s=ue,i=ui.transition;ui.transition=null;try{ue=4,qf(t,e,n,r)}finally{ue=s,ui.transition=i}}function qf(t,e,n,r){if(lu){var s=Td(t,e,n,r);if(s===null)Ah(t,e,r,uu,n),Gg(t,r);else if(aS(s,t,e,n,r))r.stopPropagation();else if(Gg(t,r),e&4&&-1<oS.indexOf(t)){for(;s!==null;){var i=Ra(s);if(i!==null&&N0(i),i=Td(t,e,n,r),i===null&&Ah(t,e,r,uu,n),i===s)break;s=i}s!==null&&r.stopPropagation()}else Ah(t,e,r,null,n)}}var uu=null;function Td(t,e,n,r){if(uu=null,t=Ff(r),t=us(t),t!==null)if(e=Rs(t),e===null)t=null;else if(n=e.tag,n===13){if(t=I0(e),t!==null)return t;t=null}else if(n===3){if(e.stateNode.current.memoizedState.isDehydrated)return e.tag===3?e.stateNode.containerInfo:null;t=null}else e!==t&&(t=null);return uu=t,null}function M0(t){switch(t){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Y1()){case zf:return 1;case A0:return 4;case ou:case J1:return 16;case R0:return 536870912;default:return 16}default:return 16}}var pr=null,Hf=null,Ml=null;function j0(){if(Ml)return Ml;var t,e=Hf,n=e.length,r,s="value"in pr?pr.value:pr.textContent,i=s.length;for(t=0;t<n&&e[t]===s[t];t++);var o=n-t;for(r=1;r<=o&&e[n-r]===s[i-r];r++);return Ml=s.slice(t,1<r?1-r:void 0)}function jl(t){var e=t.keyCode;return"charCode"in t?(t=t.charCode,t===0&&e===13&&(t=13)):t=e,t===10&&(t=13),32<=t||t===13?t:0}function pl(){return!0}function Qg(){return!1}function Lt(t){function e(n,r,s,i,o){this._reactName=n,this._targetInst=s,this.type=r,this.nativeEvent=i,this.target=o,this.currentTarget=null;for(var l in t)t.hasOwnProperty(l)&&(n=t[l],this[l]=n?n(i):i[l]);return this.isDefaultPrevented=(i.defaultPrevented!=null?i.defaultPrevented:i.returnValue===!1)?pl:Qg,this.isPropagationStopped=Qg,this}return Ce(e.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=pl)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=pl)},persist:function(){},isPersistent:pl}),e}var Di={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(t){return t.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Wf=Lt(Di),Aa=Ce({},Di,{view:0,detail:0}),hS=Lt(Aa),vh,wh,go,Yu=Ce({},Aa,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Gf,button:0,buttons:0,relatedTarget:function(t){return t.relatedTarget===void 0?t.fromElement===t.srcElement?t.toElement:t.fromElement:t.relatedTarget},movementX:function(t){return"movementX"in t?t.movementX:(t!==go&&(go&&t.type==="mousemove"?(vh=t.screenX-go.screenX,wh=t.screenY-go.screenY):wh=vh=0,go=t),vh)},movementY:function(t){return"movementY"in t?t.movementY:wh}}),Xg=Lt(Yu),dS=Ce({},Yu,{dataTransfer:0}),fS=Lt(dS),pS=Ce({},Aa,{relatedTarget:0}),Eh=Lt(pS),mS=Ce({},Di,{animationName:0,elapsedTime:0,pseudoElement:0}),gS=Lt(mS),yS=Ce({},Di,{clipboardData:function(t){return"clipboardData"in t?t.clipboardData:window.clipboardData}}),_S=Lt(yS),vS=Ce({},Di,{data:0}),Yg=Lt(vS),wS={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},ES={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},TS={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function xS(t){var e=this.nativeEvent;return e.getModifierState?e.getModifierState(t):(t=TS[t])?!!e[t]:!1}function Gf(){return xS}var IS=Ce({},Aa,{key:function(t){if(t.key){var e=wS[t.key]||t.key;if(e!=="Unidentified")return e}return t.type==="keypress"?(t=jl(t),t===13?"Enter":String.fromCharCode(t)):t.type==="keydown"||t.type==="keyup"?ES[t.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Gf,charCode:function(t){return t.type==="keypress"?jl(t):0},keyCode:function(t){return t.type==="keydown"||t.type==="keyup"?t.keyCode:0},which:function(t){return t.type==="keypress"?jl(t):t.type==="keydown"||t.type==="keyup"?t.keyCode:0}}),SS=Lt(IS),kS=Ce({},Yu,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Jg=Lt(kS),CS=Ce({},Aa,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Gf}),AS=Lt(CS),RS=Ce({},Di,{propertyName:0,elapsedTime:0,pseudoElement:0}),bS=Lt(RS),PS=Ce({},Yu,{deltaX:function(t){return"deltaX"in t?t.deltaX:"wheelDeltaX"in t?-t.wheelDeltaX:0},deltaY:function(t){return"deltaY"in t?t.deltaY:"wheelDeltaY"in t?-t.wheelDeltaY:"wheelDelta"in t?-t.wheelDelta:0},deltaZ:0,deltaMode:0}),NS=Lt(PS),DS=[9,13,27,32],Kf=zn&&"CompositionEvent"in window,Do=null;zn&&"documentMode"in document&&(Do=document.documentMode);var OS=zn&&"TextEvent"in window&&!Do,U0=zn&&(!Kf||Do&&8<Do&&11>=Do),Zg=" ",ey=!1;function F0(t,e){switch(t){case"keyup":return DS.indexOf(e.keyCode)!==-1;case"keydown":return e.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function z0(t){return t=t.detail,typeof t=="object"&&"data"in t?t.data:null}var Qs=!1;function VS(t,e){switch(t){case"compositionend":return z0(e);case"keypress":return e.which!==32?null:(ey=!0,Zg);case"textInput":return t=e.data,t===Zg&&ey?null:t;default:return null}}function LS(t,e){if(Qs)return t==="compositionend"||!Kf&&F0(t,e)?(t=j0(),Ml=Hf=pr=null,Qs=!1,t):null;switch(t){case"paste":return null;case"keypress":if(!(e.ctrlKey||e.altKey||e.metaKey)||e.ctrlKey&&e.altKey){if(e.char&&1<e.char.length)return e.char;if(e.which)return String.fromCharCode(e.which)}return null;case"compositionend":return U0&&e.locale!=="ko"?null:e.data;default:return null}}var MS={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function ty(t){var e=t&&t.nodeName&&t.nodeName.toLowerCase();return e==="input"?!!MS[t.type]:e==="textarea"}function B0(t,e,n,r){v0(r),e=cu(e,"onChange"),0<e.length&&(n=new Wf("onChange","change",null,n,r),t.push({event:n,listeners:e}))}var Oo=null,Zo=null;function jS(t){Z0(t,0)}function Ju(t){var e=Js(t);if(d0(e))return t}function US(t,e){if(t==="change")return e}var $0=!1;if(zn){var Th;if(zn){var xh="oninput"in document;if(!xh){var ny=document.createElement("div");ny.setAttribute("oninput","return;"),xh=typeof ny.oninput=="function"}Th=xh}else Th=!1;$0=Th&&(!document.documentMode||9<document.documentMode)}function ry(){Oo&&(Oo.detachEvent("onpropertychange",q0),Zo=Oo=null)}function q0(t){if(t.propertyName==="value"&&Ju(Zo)){var e=[];B0(e,Zo,t,Ff(t)),x0(jS,e)}}function FS(t,e,n){t==="focusin"?(ry(),Oo=e,Zo=n,Oo.attachEvent("onpropertychange",q0)):t==="focusout"&&ry()}function zS(t){if(t==="selectionchange"||t==="keyup"||t==="keydown")return Ju(Zo)}function BS(t,e){if(t==="click")return Ju(e)}function $S(t,e){if(t==="input"||t==="change")return Ju(e)}function qS(t,e){return t===e&&(t!==0||1/t===1/e)||t!==t&&e!==e}var sn=typeof Object.is=="function"?Object.is:qS;function ea(t,e){if(sn(t,e))return!0;if(typeof t!="object"||t===null||typeof e!="object"||e===null)return!1;var n=Object.keys(t),r=Object.keys(e);if(n.length!==r.length)return!1;for(r=0;r<n.length;r++){var s=n[r];if(!sd.call(e,s)||!sn(t[s],e[s]))return!1}return!0}function sy(t){for(;t&&t.firstChild;)t=t.firstChild;return t}function iy(t,e){var n=sy(t);t=0;for(var r;n;){if(n.nodeType===3){if(r=t+n.textContent.length,t<=e&&r>=e)return{node:n,offset:e-t};t=r}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=sy(n)}}function H0(t,e){return t&&e?t===e?!0:t&&t.nodeType===3?!1:e&&e.nodeType===3?H0(t,e.parentNode):"contains"in t?t.contains(e):t.compareDocumentPosition?!!(t.compareDocumentPosition(e)&16):!1:!1}function W0(){for(var t=window,e=ru();e instanceof t.HTMLIFrameElement;){try{var n=typeof e.contentWindow.location.href=="string"}catch{n=!1}if(n)t=e.contentWindow;else break;e=ru(t.document)}return e}function Qf(t){var e=t&&t.nodeName&&t.nodeName.toLowerCase();return e&&(e==="input"&&(t.type==="text"||t.type==="search"||t.type==="tel"||t.type==="url"||t.type==="password")||e==="textarea"||t.contentEditable==="true")}function HS(t){var e=W0(),n=t.focusedElem,r=t.selectionRange;if(e!==n&&n&&n.ownerDocument&&H0(n.ownerDocument.documentElement,n)){if(r!==null&&Qf(n)){if(e=r.start,t=r.end,t===void 0&&(t=e),"selectionStart"in n)n.selectionStart=e,n.selectionEnd=Math.min(t,n.value.length);else if(t=(e=n.ownerDocument||document)&&e.defaultView||window,t.getSelection){t=t.getSelection();var s=n.textContent.length,i=Math.min(r.start,s);r=r.end===void 0?i:Math.min(r.end,s),!t.extend&&i>r&&(s=r,r=i,i=s),s=iy(n,i);var o=iy(n,r);s&&o&&(t.rangeCount!==1||t.anchorNode!==s.node||t.anchorOffset!==s.offset||t.focusNode!==o.node||t.focusOffset!==o.offset)&&(e=e.createRange(),e.setStart(s.node,s.offset),t.removeAllRanges(),i>r?(t.addRange(e),t.extend(o.node,o.offset)):(e.setEnd(o.node,o.offset),t.addRange(e)))}}for(e=[],t=n;t=t.parentNode;)t.nodeType===1&&e.push({element:t,left:t.scrollLeft,top:t.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<e.length;n++)t=e[n],t.element.scrollLeft=t.left,t.element.scrollTop=t.top}}var WS=zn&&"documentMode"in document&&11>=document.documentMode,Xs=null,xd=null,Vo=null,Id=!1;function oy(t,e,n){var r=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;Id||Xs==null||Xs!==ru(r)||(r=Xs,"selectionStart"in r&&Qf(r)?r={start:r.selectionStart,end:r.selectionEnd}:(r=(r.ownerDocument&&r.ownerDocument.defaultView||window).getSelection(),r={anchorNode:r.anchorNode,anchorOffset:r.anchorOffset,focusNode:r.focusNode,focusOffset:r.focusOffset}),Vo&&ea(Vo,r)||(Vo=r,r=cu(xd,"onSelect"),0<r.length&&(e=new Wf("onSelect","select",null,e,n),t.push({event:e,listeners:r}),e.target=Xs)))}function ml(t,e){var n={};return n[t.toLowerCase()]=e.toLowerCase(),n["Webkit"+t]="webkit"+e,n["Moz"+t]="moz"+e,n}var Ys={animationend:ml("Animation","AnimationEnd"),animationiteration:ml("Animation","AnimationIteration"),animationstart:ml("Animation","AnimationStart"),transitionend:ml("Transition","TransitionEnd")},Ih={},G0={};zn&&(G0=document.createElement("div").style,"AnimationEvent"in window||(delete Ys.animationend.animation,delete Ys.animationiteration.animation,delete Ys.animationstart.animation),"TransitionEvent"in window||delete Ys.transitionend.transition);function Zu(t){if(Ih[t])return Ih[t];if(!Ys[t])return t;var e=Ys[t],n;for(n in e)if(e.hasOwnProperty(n)&&n in G0)return Ih[t]=e[n];return t}var K0=Zu("animationend"),Q0=Zu("animationiteration"),X0=Zu("animationstart"),Y0=Zu("transitionend"),J0=new Map,ay="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Hr(t,e){J0.set(t,e),As(e,[t])}for(var Sh=0;Sh<ay.length;Sh++){var kh=ay[Sh],GS=kh.toLowerCase(),KS=kh[0].toUpperCase()+kh.slice(1);Hr(GS,"on"+KS)}Hr(K0,"onAnimationEnd");Hr(Q0,"onAnimationIteration");Hr(X0,"onAnimationStart");Hr("dblclick","onDoubleClick");Hr("focusin","onFocus");Hr("focusout","onBlur");Hr(Y0,"onTransitionEnd");yi("onMouseEnter",["mouseout","mouseover"]);yi("onMouseLeave",["mouseout","mouseover"]);yi("onPointerEnter",["pointerout","pointerover"]);yi("onPointerLeave",["pointerout","pointerover"]);As("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));As("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));As("onBeforeInput",["compositionend","keypress","textInput","paste"]);As("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));As("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));As("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var So="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),QS=new Set("cancel close invalid load scroll toggle".split(" ").concat(So));function ly(t,e,n){var r=t.type||"unknown-event";t.currentTarget=n,G1(r,e,void 0,t),t.currentTarget=null}function Z0(t,e){e=(e&4)!==0;for(var n=0;n<t.length;n++){var r=t[n],s=r.event;r=r.listeners;e:{var i=void 0;if(e)for(var o=r.length-1;0<=o;o--){var l=r[o],u=l.instance,c=l.currentTarget;if(l=l.listener,u!==i&&s.isPropagationStopped())break e;ly(s,l,c),i=u}else for(o=0;o<r.length;o++){if(l=r[o],u=l.instance,c=l.currentTarget,l=l.listener,u!==i&&s.isPropagationStopped())break e;ly(s,l,c),i=u}}}if(iu)throw t=vd,iu=!1,vd=null,t}function ge(t,e){var n=e[Rd];n===void 0&&(n=e[Rd]=new Set);var r=t+"__bubble";n.has(r)||(ew(e,t,2,!1),n.add(r))}function Ch(t,e,n){var r=0;e&&(r|=4),ew(n,t,r,e)}var gl="_reactListening"+Math.random().toString(36).slice(2);function ta(t){if(!t[gl]){t[gl]=!0,a0.forEach(function(n){n!=="selectionchange"&&(QS.has(n)||Ch(n,!1,t),Ch(n,!0,t))});var e=t.nodeType===9?t:t.ownerDocument;e===null||e[gl]||(e[gl]=!0,Ch("selectionchange",!1,e))}}function ew(t,e,n,r){switch(M0(e)){case 1:var s=uS;break;case 4:s=cS;break;default:s=qf}n=s.bind(null,e,n,t),s=void 0,!_d||e!=="touchstart"&&e!=="touchmove"&&e!=="wheel"||(s=!0),r?s!==void 0?t.addEventListener(e,n,{capture:!0,passive:s}):t.addEventListener(e,n,!0):s!==void 0?t.addEventListener(e,n,{passive:s}):t.addEventListener(e,n,!1)}function Ah(t,e,n,r,s){var i=r;if(!(e&1)&&!(e&2)&&r!==null)e:for(;;){if(r===null)return;var o=r.tag;if(o===3||o===4){var l=r.stateNode.containerInfo;if(l===s||l.nodeType===8&&l.parentNode===s)break;if(o===4)for(o=r.return;o!==null;){var u=o.tag;if((u===3||u===4)&&(u=o.stateNode.containerInfo,u===s||u.nodeType===8&&u.parentNode===s))return;o=o.return}for(;l!==null;){if(o=us(l),o===null)return;if(u=o.tag,u===5||u===6){r=i=o;continue e}l=l.parentNode}}r=r.return}x0(function(){var c=i,f=Ff(n),p=[];e:{var g=J0.get(t);if(g!==void 0){var w=Wf,S=t;switch(t){case"keypress":if(jl(n)===0)break e;case"keydown":case"keyup":w=SS;break;case"focusin":S="focus",w=Eh;break;case"focusout":S="blur",w=Eh;break;case"beforeblur":case"afterblur":w=Eh;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":w=Xg;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":w=fS;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":w=AS;break;case K0:case Q0:case X0:w=gS;break;case Y0:w=bS;break;case"scroll":w=hS;break;case"wheel":w=NS;break;case"copy":case"cut":case"paste":w=_S;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":w=Jg}var b=(e&4)!==0,P=!b&&t==="scroll",I=b?g!==null?g+"Capture":null:g;b=[];for(var v=c,C;v!==null;){C=v;var D=C.stateNode;if(C.tag===5&&D!==null&&(C=D,I!==null&&(D=Qo(v,I),D!=null&&b.push(na(v,D,C)))),P)break;v=v.return}0<b.length&&(g=new w(g,S,null,n,f),p.push({event:g,listeners:b}))}}if(!(e&7)){e:{if(g=t==="mouseover"||t==="pointerover",w=t==="mouseout"||t==="pointerout",g&&n!==gd&&(S=n.relatedTarget||n.fromElement)&&(us(S)||S[Bn]))break e;if((w||g)&&(g=f.window===f?f:(g=f.ownerDocument)?g.defaultView||g.parentWindow:window,w?(S=n.relatedTarget||n.toElement,w=c,S=S?us(S):null,S!==null&&(P=Rs(S),S!==P||S.tag!==5&&S.tag!==6)&&(S=null)):(w=null,S=c),w!==S)){if(b=Xg,D="onMouseLeave",I="onMouseEnter",v="mouse",(t==="pointerout"||t==="pointerover")&&(b=Jg,D="onPointerLeave",I="onPointerEnter",v="pointer"),P=w==null?g:Js(w),C=S==null?g:Js(S),g=new b(D,v+"leave",w,n,f),g.target=P,g.relatedTarget=C,D=null,us(f)===c&&(b=new b(I,v+"enter",S,n,f),b.target=C,b.relatedTarget=P,D=b),P=D,w&&S)t:{for(b=w,I=S,v=0,C=b;C;C=zs(C))v++;for(C=0,D=I;D;D=zs(D))C++;for(;0<v-C;)b=zs(b),v--;for(;0<C-v;)I=zs(I),C--;for(;v--;){if(b===I||I!==null&&b===I.alternate)break t;b=zs(b),I=zs(I)}b=null}else b=null;w!==null&&uy(p,g,w,b,!1),S!==null&&P!==null&&uy(p,P,S,b,!0)}}e:{if(g=c?Js(c):window,w=g.nodeName&&g.nodeName.toLowerCase(),w==="select"||w==="input"&&g.type==="file")var j=US;else if(ty(g))if($0)j=$S;else{j=zS;var L=FS}else(w=g.nodeName)&&w.toLowerCase()==="input"&&(g.type==="checkbox"||g.type==="radio")&&(j=BS);if(j&&(j=j(t,c))){B0(p,j,n,f);break e}L&&L(t,g,c),t==="focusout"&&(L=g._wrapperState)&&L.controlled&&g.type==="number"&&hd(g,"number",g.value)}switch(L=c?Js(c):window,t){case"focusin":(ty(L)||L.contentEditable==="true")&&(Xs=L,xd=c,Vo=null);break;case"focusout":Vo=xd=Xs=null;break;case"mousedown":Id=!0;break;case"contextmenu":case"mouseup":case"dragend":Id=!1,oy(p,n,f);break;case"selectionchange":if(WS)break;case"keydown":case"keyup":oy(p,n,f)}var E;if(Kf)e:{switch(t){case"compositionstart":var _="onCompositionStart";break e;case"compositionend":_="onCompositionEnd";break e;case"compositionupdate":_="onCompositionUpdate";break e}_=void 0}else Qs?F0(t,n)&&(_="onCompositionEnd"):t==="keydown"&&n.keyCode===229&&(_="onCompositionStart");_&&(U0&&n.locale!=="ko"&&(Qs||_!=="onCompositionStart"?_==="onCompositionEnd"&&Qs&&(E=j0()):(pr=f,Hf="value"in pr?pr.value:pr.textContent,Qs=!0)),L=cu(c,_),0<L.length&&(_=new Yg(_,t,null,n,f),p.push({event:_,listeners:L}),E?_.data=E:(E=z0(n),E!==null&&(_.data=E)))),(E=OS?VS(t,n):LS(t,n))&&(c=cu(c,"onBeforeInput"),0<c.length&&(f=new Yg("onBeforeInput","beforeinput",null,n,f),p.push({event:f,listeners:c}),f.data=E))}Z0(p,e)})}function na(t,e,n){return{instance:t,listener:e,currentTarget:n}}function cu(t,e){for(var n=e+"Capture",r=[];t!==null;){var s=t,i=s.stateNode;s.tag===5&&i!==null&&(s=i,i=Qo(t,n),i!=null&&r.unshift(na(t,i,s)),i=Qo(t,e),i!=null&&r.push(na(t,i,s))),t=t.return}return r}function zs(t){if(t===null)return null;do t=t.return;while(t&&t.tag!==5);return t||null}function uy(t,e,n,r,s){for(var i=e._reactName,o=[];n!==null&&n!==r;){var l=n,u=l.alternate,c=l.stateNode;if(u!==null&&u===r)break;l.tag===5&&c!==null&&(l=c,s?(u=Qo(n,i),u!=null&&o.unshift(na(n,u,l))):s||(u=Qo(n,i),u!=null&&o.push(na(n,u,l)))),n=n.return}o.length!==0&&t.push({event:e,listeners:o})}var XS=/\r\n?/g,YS=/\u0000|\uFFFD/g;function cy(t){return(typeof t=="string"?t:""+t).replace(XS,`
`).replace(YS,"")}function yl(t,e,n){if(e=cy(e),cy(t)!==e&&n)throw Error(F(425))}function hu(){}var Sd=null,kd=null;function Cd(t,e){return t==="textarea"||t==="noscript"||typeof e.children=="string"||typeof e.children=="number"||typeof e.dangerouslySetInnerHTML=="object"&&e.dangerouslySetInnerHTML!==null&&e.dangerouslySetInnerHTML.__html!=null}var Ad=typeof setTimeout=="function"?setTimeout:void 0,JS=typeof clearTimeout=="function"?clearTimeout:void 0,hy=typeof Promise=="function"?Promise:void 0,ZS=typeof queueMicrotask=="function"?queueMicrotask:typeof hy<"u"?function(t){return hy.resolve(null).then(t).catch(ek)}:Ad;function ek(t){setTimeout(function(){throw t})}function Rh(t,e){var n=e,r=0;do{var s=n.nextSibling;if(t.removeChild(n),s&&s.nodeType===8)if(n=s.data,n==="/$"){if(r===0){t.removeChild(s),Jo(e);return}r--}else n!=="$"&&n!=="$?"&&n!=="$!"||r++;n=s}while(n);Jo(e)}function wr(t){for(;t!=null;t=t.nextSibling){var e=t.nodeType;if(e===1||e===3)break;if(e===8){if(e=t.data,e==="$"||e==="$!"||e==="$?")break;if(e==="/$")return null}}return t}function dy(t){t=t.previousSibling;for(var e=0;t;){if(t.nodeType===8){var n=t.data;if(n==="$"||n==="$!"||n==="$?"){if(e===0)return t;e--}else n==="/$"&&e++}t=t.previousSibling}return null}var Oi=Math.random().toString(36).slice(2),pn="__reactFiber$"+Oi,ra="__reactProps$"+Oi,Bn="__reactContainer$"+Oi,Rd="__reactEvents$"+Oi,tk="__reactListeners$"+Oi,nk="__reactHandles$"+Oi;function us(t){var e=t[pn];if(e)return e;for(var n=t.parentNode;n;){if(e=n[Bn]||n[pn]){if(n=e.alternate,e.child!==null||n!==null&&n.child!==null)for(t=dy(t);t!==null;){if(n=t[pn])return n;t=dy(t)}return e}t=n,n=t.parentNode}return null}function Ra(t){return t=t[pn]||t[Bn],!t||t.tag!==5&&t.tag!==6&&t.tag!==13&&t.tag!==3?null:t}function Js(t){if(t.tag===5||t.tag===6)return t.stateNode;throw Error(F(33))}function ec(t){return t[ra]||null}var bd=[],Zs=-1;function Wr(t){return{current:t}}function ye(t){0>Zs||(t.current=bd[Zs],bd[Zs]=null,Zs--)}function pe(t,e){Zs++,bd[Zs]=t.current,t.current=e}var Dr={},lt=Wr(Dr),xt=Wr(!1),ys=Dr;function _i(t,e){var n=t.type.contextTypes;if(!n)return Dr;var r=t.stateNode;if(r&&r.__reactInternalMemoizedUnmaskedChildContext===e)return r.__reactInternalMemoizedMaskedChildContext;var s={},i;for(i in n)s[i]=e[i];return r&&(t=t.stateNode,t.__reactInternalMemoizedUnmaskedChildContext=e,t.__reactInternalMemoizedMaskedChildContext=s),s}function It(t){return t=t.childContextTypes,t!=null}function du(){ye(xt),ye(lt)}function fy(t,e,n){if(lt.current!==Dr)throw Error(F(168));pe(lt,e),pe(xt,n)}function tw(t,e,n){var r=t.stateNode;if(e=e.childContextTypes,typeof r.getChildContext!="function")return n;r=r.getChildContext();for(var s in r)if(!(s in e))throw Error(F(108,F1(t)||"Unknown",s));return Ce({},n,r)}function fu(t){return t=(t=t.stateNode)&&t.__reactInternalMemoizedMergedChildContext||Dr,ys=lt.current,pe(lt,t),pe(xt,xt.current),!0}function py(t,e,n){var r=t.stateNode;if(!r)throw Error(F(169));n?(t=tw(t,e,ys),r.__reactInternalMemoizedMergedChildContext=t,ye(xt),ye(lt),pe(lt,t)):ye(xt),pe(xt,n)}var An=null,tc=!1,bh=!1;function nw(t){An===null?An=[t]:An.push(t)}function rk(t){tc=!0,nw(t)}function Gr(){if(!bh&&An!==null){bh=!0;var t=0,e=ue;try{var n=An;for(ue=1;t<n.length;t++){var r=n[t];do r=r(!0);while(r!==null)}An=null,tc=!1}catch(s){throw An!==null&&(An=An.slice(t+1)),C0(zf,Gr),s}finally{ue=e,bh=!1}}return null}var ei=[],ti=0,pu=null,mu=0,Ut=[],Ft=0,_s=null,Pn=1,Nn="";function os(t,e){ei[ti++]=mu,ei[ti++]=pu,pu=t,mu=e}function rw(t,e,n){Ut[Ft++]=Pn,Ut[Ft++]=Nn,Ut[Ft++]=_s,_s=t;var r=Pn;t=Nn;var s=32-en(r)-1;r&=~(1<<s),n+=1;var i=32-en(e)+s;if(30<i){var o=s-s%5;i=(r&(1<<o)-1).toString(32),r>>=o,s-=o,Pn=1<<32-en(e)+s|n<<s|r,Nn=i+t}else Pn=1<<i|n<<s|r,Nn=t}function Xf(t){t.return!==null&&(os(t,1),rw(t,1,0))}function Yf(t){for(;t===pu;)pu=ei[--ti],ei[ti]=null,mu=ei[--ti],ei[ti]=null;for(;t===_s;)_s=Ut[--Ft],Ut[Ft]=null,Nn=Ut[--Ft],Ut[Ft]=null,Pn=Ut[--Ft],Ut[Ft]=null}var Dt=null,bt=null,we=!1,Jt=null;function sw(t,e){var n=zt(5,null,null,0);n.elementType="DELETED",n.stateNode=e,n.return=t,e=t.deletions,e===null?(t.deletions=[n],t.flags|=16):e.push(n)}function my(t,e){switch(t.tag){case 5:var n=t.type;return e=e.nodeType!==1||n.toLowerCase()!==e.nodeName.toLowerCase()?null:e,e!==null?(t.stateNode=e,Dt=t,bt=wr(e.firstChild),!0):!1;case 6:return e=t.pendingProps===""||e.nodeType!==3?null:e,e!==null?(t.stateNode=e,Dt=t,bt=null,!0):!1;case 13:return e=e.nodeType!==8?null:e,e!==null?(n=_s!==null?{id:Pn,overflow:Nn}:null,t.memoizedState={dehydrated:e,treeContext:n,retryLane:1073741824},n=zt(18,null,null,0),n.stateNode=e,n.return=t,t.child=n,Dt=t,bt=null,!0):!1;default:return!1}}function Pd(t){return(t.mode&1)!==0&&(t.flags&128)===0}function Nd(t){if(we){var e=bt;if(e){var n=e;if(!my(t,e)){if(Pd(t))throw Error(F(418));e=wr(n.nextSibling);var r=Dt;e&&my(t,e)?sw(r,n):(t.flags=t.flags&-4097|2,we=!1,Dt=t)}}else{if(Pd(t))throw Error(F(418));t.flags=t.flags&-4097|2,we=!1,Dt=t}}}function gy(t){for(t=t.return;t!==null&&t.tag!==5&&t.tag!==3&&t.tag!==13;)t=t.return;Dt=t}function _l(t){if(t!==Dt)return!1;if(!we)return gy(t),we=!0,!1;var e;if((e=t.tag!==3)&&!(e=t.tag!==5)&&(e=t.type,e=e!=="head"&&e!=="body"&&!Cd(t.type,t.memoizedProps)),e&&(e=bt)){if(Pd(t))throw iw(),Error(F(418));for(;e;)sw(t,e),e=wr(e.nextSibling)}if(gy(t),t.tag===13){if(t=t.memoizedState,t=t!==null?t.dehydrated:null,!t)throw Error(F(317));e:{for(t=t.nextSibling,e=0;t;){if(t.nodeType===8){var n=t.data;if(n==="/$"){if(e===0){bt=wr(t.nextSibling);break e}e--}else n!=="$"&&n!=="$!"&&n!=="$?"||e++}t=t.nextSibling}bt=null}}else bt=Dt?wr(t.stateNode.nextSibling):null;return!0}function iw(){for(var t=bt;t;)t=wr(t.nextSibling)}function vi(){bt=Dt=null,we=!1}function Jf(t){Jt===null?Jt=[t]:Jt.push(t)}var sk=Qn.ReactCurrentBatchConfig;function yo(t,e,n){if(t=n.ref,t!==null&&typeof t!="function"&&typeof t!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(F(309));var r=n.stateNode}if(!r)throw Error(F(147,t));var s=r,i=""+t;return e!==null&&e.ref!==null&&typeof e.ref=="function"&&e.ref._stringRef===i?e.ref:(e=function(o){var l=s.refs;o===null?delete l[i]:l[i]=o},e._stringRef=i,e)}if(typeof t!="string")throw Error(F(284));if(!n._owner)throw Error(F(290,t))}return t}function vl(t,e){throw t=Object.prototype.toString.call(e),Error(F(31,t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t))}function yy(t){var e=t._init;return e(t._payload)}function ow(t){function e(I,v){if(t){var C=I.deletions;C===null?(I.deletions=[v],I.flags|=16):C.push(v)}}function n(I,v){if(!t)return null;for(;v!==null;)e(I,v),v=v.sibling;return null}function r(I,v){for(I=new Map;v!==null;)v.key!==null?I.set(v.key,v):I.set(v.index,v),v=v.sibling;return I}function s(I,v){return I=Ir(I,v),I.index=0,I.sibling=null,I}function i(I,v,C){return I.index=C,t?(C=I.alternate,C!==null?(C=C.index,C<v?(I.flags|=2,v):C):(I.flags|=2,v)):(I.flags|=1048576,v)}function o(I){return t&&I.alternate===null&&(I.flags|=2),I}function l(I,v,C,D){return v===null||v.tag!==6?(v=Mh(C,I.mode,D),v.return=I,v):(v=s(v,C),v.return=I,v)}function u(I,v,C,D){var j=C.type;return j===Ks?f(I,v,C.props.children,D,C.key):v!==null&&(v.elementType===j||typeof j=="object"&&j!==null&&j.$$typeof===or&&yy(j)===v.type)?(D=s(v,C.props),D.ref=yo(I,v,C),D.return=I,D):(D=Hl(C.type,C.key,C.props,null,I.mode,D),D.ref=yo(I,v,C),D.return=I,D)}function c(I,v,C,D){return v===null||v.tag!==4||v.stateNode.containerInfo!==C.containerInfo||v.stateNode.implementation!==C.implementation?(v=jh(C,I.mode,D),v.return=I,v):(v=s(v,C.children||[]),v.return=I,v)}function f(I,v,C,D,j){return v===null||v.tag!==7?(v=ms(C,I.mode,D,j),v.return=I,v):(v=s(v,C),v.return=I,v)}function p(I,v,C){if(typeof v=="string"&&v!==""||typeof v=="number")return v=Mh(""+v,I.mode,C),v.return=I,v;if(typeof v=="object"&&v!==null){switch(v.$$typeof){case ll:return C=Hl(v.type,v.key,v.props,null,I.mode,C),C.ref=yo(I,null,v),C.return=I,C;case Gs:return v=jh(v,I.mode,C),v.return=I,v;case or:var D=v._init;return p(I,D(v._payload),C)}if(xo(v)||ho(v))return v=ms(v,I.mode,C,null),v.return=I,v;vl(I,v)}return null}function g(I,v,C,D){var j=v!==null?v.key:null;if(typeof C=="string"&&C!==""||typeof C=="number")return j!==null?null:l(I,v,""+C,D);if(typeof C=="object"&&C!==null){switch(C.$$typeof){case ll:return C.key===j?u(I,v,C,D):null;case Gs:return C.key===j?c(I,v,C,D):null;case or:return j=C._init,g(I,v,j(C._payload),D)}if(xo(C)||ho(C))return j!==null?null:f(I,v,C,D,null);vl(I,C)}return null}function w(I,v,C,D,j){if(typeof D=="string"&&D!==""||typeof D=="number")return I=I.get(C)||null,l(v,I,""+D,j);if(typeof D=="object"&&D!==null){switch(D.$$typeof){case ll:return I=I.get(D.key===null?C:D.key)||null,u(v,I,D,j);case Gs:return I=I.get(D.key===null?C:D.key)||null,c(v,I,D,j);case or:var L=D._init;return w(I,v,C,L(D._payload),j)}if(xo(D)||ho(D))return I=I.get(C)||null,f(v,I,D,j,null);vl(v,D)}return null}function S(I,v,C,D){for(var j=null,L=null,E=v,_=v=0,x=null;E!==null&&_<C.length;_++){E.index>_?(x=E,E=null):x=E.sibling;var R=g(I,E,C[_],D);if(R===null){E===null&&(E=x);break}t&&E&&R.alternate===null&&e(I,E),v=i(R,v,_),L===null?j=R:L.sibling=R,L=R,E=x}if(_===C.length)return n(I,E),we&&os(I,_),j;if(E===null){for(;_<C.length;_++)E=p(I,C[_],D),E!==null&&(v=i(E,v,_),L===null?j=E:L.sibling=E,L=E);return we&&os(I,_),j}for(E=r(I,E);_<C.length;_++)x=w(E,I,_,C[_],D),x!==null&&(t&&x.alternate!==null&&E.delete(x.key===null?_:x.key),v=i(x,v,_),L===null?j=x:L.sibling=x,L=x);return t&&E.forEach(function(T){return e(I,T)}),we&&os(I,_),j}function b(I,v,C,D){var j=ho(C);if(typeof j!="function")throw Error(F(150));if(C=j.call(C),C==null)throw Error(F(151));for(var L=j=null,E=v,_=v=0,x=null,R=C.next();E!==null&&!R.done;_++,R=C.next()){E.index>_?(x=E,E=null):x=E.sibling;var T=g(I,E,R.value,D);if(T===null){E===null&&(E=x);break}t&&E&&T.alternate===null&&e(I,E),v=i(T,v,_),L===null?j=T:L.sibling=T,L=T,E=x}if(R.done)return n(I,E),we&&os(I,_),j;if(E===null){for(;!R.done;_++,R=C.next())R=p(I,R.value,D),R!==null&&(v=i(R,v,_),L===null?j=R:L.sibling=R,L=R);return we&&os(I,_),j}for(E=r(I,E);!R.done;_++,R=C.next())R=w(E,I,_,R.value,D),R!==null&&(t&&R.alternate!==null&&E.delete(R.key===null?_:R.key),v=i(R,v,_),L===null?j=R:L.sibling=R,L=R);return t&&E.forEach(function(A){return e(I,A)}),we&&os(I,_),j}function P(I,v,C,D){if(typeof C=="object"&&C!==null&&C.type===Ks&&C.key===null&&(C=C.props.children),typeof C=="object"&&C!==null){switch(C.$$typeof){case ll:e:{for(var j=C.key,L=v;L!==null;){if(L.key===j){if(j=C.type,j===Ks){if(L.tag===7){n(I,L.sibling),v=s(L,C.props.children),v.return=I,I=v;break e}}else if(L.elementType===j||typeof j=="object"&&j!==null&&j.$$typeof===or&&yy(j)===L.type){n(I,L.sibling),v=s(L,C.props),v.ref=yo(I,L,C),v.return=I,I=v;break e}n(I,L);break}else e(I,L);L=L.sibling}C.type===Ks?(v=ms(C.props.children,I.mode,D,C.key),v.return=I,I=v):(D=Hl(C.type,C.key,C.props,null,I.mode,D),D.ref=yo(I,v,C),D.return=I,I=D)}return o(I);case Gs:e:{for(L=C.key;v!==null;){if(v.key===L)if(v.tag===4&&v.stateNode.containerInfo===C.containerInfo&&v.stateNode.implementation===C.implementation){n(I,v.sibling),v=s(v,C.children||[]),v.return=I,I=v;break e}else{n(I,v);break}else e(I,v);v=v.sibling}v=jh(C,I.mode,D),v.return=I,I=v}return o(I);case or:return L=C._init,P(I,v,L(C._payload),D)}if(xo(C))return S(I,v,C,D);if(ho(C))return b(I,v,C,D);vl(I,C)}return typeof C=="string"&&C!==""||typeof C=="number"?(C=""+C,v!==null&&v.tag===6?(n(I,v.sibling),v=s(v,C),v.return=I,I=v):(n(I,v),v=Mh(C,I.mode,D),v.return=I,I=v),o(I)):n(I,v)}return P}var wi=ow(!0),aw=ow(!1),gu=Wr(null),yu=null,ni=null,Zf=null;function ep(){Zf=ni=yu=null}function tp(t){var e=gu.current;ye(gu),t._currentValue=e}function Dd(t,e,n){for(;t!==null;){var r=t.alternate;if((t.childLanes&e)!==e?(t.childLanes|=e,r!==null&&(r.childLanes|=e)):r!==null&&(r.childLanes&e)!==e&&(r.childLanes|=e),t===n)break;t=t.return}}function ci(t,e){yu=t,Zf=ni=null,t=t.dependencies,t!==null&&t.firstContext!==null&&(t.lanes&e&&(Tt=!0),t.firstContext=null)}function qt(t){var e=t._currentValue;if(Zf!==t)if(t={context:t,memoizedValue:e,next:null},ni===null){if(yu===null)throw Error(F(308));ni=t,yu.dependencies={lanes:0,firstContext:t}}else ni=ni.next=t;return e}var cs=null;function np(t){cs===null?cs=[t]:cs.push(t)}function lw(t,e,n,r){var s=e.interleaved;return s===null?(n.next=n,np(e)):(n.next=s.next,s.next=n),e.interleaved=n,$n(t,r)}function $n(t,e){t.lanes|=e;var n=t.alternate;for(n!==null&&(n.lanes|=e),n=t,t=t.return;t!==null;)t.childLanes|=e,n=t.alternate,n!==null&&(n.childLanes|=e),n=t,t=t.return;return n.tag===3?n.stateNode:null}var ar=!1;function rp(t){t.updateQueue={baseState:t.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function uw(t,e){t=t.updateQueue,e.updateQueue===t&&(e.updateQueue={baseState:t.baseState,firstBaseUpdate:t.firstBaseUpdate,lastBaseUpdate:t.lastBaseUpdate,shared:t.shared,effects:t.effects})}function Ln(t,e){return{eventTime:t,lane:e,tag:0,payload:null,callback:null,next:null}}function Er(t,e,n){var r=t.updateQueue;if(r===null)return null;if(r=r.shared,oe&2){var s=r.pending;return s===null?e.next=e:(e.next=s.next,s.next=e),r.pending=e,$n(t,n)}return s=r.interleaved,s===null?(e.next=e,np(r)):(e.next=s.next,s.next=e),r.interleaved=e,$n(t,n)}function Ul(t,e,n){if(e=e.updateQueue,e!==null&&(e=e.shared,(n&4194240)!==0)){var r=e.lanes;r&=t.pendingLanes,n|=r,e.lanes=n,Bf(t,n)}}function _y(t,e){var n=t.updateQueue,r=t.alternate;if(r!==null&&(r=r.updateQueue,n===r)){var s=null,i=null;if(n=n.firstBaseUpdate,n!==null){do{var o={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};i===null?s=i=o:i=i.next=o,n=n.next}while(n!==null);i===null?s=i=e:i=i.next=e}else s=i=e;n={baseState:r.baseState,firstBaseUpdate:s,lastBaseUpdate:i,shared:r.shared,effects:r.effects},t.updateQueue=n;return}t=n.lastBaseUpdate,t===null?n.firstBaseUpdate=e:t.next=e,n.lastBaseUpdate=e}function _u(t,e,n,r){var s=t.updateQueue;ar=!1;var i=s.firstBaseUpdate,o=s.lastBaseUpdate,l=s.shared.pending;if(l!==null){s.shared.pending=null;var u=l,c=u.next;u.next=null,o===null?i=c:o.next=c,o=u;var f=t.alternate;f!==null&&(f=f.updateQueue,l=f.lastBaseUpdate,l!==o&&(l===null?f.firstBaseUpdate=c:l.next=c,f.lastBaseUpdate=u))}if(i!==null){var p=s.baseState;o=0,f=c=u=null,l=i;do{var g=l.lane,w=l.eventTime;if((r&g)===g){f!==null&&(f=f.next={eventTime:w,lane:0,tag:l.tag,payload:l.payload,callback:l.callback,next:null});e:{var S=t,b=l;switch(g=e,w=n,b.tag){case 1:if(S=b.payload,typeof S=="function"){p=S.call(w,p,g);break e}p=S;break e;case 3:S.flags=S.flags&-65537|128;case 0:if(S=b.payload,g=typeof S=="function"?S.call(w,p,g):S,g==null)break e;p=Ce({},p,g);break e;case 2:ar=!0}}l.callback!==null&&l.lane!==0&&(t.flags|=64,g=s.effects,g===null?s.effects=[l]:g.push(l))}else w={eventTime:w,lane:g,tag:l.tag,payload:l.payload,callback:l.callback,next:null},f===null?(c=f=w,u=p):f=f.next=w,o|=g;if(l=l.next,l===null){if(l=s.shared.pending,l===null)break;g=l,l=g.next,g.next=null,s.lastBaseUpdate=g,s.shared.pending=null}}while(!0);if(f===null&&(u=p),s.baseState=u,s.firstBaseUpdate=c,s.lastBaseUpdate=f,e=s.shared.interleaved,e!==null){s=e;do o|=s.lane,s=s.next;while(s!==e)}else i===null&&(s.shared.lanes=0);ws|=o,t.lanes=o,t.memoizedState=p}}function vy(t,e,n){if(t=e.effects,e.effects=null,t!==null)for(e=0;e<t.length;e++){var r=t[e],s=r.callback;if(s!==null){if(r.callback=null,r=n,typeof s!="function")throw Error(F(191,s));s.call(r)}}}var ba={},yn=Wr(ba),sa=Wr(ba),ia=Wr(ba);function hs(t){if(t===ba)throw Error(F(174));return t}function sp(t,e){switch(pe(ia,e),pe(sa,t),pe(yn,ba),t=e.nodeType,t){case 9:case 11:e=(e=e.documentElement)?e.namespaceURI:fd(null,"");break;default:t=t===8?e.parentNode:e,e=t.namespaceURI||null,t=t.tagName,e=fd(e,t)}ye(yn),pe(yn,e)}function Ei(){ye(yn),ye(sa),ye(ia)}function cw(t){hs(ia.current);var e=hs(yn.current),n=fd(e,t.type);e!==n&&(pe(sa,t),pe(yn,n))}function ip(t){sa.current===t&&(ye(yn),ye(sa))}var xe=Wr(0);function vu(t){for(var e=t;e!==null;){if(e.tag===13){var n=e.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return e}else if(e.tag===19&&e.memoizedProps.revealOrder!==void 0){if(e.flags&128)return e}else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break;for(;e.sibling===null;){if(e.return===null||e.return===t)return null;e=e.return}e.sibling.return=e.return,e=e.sibling}return null}var Ph=[];function op(){for(var t=0;t<Ph.length;t++)Ph[t]._workInProgressVersionPrimary=null;Ph.length=0}var Fl=Qn.ReactCurrentDispatcher,Nh=Qn.ReactCurrentBatchConfig,vs=0,Se=null,Ue=null,He=null,wu=!1,Lo=!1,oa=0,ik=0;function tt(){throw Error(F(321))}function ap(t,e){if(e===null)return!1;for(var n=0;n<e.length&&n<t.length;n++)if(!sn(t[n],e[n]))return!1;return!0}function lp(t,e,n,r,s,i){if(vs=i,Se=e,e.memoizedState=null,e.updateQueue=null,e.lanes=0,Fl.current=t===null||t.memoizedState===null?uk:ck,t=n(r,s),Lo){i=0;do{if(Lo=!1,oa=0,25<=i)throw Error(F(301));i+=1,He=Ue=null,e.updateQueue=null,Fl.current=hk,t=n(r,s)}while(Lo)}if(Fl.current=Eu,e=Ue!==null&&Ue.next!==null,vs=0,He=Ue=Se=null,wu=!1,e)throw Error(F(300));return t}function up(){var t=oa!==0;return oa=0,t}function dn(){var t={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return He===null?Se.memoizedState=He=t:He=He.next=t,He}function Ht(){if(Ue===null){var t=Se.alternate;t=t!==null?t.memoizedState:null}else t=Ue.next;var e=He===null?Se.memoizedState:He.next;if(e!==null)He=e,Ue=t;else{if(t===null)throw Error(F(310));Ue=t,t={memoizedState:Ue.memoizedState,baseState:Ue.baseState,baseQueue:Ue.baseQueue,queue:Ue.queue,next:null},He===null?Se.memoizedState=He=t:He=He.next=t}return He}function aa(t,e){return typeof e=="function"?e(t):e}function Dh(t){var e=Ht(),n=e.queue;if(n===null)throw Error(F(311));n.lastRenderedReducer=t;var r=Ue,s=r.baseQueue,i=n.pending;if(i!==null){if(s!==null){var o=s.next;s.next=i.next,i.next=o}r.baseQueue=s=i,n.pending=null}if(s!==null){i=s.next,r=r.baseState;var l=o=null,u=null,c=i;do{var f=c.lane;if((vs&f)===f)u!==null&&(u=u.next={lane:0,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null}),r=c.hasEagerState?c.eagerState:t(r,c.action);else{var p={lane:f,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null};u===null?(l=u=p,o=r):u=u.next=p,Se.lanes|=f,ws|=f}c=c.next}while(c!==null&&c!==i);u===null?o=r:u.next=l,sn(r,e.memoizedState)||(Tt=!0),e.memoizedState=r,e.baseState=o,e.baseQueue=u,n.lastRenderedState=r}if(t=n.interleaved,t!==null){s=t;do i=s.lane,Se.lanes|=i,ws|=i,s=s.next;while(s!==t)}else s===null&&(n.lanes=0);return[e.memoizedState,n.dispatch]}function Oh(t){var e=Ht(),n=e.queue;if(n===null)throw Error(F(311));n.lastRenderedReducer=t;var r=n.dispatch,s=n.pending,i=e.memoizedState;if(s!==null){n.pending=null;var o=s=s.next;do i=t(i,o.action),o=o.next;while(o!==s);sn(i,e.memoizedState)||(Tt=!0),e.memoizedState=i,e.baseQueue===null&&(e.baseState=i),n.lastRenderedState=i}return[i,r]}function hw(){}function dw(t,e){var n=Se,r=Ht(),s=e(),i=!sn(r.memoizedState,s);if(i&&(r.memoizedState=s,Tt=!0),r=r.queue,cp(mw.bind(null,n,r,t),[t]),r.getSnapshot!==e||i||He!==null&&He.memoizedState.tag&1){if(n.flags|=2048,la(9,pw.bind(null,n,r,s,e),void 0,null),Ge===null)throw Error(F(349));vs&30||fw(n,e,s)}return s}function fw(t,e,n){t.flags|=16384,t={getSnapshot:e,value:n},e=Se.updateQueue,e===null?(e={lastEffect:null,stores:null},Se.updateQueue=e,e.stores=[t]):(n=e.stores,n===null?e.stores=[t]:n.push(t))}function pw(t,e,n,r){e.value=n,e.getSnapshot=r,gw(e)&&yw(t)}function mw(t,e,n){return n(function(){gw(e)&&yw(t)})}function gw(t){var e=t.getSnapshot;t=t.value;try{var n=e();return!sn(t,n)}catch{return!0}}function yw(t){var e=$n(t,1);e!==null&&tn(e,t,1,-1)}function wy(t){var e=dn();return typeof t=="function"&&(t=t()),e.memoizedState=e.baseState=t,t={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:aa,lastRenderedState:t},e.queue=t,t=t.dispatch=lk.bind(null,Se,t),[e.memoizedState,t]}function la(t,e,n,r){return t={tag:t,create:e,destroy:n,deps:r,next:null},e=Se.updateQueue,e===null?(e={lastEffect:null,stores:null},Se.updateQueue=e,e.lastEffect=t.next=t):(n=e.lastEffect,n===null?e.lastEffect=t.next=t:(r=n.next,n.next=t,t.next=r,e.lastEffect=t)),t}function _w(){return Ht().memoizedState}function zl(t,e,n,r){var s=dn();Se.flags|=t,s.memoizedState=la(1|e,n,void 0,r===void 0?null:r)}function nc(t,e,n,r){var s=Ht();r=r===void 0?null:r;var i=void 0;if(Ue!==null){var o=Ue.memoizedState;if(i=o.destroy,r!==null&&ap(r,o.deps)){s.memoizedState=la(e,n,i,r);return}}Se.flags|=t,s.memoizedState=la(1|e,n,i,r)}function Ey(t,e){return zl(8390656,8,t,e)}function cp(t,e){return nc(2048,8,t,e)}function vw(t,e){return nc(4,2,t,e)}function ww(t,e){return nc(4,4,t,e)}function Ew(t,e){if(typeof e=="function")return t=t(),e(t),function(){e(null)};if(e!=null)return t=t(),e.current=t,function(){e.current=null}}function Tw(t,e,n){return n=n!=null?n.concat([t]):null,nc(4,4,Ew.bind(null,e,t),n)}function hp(){}function xw(t,e){var n=Ht();e=e===void 0?null:e;var r=n.memoizedState;return r!==null&&e!==null&&ap(e,r[1])?r[0]:(n.memoizedState=[t,e],t)}function Iw(t,e){var n=Ht();e=e===void 0?null:e;var r=n.memoizedState;return r!==null&&e!==null&&ap(e,r[1])?r[0]:(t=t(),n.memoizedState=[t,e],t)}function Sw(t,e,n){return vs&21?(sn(n,e)||(n=b0(),Se.lanes|=n,ws|=n,t.baseState=!0),e):(t.baseState&&(t.baseState=!1,Tt=!0),t.memoizedState=n)}function ok(t,e){var n=ue;ue=n!==0&&4>n?n:4,t(!0);var r=Nh.transition;Nh.transition={};try{t(!1),e()}finally{ue=n,Nh.transition=r}}function kw(){return Ht().memoizedState}function ak(t,e,n){var r=xr(t);if(n={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null},Cw(t))Aw(e,n);else if(n=lw(t,e,n,r),n!==null){var s=pt();tn(n,t,r,s),Rw(n,e,r)}}function lk(t,e,n){var r=xr(t),s={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null};if(Cw(t))Aw(e,s);else{var i=t.alternate;if(t.lanes===0&&(i===null||i.lanes===0)&&(i=e.lastRenderedReducer,i!==null))try{var o=e.lastRenderedState,l=i(o,n);if(s.hasEagerState=!0,s.eagerState=l,sn(l,o)){var u=e.interleaved;u===null?(s.next=s,np(e)):(s.next=u.next,u.next=s),e.interleaved=s;return}}catch{}finally{}n=lw(t,e,s,r),n!==null&&(s=pt(),tn(n,t,r,s),Rw(n,e,r))}}function Cw(t){var e=t.alternate;return t===Se||e!==null&&e===Se}function Aw(t,e){Lo=wu=!0;var n=t.pending;n===null?e.next=e:(e.next=n.next,n.next=e),t.pending=e}function Rw(t,e,n){if(n&4194240){var r=e.lanes;r&=t.pendingLanes,n|=r,e.lanes=n,Bf(t,n)}}var Eu={readContext:qt,useCallback:tt,useContext:tt,useEffect:tt,useImperativeHandle:tt,useInsertionEffect:tt,useLayoutEffect:tt,useMemo:tt,useReducer:tt,useRef:tt,useState:tt,useDebugValue:tt,useDeferredValue:tt,useTransition:tt,useMutableSource:tt,useSyncExternalStore:tt,useId:tt,unstable_isNewReconciler:!1},uk={readContext:qt,useCallback:function(t,e){return dn().memoizedState=[t,e===void 0?null:e],t},useContext:qt,useEffect:Ey,useImperativeHandle:function(t,e,n){return n=n!=null?n.concat([t]):null,zl(4194308,4,Ew.bind(null,e,t),n)},useLayoutEffect:function(t,e){return zl(4194308,4,t,e)},useInsertionEffect:function(t,e){return zl(4,2,t,e)},useMemo:function(t,e){var n=dn();return e=e===void 0?null:e,t=t(),n.memoizedState=[t,e],t},useReducer:function(t,e,n){var r=dn();return e=n!==void 0?n(e):e,r.memoizedState=r.baseState=e,t={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:t,lastRenderedState:e},r.queue=t,t=t.dispatch=ak.bind(null,Se,t),[r.memoizedState,t]},useRef:function(t){var e=dn();return t={current:t},e.memoizedState=t},useState:wy,useDebugValue:hp,useDeferredValue:function(t){return dn().memoizedState=t},useTransition:function(){var t=wy(!1),e=t[0];return t=ok.bind(null,t[1]),dn().memoizedState=t,[e,t]},useMutableSource:function(){},useSyncExternalStore:function(t,e,n){var r=Se,s=dn();if(we){if(n===void 0)throw Error(F(407));n=n()}else{if(n=e(),Ge===null)throw Error(F(349));vs&30||fw(r,e,n)}s.memoizedState=n;var i={value:n,getSnapshot:e};return s.queue=i,Ey(mw.bind(null,r,i,t),[t]),r.flags|=2048,la(9,pw.bind(null,r,i,n,e),void 0,null),n},useId:function(){var t=dn(),e=Ge.identifierPrefix;if(we){var n=Nn,r=Pn;n=(r&~(1<<32-en(r)-1)).toString(32)+n,e=":"+e+"R"+n,n=oa++,0<n&&(e+="H"+n.toString(32)),e+=":"}else n=ik++,e=":"+e+"r"+n.toString(32)+":";return t.memoizedState=e},unstable_isNewReconciler:!1},ck={readContext:qt,useCallback:xw,useContext:qt,useEffect:cp,useImperativeHandle:Tw,useInsertionEffect:vw,useLayoutEffect:ww,useMemo:Iw,useReducer:Dh,useRef:_w,useState:function(){return Dh(aa)},useDebugValue:hp,useDeferredValue:function(t){var e=Ht();return Sw(e,Ue.memoizedState,t)},useTransition:function(){var t=Dh(aa)[0],e=Ht().memoizedState;return[t,e]},useMutableSource:hw,useSyncExternalStore:dw,useId:kw,unstable_isNewReconciler:!1},hk={readContext:qt,useCallback:xw,useContext:qt,useEffect:cp,useImperativeHandle:Tw,useInsertionEffect:vw,useLayoutEffect:ww,useMemo:Iw,useReducer:Oh,useRef:_w,useState:function(){return Oh(aa)},useDebugValue:hp,useDeferredValue:function(t){var e=Ht();return Ue===null?e.memoizedState=t:Sw(e,Ue.memoizedState,t)},useTransition:function(){var t=Oh(aa)[0],e=Ht().memoizedState;return[t,e]},useMutableSource:hw,useSyncExternalStore:dw,useId:kw,unstable_isNewReconciler:!1};function Xt(t,e){if(t&&t.defaultProps){e=Ce({},e),t=t.defaultProps;for(var n in t)e[n]===void 0&&(e[n]=t[n]);return e}return e}function Od(t,e,n,r){e=t.memoizedState,n=n(r,e),n=n==null?e:Ce({},e,n),t.memoizedState=n,t.lanes===0&&(t.updateQueue.baseState=n)}var rc={isMounted:function(t){return(t=t._reactInternals)?Rs(t)===t:!1},enqueueSetState:function(t,e,n){t=t._reactInternals;var r=pt(),s=xr(t),i=Ln(r,s);i.payload=e,n!=null&&(i.callback=n),e=Er(t,i,s),e!==null&&(tn(e,t,s,r),Ul(e,t,s))},enqueueReplaceState:function(t,e,n){t=t._reactInternals;var r=pt(),s=xr(t),i=Ln(r,s);i.tag=1,i.payload=e,n!=null&&(i.callback=n),e=Er(t,i,s),e!==null&&(tn(e,t,s,r),Ul(e,t,s))},enqueueForceUpdate:function(t,e){t=t._reactInternals;var n=pt(),r=xr(t),s=Ln(n,r);s.tag=2,e!=null&&(s.callback=e),e=Er(t,s,r),e!==null&&(tn(e,t,r,n),Ul(e,t,r))}};function Ty(t,e,n,r,s,i,o){return t=t.stateNode,typeof t.shouldComponentUpdate=="function"?t.shouldComponentUpdate(r,i,o):e.prototype&&e.prototype.isPureReactComponent?!ea(n,r)||!ea(s,i):!0}function bw(t,e,n){var r=!1,s=Dr,i=e.contextType;return typeof i=="object"&&i!==null?i=qt(i):(s=It(e)?ys:lt.current,r=e.contextTypes,i=(r=r!=null)?_i(t,s):Dr),e=new e(n,i),t.memoizedState=e.state!==null&&e.state!==void 0?e.state:null,e.updater=rc,t.stateNode=e,e._reactInternals=t,r&&(t=t.stateNode,t.__reactInternalMemoizedUnmaskedChildContext=s,t.__reactInternalMemoizedMaskedChildContext=i),e}function xy(t,e,n,r){t=e.state,typeof e.componentWillReceiveProps=="function"&&e.componentWillReceiveProps(n,r),typeof e.UNSAFE_componentWillReceiveProps=="function"&&e.UNSAFE_componentWillReceiveProps(n,r),e.state!==t&&rc.enqueueReplaceState(e,e.state,null)}function Vd(t,e,n,r){var s=t.stateNode;s.props=n,s.state=t.memoizedState,s.refs={},rp(t);var i=e.contextType;typeof i=="object"&&i!==null?s.context=qt(i):(i=It(e)?ys:lt.current,s.context=_i(t,i)),s.state=t.memoizedState,i=e.getDerivedStateFromProps,typeof i=="function"&&(Od(t,e,i,n),s.state=t.memoizedState),typeof e.getDerivedStateFromProps=="function"||typeof s.getSnapshotBeforeUpdate=="function"||typeof s.UNSAFE_componentWillMount!="function"&&typeof s.componentWillMount!="function"||(e=s.state,typeof s.componentWillMount=="function"&&s.componentWillMount(),typeof s.UNSAFE_componentWillMount=="function"&&s.UNSAFE_componentWillMount(),e!==s.state&&rc.enqueueReplaceState(s,s.state,null),_u(t,n,s,r),s.state=t.memoizedState),typeof s.componentDidMount=="function"&&(t.flags|=4194308)}function Ti(t,e){try{var n="",r=e;do n+=U1(r),r=r.return;while(r);var s=n}catch(i){s=`
Error generating stack: `+i.message+`
`+i.stack}return{value:t,source:e,stack:s,digest:null}}function Vh(t,e,n){return{value:t,source:null,stack:n??null,digest:e??null}}function Ld(t,e){try{console.error(e.value)}catch(n){setTimeout(function(){throw n})}}var dk=typeof WeakMap=="function"?WeakMap:Map;function Pw(t,e,n){n=Ln(-1,n),n.tag=3,n.payload={element:null};var r=e.value;return n.callback=function(){xu||(xu=!0,Wd=r),Ld(t,e)},n}function Nw(t,e,n){n=Ln(-1,n),n.tag=3;var r=t.type.getDerivedStateFromError;if(typeof r=="function"){var s=e.value;n.payload=function(){return r(s)},n.callback=function(){Ld(t,e)}}var i=t.stateNode;return i!==null&&typeof i.componentDidCatch=="function"&&(n.callback=function(){Ld(t,e),typeof r!="function"&&(Tr===null?Tr=new Set([this]):Tr.add(this));var o=e.stack;this.componentDidCatch(e.value,{componentStack:o!==null?o:""})}),n}function Iy(t,e,n){var r=t.pingCache;if(r===null){r=t.pingCache=new dk;var s=new Set;r.set(e,s)}else s=r.get(e),s===void 0&&(s=new Set,r.set(e,s));s.has(n)||(s.add(n),t=kk.bind(null,t,e,n),e.then(t,t))}function Sy(t){do{var e;if((e=t.tag===13)&&(e=t.memoizedState,e=e!==null?e.dehydrated!==null:!0),e)return t;t=t.return}while(t!==null);return null}function ky(t,e,n,r,s){return t.mode&1?(t.flags|=65536,t.lanes=s,t):(t===e?t.flags|=65536:(t.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(e=Ln(-1,1),e.tag=2,Er(n,e,1))),n.lanes|=1),t)}var fk=Qn.ReactCurrentOwner,Tt=!1;function ft(t,e,n,r){e.child=t===null?aw(e,null,n,r):wi(e,t.child,n,r)}function Cy(t,e,n,r,s){n=n.render;var i=e.ref;return ci(e,s),r=lp(t,e,n,r,i,s),n=up(),t!==null&&!Tt?(e.updateQueue=t.updateQueue,e.flags&=-2053,t.lanes&=~s,qn(t,e,s)):(we&&n&&Xf(e),e.flags|=1,ft(t,e,r,s),e.child)}function Ay(t,e,n,r,s){if(t===null){var i=n.type;return typeof i=="function"&&!vp(i)&&i.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(e.tag=15,e.type=i,Dw(t,e,i,r,s)):(t=Hl(n.type,null,r,e,e.mode,s),t.ref=e.ref,t.return=e,e.child=t)}if(i=t.child,!(t.lanes&s)){var o=i.memoizedProps;if(n=n.compare,n=n!==null?n:ea,n(o,r)&&t.ref===e.ref)return qn(t,e,s)}return e.flags|=1,t=Ir(i,r),t.ref=e.ref,t.return=e,e.child=t}function Dw(t,e,n,r,s){if(t!==null){var i=t.memoizedProps;if(ea(i,r)&&t.ref===e.ref)if(Tt=!1,e.pendingProps=r=i,(t.lanes&s)!==0)t.flags&131072&&(Tt=!0);else return e.lanes=t.lanes,qn(t,e,s)}return Md(t,e,n,r,s)}function Ow(t,e,n){var r=e.pendingProps,s=r.children,i=t!==null?t.memoizedState:null;if(r.mode==="hidden")if(!(e.mode&1))e.memoizedState={baseLanes:0,cachePool:null,transitions:null},pe(si,Ct),Ct|=n;else{if(!(n&1073741824))return t=i!==null?i.baseLanes|n:n,e.lanes=e.childLanes=1073741824,e.memoizedState={baseLanes:t,cachePool:null,transitions:null},e.updateQueue=null,pe(si,Ct),Ct|=t,null;e.memoizedState={baseLanes:0,cachePool:null,transitions:null},r=i!==null?i.baseLanes:n,pe(si,Ct),Ct|=r}else i!==null?(r=i.baseLanes|n,e.memoizedState=null):r=n,pe(si,Ct),Ct|=r;return ft(t,e,s,n),e.child}function Vw(t,e){var n=e.ref;(t===null&&n!==null||t!==null&&t.ref!==n)&&(e.flags|=512,e.flags|=2097152)}function Md(t,e,n,r,s){var i=It(n)?ys:lt.current;return i=_i(e,i),ci(e,s),n=lp(t,e,n,r,i,s),r=up(),t!==null&&!Tt?(e.updateQueue=t.updateQueue,e.flags&=-2053,t.lanes&=~s,qn(t,e,s)):(we&&r&&Xf(e),e.flags|=1,ft(t,e,n,s),e.child)}function Ry(t,e,n,r,s){if(It(n)){var i=!0;fu(e)}else i=!1;if(ci(e,s),e.stateNode===null)Bl(t,e),bw(e,n,r),Vd(e,n,r,s),r=!0;else if(t===null){var o=e.stateNode,l=e.memoizedProps;o.props=l;var u=o.context,c=n.contextType;typeof c=="object"&&c!==null?c=qt(c):(c=It(n)?ys:lt.current,c=_i(e,c));var f=n.getDerivedStateFromProps,p=typeof f=="function"||typeof o.getSnapshotBeforeUpdate=="function";p||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(l!==r||u!==c)&&xy(e,o,r,c),ar=!1;var g=e.memoizedState;o.state=g,_u(e,r,o,s),u=e.memoizedState,l!==r||g!==u||xt.current||ar?(typeof f=="function"&&(Od(e,n,f,r),u=e.memoizedState),(l=ar||Ty(e,n,l,r,g,u,c))?(p||typeof o.UNSAFE_componentWillMount!="function"&&typeof o.componentWillMount!="function"||(typeof o.componentWillMount=="function"&&o.componentWillMount(),typeof o.UNSAFE_componentWillMount=="function"&&o.UNSAFE_componentWillMount()),typeof o.componentDidMount=="function"&&(e.flags|=4194308)):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),e.memoizedProps=r,e.memoizedState=u),o.props=r,o.state=u,o.context=c,r=l):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),r=!1)}else{o=e.stateNode,uw(t,e),l=e.memoizedProps,c=e.type===e.elementType?l:Xt(e.type,l),o.props=c,p=e.pendingProps,g=o.context,u=n.contextType,typeof u=="object"&&u!==null?u=qt(u):(u=It(n)?ys:lt.current,u=_i(e,u));var w=n.getDerivedStateFromProps;(f=typeof w=="function"||typeof o.getSnapshotBeforeUpdate=="function")||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(l!==p||g!==u)&&xy(e,o,r,u),ar=!1,g=e.memoizedState,o.state=g,_u(e,r,o,s);var S=e.memoizedState;l!==p||g!==S||xt.current||ar?(typeof w=="function"&&(Od(e,n,w,r),S=e.memoizedState),(c=ar||Ty(e,n,c,r,g,S,u)||!1)?(f||typeof o.UNSAFE_componentWillUpdate!="function"&&typeof o.componentWillUpdate!="function"||(typeof o.componentWillUpdate=="function"&&o.componentWillUpdate(r,S,u),typeof o.UNSAFE_componentWillUpdate=="function"&&o.UNSAFE_componentWillUpdate(r,S,u)),typeof o.componentDidUpdate=="function"&&(e.flags|=4),typeof o.getSnapshotBeforeUpdate=="function"&&(e.flags|=1024)):(typeof o.componentDidUpdate!="function"||l===t.memoizedProps&&g===t.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||l===t.memoizedProps&&g===t.memoizedState||(e.flags|=1024),e.memoizedProps=r,e.memoizedState=S),o.props=r,o.state=S,o.context=u,r=c):(typeof o.componentDidUpdate!="function"||l===t.memoizedProps&&g===t.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||l===t.memoizedProps&&g===t.memoizedState||(e.flags|=1024),r=!1)}return jd(t,e,n,r,i,s)}function jd(t,e,n,r,s,i){Vw(t,e);var o=(e.flags&128)!==0;if(!r&&!o)return s&&py(e,n,!1),qn(t,e,i);r=e.stateNode,fk.current=e;var l=o&&typeof n.getDerivedStateFromError!="function"?null:r.render();return e.flags|=1,t!==null&&o?(e.child=wi(e,t.child,null,i),e.child=wi(e,null,l,i)):ft(t,e,l,i),e.memoizedState=r.state,s&&py(e,n,!0),e.child}function Lw(t){var e=t.stateNode;e.pendingContext?fy(t,e.pendingContext,e.pendingContext!==e.context):e.context&&fy(t,e.context,!1),sp(t,e.containerInfo)}function by(t,e,n,r,s){return vi(),Jf(s),e.flags|=256,ft(t,e,n,r),e.child}var Ud={dehydrated:null,treeContext:null,retryLane:0};function Fd(t){return{baseLanes:t,cachePool:null,transitions:null}}function Mw(t,e,n){var r=e.pendingProps,s=xe.current,i=!1,o=(e.flags&128)!==0,l;if((l=o)||(l=t!==null&&t.memoizedState===null?!1:(s&2)!==0),l?(i=!0,e.flags&=-129):(t===null||t.memoizedState!==null)&&(s|=1),pe(xe,s&1),t===null)return Nd(e),t=e.memoizedState,t!==null&&(t=t.dehydrated,t!==null)?(e.mode&1?t.data==="$!"?e.lanes=8:e.lanes=1073741824:e.lanes=1,null):(o=r.children,t=r.fallback,i?(r=e.mode,i=e.child,o={mode:"hidden",children:o},!(r&1)&&i!==null?(i.childLanes=0,i.pendingProps=o):i=oc(o,r,0,null),t=ms(t,r,n,null),i.return=e,t.return=e,i.sibling=t,e.child=i,e.child.memoizedState=Fd(n),e.memoizedState=Ud,t):dp(e,o));if(s=t.memoizedState,s!==null&&(l=s.dehydrated,l!==null))return pk(t,e,o,r,l,s,n);if(i){i=r.fallback,o=e.mode,s=t.child,l=s.sibling;var u={mode:"hidden",children:r.children};return!(o&1)&&e.child!==s?(r=e.child,r.childLanes=0,r.pendingProps=u,e.deletions=null):(r=Ir(s,u),r.subtreeFlags=s.subtreeFlags&14680064),l!==null?i=Ir(l,i):(i=ms(i,o,n,null),i.flags|=2),i.return=e,r.return=e,r.sibling=i,e.child=r,r=i,i=e.child,o=t.child.memoizedState,o=o===null?Fd(n):{baseLanes:o.baseLanes|n,cachePool:null,transitions:o.transitions},i.memoizedState=o,i.childLanes=t.childLanes&~n,e.memoizedState=Ud,r}return i=t.child,t=i.sibling,r=Ir(i,{mode:"visible",children:r.children}),!(e.mode&1)&&(r.lanes=n),r.return=e,r.sibling=null,t!==null&&(n=e.deletions,n===null?(e.deletions=[t],e.flags|=16):n.push(t)),e.child=r,e.memoizedState=null,r}function dp(t,e){return e=oc({mode:"visible",children:e},t.mode,0,null),e.return=t,t.child=e}function wl(t,e,n,r){return r!==null&&Jf(r),wi(e,t.child,null,n),t=dp(e,e.pendingProps.children),t.flags|=2,e.memoizedState=null,t}function pk(t,e,n,r,s,i,o){if(n)return e.flags&256?(e.flags&=-257,r=Vh(Error(F(422))),wl(t,e,o,r)):e.memoizedState!==null?(e.child=t.child,e.flags|=128,null):(i=r.fallback,s=e.mode,r=oc({mode:"visible",children:r.children},s,0,null),i=ms(i,s,o,null),i.flags|=2,r.return=e,i.return=e,r.sibling=i,e.child=r,e.mode&1&&wi(e,t.child,null,o),e.child.memoizedState=Fd(o),e.memoizedState=Ud,i);if(!(e.mode&1))return wl(t,e,o,null);if(s.data==="$!"){if(r=s.nextSibling&&s.nextSibling.dataset,r)var l=r.dgst;return r=l,i=Error(F(419)),r=Vh(i,r,void 0),wl(t,e,o,r)}if(l=(o&t.childLanes)!==0,Tt||l){if(r=Ge,r!==null){switch(o&-o){case 4:s=2;break;case 16:s=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:s=32;break;case 536870912:s=268435456;break;default:s=0}s=s&(r.suspendedLanes|o)?0:s,s!==0&&s!==i.retryLane&&(i.retryLane=s,$n(t,s),tn(r,t,s,-1))}return _p(),r=Vh(Error(F(421))),wl(t,e,o,r)}return s.data==="$?"?(e.flags|=128,e.child=t.child,e=Ck.bind(null,t),s._reactRetry=e,null):(t=i.treeContext,bt=wr(s.nextSibling),Dt=e,we=!0,Jt=null,t!==null&&(Ut[Ft++]=Pn,Ut[Ft++]=Nn,Ut[Ft++]=_s,Pn=t.id,Nn=t.overflow,_s=e),e=dp(e,r.children),e.flags|=4096,e)}function Py(t,e,n){t.lanes|=e;var r=t.alternate;r!==null&&(r.lanes|=e),Dd(t.return,e,n)}function Lh(t,e,n,r,s){var i=t.memoizedState;i===null?t.memoizedState={isBackwards:e,rendering:null,renderingStartTime:0,last:r,tail:n,tailMode:s}:(i.isBackwards=e,i.rendering=null,i.renderingStartTime=0,i.last=r,i.tail=n,i.tailMode=s)}function jw(t,e,n){var r=e.pendingProps,s=r.revealOrder,i=r.tail;if(ft(t,e,r.children,n),r=xe.current,r&2)r=r&1|2,e.flags|=128;else{if(t!==null&&t.flags&128)e:for(t=e.child;t!==null;){if(t.tag===13)t.memoizedState!==null&&Py(t,n,e);else if(t.tag===19)Py(t,n,e);else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break e;for(;t.sibling===null;){if(t.return===null||t.return===e)break e;t=t.return}t.sibling.return=t.return,t=t.sibling}r&=1}if(pe(xe,r),!(e.mode&1))e.memoizedState=null;else switch(s){case"forwards":for(n=e.child,s=null;n!==null;)t=n.alternate,t!==null&&vu(t)===null&&(s=n),n=n.sibling;n=s,n===null?(s=e.child,e.child=null):(s=n.sibling,n.sibling=null),Lh(e,!1,s,n,i);break;case"backwards":for(n=null,s=e.child,e.child=null;s!==null;){if(t=s.alternate,t!==null&&vu(t)===null){e.child=s;break}t=s.sibling,s.sibling=n,n=s,s=t}Lh(e,!0,n,null,i);break;case"together":Lh(e,!1,null,null,void 0);break;default:e.memoizedState=null}return e.child}function Bl(t,e){!(e.mode&1)&&t!==null&&(t.alternate=null,e.alternate=null,e.flags|=2)}function qn(t,e,n){if(t!==null&&(e.dependencies=t.dependencies),ws|=e.lanes,!(n&e.childLanes))return null;if(t!==null&&e.child!==t.child)throw Error(F(153));if(e.child!==null){for(t=e.child,n=Ir(t,t.pendingProps),e.child=n,n.return=e;t.sibling!==null;)t=t.sibling,n=n.sibling=Ir(t,t.pendingProps),n.return=e;n.sibling=null}return e.child}function mk(t,e,n){switch(e.tag){case 3:Lw(e),vi();break;case 5:cw(e);break;case 1:It(e.type)&&fu(e);break;case 4:sp(e,e.stateNode.containerInfo);break;case 10:var r=e.type._context,s=e.memoizedProps.value;pe(gu,r._currentValue),r._currentValue=s;break;case 13:if(r=e.memoizedState,r!==null)return r.dehydrated!==null?(pe(xe,xe.current&1),e.flags|=128,null):n&e.child.childLanes?Mw(t,e,n):(pe(xe,xe.current&1),t=qn(t,e,n),t!==null?t.sibling:null);pe(xe,xe.current&1);break;case 19:if(r=(n&e.childLanes)!==0,t.flags&128){if(r)return jw(t,e,n);e.flags|=128}if(s=e.memoizedState,s!==null&&(s.rendering=null,s.tail=null,s.lastEffect=null),pe(xe,xe.current),r)break;return null;case 22:case 23:return e.lanes=0,Ow(t,e,n)}return qn(t,e,n)}var Uw,zd,Fw,zw;Uw=function(t,e){for(var n=e.child;n!==null;){if(n.tag===5||n.tag===6)t.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===e)break;for(;n.sibling===null;){if(n.return===null||n.return===e)return;n=n.return}n.sibling.return=n.return,n=n.sibling}};zd=function(){};Fw=function(t,e,n,r){var s=t.memoizedProps;if(s!==r){t=e.stateNode,hs(yn.current);var i=null;switch(n){case"input":s=ud(t,s),r=ud(t,r),i=[];break;case"select":s=Ce({},s,{value:void 0}),r=Ce({},r,{value:void 0}),i=[];break;case"textarea":s=dd(t,s),r=dd(t,r),i=[];break;default:typeof s.onClick!="function"&&typeof r.onClick=="function"&&(t.onclick=hu)}pd(n,r);var o;n=null;for(c in s)if(!r.hasOwnProperty(c)&&s.hasOwnProperty(c)&&s[c]!=null)if(c==="style"){var l=s[c];for(o in l)l.hasOwnProperty(o)&&(n||(n={}),n[o]="")}else c!=="dangerouslySetInnerHTML"&&c!=="children"&&c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&c!=="autoFocus"&&(Go.hasOwnProperty(c)?i||(i=[]):(i=i||[]).push(c,null));for(c in r){var u=r[c];if(l=s!=null?s[c]:void 0,r.hasOwnProperty(c)&&u!==l&&(u!=null||l!=null))if(c==="style")if(l){for(o in l)!l.hasOwnProperty(o)||u&&u.hasOwnProperty(o)||(n||(n={}),n[o]="");for(o in u)u.hasOwnProperty(o)&&l[o]!==u[o]&&(n||(n={}),n[o]=u[o])}else n||(i||(i=[]),i.push(c,n)),n=u;else c==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,l=l?l.__html:void 0,u!=null&&l!==u&&(i=i||[]).push(c,u)):c==="children"?typeof u!="string"&&typeof u!="number"||(i=i||[]).push(c,""+u):c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&(Go.hasOwnProperty(c)?(u!=null&&c==="onScroll"&&ge("scroll",t),i||l===u||(i=[])):(i=i||[]).push(c,u))}n&&(i=i||[]).push("style",n);var c=i;(e.updateQueue=c)&&(e.flags|=4)}};zw=function(t,e,n,r){n!==r&&(e.flags|=4)};function _o(t,e){if(!we)switch(t.tailMode){case"hidden":e=t.tail;for(var n=null;e!==null;)e.alternate!==null&&(n=e),e=e.sibling;n===null?t.tail=null:n.sibling=null;break;case"collapsed":n=t.tail;for(var r=null;n!==null;)n.alternate!==null&&(r=n),n=n.sibling;r===null?e||t.tail===null?t.tail=null:t.tail.sibling=null:r.sibling=null}}function nt(t){var e=t.alternate!==null&&t.alternate.child===t.child,n=0,r=0;if(e)for(var s=t.child;s!==null;)n|=s.lanes|s.childLanes,r|=s.subtreeFlags&14680064,r|=s.flags&14680064,s.return=t,s=s.sibling;else for(s=t.child;s!==null;)n|=s.lanes|s.childLanes,r|=s.subtreeFlags,r|=s.flags,s.return=t,s=s.sibling;return t.subtreeFlags|=r,t.childLanes=n,e}function gk(t,e,n){var r=e.pendingProps;switch(Yf(e),e.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return nt(e),null;case 1:return It(e.type)&&du(),nt(e),null;case 3:return r=e.stateNode,Ei(),ye(xt),ye(lt),op(),r.pendingContext&&(r.context=r.pendingContext,r.pendingContext=null),(t===null||t.child===null)&&(_l(e)?e.flags|=4:t===null||t.memoizedState.isDehydrated&&!(e.flags&256)||(e.flags|=1024,Jt!==null&&(Qd(Jt),Jt=null))),zd(t,e),nt(e),null;case 5:ip(e);var s=hs(ia.current);if(n=e.type,t!==null&&e.stateNode!=null)Fw(t,e,n,r,s),t.ref!==e.ref&&(e.flags|=512,e.flags|=2097152);else{if(!r){if(e.stateNode===null)throw Error(F(166));return nt(e),null}if(t=hs(yn.current),_l(e)){r=e.stateNode,n=e.type;var i=e.memoizedProps;switch(r[pn]=e,r[ra]=i,t=(e.mode&1)!==0,n){case"dialog":ge("cancel",r),ge("close",r);break;case"iframe":case"object":case"embed":ge("load",r);break;case"video":case"audio":for(s=0;s<So.length;s++)ge(So[s],r);break;case"source":ge("error",r);break;case"img":case"image":case"link":ge("error",r),ge("load",r);break;case"details":ge("toggle",r);break;case"input":Fg(r,i),ge("invalid",r);break;case"select":r._wrapperState={wasMultiple:!!i.multiple},ge("invalid",r);break;case"textarea":Bg(r,i),ge("invalid",r)}pd(n,i),s=null;for(var o in i)if(i.hasOwnProperty(o)){var l=i[o];o==="children"?typeof l=="string"?r.textContent!==l&&(i.suppressHydrationWarning!==!0&&yl(r.textContent,l,t),s=["children",l]):typeof l=="number"&&r.textContent!==""+l&&(i.suppressHydrationWarning!==!0&&yl(r.textContent,l,t),s=["children",""+l]):Go.hasOwnProperty(o)&&l!=null&&o==="onScroll"&&ge("scroll",r)}switch(n){case"input":ul(r),zg(r,i,!0);break;case"textarea":ul(r),$g(r);break;case"select":case"option":break;default:typeof i.onClick=="function"&&(r.onclick=hu)}r=s,e.updateQueue=r,r!==null&&(e.flags|=4)}else{o=s.nodeType===9?s:s.ownerDocument,t==="http://www.w3.org/1999/xhtml"&&(t=m0(n)),t==="http://www.w3.org/1999/xhtml"?n==="script"?(t=o.createElement("div"),t.innerHTML="<script><\/script>",t=t.removeChild(t.firstChild)):typeof r.is=="string"?t=o.createElement(n,{is:r.is}):(t=o.createElement(n),n==="select"&&(o=t,r.multiple?o.multiple=!0:r.size&&(o.size=r.size))):t=o.createElementNS(t,n),t[pn]=e,t[ra]=r,Uw(t,e,!1,!1),e.stateNode=t;e:{switch(o=md(n,r),n){case"dialog":ge("cancel",t),ge("close",t),s=r;break;case"iframe":case"object":case"embed":ge("load",t),s=r;break;case"video":case"audio":for(s=0;s<So.length;s++)ge(So[s],t);s=r;break;case"source":ge("error",t),s=r;break;case"img":case"image":case"link":ge("error",t),ge("load",t),s=r;break;case"details":ge("toggle",t),s=r;break;case"input":Fg(t,r),s=ud(t,r),ge("invalid",t);break;case"option":s=r;break;case"select":t._wrapperState={wasMultiple:!!r.multiple},s=Ce({},r,{value:void 0}),ge("invalid",t);break;case"textarea":Bg(t,r),s=dd(t,r),ge("invalid",t);break;default:s=r}pd(n,s),l=s;for(i in l)if(l.hasOwnProperty(i)){var u=l[i];i==="style"?_0(t,u):i==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,u!=null&&g0(t,u)):i==="children"?typeof u=="string"?(n!=="textarea"||u!=="")&&Ko(t,u):typeof u=="number"&&Ko(t,""+u):i!=="suppressContentEditableWarning"&&i!=="suppressHydrationWarning"&&i!=="autoFocus"&&(Go.hasOwnProperty(i)?u!=null&&i==="onScroll"&&ge("scroll",t):u!=null&&Lf(t,i,u,o))}switch(n){case"input":ul(t),zg(t,r,!1);break;case"textarea":ul(t),$g(t);break;case"option":r.value!=null&&t.setAttribute("value",""+Nr(r.value));break;case"select":t.multiple=!!r.multiple,i=r.value,i!=null?oi(t,!!r.multiple,i,!1):r.defaultValue!=null&&oi(t,!!r.multiple,r.defaultValue,!0);break;default:typeof s.onClick=="function"&&(t.onclick=hu)}switch(n){case"button":case"input":case"select":case"textarea":r=!!r.autoFocus;break e;case"img":r=!0;break e;default:r=!1}}r&&(e.flags|=4)}e.ref!==null&&(e.flags|=512,e.flags|=2097152)}return nt(e),null;case 6:if(t&&e.stateNode!=null)zw(t,e,t.memoizedProps,r);else{if(typeof r!="string"&&e.stateNode===null)throw Error(F(166));if(n=hs(ia.current),hs(yn.current),_l(e)){if(r=e.stateNode,n=e.memoizedProps,r[pn]=e,(i=r.nodeValue!==n)&&(t=Dt,t!==null))switch(t.tag){case 3:yl(r.nodeValue,n,(t.mode&1)!==0);break;case 5:t.memoizedProps.suppressHydrationWarning!==!0&&yl(r.nodeValue,n,(t.mode&1)!==0)}i&&(e.flags|=4)}else r=(n.nodeType===9?n:n.ownerDocument).createTextNode(r),r[pn]=e,e.stateNode=r}return nt(e),null;case 13:if(ye(xe),r=e.memoizedState,t===null||t.memoizedState!==null&&t.memoizedState.dehydrated!==null){if(we&&bt!==null&&e.mode&1&&!(e.flags&128))iw(),vi(),e.flags|=98560,i=!1;else if(i=_l(e),r!==null&&r.dehydrated!==null){if(t===null){if(!i)throw Error(F(318));if(i=e.memoizedState,i=i!==null?i.dehydrated:null,!i)throw Error(F(317));i[pn]=e}else vi(),!(e.flags&128)&&(e.memoizedState=null),e.flags|=4;nt(e),i=!1}else Jt!==null&&(Qd(Jt),Jt=null),i=!0;if(!i)return e.flags&65536?e:null}return e.flags&128?(e.lanes=n,e):(r=r!==null,r!==(t!==null&&t.memoizedState!==null)&&r&&(e.child.flags|=8192,e.mode&1&&(t===null||xe.current&1?Fe===0&&(Fe=3):_p())),e.updateQueue!==null&&(e.flags|=4),nt(e),null);case 4:return Ei(),zd(t,e),t===null&&ta(e.stateNode.containerInfo),nt(e),null;case 10:return tp(e.type._context),nt(e),null;case 17:return It(e.type)&&du(),nt(e),null;case 19:if(ye(xe),i=e.memoizedState,i===null)return nt(e),null;if(r=(e.flags&128)!==0,o=i.rendering,o===null)if(r)_o(i,!1);else{if(Fe!==0||t!==null&&t.flags&128)for(t=e.child;t!==null;){if(o=vu(t),o!==null){for(e.flags|=128,_o(i,!1),r=o.updateQueue,r!==null&&(e.updateQueue=r,e.flags|=4),e.subtreeFlags=0,r=n,n=e.child;n!==null;)i=n,t=r,i.flags&=14680066,o=i.alternate,o===null?(i.childLanes=0,i.lanes=t,i.child=null,i.subtreeFlags=0,i.memoizedProps=null,i.memoizedState=null,i.updateQueue=null,i.dependencies=null,i.stateNode=null):(i.childLanes=o.childLanes,i.lanes=o.lanes,i.child=o.child,i.subtreeFlags=0,i.deletions=null,i.memoizedProps=o.memoizedProps,i.memoizedState=o.memoizedState,i.updateQueue=o.updateQueue,i.type=o.type,t=o.dependencies,i.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext}),n=n.sibling;return pe(xe,xe.current&1|2),e.child}t=t.sibling}i.tail!==null&&De()>xi&&(e.flags|=128,r=!0,_o(i,!1),e.lanes=4194304)}else{if(!r)if(t=vu(o),t!==null){if(e.flags|=128,r=!0,n=t.updateQueue,n!==null&&(e.updateQueue=n,e.flags|=4),_o(i,!0),i.tail===null&&i.tailMode==="hidden"&&!o.alternate&&!we)return nt(e),null}else 2*De()-i.renderingStartTime>xi&&n!==1073741824&&(e.flags|=128,r=!0,_o(i,!1),e.lanes=4194304);i.isBackwards?(o.sibling=e.child,e.child=o):(n=i.last,n!==null?n.sibling=o:e.child=o,i.last=o)}return i.tail!==null?(e=i.tail,i.rendering=e,i.tail=e.sibling,i.renderingStartTime=De(),e.sibling=null,n=xe.current,pe(xe,r?n&1|2:n&1),e):(nt(e),null);case 22:case 23:return yp(),r=e.memoizedState!==null,t!==null&&t.memoizedState!==null!==r&&(e.flags|=8192),r&&e.mode&1?Ct&1073741824&&(nt(e),e.subtreeFlags&6&&(e.flags|=8192)):nt(e),null;case 24:return null;case 25:return null}throw Error(F(156,e.tag))}function yk(t,e){switch(Yf(e),e.tag){case 1:return It(e.type)&&du(),t=e.flags,t&65536?(e.flags=t&-65537|128,e):null;case 3:return Ei(),ye(xt),ye(lt),op(),t=e.flags,t&65536&&!(t&128)?(e.flags=t&-65537|128,e):null;case 5:return ip(e),null;case 13:if(ye(xe),t=e.memoizedState,t!==null&&t.dehydrated!==null){if(e.alternate===null)throw Error(F(340));vi()}return t=e.flags,t&65536?(e.flags=t&-65537|128,e):null;case 19:return ye(xe),null;case 4:return Ei(),null;case 10:return tp(e.type._context),null;case 22:case 23:return yp(),null;case 24:return null;default:return null}}var El=!1,it=!1,_k=typeof WeakSet=="function"?WeakSet:Set,H=null;function ri(t,e){var n=t.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(r){be(t,e,r)}else n.current=null}function Bd(t,e,n){try{n()}catch(r){be(t,e,r)}}var Ny=!1;function vk(t,e){if(Sd=lu,t=W0(),Qf(t)){if("selectionStart"in t)var n={start:t.selectionStart,end:t.selectionEnd};else e:{n=(n=t.ownerDocument)&&n.defaultView||window;var r=n.getSelection&&n.getSelection();if(r&&r.rangeCount!==0){n=r.anchorNode;var s=r.anchorOffset,i=r.focusNode;r=r.focusOffset;try{n.nodeType,i.nodeType}catch{n=null;break e}var o=0,l=-1,u=-1,c=0,f=0,p=t,g=null;t:for(;;){for(var w;p!==n||s!==0&&p.nodeType!==3||(l=o+s),p!==i||r!==0&&p.nodeType!==3||(u=o+r),p.nodeType===3&&(o+=p.nodeValue.length),(w=p.firstChild)!==null;)g=p,p=w;for(;;){if(p===t)break t;if(g===n&&++c===s&&(l=o),g===i&&++f===r&&(u=o),(w=p.nextSibling)!==null)break;p=g,g=p.parentNode}p=w}n=l===-1||u===-1?null:{start:l,end:u}}else n=null}n=n||{start:0,end:0}}else n=null;for(kd={focusedElem:t,selectionRange:n},lu=!1,H=e;H!==null;)if(e=H,t=e.child,(e.subtreeFlags&1028)!==0&&t!==null)t.return=e,H=t;else for(;H!==null;){e=H;try{var S=e.alternate;if(e.flags&1024)switch(e.tag){case 0:case 11:case 15:break;case 1:if(S!==null){var b=S.memoizedProps,P=S.memoizedState,I=e.stateNode,v=I.getSnapshotBeforeUpdate(e.elementType===e.type?b:Xt(e.type,b),P);I.__reactInternalSnapshotBeforeUpdate=v}break;case 3:var C=e.stateNode.containerInfo;C.nodeType===1?C.textContent="":C.nodeType===9&&C.documentElement&&C.removeChild(C.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(F(163))}}catch(D){be(e,e.return,D)}if(t=e.sibling,t!==null){t.return=e.return,H=t;break}H=e.return}return S=Ny,Ny=!1,S}function Mo(t,e,n){var r=e.updateQueue;if(r=r!==null?r.lastEffect:null,r!==null){var s=r=r.next;do{if((s.tag&t)===t){var i=s.destroy;s.destroy=void 0,i!==void 0&&Bd(e,n,i)}s=s.next}while(s!==r)}}function sc(t,e){if(e=e.updateQueue,e=e!==null?e.lastEffect:null,e!==null){var n=e=e.next;do{if((n.tag&t)===t){var r=n.create;n.destroy=r()}n=n.next}while(n!==e)}}function $d(t){var e=t.ref;if(e!==null){var n=t.stateNode;switch(t.tag){case 5:t=n;break;default:t=n}typeof e=="function"?e(t):e.current=t}}function Bw(t){var e=t.alternate;e!==null&&(t.alternate=null,Bw(e)),t.child=null,t.deletions=null,t.sibling=null,t.tag===5&&(e=t.stateNode,e!==null&&(delete e[pn],delete e[ra],delete e[Rd],delete e[tk],delete e[nk])),t.stateNode=null,t.return=null,t.dependencies=null,t.memoizedProps=null,t.memoizedState=null,t.pendingProps=null,t.stateNode=null,t.updateQueue=null}function $w(t){return t.tag===5||t.tag===3||t.tag===4}function Dy(t){e:for(;;){for(;t.sibling===null;){if(t.return===null||$w(t.return))return null;t=t.return}for(t.sibling.return=t.return,t=t.sibling;t.tag!==5&&t.tag!==6&&t.tag!==18;){if(t.flags&2||t.child===null||t.tag===4)continue e;t.child.return=t,t=t.child}if(!(t.flags&2))return t.stateNode}}function qd(t,e,n){var r=t.tag;if(r===5||r===6)t=t.stateNode,e?n.nodeType===8?n.parentNode.insertBefore(t,e):n.insertBefore(t,e):(n.nodeType===8?(e=n.parentNode,e.insertBefore(t,n)):(e=n,e.appendChild(t)),n=n._reactRootContainer,n!=null||e.onclick!==null||(e.onclick=hu));else if(r!==4&&(t=t.child,t!==null))for(qd(t,e,n),t=t.sibling;t!==null;)qd(t,e,n),t=t.sibling}function Hd(t,e,n){var r=t.tag;if(r===5||r===6)t=t.stateNode,e?n.insertBefore(t,e):n.appendChild(t);else if(r!==4&&(t=t.child,t!==null))for(Hd(t,e,n),t=t.sibling;t!==null;)Hd(t,e,n),t=t.sibling}var Qe=null,Yt=!1;function sr(t,e,n){for(n=n.child;n!==null;)qw(t,e,n),n=n.sibling}function qw(t,e,n){if(gn&&typeof gn.onCommitFiberUnmount=="function")try{gn.onCommitFiberUnmount(Xu,n)}catch{}switch(n.tag){case 5:it||ri(n,e);case 6:var r=Qe,s=Yt;Qe=null,sr(t,e,n),Qe=r,Yt=s,Qe!==null&&(Yt?(t=Qe,n=n.stateNode,t.nodeType===8?t.parentNode.removeChild(n):t.removeChild(n)):Qe.removeChild(n.stateNode));break;case 18:Qe!==null&&(Yt?(t=Qe,n=n.stateNode,t.nodeType===8?Rh(t.parentNode,n):t.nodeType===1&&Rh(t,n),Jo(t)):Rh(Qe,n.stateNode));break;case 4:r=Qe,s=Yt,Qe=n.stateNode.containerInfo,Yt=!0,sr(t,e,n),Qe=r,Yt=s;break;case 0:case 11:case 14:case 15:if(!it&&(r=n.updateQueue,r!==null&&(r=r.lastEffect,r!==null))){s=r=r.next;do{var i=s,o=i.destroy;i=i.tag,o!==void 0&&(i&2||i&4)&&Bd(n,e,o),s=s.next}while(s!==r)}sr(t,e,n);break;case 1:if(!it&&(ri(n,e),r=n.stateNode,typeof r.componentWillUnmount=="function"))try{r.props=n.memoizedProps,r.state=n.memoizedState,r.componentWillUnmount()}catch(l){be(n,e,l)}sr(t,e,n);break;case 21:sr(t,e,n);break;case 22:n.mode&1?(it=(r=it)||n.memoizedState!==null,sr(t,e,n),it=r):sr(t,e,n);break;default:sr(t,e,n)}}function Oy(t){var e=t.updateQueue;if(e!==null){t.updateQueue=null;var n=t.stateNode;n===null&&(n=t.stateNode=new _k),e.forEach(function(r){var s=Ak.bind(null,t,r);n.has(r)||(n.add(r),r.then(s,s))})}}function Qt(t,e){var n=e.deletions;if(n!==null)for(var r=0;r<n.length;r++){var s=n[r];try{var i=t,o=e,l=o;e:for(;l!==null;){switch(l.tag){case 5:Qe=l.stateNode,Yt=!1;break e;case 3:Qe=l.stateNode.containerInfo,Yt=!0;break e;case 4:Qe=l.stateNode.containerInfo,Yt=!0;break e}l=l.return}if(Qe===null)throw Error(F(160));qw(i,o,s),Qe=null,Yt=!1;var u=s.alternate;u!==null&&(u.return=null),s.return=null}catch(c){be(s,e,c)}}if(e.subtreeFlags&12854)for(e=e.child;e!==null;)Hw(e,t),e=e.sibling}function Hw(t,e){var n=t.alternate,r=t.flags;switch(t.tag){case 0:case 11:case 14:case 15:if(Qt(e,t),hn(t),r&4){try{Mo(3,t,t.return),sc(3,t)}catch(b){be(t,t.return,b)}try{Mo(5,t,t.return)}catch(b){be(t,t.return,b)}}break;case 1:Qt(e,t),hn(t),r&512&&n!==null&&ri(n,n.return);break;case 5:if(Qt(e,t),hn(t),r&512&&n!==null&&ri(n,n.return),t.flags&32){var s=t.stateNode;try{Ko(s,"")}catch(b){be(t,t.return,b)}}if(r&4&&(s=t.stateNode,s!=null)){var i=t.memoizedProps,o=n!==null?n.memoizedProps:i,l=t.type,u=t.updateQueue;if(t.updateQueue=null,u!==null)try{l==="input"&&i.type==="radio"&&i.name!=null&&f0(s,i),md(l,o);var c=md(l,i);for(o=0;o<u.length;o+=2){var f=u[o],p=u[o+1];f==="style"?_0(s,p):f==="dangerouslySetInnerHTML"?g0(s,p):f==="children"?Ko(s,p):Lf(s,f,p,c)}switch(l){case"input":cd(s,i);break;case"textarea":p0(s,i);break;case"select":var g=s._wrapperState.wasMultiple;s._wrapperState.wasMultiple=!!i.multiple;var w=i.value;w!=null?oi(s,!!i.multiple,w,!1):g!==!!i.multiple&&(i.defaultValue!=null?oi(s,!!i.multiple,i.defaultValue,!0):oi(s,!!i.multiple,i.multiple?[]:"",!1))}s[ra]=i}catch(b){be(t,t.return,b)}}break;case 6:if(Qt(e,t),hn(t),r&4){if(t.stateNode===null)throw Error(F(162));s=t.stateNode,i=t.memoizedProps;try{s.nodeValue=i}catch(b){be(t,t.return,b)}}break;case 3:if(Qt(e,t),hn(t),r&4&&n!==null&&n.memoizedState.isDehydrated)try{Jo(e.containerInfo)}catch(b){be(t,t.return,b)}break;case 4:Qt(e,t),hn(t);break;case 13:Qt(e,t),hn(t),s=t.child,s.flags&8192&&(i=s.memoizedState!==null,s.stateNode.isHidden=i,!i||s.alternate!==null&&s.alternate.memoizedState!==null||(mp=De())),r&4&&Oy(t);break;case 22:if(f=n!==null&&n.memoizedState!==null,t.mode&1?(it=(c=it)||f,Qt(e,t),it=c):Qt(e,t),hn(t),r&8192){if(c=t.memoizedState!==null,(t.stateNode.isHidden=c)&&!f&&t.mode&1)for(H=t,f=t.child;f!==null;){for(p=H=f;H!==null;){switch(g=H,w=g.child,g.tag){case 0:case 11:case 14:case 15:Mo(4,g,g.return);break;case 1:ri(g,g.return);var S=g.stateNode;if(typeof S.componentWillUnmount=="function"){r=g,n=g.return;try{e=r,S.props=e.memoizedProps,S.state=e.memoizedState,S.componentWillUnmount()}catch(b){be(r,n,b)}}break;case 5:ri(g,g.return);break;case 22:if(g.memoizedState!==null){Ly(p);continue}}w!==null?(w.return=g,H=w):Ly(p)}f=f.sibling}e:for(f=null,p=t;;){if(p.tag===5){if(f===null){f=p;try{s=p.stateNode,c?(i=s.style,typeof i.setProperty=="function"?i.setProperty("display","none","important"):i.display="none"):(l=p.stateNode,u=p.memoizedProps.style,o=u!=null&&u.hasOwnProperty("display")?u.display:null,l.style.display=y0("display",o))}catch(b){be(t,t.return,b)}}}else if(p.tag===6){if(f===null)try{p.stateNode.nodeValue=c?"":p.memoizedProps}catch(b){be(t,t.return,b)}}else if((p.tag!==22&&p.tag!==23||p.memoizedState===null||p===t)&&p.child!==null){p.child.return=p,p=p.child;continue}if(p===t)break e;for(;p.sibling===null;){if(p.return===null||p.return===t)break e;f===p&&(f=null),p=p.return}f===p&&(f=null),p.sibling.return=p.return,p=p.sibling}}break;case 19:Qt(e,t),hn(t),r&4&&Oy(t);break;case 21:break;default:Qt(e,t),hn(t)}}function hn(t){var e=t.flags;if(e&2){try{e:{for(var n=t.return;n!==null;){if($w(n)){var r=n;break e}n=n.return}throw Error(F(160))}switch(r.tag){case 5:var s=r.stateNode;r.flags&32&&(Ko(s,""),r.flags&=-33);var i=Dy(t);Hd(t,i,s);break;case 3:case 4:var o=r.stateNode.containerInfo,l=Dy(t);qd(t,l,o);break;default:throw Error(F(161))}}catch(u){be(t,t.return,u)}t.flags&=-3}e&4096&&(t.flags&=-4097)}function wk(t,e,n){H=t,Ww(t)}function Ww(t,e,n){for(var r=(t.mode&1)!==0;H!==null;){var s=H,i=s.child;if(s.tag===22&&r){var o=s.memoizedState!==null||El;if(!o){var l=s.alternate,u=l!==null&&l.memoizedState!==null||it;l=El;var c=it;if(El=o,(it=u)&&!c)for(H=s;H!==null;)o=H,u=o.child,o.tag===22&&o.memoizedState!==null?My(s):u!==null?(u.return=o,H=u):My(s);for(;i!==null;)H=i,Ww(i),i=i.sibling;H=s,El=l,it=c}Vy(t)}else s.subtreeFlags&8772&&i!==null?(i.return=s,H=i):Vy(t)}}function Vy(t){for(;H!==null;){var e=H;if(e.flags&8772){var n=e.alternate;try{if(e.flags&8772)switch(e.tag){case 0:case 11:case 15:it||sc(5,e);break;case 1:var r=e.stateNode;if(e.flags&4&&!it)if(n===null)r.componentDidMount();else{var s=e.elementType===e.type?n.memoizedProps:Xt(e.type,n.memoizedProps);r.componentDidUpdate(s,n.memoizedState,r.__reactInternalSnapshotBeforeUpdate)}var i=e.updateQueue;i!==null&&vy(e,i,r);break;case 3:var o=e.updateQueue;if(o!==null){if(n=null,e.child!==null)switch(e.child.tag){case 5:n=e.child.stateNode;break;case 1:n=e.child.stateNode}vy(e,o,n)}break;case 5:var l=e.stateNode;if(n===null&&e.flags&4){n=l;var u=e.memoizedProps;switch(e.type){case"button":case"input":case"select":case"textarea":u.autoFocus&&n.focus();break;case"img":u.src&&(n.src=u.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(e.memoizedState===null){var c=e.alternate;if(c!==null){var f=c.memoizedState;if(f!==null){var p=f.dehydrated;p!==null&&Jo(p)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(F(163))}it||e.flags&512&&$d(e)}catch(g){be(e,e.return,g)}}if(e===t){H=null;break}if(n=e.sibling,n!==null){n.return=e.return,H=n;break}H=e.return}}function Ly(t){for(;H!==null;){var e=H;if(e===t){H=null;break}var n=e.sibling;if(n!==null){n.return=e.return,H=n;break}H=e.return}}function My(t){for(;H!==null;){var e=H;try{switch(e.tag){case 0:case 11:case 15:var n=e.return;try{sc(4,e)}catch(u){be(e,n,u)}break;case 1:var r=e.stateNode;if(typeof r.componentDidMount=="function"){var s=e.return;try{r.componentDidMount()}catch(u){be(e,s,u)}}var i=e.return;try{$d(e)}catch(u){be(e,i,u)}break;case 5:var o=e.return;try{$d(e)}catch(u){be(e,o,u)}}}catch(u){be(e,e.return,u)}if(e===t){H=null;break}var l=e.sibling;if(l!==null){l.return=e.return,H=l;break}H=e.return}}var Ek=Math.ceil,Tu=Qn.ReactCurrentDispatcher,fp=Qn.ReactCurrentOwner,Bt=Qn.ReactCurrentBatchConfig,oe=0,Ge=null,Ve=null,Ye=0,Ct=0,si=Wr(0),Fe=0,ua=null,ws=0,ic=0,pp=0,jo=null,wt=null,mp=0,xi=1/0,Cn=null,xu=!1,Wd=null,Tr=null,Tl=!1,mr=null,Iu=0,Uo=0,Gd=null,$l=-1,ql=0;function pt(){return oe&6?De():$l!==-1?$l:$l=De()}function xr(t){return t.mode&1?oe&2&&Ye!==0?Ye&-Ye:sk.transition!==null?(ql===0&&(ql=b0()),ql):(t=ue,t!==0||(t=window.event,t=t===void 0?16:M0(t.type)),t):1}function tn(t,e,n,r){if(50<Uo)throw Uo=0,Gd=null,Error(F(185));Ca(t,n,r),(!(oe&2)||t!==Ge)&&(t===Ge&&(!(oe&2)&&(ic|=n),Fe===4&&ur(t,Ye)),St(t,r),n===1&&oe===0&&!(e.mode&1)&&(xi=De()+500,tc&&Gr()))}function St(t,e){var n=t.callbackNode;sS(t,e);var r=au(t,t===Ge?Ye:0);if(r===0)n!==null&&Wg(n),t.callbackNode=null,t.callbackPriority=0;else if(e=r&-r,t.callbackPriority!==e){if(n!=null&&Wg(n),e===1)t.tag===0?rk(jy.bind(null,t)):nw(jy.bind(null,t)),ZS(function(){!(oe&6)&&Gr()}),n=null;else{switch(P0(r)){case 1:n=zf;break;case 4:n=A0;break;case 16:n=ou;break;case 536870912:n=R0;break;default:n=ou}n=eE(n,Gw.bind(null,t))}t.callbackPriority=e,t.callbackNode=n}}function Gw(t,e){if($l=-1,ql=0,oe&6)throw Error(F(327));var n=t.callbackNode;if(hi()&&t.callbackNode!==n)return null;var r=au(t,t===Ge?Ye:0);if(r===0)return null;if(r&30||r&t.expiredLanes||e)e=Su(t,r);else{e=r;var s=oe;oe|=2;var i=Qw();(Ge!==t||Ye!==e)&&(Cn=null,xi=De()+500,ps(t,e));do try{Ik();break}catch(l){Kw(t,l)}while(!0);ep(),Tu.current=i,oe=s,Ve!==null?e=0:(Ge=null,Ye=0,e=Fe)}if(e!==0){if(e===2&&(s=wd(t),s!==0&&(r=s,e=Kd(t,s))),e===1)throw n=ua,ps(t,0),ur(t,r),St(t,De()),n;if(e===6)ur(t,r);else{if(s=t.current.alternate,!(r&30)&&!Tk(s)&&(e=Su(t,r),e===2&&(i=wd(t),i!==0&&(r=i,e=Kd(t,i))),e===1))throw n=ua,ps(t,0),ur(t,r),St(t,De()),n;switch(t.finishedWork=s,t.finishedLanes=r,e){case 0:case 1:throw Error(F(345));case 2:as(t,wt,Cn);break;case 3:if(ur(t,r),(r&130023424)===r&&(e=mp+500-De(),10<e)){if(au(t,0)!==0)break;if(s=t.suspendedLanes,(s&r)!==r){pt(),t.pingedLanes|=t.suspendedLanes&s;break}t.timeoutHandle=Ad(as.bind(null,t,wt,Cn),e);break}as(t,wt,Cn);break;case 4:if(ur(t,r),(r&4194240)===r)break;for(e=t.eventTimes,s=-1;0<r;){var o=31-en(r);i=1<<o,o=e[o],o>s&&(s=o),r&=~i}if(r=s,r=De()-r,r=(120>r?120:480>r?480:1080>r?1080:1920>r?1920:3e3>r?3e3:4320>r?4320:1960*Ek(r/1960))-r,10<r){t.timeoutHandle=Ad(as.bind(null,t,wt,Cn),r);break}as(t,wt,Cn);break;case 5:as(t,wt,Cn);break;default:throw Error(F(329))}}}return St(t,De()),t.callbackNode===n?Gw.bind(null,t):null}function Kd(t,e){var n=jo;return t.current.memoizedState.isDehydrated&&(ps(t,e).flags|=256),t=Su(t,e),t!==2&&(e=wt,wt=n,e!==null&&Qd(e)),t}function Qd(t){wt===null?wt=t:wt.push.apply(wt,t)}function Tk(t){for(var e=t;;){if(e.flags&16384){var n=e.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var r=0;r<n.length;r++){var s=n[r],i=s.getSnapshot;s=s.value;try{if(!sn(i(),s))return!1}catch{return!1}}}if(n=e.child,e.subtreeFlags&16384&&n!==null)n.return=e,e=n;else{if(e===t)break;for(;e.sibling===null;){if(e.return===null||e.return===t)return!0;e=e.return}e.sibling.return=e.return,e=e.sibling}}return!0}function ur(t,e){for(e&=~pp,e&=~ic,t.suspendedLanes|=e,t.pingedLanes&=~e,t=t.expirationTimes;0<e;){var n=31-en(e),r=1<<n;t[n]=-1,e&=~r}}function jy(t){if(oe&6)throw Error(F(327));hi();var e=au(t,0);if(!(e&1))return St(t,De()),null;var n=Su(t,e);if(t.tag!==0&&n===2){var r=wd(t);r!==0&&(e=r,n=Kd(t,r))}if(n===1)throw n=ua,ps(t,0),ur(t,e),St(t,De()),n;if(n===6)throw Error(F(345));return t.finishedWork=t.current.alternate,t.finishedLanes=e,as(t,wt,Cn),St(t,De()),null}function gp(t,e){var n=oe;oe|=1;try{return t(e)}finally{oe=n,oe===0&&(xi=De()+500,tc&&Gr())}}function Es(t){mr!==null&&mr.tag===0&&!(oe&6)&&hi();var e=oe;oe|=1;var n=Bt.transition,r=ue;try{if(Bt.transition=null,ue=1,t)return t()}finally{ue=r,Bt.transition=n,oe=e,!(oe&6)&&Gr()}}function yp(){Ct=si.current,ye(si)}function ps(t,e){t.finishedWork=null,t.finishedLanes=0;var n=t.timeoutHandle;if(n!==-1&&(t.timeoutHandle=-1,JS(n)),Ve!==null)for(n=Ve.return;n!==null;){var r=n;switch(Yf(r),r.tag){case 1:r=r.type.childContextTypes,r!=null&&du();break;case 3:Ei(),ye(xt),ye(lt),op();break;case 5:ip(r);break;case 4:Ei();break;case 13:ye(xe);break;case 19:ye(xe);break;case 10:tp(r.type._context);break;case 22:case 23:yp()}n=n.return}if(Ge=t,Ve=t=Ir(t.current,null),Ye=Ct=e,Fe=0,ua=null,pp=ic=ws=0,wt=jo=null,cs!==null){for(e=0;e<cs.length;e++)if(n=cs[e],r=n.interleaved,r!==null){n.interleaved=null;var s=r.next,i=n.pending;if(i!==null){var o=i.next;i.next=s,r.next=o}n.pending=r}cs=null}return t}function Kw(t,e){do{var n=Ve;try{if(ep(),Fl.current=Eu,wu){for(var r=Se.memoizedState;r!==null;){var s=r.queue;s!==null&&(s.pending=null),r=r.next}wu=!1}if(vs=0,He=Ue=Se=null,Lo=!1,oa=0,fp.current=null,n===null||n.return===null){Fe=1,ua=e,Ve=null;break}e:{var i=t,o=n.return,l=n,u=e;if(e=Ye,l.flags|=32768,u!==null&&typeof u=="object"&&typeof u.then=="function"){var c=u,f=l,p=f.tag;if(!(f.mode&1)&&(p===0||p===11||p===15)){var g=f.alternate;g?(f.updateQueue=g.updateQueue,f.memoizedState=g.memoizedState,f.lanes=g.lanes):(f.updateQueue=null,f.memoizedState=null)}var w=Sy(o);if(w!==null){w.flags&=-257,ky(w,o,l,i,e),w.mode&1&&Iy(i,c,e),e=w,u=c;var S=e.updateQueue;if(S===null){var b=new Set;b.add(u),e.updateQueue=b}else S.add(u);break e}else{if(!(e&1)){Iy(i,c,e),_p();break e}u=Error(F(426))}}else if(we&&l.mode&1){var P=Sy(o);if(P!==null){!(P.flags&65536)&&(P.flags|=256),ky(P,o,l,i,e),Jf(Ti(u,l));break e}}i=u=Ti(u,l),Fe!==4&&(Fe=2),jo===null?jo=[i]:jo.push(i),i=o;do{switch(i.tag){case 3:i.flags|=65536,e&=-e,i.lanes|=e;var I=Pw(i,u,e);_y(i,I);break e;case 1:l=u;var v=i.type,C=i.stateNode;if(!(i.flags&128)&&(typeof v.getDerivedStateFromError=="function"||C!==null&&typeof C.componentDidCatch=="function"&&(Tr===null||!Tr.has(C)))){i.flags|=65536,e&=-e,i.lanes|=e;var D=Nw(i,l,e);_y(i,D);break e}}i=i.return}while(i!==null)}Yw(n)}catch(j){e=j,Ve===n&&n!==null&&(Ve=n=n.return);continue}break}while(!0)}function Qw(){var t=Tu.current;return Tu.current=Eu,t===null?Eu:t}function _p(){(Fe===0||Fe===3||Fe===2)&&(Fe=4),Ge===null||!(ws&268435455)&&!(ic&268435455)||ur(Ge,Ye)}function Su(t,e){var n=oe;oe|=2;var r=Qw();(Ge!==t||Ye!==e)&&(Cn=null,ps(t,e));do try{xk();break}catch(s){Kw(t,s)}while(!0);if(ep(),oe=n,Tu.current=r,Ve!==null)throw Error(F(261));return Ge=null,Ye=0,Fe}function xk(){for(;Ve!==null;)Xw(Ve)}function Ik(){for(;Ve!==null&&!Q1();)Xw(Ve)}function Xw(t){var e=Zw(t.alternate,t,Ct);t.memoizedProps=t.pendingProps,e===null?Yw(t):Ve=e,fp.current=null}function Yw(t){var e=t;do{var n=e.alternate;if(t=e.return,e.flags&32768){if(n=yk(n,e),n!==null){n.flags&=32767,Ve=n;return}if(t!==null)t.flags|=32768,t.subtreeFlags=0,t.deletions=null;else{Fe=6,Ve=null;return}}else if(n=gk(n,e,Ct),n!==null){Ve=n;return}if(e=e.sibling,e!==null){Ve=e;return}Ve=e=t}while(e!==null);Fe===0&&(Fe=5)}function as(t,e,n){var r=ue,s=Bt.transition;try{Bt.transition=null,ue=1,Sk(t,e,n,r)}finally{Bt.transition=s,ue=r}return null}function Sk(t,e,n,r){do hi();while(mr!==null);if(oe&6)throw Error(F(327));n=t.finishedWork;var s=t.finishedLanes;if(n===null)return null;if(t.finishedWork=null,t.finishedLanes=0,n===t.current)throw Error(F(177));t.callbackNode=null,t.callbackPriority=0;var i=n.lanes|n.childLanes;if(iS(t,i),t===Ge&&(Ve=Ge=null,Ye=0),!(n.subtreeFlags&2064)&&!(n.flags&2064)||Tl||(Tl=!0,eE(ou,function(){return hi(),null})),i=(n.flags&15990)!==0,n.subtreeFlags&15990||i){i=Bt.transition,Bt.transition=null;var o=ue;ue=1;var l=oe;oe|=4,fp.current=null,vk(t,n),Hw(n,t),HS(kd),lu=!!Sd,kd=Sd=null,t.current=n,wk(n),X1(),oe=l,ue=o,Bt.transition=i}else t.current=n;if(Tl&&(Tl=!1,mr=t,Iu=s),i=t.pendingLanes,i===0&&(Tr=null),Z1(n.stateNode),St(t,De()),e!==null)for(r=t.onRecoverableError,n=0;n<e.length;n++)s=e[n],r(s.value,{componentStack:s.stack,digest:s.digest});if(xu)throw xu=!1,t=Wd,Wd=null,t;return Iu&1&&t.tag!==0&&hi(),i=t.pendingLanes,i&1?t===Gd?Uo++:(Uo=0,Gd=t):Uo=0,Gr(),null}function hi(){if(mr!==null){var t=P0(Iu),e=Bt.transition,n=ue;try{if(Bt.transition=null,ue=16>t?16:t,mr===null)var r=!1;else{if(t=mr,mr=null,Iu=0,oe&6)throw Error(F(331));var s=oe;for(oe|=4,H=t.current;H!==null;){var i=H,o=i.child;if(H.flags&16){var l=i.deletions;if(l!==null){for(var u=0;u<l.length;u++){var c=l[u];for(H=c;H!==null;){var f=H;switch(f.tag){case 0:case 11:case 15:Mo(8,f,i)}var p=f.child;if(p!==null)p.return=f,H=p;else for(;H!==null;){f=H;var g=f.sibling,w=f.return;if(Bw(f),f===c){H=null;break}if(g!==null){g.return=w,H=g;break}H=w}}}var S=i.alternate;if(S!==null){var b=S.child;if(b!==null){S.child=null;do{var P=b.sibling;b.sibling=null,b=P}while(b!==null)}}H=i}}if(i.subtreeFlags&2064&&o!==null)o.return=i,H=o;else e:for(;H!==null;){if(i=H,i.flags&2048)switch(i.tag){case 0:case 11:case 15:Mo(9,i,i.return)}var I=i.sibling;if(I!==null){I.return=i.return,H=I;break e}H=i.return}}var v=t.current;for(H=v;H!==null;){o=H;var C=o.child;if(o.subtreeFlags&2064&&C!==null)C.return=o,H=C;else e:for(o=v;H!==null;){if(l=H,l.flags&2048)try{switch(l.tag){case 0:case 11:case 15:sc(9,l)}}catch(j){be(l,l.return,j)}if(l===o){H=null;break e}var D=l.sibling;if(D!==null){D.return=l.return,H=D;break e}H=l.return}}if(oe=s,Gr(),gn&&typeof gn.onPostCommitFiberRoot=="function")try{gn.onPostCommitFiberRoot(Xu,t)}catch{}r=!0}return r}finally{ue=n,Bt.transition=e}}return!1}function Uy(t,e,n){e=Ti(n,e),e=Pw(t,e,1),t=Er(t,e,1),e=pt(),t!==null&&(Ca(t,1,e),St(t,e))}function be(t,e,n){if(t.tag===3)Uy(t,t,n);else for(;e!==null;){if(e.tag===3){Uy(e,t,n);break}else if(e.tag===1){var r=e.stateNode;if(typeof e.type.getDerivedStateFromError=="function"||typeof r.componentDidCatch=="function"&&(Tr===null||!Tr.has(r))){t=Ti(n,t),t=Nw(e,t,1),e=Er(e,t,1),t=pt(),e!==null&&(Ca(e,1,t),St(e,t));break}}e=e.return}}function kk(t,e,n){var r=t.pingCache;r!==null&&r.delete(e),e=pt(),t.pingedLanes|=t.suspendedLanes&n,Ge===t&&(Ye&n)===n&&(Fe===4||Fe===3&&(Ye&130023424)===Ye&&500>De()-mp?ps(t,0):pp|=n),St(t,e)}function Jw(t,e){e===0&&(t.mode&1?(e=dl,dl<<=1,!(dl&130023424)&&(dl=4194304)):e=1);var n=pt();t=$n(t,e),t!==null&&(Ca(t,e,n),St(t,n))}function Ck(t){var e=t.memoizedState,n=0;e!==null&&(n=e.retryLane),Jw(t,n)}function Ak(t,e){var n=0;switch(t.tag){case 13:var r=t.stateNode,s=t.memoizedState;s!==null&&(n=s.retryLane);break;case 19:r=t.stateNode;break;default:throw Error(F(314))}r!==null&&r.delete(e),Jw(t,n)}var Zw;Zw=function(t,e,n){if(t!==null)if(t.memoizedProps!==e.pendingProps||xt.current)Tt=!0;else{if(!(t.lanes&n)&&!(e.flags&128))return Tt=!1,mk(t,e,n);Tt=!!(t.flags&131072)}else Tt=!1,we&&e.flags&1048576&&rw(e,mu,e.index);switch(e.lanes=0,e.tag){case 2:var r=e.type;Bl(t,e),t=e.pendingProps;var s=_i(e,lt.current);ci(e,n),s=lp(null,e,r,t,s,n);var i=up();return e.flags|=1,typeof s=="object"&&s!==null&&typeof s.render=="function"&&s.$$typeof===void 0?(e.tag=1,e.memoizedState=null,e.updateQueue=null,It(r)?(i=!0,fu(e)):i=!1,e.memoizedState=s.state!==null&&s.state!==void 0?s.state:null,rp(e),s.updater=rc,e.stateNode=s,s._reactInternals=e,Vd(e,r,t,n),e=jd(null,e,r,!0,i,n)):(e.tag=0,we&&i&&Xf(e),ft(null,e,s,n),e=e.child),e;case 16:r=e.elementType;e:{switch(Bl(t,e),t=e.pendingProps,s=r._init,r=s(r._payload),e.type=r,s=e.tag=bk(r),t=Xt(r,t),s){case 0:e=Md(null,e,r,t,n);break e;case 1:e=Ry(null,e,r,t,n);break e;case 11:e=Cy(null,e,r,t,n);break e;case 14:e=Ay(null,e,r,Xt(r.type,t),n);break e}throw Error(F(306,r,""))}return e;case 0:return r=e.type,s=e.pendingProps,s=e.elementType===r?s:Xt(r,s),Md(t,e,r,s,n);case 1:return r=e.type,s=e.pendingProps,s=e.elementType===r?s:Xt(r,s),Ry(t,e,r,s,n);case 3:e:{if(Lw(e),t===null)throw Error(F(387));r=e.pendingProps,i=e.memoizedState,s=i.element,uw(t,e),_u(e,r,null,n);var o=e.memoizedState;if(r=o.element,i.isDehydrated)if(i={element:r,isDehydrated:!1,cache:o.cache,pendingSuspenseBoundaries:o.pendingSuspenseBoundaries,transitions:o.transitions},e.updateQueue.baseState=i,e.memoizedState=i,e.flags&256){s=Ti(Error(F(423)),e),e=by(t,e,r,n,s);break e}else if(r!==s){s=Ti(Error(F(424)),e),e=by(t,e,r,n,s);break e}else for(bt=wr(e.stateNode.containerInfo.firstChild),Dt=e,we=!0,Jt=null,n=aw(e,null,r,n),e.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(vi(),r===s){e=qn(t,e,n);break e}ft(t,e,r,n)}e=e.child}return e;case 5:return cw(e),t===null&&Nd(e),r=e.type,s=e.pendingProps,i=t!==null?t.memoizedProps:null,o=s.children,Cd(r,s)?o=null:i!==null&&Cd(r,i)&&(e.flags|=32),Vw(t,e),ft(t,e,o,n),e.child;case 6:return t===null&&Nd(e),null;case 13:return Mw(t,e,n);case 4:return sp(e,e.stateNode.containerInfo),r=e.pendingProps,t===null?e.child=wi(e,null,r,n):ft(t,e,r,n),e.child;case 11:return r=e.type,s=e.pendingProps,s=e.elementType===r?s:Xt(r,s),Cy(t,e,r,s,n);case 7:return ft(t,e,e.pendingProps,n),e.child;case 8:return ft(t,e,e.pendingProps.children,n),e.child;case 12:return ft(t,e,e.pendingProps.children,n),e.child;case 10:e:{if(r=e.type._context,s=e.pendingProps,i=e.memoizedProps,o=s.value,pe(gu,r._currentValue),r._currentValue=o,i!==null)if(sn(i.value,o)){if(i.children===s.children&&!xt.current){e=qn(t,e,n);break e}}else for(i=e.child,i!==null&&(i.return=e);i!==null;){var l=i.dependencies;if(l!==null){o=i.child;for(var u=l.firstContext;u!==null;){if(u.context===r){if(i.tag===1){u=Ln(-1,n&-n),u.tag=2;var c=i.updateQueue;if(c!==null){c=c.shared;var f=c.pending;f===null?u.next=u:(u.next=f.next,f.next=u),c.pending=u}}i.lanes|=n,u=i.alternate,u!==null&&(u.lanes|=n),Dd(i.return,n,e),l.lanes|=n;break}u=u.next}}else if(i.tag===10)o=i.type===e.type?null:i.child;else if(i.tag===18){if(o=i.return,o===null)throw Error(F(341));o.lanes|=n,l=o.alternate,l!==null&&(l.lanes|=n),Dd(o,n,e),o=i.sibling}else o=i.child;if(o!==null)o.return=i;else for(o=i;o!==null;){if(o===e){o=null;break}if(i=o.sibling,i!==null){i.return=o.return,o=i;break}o=o.return}i=o}ft(t,e,s.children,n),e=e.child}return e;case 9:return s=e.type,r=e.pendingProps.children,ci(e,n),s=qt(s),r=r(s),e.flags|=1,ft(t,e,r,n),e.child;case 14:return r=e.type,s=Xt(r,e.pendingProps),s=Xt(r.type,s),Ay(t,e,r,s,n);case 15:return Dw(t,e,e.type,e.pendingProps,n);case 17:return r=e.type,s=e.pendingProps,s=e.elementType===r?s:Xt(r,s),Bl(t,e),e.tag=1,It(r)?(t=!0,fu(e)):t=!1,ci(e,n),bw(e,r,s),Vd(e,r,s,n),jd(null,e,r,!0,t,n);case 19:return jw(t,e,n);case 22:return Ow(t,e,n)}throw Error(F(156,e.tag))};function eE(t,e){return C0(t,e)}function Rk(t,e,n,r){this.tag=t,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=e,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=r,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function zt(t,e,n,r){return new Rk(t,e,n,r)}function vp(t){return t=t.prototype,!(!t||!t.isReactComponent)}function bk(t){if(typeof t=="function")return vp(t)?1:0;if(t!=null){if(t=t.$$typeof,t===jf)return 11;if(t===Uf)return 14}return 2}function Ir(t,e){var n=t.alternate;return n===null?(n=zt(t.tag,e,t.key,t.mode),n.elementType=t.elementType,n.type=t.type,n.stateNode=t.stateNode,n.alternate=t,t.alternate=n):(n.pendingProps=e,n.type=t.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=t.flags&14680064,n.childLanes=t.childLanes,n.lanes=t.lanes,n.child=t.child,n.memoizedProps=t.memoizedProps,n.memoizedState=t.memoizedState,n.updateQueue=t.updateQueue,e=t.dependencies,n.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext},n.sibling=t.sibling,n.index=t.index,n.ref=t.ref,n}function Hl(t,e,n,r,s,i){var o=2;if(r=t,typeof t=="function")vp(t)&&(o=1);else if(typeof t=="string")o=5;else e:switch(t){case Ks:return ms(n.children,s,i,e);case Mf:o=8,s|=8;break;case id:return t=zt(12,n,e,s|2),t.elementType=id,t.lanes=i,t;case od:return t=zt(13,n,e,s),t.elementType=od,t.lanes=i,t;case ad:return t=zt(19,n,e,s),t.elementType=ad,t.lanes=i,t;case c0:return oc(n,s,i,e);default:if(typeof t=="object"&&t!==null)switch(t.$$typeof){case l0:o=10;break e;case u0:o=9;break e;case jf:o=11;break e;case Uf:o=14;break e;case or:o=16,r=null;break e}throw Error(F(130,t==null?t:typeof t,""))}return e=zt(o,n,e,s),e.elementType=t,e.type=r,e.lanes=i,e}function ms(t,e,n,r){return t=zt(7,t,r,e),t.lanes=n,t}function oc(t,e,n,r){return t=zt(22,t,r,e),t.elementType=c0,t.lanes=n,t.stateNode={isHidden:!1},t}function Mh(t,e,n){return t=zt(6,t,null,e),t.lanes=n,t}function jh(t,e,n){return e=zt(4,t.children!==null?t.children:[],t.key,e),e.lanes=n,e.stateNode={containerInfo:t.containerInfo,pendingChildren:null,implementation:t.implementation},e}function Pk(t,e,n,r,s){this.tag=e,this.containerInfo=t,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=_h(0),this.expirationTimes=_h(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=_h(0),this.identifierPrefix=r,this.onRecoverableError=s,this.mutableSourceEagerHydrationData=null}function wp(t,e,n,r,s,i,o,l,u){return t=new Pk(t,e,n,l,u),e===1?(e=1,i===!0&&(e|=8)):e=0,i=zt(3,null,null,e),t.current=i,i.stateNode=t,i.memoizedState={element:r,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},rp(i),t}function Nk(t,e,n){var r=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:Gs,key:r==null?null:""+r,children:t,containerInfo:e,implementation:n}}function tE(t){if(!t)return Dr;t=t._reactInternals;e:{if(Rs(t)!==t||t.tag!==1)throw Error(F(170));var e=t;do{switch(e.tag){case 3:e=e.stateNode.context;break e;case 1:if(It(e.type)){e=e.stateNode.__reactInternalMemoizedMergedChildContext;break e}}e=e.return}while(e!==null);throw Error(F(171))}if(t.tag===1){var n=t.type;if(It(n))return tw(t,n,e)}return e}function nE(t,e,n,r,s,i,o,l,u){return t=wp(n,r,!0,t,s,i,o,l,u),t.context=tE(null),n=t.current,r=pt(),s=xr(n),i=Ln(r,s),i.callback=e??null,Er(n,i,s),t.current.lanes=s,Ca(t,s,r),St(t,r),t}function ac(t,e,n,r){var s=e.current,i=pt(),o=xr(s);return n=tE(n),e.context===null?e.context=n:e.pendingContext=n,e=Ln(i,o),e.payload={element:t},r=r===void 0?null:r,r!==null&&(e.callback=r),t=Er(s,e,o),t!==null&&(tn(t,s,o,i),Ul(t,s,o)),o}function ku(t){if(t=t.current,!t.child)return null;switch(t.child.tag){case 5:return t.child.stateNode;default:return t.child.stateNode}}function Fy(t,e){if(t=t.memoizedState,t!==null&&t.dehydrated!==null){var n=t.retryLane;t.retryLane=n!==0&&n<e?n:e}}function Ep(t,e){Fy(t,e),(t=t.alternate)&&Fy(t,e)}function Dk(){return null}var rE=typeof reportError=="function"?reportError:function(t){console.error(t)};function Tp(t){this._internalRoot=t}lc.prototype.render=Tp.prototype.render=function(t){var e=this._internalRoot;if(e===null)throw Error(F(409));ac(t,e,null,null)};lc.prototype.unmount=Tp.prototype.unmount=function(){var t=this._internalRoot;if(t!==null){this._internalRoot=null;var e=t.containerInfo;Es(function(){ac(null,t,null,null)}),e[Bn]=null}};function lc(t){this._internalRoot=t}lc.prototype.unstable_scheduleHydration=function(t){if(t){var e=O0();t={blockedOn:null,target:t,priority:e};for(var n=0;n<lr.length&&e!==0&&e<lr[n].priority;n++);lr.splice(n,0,t),n===0&&L0(t)}};function xp(t){return!(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11)}function uc(t){return!(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11&&(t.nodeType!==8||t.nodeValue!==" react-mount-point-unstable "))}function zy(){}function Ok(t,e,n,r,s){if(s){if(typeof r=="function"){var i=r;r=function(){var c=ku(o);i.call(c)}}var o=nE(e,r,t,0,null,!1,!1,"",zy);return t._reactRootContainer=o,t[Bn]=o.current,ta(t.nodeType===8?t.parentNode:t),Es(),o}for(;s=t.lastChild;)t.removeChild(s);if(typeof r=="function"){var l=r;r=function(){var c=ku(u);l.call(c)}}var u=wp(t,0,!1,null,null,!1,!1,"",zy);return t._reactRootContainer=u,t[Bn]=u.current,ta(t.nodeType===8?t.parentNode:t),Es(function(){ac(e,u,n,r)}),u}function cc(t,e,n,r,s){var i=n._reactRootContainer;if(i){var o=i;if(typeof s=="function"){var l=s;s=function(){var u=ku(o);l.call(u)}}ac(e,o,t,s)}else o=Ok(n,e,t,s,r);return ku(o)}N0=function(t){switch(t.tag){case 3:var e=t.stateNode;if(e.current.memoizedState.isDehydrated){var n=Io(e.pendingLanes);n!==0&&(Bf(e,n|1),St(e,De()),!(oe&6)&&(xi=De()+500,Gr()))}break;case 13:Es(function(){var r=$n(t,1);if(r!==null){var s=pt();tn(r,t,1,s)}}),Ep(t,1)}};$f=function(t){if(t.tag===13){var e=$n(t,134217728);if(e!==null){var n=pt();tn(e,t,134217728,n)}Ep(t,134217728)}};D0=function(t){if(t.tag===13){var e=xr(t),n=$n(t,e);if(n!==null){var r=pt();tn(n,t,e,r)}Ep(t,e)}};O0=function(){return ue};V0=function(t,e){var n=ue;try{return ue=t,e()}finally{ue=n}};yd=function(t,e,n){switch(e){case"input":if(cd(t,n),e=n.name,n.type==="radio"&&e!=null){for(n=t;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+e)+'][type="radio"]'),e=0;e<n.length;e++){var r=n[e];if(r!==t&&r.form===t.form){var s=ec(r);if(!s)throw Error(F(90));d0(r),cd(r,s)}}}break;case"textarea":p0(t,n);break;case"select":e=n.value,e!=null&&oi(t,!!n.multiple,e,!1)}};E0=gp;T0=Es;var Vk={usingClientEntryPoint:!1,Events:[Ra,Js,ec,v0,w0,gp]},vo={findFiberByHostInstance:us,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},Lk={bundleType:vo.bundleType,version:vo.version,rendererPackageName:vo.rendererPackageName,rendererConfig:vo.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:Qn.ReactCurrentDispatcher,findHostInstanceByFiber:function(t){return t=S0(t),t===null?null:t.stateNode},findFiberByHostInstance:vo.findFiberByHostInstance||Dk,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var xl=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!xl.isDisabled&&xl.supportsFiber)try{Xu=xl.inject(Lk),gn=xl}catch{}}Vt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Vk;Vt.createPortal=function(t,e){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!xp(e))throw Error(F(200));return Nk(t,e,null,n)};Vt.createRoot=function(t,e){if(!xp(t))throw Error(F(299));var n=!1,r="",s=rE;return e!=null&&(e.unstable_strictMode===!0&&(n=!0),e.identifierPrefix!==void 0&&(r=e.identifierPrefix),e.onRecoverableError!==void 0&&(s=e.onRecoverableError)),e=wp(t,1,!1,null,null,n,!1,r,s),t[Bn]=e.current,ta(t.nodeType===8?t.parentNode:t),new Tp(e)};Vt.findDOMNode=function(t){if(t==null)return null;if(t.nodeType===1)return t;var e=t._reactInternals;if(e===void 0)throw typeof t.render=="function"?Error(F(188)):(t=Object.keys(t).join(","),Error(F(268,t)));return t=S0(e),t=t===null?null:t.stateNode,t};Vt.flushSync=function(t){return Es(t)};Vt.hydrate=function(t,e,n){if(!uc(e))throw Error(F(200));return cc(null,t,e,!0,n)};Vt.hydrateRoot=function(t,e,n){if(!xp(t))throw Error(F(405));var r=n!=null&&n.hydratedSources||null,s=!1,i="",o=rE;if(n!=null&&(n.unstable_strictMode===!0&&(s=!0),n.identifierPrefix!==void 0&&(i=n.identifierPrefix),n.onRecoverableError!==void 0&&(o=n.onRecoverableError)),e=nE(e,null,t,1,n??null,s,!1,i,o),t[Bn]=e.current,ta(t),r)for(t=0;t<r.length;t++)n=r[t],s=n._getVersion,s=s(n._source),e.mutableSourceEagerHydrationData==null?e.mutableSourceEagerHydrationData=[n,s]:e.mutableSourceEagerHydrationData.push(n,s);return new lc(e)};Vt.render=function(t,e,n){if(!uc(e))throw Error(F(200));return cc(null,t,e,!1,n)};Vt.unmountComponentAtNode=function(t){if(!uc(t))throw Error(F(40));return t._reactRootContainer?(Es(function(){cc(null,null,t,!1,function(){t._reactRootContainer=null,t[Bn]=null})}),!0):!1};Vt.unstable_batchedUpdates=gp;Vt.unstable_renderSubtreeIntoContainer=function(t,e,n,r){if(!uc(n))throw Error(F(200));if(t==null||t._reactInternals===void 0)throw Error(F(38));return cc(t,e,n,!1,r)};Vt.version="18.3.1-next-f1338f8080-20240426";function sE(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(sE)}catch(t){console.error(t)}}sE(),s0.exports=Vt;var Mk=s0.exports,iE,By=Mk;iE=By.createRoot,By.hydrateRoot;/**
 * @remix-run/router v1.23.2
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function ca(){return ca=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},ca.apply(this,arguments)}var gr;(function(t){t.Pop="POP",t.Push="PUSH",t.Replace="REPLACE"})(gr||(gr={}));const $y="popstate";function jk(t){t===void 0&&(t={});function e(r,s){let{pathname:i,search:o,hash:l}=r.location;return Xd("",{pathname:i,search:o,hash:l},s.state&&s.state.usr||null,s.state&&s.state.key||"default")}function n(r,s){return typeof s=="string"?s:Cu(s)}return Fk(e,n,null,t)}function ke(t,e){if(t===!1||t===null||typeof t>"u")throw new Error(e)}function Ip(t,e){if(!t){typeof console<"u"&&console.warn(e);try{throw new Error(e)}catch{}}}function Uk(){return Math.random().toString(36).substr(2,8)}function qy(t,e){return{usr:t.state,key:t.key,idx:e}}function Xd(t,e,n,r){return n===void 0&&(n=null),ca({pathname:typeof t=="string"?t:t.pathname,search:"",hash:""},typeof e=="string"?Vi(e):e,{state:n,key:e&&e.key||r||Uk()})}function Cu(t){let{pathname:e="/",search:n="",hash:r=""}=t;return n&&n!=="?"&&(e+=n.charAt(0)==="?"?n:"?"+n),r&&r!=="#"&&(e+=r.charAt(0)==="#"?r:"#"+r),e}function Vi(t){let e={};if(t){let n=t.indexOf("#");n>=0&&(e.hash=t.substr(n),t=t.substr(0,n));let r=t.indexOf("?");r>=0&&(e.search=t.substr(r),t=t.substr(0,r)),t&&(e.pathname=t)}return e}function Fk(t,e,n,r){r===void 0&&(r={});let{window:s=document.defaultView,v5Compat:i=!1}=r,o=s.history,l=gr.Pop,u=null,c=f();c==null&&(c=0,o.replaceState(ca({},o.state,{idx:c}),""));function f(){return(o.state||{idx:null}).idx}function p(){l=gr.Pop;let P=f(),I=P==null?null:P-c;c=P,u&&u({action:l,location:b.location,delta:I})}function g(P,I){l=gr.Push;let v=Xd(b.location,P,I);c=f()+1;let C=qy(v,c),D=b.createHref(v);try{o.pushState(C,"",D)}catch(j){if(j instanceof DOMException&&j.name==="DataCloneError")throw j;s.location.assign(D)}i&&u&&u({action:l,location:b.location,delta:1})}function w(P,I){l=gr.Replace;let v=Xd(b.location,P,I);c=f();let C=qy(v,c),D=b.createHref(v);o.replaceState(C,"",D),i&&u&&u({action:l,location:b.location,delta:0})}function S(P){let I=s.location.origin!=="null"?s.location.origin:s.location.href,v=typeof P=="string"?P:Cu(P);return v=v.replace(/ $/,"%20"),ke(I,"No window.location.(origin|href) available to create URL for href: "+v),new URL(v,I)}let b={get action(){return l},get location(){return t(s,o)},listen(P){if(u)throw new Error("A history only accepts one active listener");return s.addEventListener($y,p),u=P,()=>{s.removeEventListener($y,p),u=null}},createHref(P){return e(s,P)},createURL:S,encodeLocation(P){let I=S(P);return{pathname:I.pathname,search:I.search,hash:I.hash}},push:g,replace:w,go(P){return o.go(P)}};return b}var Hy;(function(t){t.data="data",t.deferred="deferred",t.redirect="redirect",t.error="error"})(Hy||(Hy={}));function zk(t,e,n){return n===void 0&&(n="/"),Bk(t,e,n)}function Bk(t,e,n,r){let s=typeof e=="string"?Vi(e):e,i=Ii(s.pathname||"/",n);if(i==null)return null;let o=oE(t);$k(o);let l=null;for(let u=0;l==null&&u<o.length;++u){let c=eC(i);l=Jk(o[u],c)}return l}function oE(t,e,n,r){e===void 0&&(e=[]),n===void 0&&(n=[]),r===void 0&&(r="");let s=(i,o,l)=>{let u={relativePath:l===void 0?i.path||"":l,caseSensitive:i.caseSensitive===!0,childrenIndex:o,route:i};u.relativePath.startsWith("/")&&(ke(u.relativePath.startsWith(r),'Absolute route path "'+u.relativePath+'" nested under path '+('"'+r+'" is not valid. An absolute child route path ')+"must start with the combined path of all its parent routes."),u.relativePath=u.relativePath.slice(r.length));let c=Sr([r,u.relativePath]),f=n.concat(u);i.children&&i.children.length>0&&(ke(i.index!==!0,"Index routes must not have child routes. Please remove "+('all child routes from route path "'+c+'".')),oE(i.children,e,f,c)),!(i.path==null&&!i.index)&&e.push({path:c,score:Xk(c,i.index),routesMeta:f})};return t.forEach((i,o)=>{var l;if(i.path===""||!((l=i.path)!=null&&l.includes("?")))s(i,o);else for(let u of aE(i.path))s(i,o,u)}),e}function aE(t){let e=t.split("/");if(e.length===0)return[];let[n,...r]=e,s=n.endsWith("?"),i=n.replace(/\?$/,"");if(r.length===0)return s?[i,""]:[i];let o=aE(r.join("/")),l=[];return l.push(...o.map(u=>u===""?i:[i,u].join("/"))),s&&l.push(...o),l.map(u=>t.startsWith("/")&&u===""?"/":u)}function $k(t){t.sort((e,n)=>e.score!==n.score?n.score-e.score:Yk(e.routesMeta.map(r=>r.childrenIndex),n.routesMeta.map(r=>r.childrenIndex)))}const qk=/^:[\w-]+$/,Hk=3,Wk=2,Gk=1,Kk=10,Qk=-2,Wy=t=>t==="*";function Xk(t,e){let n=t.split("/"),r=n.length;return n.some(Wy)&&(r+=Qk),e&&(r+=Wk),n.filter(s=>!Wy(s)).reduce((s,i)=>s+(qk.test(i)?Hk:i===""?Gk:Kk),r)}function Yk(t,e){return t.length===e.length&&t.slice(0,-1).every((r,s)=>r===e[s])?t[t.length-1]-e[e.length-1]:0}function Jk(t,e,n){let{routesMeta:r}=t,s={},i="/",o=[];for(let l=0;l<r.length;++l){let u=r[l],c=l===r.length-1,f=i==="/"?e:e.slice(i.length)||"/",p=Yd({path:u.relativePath,caseSensitive:u.caseSensitive,end:c},f),g=u.route;if(!p)return null;Object.assign(s,p.params),o.push({params:s,pathname:Sr([i,p.pathname]),pathnameBase:iC(Sr([i,p.pathnameBase])),route:g}),p.pathnameBase!=="/"&&(i=Sr([i,p.pathnameBase]))}return o}function Yd(t,e){typeof t=="string"&&(t={path:t,caseSensitive:!1,end:!0});let[n,r]=Zk(t.path,t.caseSensitive,t.end),s=e.match(n);if(!s)return null;let i=s[0],o=i.replace(/(.)\/+$/,"$1"),l=s.slice(1);return{params:r.reduce((c,f,p)=>{let{paramName:g,isOptional:w}=f;if(g==="*"){let b=l[p]||"";o=i.slice(0,i.length-b.length).replace(/(.)\/+$/,"$1")}const S=l[p];return w&&!S?c[g]=void 0:c[g]=(S||"").replace(/%2F/g,"/"),c},{}),pathname:i,pathnameBase:o,pattern:t}}function Zk(t,e,n){e===void 0&&(e=!1),n===void 0&&(n=!0),Ip(t==="*"||!t.endsWith("*")||t.endsWith("/*"),'Route path "'+t+'" will be treated as if it were '+('"'+t.replace(/\*$/,"/*")+'" because the `*` character must ')+"always follow a `/` in the pattern. To get rid of this warning, "+('please change the route path to "'+t.replace(/\*$/,"/*")+'".'));let r=[],s="^"+t.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(o,l,u)=>(r.push({paramName:l,isOptional:u!=null}),u?"/?([^\\/]+)?":"/([^\\/]+)"));return t.endsWith("*")?(r.push({paramName:"*"}),s+=t==="*"||t==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):n?s+="\\/*$":t!==""&&t!=="/"&&(s+="(?:(?=\\/|$))"),[new RegExp(s,e?void 0:"i"),r]}function eC(t){try{return t.split("/").map(e=>decodeURIComponent(e).replace(/\//g,"%2F")).join("/")}catch(e){return Ip(!1,'The URL path "'+t+'" could not be decoded because it is is a malformed URL segment. This is probably due to a bad percent '+("encoding ("+e+").")),t}}function Ii(t,e){if(e==="/")return t;if(!t.toLowerCase().startsWith(e.toLowerCase()))return null;let n=e.endsWith("/")?e.length-1:e.length,r=t.charAt(n);return r&&r!=="/"?null:t.slice(n)||"/"}const tC=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,nC=t=>tC.test(t);function rC(t,e){e===void 0&&(e="/");let{pathname:n,search:r="",hash:s=""}=typeof t=="string"?Vi(t):t,i;if(n)if(nC(n))i=n;else{if(n.includes("//")){let o=n;n=n.replace(/\/\/+/g,"/"),Ip(!1,"Pathnames cannot have embedded double slashes - normalizing "+(o+" -> "+n))}n.startsWith("/")?i=Gy(n.substring(1),"/"):i=Gy(n,e)}else i=e;return{pathname:i,search:oC(r),hash:aC(s)}}function Gy(t,e){let n=e.replace(/\/+$/,"").split("/");return t.split("/").forEach(s=>{s===".."?n.length>1&&n.pop():s!=="."&&n.push(s)}),n.length>1?n.join("/"):"/"}function Uh(t,e,n,r){return"Cannot include a '"+t+"' character in a manually specified "+("`to."+e+"` field ["+JSON.stringify(r)+"].  Please separate it out to the ")+("`to."+n+"` field. Alternatively you may provide the full path as ")+'a string in <Link to="..."> and the router will parse it for you.'}function sC(t){return t.filter((e,n)=>n===0||e.route.path&&e.route.path.length>0)}function Sp(t,e){let n=sC(t);return e?n.map((r,s)=>s===n.length-1?r.pathname:r.pathnameBase):n.map(r=>r.pathnameBase)}function kp(t,e,n,r){r===void 0&&(r=!1);let s;typeof t=="string"?s=Vi(t):(s=ca({},t),ke(!s.pathname||!s.pathname.includes("?"),Uh("?","pathname","search",s)),ke(!s.pathname||!s.pathname.includes("#"),Uh("#","pathname","hash",s)),ke(!s.search||!s.search.includes("#"),Uh("#","search","hash",s)));let i=t===""||s.pathname==="",o=i?"/":s.pathname,l;if(o==null)l=n;else{let p=e.length-1;if(!r&&o.startsWith("..")){let g=o.split("/");for(;g[0]==="..";)g.shift(),p-=1;s.pathname=g.join("/")}l=p>=0?e[p]:"/"}let u=rC(s,l),c=o&&o!=="/"&&o.endsWith("/"),f=(i||o===".")&&n.endsWith("/");return!u.pathname.endsWith("/")&&(c||f)&&(u.pathname+="/"),u}const Sr=t=>t.join("/").replace(/\/\/+/g,"/"),iC=t=>t.replace(/\/+$/,"").replace(/^\/*/,"/"),oC=t=>!t||t==="?"?"":t.startsWith("?")?t:"?"+t,aC=t=>!t||t==="#"?"":t.startsWith("#")?t:"#"+t;function lC(t){return t!=null&&typeof t.status=="number"&&typeof t.statusText=="string"&&typeof t.internal=="boolean"&&"data"in t}const lE=["post","put","patch","delete"];new Set(lE);const uC=["get",...lE];new Set(uC);/**
 * React Router v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function ha(){return ha=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},ha.apply(this,arguments)}const hc=O.createContext(null),uE=O.createContext(null),Xn=O.createContext(null),dc=O.createContext(null),Kr=O.createContext({outlet:null,matches:[],isDataRoute:!1}),cE=O.createContext(null);function cC(t,e){let{relative:n}=e===void 0?{}:e;Li()||ke(!1);let{basename:r,navigator:s}=O.useContext(Xn),{hash:i,pathname:o,search:l}=fc(t,{relative:n}),u=o;return r!=="/"&&(u=o==="/"?r:Sr([r,o])),s.createHref({pathname:u,search:l,hash:i})}function Li(){return O.useContext(dc)!=null}function Mi(){return Li()||ke(!1),O.useContext(dc).location}function hE(t){O.useContext(Xn).static||O.useLayoutEffect(t)}function dE(){let{isDataRoute:t}=O.useContext(Kr);return t?xC():hC()}function hC(){Li()||ke(!1);let t=O.useContext(hc),{basename:e,future:n,navigator:r}=O.useContext(Xn),{matches:s}=O.useContext(Kr),{pathname:i}=Mi(),o=JSON.stringify(Sp(s,n.v7_relativeSplatPath)),l=O.useRef(!1);return hE(()=>{l.current=!0}),O.useCallback(function(c,f){if(f===void 0&&(f={}),!l.current)return;if(typeof c=="number"){r.go(c);return}let p=kp(c,JSON.parse(o),i,f.relative==="path");t==null&&e!=="/"&&(p.pathname=p.pathname==="/"?e:Sr([e,p.pathname])),(f.replace?r.replace:r.push)(p,f.state,f)},[e,r,o,i,t])}function fc(t,e){let{relative:n}=e===void 0?{}:e,{future:r}=O.useContext(Xn),{matches:s}=O.useContext(Kr),{pathname:i}=Mi(),o=JSON.stringify(Sp(s,r.v7_relativeSplatPath));return O.useMemo(()=>kp(t,JSON.parse(o),i,n==="path"),[t,o,i,n])}function dC(t,e){return fC(t,e)}function fC(t,e,n,r){Li()||ke(!1);let{navigator:s}=O.useContext(Xn),{matches:i}=O.useContext(Kr),o=i[i.length-1],l=o?o.params:{};o&&o.pathname;let u=o?o.pathnameBase:"/";o&&o.route;let c=Mi(),f;if(e){var p;let P=typeof e=="string"?Vi(e):e;u==="/"||(p=P.pathname)!=null&&p.startsWith(u)||ke(!1),f=P}else f=c;let g=f.pathname||"/",w=g;if(u!=="/"){let P=u.replace(/^\//,"").split("/");w="/"+g.replace(/^\//,"").split("/").slice(P.length).join("/")}let S=zk(t,{pathname:w}),b=_C(S&&S.map(P=>Object.assign({},P,{params:Object.assign({},l,P.params),pathname:Sr([u,s.encodeLocation?s.encodeLocation(P.pathname).pathname:P.pathname]),pathnameBase:P.pathnameBase==="/"?u:Sr([u,s.encodeLocation?s.encodeLocation(P.pathnameBase).pathname:P.pathnameBase])})),i,n,r);return e&&b?O.createElement(dc.Provider,{value:{location:ha({pathname:"/",search:"",hash:"",state:null,key:"default"},f),navigationType:gr.Pop}},b):b}function pC(){let t=TC(),e=lC(t)?t.status+" "+t.statusText:t instanceof Error?t.message:JSON.stringify(t),n=t instanceof Error?t.stack:null,s={padding:"0.5rem",backgroundColor:"rgba(200,200,200, 0.5)"};return O.createElement(O.Fragment,null,O.createElement("h2",null,"Unexpected Application Error!"),O.createElement("h3",{style:{fontStyle:"italic"}},e),n?O.createElement("pre",{style:s},n):null,null)}const mC=O.createElement(pC,null);class gC extends O.Component{constructor(e){super(e),this.state={location:e.location,revalidation:e.revalidation,error:e.error}}static getDerivedStateFromError(e){return{error:e}}static getDerivedStateFromProps(e,n){return n.location!==e.location||n.revalidation!=="idle"&&e.revalidation==="idle"?{error:e.error,location:e.location,revalidation:e.revalidation}:{error:e.error!==void 0?e.error:n.error,location:n.location,revalidation:e.revalidation||n.revalidation}}componentDidCatch(e,n){console.error("React Router caught the following error during render",e,n)}render(){return this.state.error!==void 0?O.createElement(Kr.Provider,{value:this.props.routeContext},O.createElement(cE.Provider,{value:this.state.error,children:this.props.component})):this.props.children}}function yC(t){let{routeContext:e,match:n,children:r}=t,s=O.useContext(hc);return s&&s.static&&s.staticContext&&(n.route.errorElement||n.route.ErrorBoundary)&&(s.staticContext._deepestRenderedBoundaryId=n.route.id),O.createElement(Kr.Provider,{value:e},r)}function _C(t,e,n,r){var s;if(e===void 0&&(e=[]),n===void 0&&(n=null),r===void 0&&(r=null),t==null){var i;if(!n)return null;if(n.errors)t=n.matches;else if((i=r)!=null&&i.v7_partialHydration&&e.length===0&&!n.initialized&&n.matches.length>0)t=n.matches;else return null}let o=t,l=(s=n)==null?void 0:s.errors;if(l!=null){let f=o.findIndex(p=>p.route.id&&(l==null?void 0:l[p.route.id])!==void 0);f>=0||ke(!1),o=o.slice(0,Math.min(o.length,f+1))}let u=!1,c=-1;if(n&&r&&r.v7_partialHydration)for(let f=0;f<o.length;f++){let p=o[f];if((p.route.HydrateFallback||p.route.hydrateFallbackElement)&&(c=f),p.route.id){let{loaderData:g,errors:w}=n,S=p.route.loader&&g[p.route.id]===void 0&&(!w||w[p.route.id]===void 0);if(p.route.lazy||S){u=!0,c>=0?o=o.slice(0,c+1):o=[o[0]];break}}}return o.reduceRight((f,p,g)=>{let w,S=!1,b=null,P=null;n&&(w=l&&p.route.id?l[p.route.id]:void 0,b=p.route.errorElement||mC,u&&(c<0&&g===0?(IC("route-fallback"),S=!0,P=null):c===g&&(S=!0,P=p.route.hydrateFallbackElement||null)));let I=e.concat(o.slice(0,g+1)),v=()=>{let C;return w?C=b:S?C=P:p.route.Component?C=O.createElement(p.route.Component,null):p.route.element?C=p.route.element:C=f,O.createElement(yC,{match:p,routeContext:{outlet:f,matches:I,isDataRoute:n!=null},children:C})};return n&&(p.route.ErrorBoundary||p.route.errorElement||g===0)?O.createElement(gC,{location:n.location,revalidation:n.revalidation,component:b,error:w,children:v(),routeContext:{outlet:null,matches:I,isDataRoute:!0}}):v()},null)}var fE=function(t){return t.UseBlocker="useBlocker",t.UseRevalidator="useRevalidator",t.UseNavigateStable="useNavigate",t}(fE||{}),pE=function(t){return t.UseBlocker="useBlocker",t.UseLoaderData="useLoaderData",t.UseActionData="useActionData",t.UseRouteError="useRouteError",t.UseNavigation="useNavigation",t.UseRouteLoaderData="useRouteLoaderData",t.UseMatches="useMatches",t.UseRevalidator="useRevalidator",t.UseNavigateStable="useNavigate",t.UseRouteId="useRouteId",t}(pE||{});function vC(t){let e=O.useContext(hc);return e||ke(!1),e}function wC(t){let e=O.useContext(uE);return e||ke(!1),e}function EC(t){let e=O.useContext(Kr);return e||ke(!1),e}function mE(t){let e=EC(),n=e.matches[e.matches.length-1];return n.route.id||ke(!1),n.route.id}function TC(){var t;let e=O.useContext(cE),n=wC(),r=mE();return e!==void 0?e:(t=n.errors)==null?void 0:t[r]}function xC(){let{router:t}=vC(fE.UseNavigateStable),e=mE(pE.UseNavigateStable),n=O.useRef(!1);return hE(()=>{n.current=!0}),O.useCallback(function(s,i){i===void 0&&(i={}),n.current&&(typeof s=="number"?t.navigate(s):t.navigate(s,ha({fromRouteId:e},i)))},[t,e])}const Ky={};function IC(t,e,n){Ky[t]||(Ky[t]=!0)}function SC(t,e){t==null||t.v7_startTransition,t==null||t.v7_relativeSplatPath}function Qy(t){let{to:e,replace:n,state:r,relative:s}=t;Li()||ke(!1);let{future:i,static:o}=O.useContext(Xn),{matches:l}=O.useContext(Kr),{pathname:u}=Mi(),c=dE(),f=kp(e,Sp(l,i.v7_relativeSplatPath),u,s==="path"),p=JSON.stringify(f);return O.useEffect(()=>c(JSON.parse(p),{replace:n,state:r,relative:s}),[c,p,s,n,r]),null}function jt(t){ke(!1)}function kC(t){let{basename:e="/",children:n=null,location:r,navigationType:s=gr.Pop,navigator:i,static:o=!1,future:l}=t;Li()&&ke(!1);let u=e.replace(/^\/*/,"/"),c=O.useMemo(()=>({basename:u,navigator:i,static:o,future:ha({v7_relativeSplatPath:!1},l)}),[u,l,i,o]);typeof r=="string"&&(r=Vi(r));let{pathname:f="/",search:p="",hash:g="",state:w=null,key:S="default"}=r,b=O.useMemo(()=>{let P=Ii(f,u);return P==null?null:{location:{pathname:P,search:p,hash:g,state:w,key:S},navigationType:s}},[u,f,p,g,w,S,s]);return b==null?null:O.createElement(Xn.Provider,{value:c},O.createElement(dc.Provider,{children:n,value:b}))}function gE(t){let{children:e,location:n}=t;return dC(Jd(e),n)}new Promise(()=>{});function Jd(t,e){e===void 0&&(e=[]);let n=[];return O.Children.forEach(t,(r,s)=>{if(!O.isValidElement(r))return;let i=[...e,s];if(r.type===O.Fragment){n.push.apply(n,Jd(r.props.children,i));return}r.type!==jt&&ke(!1),!r.props.index||!r.props.children||ke(!1);let o={id:r.props.id||i.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,loader:r.props.loader,action:r.props.action,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(o.children=Jd(r.props.children,i)),n.push(o)}),n}/**
 * React Router DOM v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function Au(){return Au=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},Au.apply(this,arguments)}function yE(t,e){if(t==null)return{};var n={},r=Object.keys(t),s,i;for(i=0;i<r.length;i++)s=r[i],!(e.indexOf(s)>=0)&&(n[s]=t[s]);return n}function CC(t){return!!(t.metaKey||t.altKey||t.ctrlKey||t.shiftKey)}function AC(t,e){return t.button===0&&(!e||e==="_self")&&!CC(t)}const RC=["onClick","relative","reloadDocument","replace","state","target","to","preventScrollReset","viewTransition"],bC=["aria-current","caseSensitive","className","end","style","to","viewTransition","children"],PC="6";try{window.__reactRouterVersion=PC}catch{}const NC=O.createContext({isTransitioning:!1}),DC="startTransition",Xy=k1[DC];function OC(t){let{basename:e,children:n,future:r,window:s}=t,i=O.useRef();i.current==null&&(i.current=jk({window:s,v5Compat:!0}));let o=i.current,[l,u]=O.useState({action:o.action,location:o.location}),{v7_startTransition:c}=r||{},f=O.useCallback(p=>{c&&Xy?Xy(()=>u(p)):u(p)},[u,c]);return O.useLayoutEffect(()=>o.listen(f),[o,f]),O.useEffect(()=>SC(r),[r]),O.createElement(kC,{basename:e,children:n,location:l.location,navigationType:l.action,navigator:o,future:r})}const VC=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u",LC=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,MC=O.forwardRef(function(e,n){let{onClick:r,relative:s,reloadDocument:i,replace:o,state:l,target:u,to:c,preventScrollReset:f,viewTransition:p}=e,g=yE(e,RC),{basename:w}=O.useContext(Xn),S,b=!1;if(typeof c=="string"&&LC.test(c)&&(S=c,VC))try{let C=new URL(window.location.href),D=c.startsWith("//")?new URL(C.protocol+c):new URL(c),j=Ii(D.pathname,w);D.origin===C.origin&&j!=null?c=j+D.search+D.hash:b=!0}catch{}let P=cC(c,{relative:s}),I=FC(c,{replace:o,state:l,target:u,preventScrollReset:f,relative:s,viewTransition:p});function v(C){r&&r(C),C.defaultPrevented||I(C)}return O.createElement("a",Au({},g,{href:S||P,onClick:b||i?r:v,ref:n,target:u}))}),jC=O.forwardRef(function(e,n){let{"aria-current":r="page",caseSensitive:s=!1,className:i="",end:o=!1,style:l,to:u,viewTransition:c,children:f}=e,p=yE(e,bC),g=fc(u,{relative:p.relative}),w=Mi(),S=O.useContext(uE),{navigator:b,basename:P}=O.useContext(Xn),I=S!=null&&zC(g)&&c===!0,v=b.encodeLocation?b.encodeLocation(g).pathname:g.pathname,C=w.pathname,D=S&&S.navigation&&S.navigation.location?S.navigation.location.pathname:null;s||(C=C.toLowerCase(),D=D?D.toLowerCase():null,v=v.toLowerCase()),D&&P&&(D=Ii(D,P)||D);const j=v!=="/"&&v.endsWith("/")?v.length-1:v.length;let L=C===v||!o&&C.startsWith(v)&&C.charAt(j)==="/",E=D!=null&&(D===v||!o&&D.startsWith(v)&&D.charAt(v.length)==="/"),_={isActive:L,isPending:E,isTransitioning:I},x=L?r:void 0,R;typeof i=="function"?R=i(_):R=[i,L?"active":null,E?"pending":null,I?"transitioning":null].filter(Boolean).join(" ");let T=typeof l=="function"?l(_):l;return O.createElement(MC,Au({},p,{"aria-current":x,className:R,ref:n,style:T,to:u,viewTransition:c}),typeof f=="function"?f(_):f)});var Zd;(function(t){t.UseScrollRestoration="useScrollRestoration",t.UseSubmit="useSubmit",t.UseSubmitFetcher="useSubmitFetcher",t.UseFetcher="useFetcher",t.useViewTransitionState="useViewTransitionState"})(Zd||(Zd={}));var Yy;(function(t){t.UseFetcher="useFetcher",t.UseFetchers="useFetchers",t.UseScrollRestoration="useScrollRestoration"})(Yy||(Yy={}));function UC(t){let e=O.useContext(hc);return e||ke(!1),e}function FC(t,e){let{target:n,replace:r,state:s,preventScrollReset:i,relative:o,viewTransition:l}=e===void 0?{}:e,u=dE(),c=Mi(),f=fc(t,{relative:o});return O.useCallback(p=>{if(AC(p,n)){p.preventDefault();let g=r!==void 0?r:Cu(c)===Cu(f);u(t,{replace:g,state:s,preventScrollReset:i,relative:o,viewTransition:l})}},[c,u,f,r,s,n,t,i,o,l])}function zC(t,e){e===void 0&&(e={});let n=O.useContext(NC);n==null&&ke(!1);let{basename:r}=UC(Zd.useViewTransitionState),s=fc(t,{relative:e.relative});if(!n.isTransitioning)return!1;let i=Ii(n.currentLocation.pathname,r)||n.currentLocation.pathname,o=Ii(n.nextLocation.pathname,r)||n.nextLocation.pathname;return Yd(s.pathname,o)!=null||Yd(s.pathname,i)!=null}const BC=()=>{};var Jy={};/**
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
 */const _E=function(t){const e=[];let n=0;for(let r=0;r<t.length;r++){let s=t.charCodeAt(r);s<128?e[n++]=s:s<2048?(e[n++]=s>>6|192,e[n++]=s&63|128):(s&64512)===55296&&r+1<t.length&&(t.charCodeAt(r+1)&64512)===56320?(s=65536+((s&1023)<<10)+(t.charCodeAt(++r)&1023),e[n++]=s>>18|240,e[n++]=s>>12&63|128,e[n++]=s>>6&63|128,e[n++]=s&63|128):(e[n++]=s>>12|224,e[n++]=s>>6&63|128,e[n++]=s&63|128)}return e},$C=function(t){const e=[];let n=0,r=0;for(;n<t.length;){const s=t[n++];if(s<128)e[r++]=String.fromCharCode(s);else if(s>191&&s<224){const i=t[n++];e[r++]=String.fromCharCode((s&31)<<6|i&63)}else if(s>239&&s<365){const i=t[n++],o=t[n++],l=t[n++],u=((s&7)<<18|(i&63)<<12|(o&63)<<6|l&63)-65536;e[r++]=String.fromCharCode(55296+(u>>10)),e[r++]=String.fromCharCode(56320+(u&1023))}else{const i=t[n++],o=t[n++];e[r++]=String.fromCharCode((s&15)<<12|(i&63)<<6|o&63)}}return e.join("")},vE={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(t,e){if(!Array.isArray(t))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let s=0;s<t.length;s+=3){const i=t[s],o=s+1<t.length,l=o?t[s+1]:0,u=s+2<t.length,c=u?t[s+2]:0,f=i>>2,p=(i&3)<<4|l>>4;let g=(l&15)<<2|c>>6,w=c&63;u||(w=64,o||(g=64)),r.push(n[f],n[p],n[g],n[w])}return r.join("")},encodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(t):this.encodeByteArray(_E(t),e)},decodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(t):$C(this.decodeStringToByteArray(t,e))},decodeStringToByteArray(t,e){this.init_();const n=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let s=0;s<t.length;){const i=n[t.charAt(s++)],l=s<t.length?n[t.charAt(s)]:0;++s;const c=s<t.length?n[t.charAt(s)]:64;++s;const p=s<t.length?n[t.charAt(s)]:64;if(++s,i==null||l==null||c==null||p==null)throw new qC;const g=i<<2|l>>4;if(r.push(g),c!==64){const w=l<<4&240|c>>2;if(r.push(w),p!==64){const S=c<<6&192|p;r.push(S)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let t=0;t<this.ENCODED_VALS.length;t++)this.byteToCharMap_[t]=this.ENCODED_VALS.charAt(t),this.charToByteMap_[this.byteToCharMap_[t]]=t,this.byteToCharMapWebSafe_[t]=this.ENCODED_VALS_WEBSAFE.charAt(t),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[t]]=t,t>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(t)]=t,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(t)]=t)}}};class qC extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const HC=function(t){const e=_E(t);return vE.encodeByteArray(e,!0)},Ru=function(t){return HC(t).replace(/\./g,"")},wE=function(t){try{return vE.decodeString(t,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
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
 */function WC(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const GC=()=>WC().__FIREBASE_DEFAULTS__,KC=()=>{if(typeof process>"u"||typeof Jy>"u")return;const t=Jy.__FIREBASE_DEFAULTS__;if(t)return JSON.parse(t)},QC=()=>{if(typeof document>"u")return;let t;try{t=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=t&&wE(t[1]);return e&&JSON.parse(e)},pc=()=>{try{return BC()||GC()||KC()||QC()}catch(t){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${t}`);return}},EE=t=>{var e,n;return(n=(e=pc())==null?void 0:e.emulatorHosts)==null?void 0:n[t]},TE=t=>{const e=EE(t);if(!e)return;const n=e.lastIndexOf(":");if(n<=0||n+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const r=parseInt(e.substring(n+1),10);return e[0]==="["?[e.substring(1,n-1),r]:[e.substring(0,n),r]},xE=()=>{var t;return(t=pc())==null?void 0:t.config},IE=t=>{var e;return(e=pc())==null?void 0:e[`_${t}`]};/**
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
 */class XC{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,n)=>{this.resolve=e,this.reject=n})}wrapCallback(e){return(n,r)=>{n?this.reject(n):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(n):e(n,r))}}}/**
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
 */function SE(t,e){if(t.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const n={alg:"none",type:"JWT"},r=e||"demo-project",s=t.iat||0,i=t.sub||t.user_id;if(!i)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o={iss:`https://securetoken.google.com/${r}`,aud:r,iat:s,exp:s+3600,auth_time:s,sub:i,user_id:i,firebase:{sign_in_provider:"custom",identities:{}},...t};return[Ru(JSON.stringify(n)),Ru(JSON.stringify(o)),""].join(".")}/**
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
 */function ut(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function YC(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(ut())}function JC(){var e;const t=(e=pc())==null?void 0:e.forceEnvironment;if(t==="node")return!0;if(t==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function ZC(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function eA(){const t=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof t=="object"&&t.id!==void 0}function tA(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function nA(){const t=ut();return t.indexOf("MSIE ")>=0||t.indexOf("Trident/")>=0}function rA(){return!JC()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function sA(){try{return typeof indexedDB=="object"}catch{return!1}}function iA(){return new Promise((t,e)=>{try{let n=!0;const r="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(r);s.onsuccess=()=>{s.result.close(),n||self.indexedDB.deleteDatabase(r),t(!0)},s.onupgradeneeded=()=>{n=!1},s.onerror=()=>{var i;e(((i=s.error)==null?void 0:i.message)||"")}}catch(n){e(n)}})}/**
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
 */const oA="FirebaseError";class Sn extends Error{constructor(e,n,r){super(n),this.code=e,this.customData=r,this.name=oA,Object.setPrototypeOf(this,Sn.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Pa.prototype.create)}}class Pa{constructor(e,n,r){this.service=e,this.serviceName=n,this.errors=r}create(e,...n){const r=n[0]||{},s=`${this.service}/${e}`,i=this.errors[e],o=i?aA(i,r):"Error",l=`${this.serviceName}: ${o} (${s}).`;return new Sn(s,l,r)}}function aA(t,e){return t.replace(lA,(n,r)=>{const s=e[r];return s!=null?String(s):`<${r}?>`})}const lA=/\{\$([^}]+)}/g;function uA(t){for(const e in t)if(Object.prototype.hasOwnProperty.call(t,e))return!1;return!0}function Or(t,e){if(t===e)return!0;const n=Object.keys(t),r=Object.keys(e);for(const s of n){if(!r.includes(s))return!1;const i=t[s],o=e[s];if(Zy(i)&&Zy(o)){if(!Or(i,o))return!1}else if(i!==o)return!1}for(const s of r)if(!n.includes(s))return!1;return!0}function Zy(t){return t!==null&&typeof t=="object"}/**
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
 */function Na(t){const e=[];for(const[n,r]of Object.entries(t))Array.isArray(r)?r.forEach(s=>{e.push(encodeURIComponent(n)+"="+encodeURIComponent(s))}):e.push(encodeURIComponent(n)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function ko(t){const e={};return t.replace(/^\?/,"").split("&").forEach(r=>{if(r){const[s,i]=r.split("=");e[decodeURIComponent(s)]=decodeURIComponent(i)}}),e}function Co(t){const e=t.indexOf("?");if(!e)return"";const n=t.indexOf("#",e);return t.substring(e,n>0?n:void 0)}function cA(t,e){const n=new hA(t,e);return n.subscribe.bind(n)}class hA{constructor(e,n){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=n,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(n=>{n.next(e)})}error(e){this.forEachObserver(n=>{n.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,n,r){let s;if(e===void 0&&n===void 0&&r===void 0)throw new Error("Missing Observer.");dA(e,["next","error","complete"])?s=e:s={next:e,error:n,complete:r},s.next===void 0&&(s.next=Fh),s.error===void 0&&(s.error=Fh),s.complete===void 0&&(s.complete=Fh);const i=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?s.error(this.finalError):s.complete()}catch{}}),this.observers.push(s),i}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let n=0;n<this.observers.length;n++)this.sendOne(n,e)}sendOne(e,n){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{n(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function dA(t,e){if(typeof t!="object"||t===null)return!1;for(const n of e)if(n in t&&typeof t[n]=="function")return!0;return!1}function Fh(){}/**
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
 */function bs(t){try{return(t.startsWith("http://")||t.startsWith("https://")?new URL(t).hostname:t).endsWith(".cloudworkstations.dev")}catch{return!1}}async function Cp(t){return(await fetch(t,{credentials:"include"})).ok}class Vr{constructor(e,n,r){this.name=e,this.instanceFactory=n,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
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
 */class fA{constructor(e,n){this.name=e,this.container=n,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const n=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(n)){const r=new XC;if(this.instancesDeferred.set(n,r),this.isInitialized(n)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:n});s&&r.resolve(s)}catch{}}return this.instancesDeferred.get(n).promise}getImmediate(e){const n=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),r=(e==null?void 0:e.optional)??!1;if(this.isInitialized(n)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:n})}catch(s){if(r)return null;throw s}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(mA(e))try{this.getOrInitializeService({instanceIdentifier:ls})}catch{}for(const[n,r]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(n);try{const i=this.getOrInitializeService({instanceIdentifier:s});r.resolve(i)}catch{}}}}clearInstance(e=ls){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(n=>"INTERNAL"in n).map(n=>n.INTERNAL.delete()),...e.filter(n=>"_delete"in n).map(n=>n._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=ls){return this.instances.has(e)}getOptions(e=ls){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:n={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:r,options:n});for(const[i,o]of this.instancesDeferred.entries()){const l=this.normalizeInstanceIdentifier(i);r===l&&o.resolve(s)}return s}onInit(e,n){const r=this.normalizeInstanceIdentifier(n),s=this.onInitCallbacks.get(r)??new Set;s.add(e),this.onInitCallbacks.set(r,s);const i=this.instances.get(r);return i&&e(i,r),()=>{s.delete(e)}}invokeOnInitCallbacks(e,n){const r=this.onInitCallbacks.get(n);if(r)for(const s of r)try{s(e,n)}catch{}}getOrInitializeService({instanceIdentifier:e,options:n={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:pA(e),options:n}),this.instances.set(e,r),this.instancesOptions.set(e,n),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=ls){return this.component?this.component.multipleInstances?e:ls:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function pA(t){return t===ls?void 0:t}function mA(t){return t.instantiationMode==="EAGER"}/**
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
 */class gA{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const n=this.getProvider(e.name);if(n.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);n.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const n=new fA(e,this);return this.providers.set(e,n),n}getProviders(){return Array.from(this.providers.values())}}/**
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
 */var re;(function(t){t[t.DEBUG=0]="DEBUG",t[t.VERBOSE=1]="VERBOSE",t[t.INFO=2]="INFO",t[t.WARN=3]="WARN",t[t.ERROR=4]="ERROR",t[t.SILENT=5]="SILENT"})(re||(re={}));const yA={debug:re.DEBUG,verbose:re.VERBOSE,info:re.INFO,warn:re.WARN,error:re.ERROR,silent:re.SILENT},_A=re.INFO,vA={[re.DEBUG]:"log",[re.VERBOSE]:"log",[re.INFO]:"info",[re.WARN]:"warn",[re.ERROR]:"error"},wA=(t,e,...n)=>{if(e<t.logLevel)return;const r=new Date().toISOString(),s=vA[e];if(s)console[s](`[${r}]  ${t.name}:`,...n);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class Ap{constructor(e){this.name=e,this._logLevel=_A,this._logHandler=wA,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in re))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?yA[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,re.DEBUG,...e),this._logHandler(this,re.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,re.VERBOSE,...e),this._logHandler(this,re.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,re.INFO,...e),this._logHandler(this,re.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,re.WARN,...e),this._logHandler(this,re.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,re.ERROR,...e),this._logHandler(this,re.ERROR,...e)}}const EA=(t,e)=>e.some(n=>t instanceof n);let e_,t_;function TA(){return e_||(e_=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function xA(){return t_||(t_=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const kE=new WeakMap,ef=new WeakMap,CE=new WeakMap,zh=new WeakMap,Rp=new WeakMap;function IA(t){const e=new Promise((n,r)=>{const s=()=>{t.removeEventListener("success",i),t.removeEventListener("error",o)},i=()=>{n(kr(t.result)),s()},o=()=>{r(t.error),s()};t.addEventListener("success",i),t.addEventListener("error",o)});return e.then(n=>{n instanceof IDBCursor&&kE.set(n,t)}).catch(()=>{}),Rp.set(e,t),e}function SA(t){if(ef.has(t))return;const e=new Promise((n,r)=>{const s=()=>{t.removeEventListener("complete",i),t.removeEventListener("error",o),t.removeEventListener("abort",o)},i=()=>{n(),s()},o=()=>{r(t.error||new DOMException("AbortError","AbortError")),s()};t.addEventListener("complete",i),t.addEventListener("error",o),t.addEventListener("abort",o)});ef.set(t,e)}let tf={get(t,e,n){if(t instanceof IDBTransaction){if(e==="done")return ef.get(t);if(e==="objectStoreNames")return t.objectStoreNames||CE.get(t);if(e==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return kr(t[e])},set(t,e,n){return t[e]=n,!0},has(t,e){return t instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in t}};function kA(t){tf=t(tf)}function CA(t){return t===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...n){const r=t.call(Bh(this),e,...n);return CE.set(r,e.sort?e.sort():[e]),kr(r)}:xA().includes(t)?function(...e){return t.apply(Bh(this),e),kr(kE.get(this))}:function(...e){return kr(t.apply(Bh(this),e))}}function AA(t){return typeof t=="function"?CA(t):(t instanceof IDBTransaction&&SA(t),EA(t,TA())?new Proxy(t,tf):t)}function kr(t){if(t instanceof IDBRequest)return IA(t);if(zh.has(t))return zh.get(t);const e=AA(t);return e!==t&&(zh.set(t,e),Rp.set(e,t)),e}const Bh=t=>Rp.get(t);function RA(t,e,{blocked:n,upgrade:r,blocking:s,terminated:i}={}){const o=indexedDB.open(t,e),l=kr(o);return r&&o.addEventListener("upgradeneeded",u=>{r(kr(o.result),u.oldVersion,u.newVersion,kr(o.transaction),u)}),n&&o.addEventListener("blocked",u=>n(u.oldVersion,u.newVersion,u)),l.then(u=>{i&&u.addEventListener("close",()=>i()),s&&u.addEventListener("versionchange",c=>s(c.oldVersion,c.newVersion,c))}).catch(()=>{}),l}const bA=["get","getKey","getAll","getAllKeys","count"],PA=["put","add","delete","clear"],$h=new Map;function n_(t,e){if(!(t instanceof IDBDatabase&&!(e in t)&&typeof e=="string"))return;if($h.get(e))return $h.get(e);const n=e.replace(/FromIndex$/,""),r=e!==n,s=PA.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(s||bA.includes(n)))return;const i=async function(o,...l){const u=this.transaction(o,s?"readwrite":"readonly");let c=u.store;return r&&(c=c.index(l.shift())),(await Promise.all([c[n](...l),s&&u.done]))[0]};return $h.set(e,i),i}kA(t=>({...t,get:(e,n,r)=>n_(e,n)||t.get(e,n,r),has:(e,n)=>!!n_(e,n)||t.has(e,n)}));/**
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
 */class NA{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(n=>{if(DA(n)){const r=n.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(n=>n).join(" ")}}function DA(t){const e=t.getComponent();return(e==null?void 0:e.type)==="VERSION"}const nf="@firebase/app",r_="0.14.12";/**
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
 */const Hn=new Ap("@firebase/app"),OA="@firebase/app-compat",VA="@firebase/analytics-compat",LA="@firebase/analytics",MA="@firebase/app-check-compat",jA="@firebase/app-check",UA="@firebase/auth",FA="@firebase/auth-compat",zA="@firebase/database",BA="@firebase/data-connect",$A="@firebase/database-compat",qA="@firebase/functions",HA="@firebase/functions-compat",WA="@firebase/installations",GA="@firebase/installations-compat",KA="@firebase/messaging",QA="@firebase/messaging-compat",XA="@firebase/performance",YA="@firebase/performance-compat",JA="@firebase/remote-config",ZA="@firebase/remote-config-compat",eR="@firebase/storage",tR="@firebase/storage-compat",nR="@firebase/firestore",rR="@firebase/ai",sR="@firebase/firestore-compat",iR="firebase",oR="12.13.0";/**
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
 */const rf="[DEFAULT]",aR={[nf]:"fire-core",[OA]:"fire-core-compat",[LA]:"fire-analytics",[VA]:"fire-analytics-compat",[jA]:"fire-app-check",[MA]:"fire-app-check-compat",[UA]:"fire-auth",[FA]:"fire-auth-compat",[zA]:"fire-rtdb",[BA]:"fire-data-connect",[$A]:"fire-rtdb-compat",[qA]:"fire-fn",[HA]:"fire-fn-compat",[WA]:"fire-iid",[GA]:"fire-iid-compat",[KA]:"fire-fcm",[QA]:"fire-fcm-compat",[XA]:"fire-perf",[YA]:"fire-perf-compat",[JA]:"fire-rc",[ZA]:"fire-rc-compat",[eR]:"fire-gcs",[tR]:"fire-gcs-compat",[nR]:"fire-fst",[sR]:"fire-fst-compat",[rR]:"fire-vertex","fire-js":"fire-js",[iR]:"fire-js-all"};/**
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
 */const da=new Map,lR=new Map,sf=new Map;function s_(t,e){try{t.container.addComponent(e)}catch(n){Hn.debug(`Component ${e.name} failed to register with FirebaseApp ${t.name}`,n)}}function Ts(t){const e=t.name;if(sf.has(e))return Hn.debug(`There were multiple attempts to register component ${e}.`),!1;sf.set(e,t);for(const n of da.values())s_(n,t);for(const n of lR.values())s_(n,t);return!0}function mc(t,e){const n=t.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),t.container.getProvider(e)}function At(t){return t==null?!1:t.settings!==void 0}/**
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
 */const uR={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},Cr=new Pa("app","Firebase",uR);/**
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
 */class cR{constructor(e,n,r){this._isDeleted=!1,this._options={...e},this._config={...n},this._name=n.name,this._automaticDataCollectionEnabled=n.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new Vr("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw Cr.create("app-deleted",{appName:this._name})}}/**
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
 */const Ps=oR;function AE(t,e={}){let n=t;typeof e!="object"&&(e={name:e});const r={name:rf,automaticDataCollectionEnabled:!0,...e},s=r.name;if(typeof s!="string"||!s)throw Cr.create("bad-app-name",{appName:String(s)});if(n||(n=xE()),!n)throw Cr.create("no-options");const i=da.get(s);if(i){if(Or(n,i.options)&&Or(r,i.config))return i;throw Cr.create("duplicate-app",{appName:s})}const o=new gA(s);for(const u of sf.values())o.addComponent(u);const l=new cR(n,r,o);return da.set(s,l),l}function bp(t=rf){const e=da.get(t);if(!e&&t===rf&&xE())return AE();if(!e)throw Cr.create("no-app",{appName:t});return e}function i_(){return Array.from(da.values())}function _n(t,e,n){let r=aR[t]??t;n&&(r+=`-${n}`);const s=r.match(/\s|\//),i=e.match(/\s|\//);if(s||i){const o=[`Unable to register library "${r}" with version "${e}":`];s&&o.push(`library name "${r}" contains illegal characters (whitespace or "/")`),s&&i&&o.push("and"),i&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Hn.warn(o.join(" "));return}Ts(new Vr(`${r}-version`,()=>({library:r,version:e}),"VERSION"))}/**
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
 */const hR="firebase-heartbeat-database",dR=1,fa="firebase-heartbeat-store";let qh=null;function RE(){return qh||(qh=RA(hR,dR,{upgrade:(t,e)=>{switch(e){case 0:try{t.createObjectStore(fa)}catch(n){console.warn(n)}}}}).catch(t=>{throw Cr.create("idb-open",{originalErrorMessage:t.message})})),qh}async function fR(t){try{const n=(await RE()).transaction(fa),r=await n.objectStore(fa).get(bE(t));return await n.done,r}catch(e){if(e instanceof Sn)Hn.warn(e.message);else{const n=Cr.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});Hn.warn(n.message)}}}async function o_(t,e){try{const r=(await RE()).transaction(fa,"readwrite");await r.objectStore(fa).put(e,bE(t)),await r.done}catch(n){if(n instanceof Sn)Hn.warn(n.message);else{const r=Cr.create("idb-set",{originalErrorMessage:n==null?void 0:n.message});Hn.warn(r.message)}}}function bE(t){return`${t.name}!${t.options.appId}`}/**
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
 */const pR=1024,mR=30;class gR{constructor(e){this.container=e,this._heartbeatsCache=null;const n=this.container.getProvider("app").getImmediate();this._storage=new _R(n),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,n;try{const s=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),i=a_();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((n=this._heartbeatsCache)==null?void 0:n.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===i||this._heartbeatsCache.heartbeats.some(o=>o.date===i))return;if(this._heartbeatsCache.heartbeats.push({date:i,agent:s}),this._heartbeatsCache.heartbeats.length>mR){const o=vR(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(r){Hn.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const n=a_(),{heartbeatsToSend:r,unsentEntries:s}=yR(this._heartbeatsCache.heartbeats),i=Ru(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=n,s.length>0?(this._heartbeatsCache.heartbeats=s,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),i}catch(n){return Hn.warn(n),""}}}function a_(){return new Date().toISOString().substring(0,10)}function yR(t,e=pR){const n=[];let r=t.slice();for(const s of t){const i=n.find(o=>o.agent===s.agent);if(i){if(i.dates.push(s.date),l_(n)>e){i.dates.pop();break}}else if(n.push({agent:s.agent,dates:[s.date]}),l_(n)>e){n.pop();break}r=r.slice(1)}return{heartbeatsToSend:n,unsentEntries:r}}class _R{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return sA()?iA().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const n=await fR(this.app);return n!=null&&n.heartbeats?n:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return o_(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return o_(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...e.heartbeats]})}else return}}function l_(t){return Ru(JSON.stringify({version:2,heartbeats:t})).length}function vR(t){if(t.length===0)return-1;let e=0,n=t[0].date;for(let r=1;r<t.length;r++)t[r].date<n&&(n=t[r].date,e=r);return e}/**
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
 */function wR(t){Ts(new Vr("platform-logger",e=>new NA(e),"PRIVATE")),Ts(new Vr("heartbeat",e=>new gR(e),"PRIVATE")),_n(nf,r_,t),_n(nf,r_,"esm2020"),_n("fire-js","")}wR("");var u_=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Ar,PE;(function(){var t;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(E,_){function x(){}x.prototype=_.prototype,E.F=_.prototype,E.prototype=new x,E.prototype.constructor=E,E.D=function(R,T,A){for(var k=Array(arguments.length-2),se=2;se<arguments.length;se++)k[se-2]=arguments[se];return _.prototype[T].apply(R,k)}}function n(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(r,n),r.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function s(E,_,x){x||(x=0);const R=Array(16);if(typeof _=="string")for(var T=0;T<16;++T)R[T]=_.charCodeAt(x++)|_.charCodeAt(x++)<<8|_.charCodeAt(x++)<<16|_.charCodeAt(x++)<<24;else for(T=0;T<16;++T)R[T]=_[x++]|_[x++]<<8|_[x++]<<16|_[x++]<<24;_=E.g[0],x=E.g[1],T=E.g[2];let A=E.g[3],k;k=_+(A^x&(T^A))+R[0]+3614090360&4294967295,_=x+(k<<7&4294967295|k>>>25),k=A+(T^_&(x^T))+R[1]+3905402710&4294967295,A=_+(k<<12&4294967295|k>>>20),k=T+(x^A&(_^x))+R[2]+606105819&4294967295,T=A+(k<<17&4294967295|k>>>15),k=x+(_^T&(A^_))+R[3]+3250441966&4294967295,x=T+(k<<22&4294967295|k>>>10),k=_+(A^x&(T^A))+R[4]+4118548399&4294967295,_=x+(k<<7&4294967295|k>>>25),k=A+(T^_&(x^T))+R[5]+1200080426&4294967295,A=_+(k<<12&4294967295|k>>>20),k=T+(x^A&(_^x))+R[6]+2821735955&4294967295,T=A+(k<<17&4294967295|k>>>15),k=x+(_^T&(A^_))+R[7]+4249261313&4294967295,x=T+(k<<22&4294967295|k>>>10),k=_+(A^x&(T^A))+R[8]+1770035416&4294967295,_=x+(k<<7&4294967295|k>>>25),k=A+(T^_&(x^T))+R[9]+2336552879&4294967295,A=_+(k<<12&4294967295|k>>>20),k=T+(x^A&(_^x))+R[10]+4294925233&4294967295,T=A+(k<<17&4294967295|k>>>15),k=x+(_^T&(A^_))+R[11]+2304563134&4294967295,x=T+(k<<22&4294967295|k>>>10),k=_+(A^x&(T^A))+R[12]+1804603682&4294967295,_=x+(k<<7&4294967295|k>>>25),k=A+(T^_&(x^T))+R[13]+4254626195&4294967295,A=_+(k<<12&4294967295|k>>>20),k=T+(x^A&(_^x))+R[14]+2792965006&4294967295,T=A+(k<<17&4294967295|k>>>15),k=x+(_^T&(A^_))+R[15]+1236535329&4294967295,x=T+(k<<22&4294967295|k>>>10),k=_+(T^A&(x^T))+R[1]+4129170786&4294967295,_=x+(k<<5&4294967295|k>>>27),k=A+(x^T&(_^x))+R[6]+3225465664&4294967295,A=_+(k<<9&4294967295|k>>>23),k=T+(_^x&(A^_))+R[11]+643717713&4294967295,T=A+(k<<14&4294967295|k>>>18),k=x+(A^_&(T^A))+R[0]+3921069994&4294967295,x=T+(k<<20&4294967295|k>>>12),k=_+(T^A&(x^T))+R[5]+3593408605&4294967295,_=x+(k<<5&4294967295|k>>>27),k=A+(x^T&(_^x))+R[10]+38016083&4294967295,A=_+(k<<9&4294967295|k>>>23),k=T+(_^x&(A^_))+R[15]+3634488961&4294967295,T=A+(k<<14&4294967295|k>>>18),k=x+(A^_&(T^A))+R[4]+3889429448&4294967295,x=T+(k<<20&4294967295|k>>>12),k=_+(T^A&(x^T))+R[9]+568446438&4294967295,_=x+(k<<5&4294967295|k>>>27),k=A+(x^T&(_^x))+R[14]+3275163606&4294967295,A=_+(k<<9&4294967295|k>>>23),k=T+(_^x&(A^_))+R[3]+4107603335&4294967295,T=A+(k<<14&4294967295|k>>>18),k=x+(A^_&(T^A))+R[8]+1163531501&4294967295,x=T+(k<<20&4294967295|k>>>12),k=_+(T^A&(x^T))+R[13]+2850285829&4294967295,_=x+(k<<5&4294967295|k>>>27),k=A+(x^T&(_^x))+R[2]+4243563512&4294967295,A=_+(k<<9&4294967295|k>>>23),k=T+(_^x&(A^_))+R[7]+1735328473&4294967295,T=A+(k<<14&4294967295|k>>>18),k=x+(A^_&(T^A))+R[12]+2368359562&4294967295,x=T+(k<<20&4294967295|k>>>12),k=_+(x^T^A)+R[5]+4294588738&4294967295,_=x+(k<<4&4294967295|k>>>28),k=A+(_^x^T)+R[8]+2272392833&4294967295,A=_+(k<<11&4294967295|k>>>21),k=T+(A^_^x)+R[11]+1839030562&4294967295,T=A+(k<<16&4294967295|k>>>16),k=x+(T^A^_)+R[14]+4259657740&4294967295,x=T+(k<<23&4294967295|k>>>9),k=_+(x^T^A)+R[1]+2763975236&4294967295,_=x+(k<<4&4294967295|k>>>28),k=A+(_^x^T)+R[4]+1272893353&4294967295,A=_+(k<<11&4294967295|k>>>21),k=T+(A^_^x)+R[7]+4139469664&4294967295,T=A+(k<<16&4294967295|k>>>16),k=x+(T^A^_)+R[10]+3200236656&4294967295,x=T+(k<<23&4294967295|k>>>9),k=_+(x^T^A)+R[13]+681279174&4294967295,_=x+(k<<4&4294967295|k>>>28),k=A+(_^x^T)+R[0]+3936430074&4294967295,A=_+(k<<11&4294967295|k>>>21),k=T+(A^_^x)+R[3]+3572445317&4294967295,T=A+(k<<16&4294967295|k>>>16),k=x+(T^A^_)+R[6]+76029189&4294967295,x=T+(k<<23&4294967295|k>>>9),k=_+(x^T^A)+R[9]+3654602809&4294967295,_=x+(k<<4&4294967295|k>>>28),k=A+(_^x^T)+R[12]+3873151461&4294967295,A=_+(k<<11&4294967295|k>>>21),k=T+(A^_^x)+R[15]+530742520&4294967295,T=A+(k<<16&4294967295|k>>>16),k=x+(T^A^_)+R[2]+3299628645&4294967295,x=T+(k<<23&4294967295|k>>>9),k=_+(T^(x|~A))+R[0]+4096336452&4294967295,_=x+(k<<6&4294967295|k>>>26),k=A+(x^(_|~T))+R[7]+1126891415&4294967295,A=_+(k<<10&4294967295|k>>>22),k=T+(_^(A|~x))+R[14]+2878612391&4294967295,T=A+(k<<15&4294967295|k>>>17),k=x+(A^(T|~_))+R[5]+4237533241&4294967295,x=T+(k<<21&4294967295|k>>>11),k=_+(T^(x|~A))+R[12]+1700485571&4294967295,_=x+(k<<6&4294967295|k>>>26),k=A+(x^(_|~T))+R[3]+2399980690&4294967295,A=_+(k<<10&4294967295|k>>>22),k=T+(_^(A|~x))+R[10]+4293915773&4294967295,T=A+(k<<15&4294967295|k>>>17),k=x+(A^(T|~_))+R[1]+2240044497&4294967295,x=T+(k<<21&4294967295|k>>>11),k=_+(T^(x|~A))+R[8]+1873313359&4294967295,_=x+(k<<6&4294967295|k>>>26),k=A+(x^(_|~T))+R[15]+4264355552&4294967295,A=_+(k<<10&4294967295|k>>>22),k=T+(_^(A|~x))+R[6]+2734768916&4294967295,T=A+(k<<15&4294967295|k>>>17),k=x+(A^(T|~_))+R[13]+1309151649&4294967295,x=T+(k<<21&4294967295|k>>>11),k=_+(T^(x|~A))+R[4]+4149444226&4294967295,_=x+(k<<6&4294967295|k>>>26),k=A+(x^(_|~T))+R[11]+3174756917&4294967295,A=_+(k<<10&4294967295|k>>>22),k=T+(_^(A|~x))+R[2]+718787259&4294967295,T=A+(k<<15&4294967295|k>>>17),k=x+(A^(T|~_))+R[9]+3951481745&4294967295,E.g[0]=E.g[0]+_&4294967295,E.g[1]=E.g[1]+(T+(k<<21&4294967295|k>>>11))&4294967295,E.g[2]=E.g[2]+T&4294967295,E.g[3]=E.g[3]+A&4294967295}r.prototype.v=function(E,_){_===void 0&&(_=E.length);const x=_-this.blockSize,R=this.C;let T=this.h,A=0;for(;A<_;){if(T==0)for(;A<=x;)s(this,E,A),A+=this.blockSize;if(typeof E=="string"){for(;A<_;)if(R[T++]=E.charCodeAt(A++),T==this.blockSize){s(this,R),T=0;break}}else for(;A<_;)if(R[T++]=E[A++],T==this.blockSize){s(this,R),T=0;break}}this.h=T,this.o+=_},r.prototype.A=function(){var E=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);E[0]=128;for(var _=1;_<E.length-8;++_)E[_]=0;_=this.o*8;for(var x=E.length-8;x<E.length;++x)E[x]=_&255,_/=256;for(this.v(E),E=Array(16),_=0,x=0;x<4;++x)for(let R=0;R<32;R+=8)E[_++]=this.g[x]>>>R&255;return E};function i(E,_){var x=l;return Object.prototype.hasOwnProperty.call(x,E)?x[E]:x[E]=_(E)}function o(E,_){this.h=_;const x=[];let R=!0;for(let T=E.length-1;T>=0;T--){const A=E[T]|0;R&&A==_||(x[T]=A,R=!1)}this.g=x}var l={};function u(E){return-128<=E&&E<128?i(E,function(_){return new o([_|0],_<0?-1:0)}):new o([E|0],E<0?-1:0)}function c(E){if(isNaN(E)||!isFinite(E))return p;if(E<0)return P(c(-E));const _=[];let x=1;for(let R=0;E>=x;R++)_[R]=E/x|0,x*=4294967296;return new o(_,0)}function f(E,_){if(E.length==0)throw Error("number format error: empty string");if(_=_||10,_<2||36<_)throw Error("radix out of range: "+_);if(E.charAt(0)=="-")return P(f(E.substring(1),_));if(E.indexOf("-")>=0)throw Error('number format error: interior "-" character');const x=c(Math.pow(_,8));let R=p;for(let A=0;A<E.length;A+=8){var T=Math.min(8,E.length-A);const k=parseInt(E.substring(A,A+T),_);T<8?(T=c(Math.pow(_,T)),R=R.j(T).add(c(k))):(R=R.j(x),R=R.add(c(k)))}return R}var p=u(0),g=u(1),w=u(16777216);t=o.prototype,t.m=function(){if(b(this))return-P(this).m();let E=0,_=1;for(let x=0;x<this.g.length;x++){const R=this.i(x);E+=(R>=0?R:4294967296+R)*_,_*=4294967296}return E},t.toString=function(E){if(E=E||10,E<2||36<E)throw Error("radix out of range: "+E);if(S(this))return"0";if(b(this))return"-"+P(this).toString(E);const _=c(Math.pow(E,6));var x=this;let R="";for(;;){const T=D(x,_).g;x=I(x,T.j(_));let A=((x.g.length>0?x.g[0]:x.h)>>>0).toString(E);if(x=T,S(x))return A+R;for(;A.length<6;)A="0"+A;R=A+R}},t.i=function(E){return E<0?0:E<this.g.length?this.g[E]:this.h};function S(E){if(E.h!=0)return!1;for(let _=0;_<E.g.length;_++)if(E.g[_]!=0)return!1;return!0}function b(E){return E.h==-1}t.l=function(E){return E=I(this,E),b(E)?-1:S(E)?0:1};function P(E){const _=E.g.length,x=[];for(let R=0;R<_;R++)x[R]=~E.g[R];return new o(x,~E.h).add(g)}t.abs=function(){return b(this)?P(this):this},t.add=function(E){const _=Math.max(this.g.length,E.g.length),x=[];let R=0;for(let T=0;T<=_;T++){let A=R+(this.i(T)&65535)+(E.i(T)&65535),k=(A>>>16)+(this.i(T)>>>16)+(E.i(T)>>>16);R=k>>>16,A&=65535,k&=65535,x[T]=k<<16|A}return new o(x,x[x.length-1]&-2147483648?-1:0)};function I(E,_){return E.add(P(_))}t.j=function(E){if(S(this)||S(E))return p;if(b(this))return b(E)?P(this).j(P(E)):P(P(this).j(E));if(b(E))return P(this.j(P(E)));if(this.l(w)<0&&E.l(w)<0)return c(this.m()*E.m());const _=this.g.length+E.g.length,x=[];for(var R=0;R<2*_;R++)x[R]=0;for(R=0;R<this.g.length;R++)for(let T=0;T<E.g.length;T++){const A=this.i(R)>>>16,k=this.i(R)&65535,se=E.i(T)>>>16,Ze=E.i(T)&65535;x[2*R+2*T]+=k*Ze,v(x,2*R+2*T),x[2*R+2*T+1]+=A*Ze,v(x,2*R+2*T+1),x[2*R+2*T+1]+=k*se,v(x,2*R+2*T+1),x[2*R+2*T+2]+=A*se,v(x,2*R+2*T+2)}for(E=0;E<_;E++)x[E]=x[2*E+1]<<16|x[2*E];for(E=_;E<2*_;E++)x[E]=0;return new o(x,0)};function v(E,_){for(;(E[_]&65535)!=E[_];)E[_+1]+=E[_]>>>16,E[_]&=65535,_++}function C(E,_){this.g=E,this.h=_}function D(E,_){if(S(_))throw Error("division by zero");if(S(E))return new C(p,p);if(b(E))return _=D(P(E),_),new C(P(_.g),P(_.h));if(b(_))return _=D(E,P(_)),new C(P(_.g),_.h);if(E.g.length>30){if(b(E)||b(_))throw Error("slowDivide_ only works with positive integers.");for(var x=g,R=_;R.l(E)<=0;)x=j(x),R=j(R);var T=L(x,1),A=L(R,1);for(R=L(R,2),x=L(x,2);!S(R);){var k=A.add(R);k.l(E)<=0&&(T=T.add(x),A=k),R=L(R,1),x=L(x,1)}return _=I(E,T.j(_)),new C(T,_)}for(T=p;E.l(_)>=0;){for(x=Math.max(1,Math.floor(E.m()/_.m())),R=Math.ceil(Math.log(x)/Math.LN2),R=R<=48?1:Math.pow(2,R-48),A=c(x),k=A.j(_);b(k)||k.l(E)>0;)x-=R,A=c(x),k=A.j(_);S(A)&&(A=g),T=T.add(A),E=I(E,k)}return new C(T,E)}t.B=function(E){return D(this,E).h},t.and=function(E){const _=Math.max(this.g.length,E.g.length),x=[];for(let R=0;R<_;R++)x[R]=this.i(R)&E.i(R);return new o(x,this.h&E.h)},t.or=function(E){const _=Math.max(this.g.length,E.g.length),x=[];for(let R=0;R<_;R++)x[R]=this.i(R)|E.i(R);return new o(x,this.h|E.h)},t.xor=function(E){const _=Math.max(this.g.length,E.g.length),x=[];for(let R=0;R<_;R++)x[R]=this.i(R)^E.i(R);return new o(x,this.h^E.h)};function j(E){const _=E.g.length+1,x=[];for(let R=0;R<_;R++)x[R]=E.i(R)<<1|E.i(R-1)>>>31;return new o(x,E.h)}function L(E,_){const x=_>>5;_%=32;const R=E.g.length-x,T=[];for(let A=0;A<R;A++)T[A]=_>0?E.i(A+x)>>>_|E.i(A+x+1)<<32-_:E.i(A+x);return new o(T,E.h)}r.prototype.digest=r.prototype.A,r.prototype.reset=r.prototype.u,r.prototype.update=r.prototype.v,PE=r,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=c,o.fromString=f,Ar=o}).apply(typeof u_<"u"?u_:typeof self<"u"?self:typeof window<"u"?window:{});var Il=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var NE,Ao,DE,Wl,of,OE,VE,LE;(function(){var t,e=Object.defineProperty;function n(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof Il=="object"&&Il];for(var h=0;h<a.length;++h){var m=a[h];if(m&&m.Math==Math)return m}throw Error("Cannot find global object")}var r=n(this);function s(a,h){if(h)e:{var m=r;a=a.split(".");for(var y=0;y<a.length-1;y++){var N=a[y];if(!(N in m))break e;m=m[N]}a=a[a.length-1],y=m[a],h=h(y),h!=y&&h!=null&&e(m,a,{configurable:!0,writable:!0,value:h})}}s("Symbol.dispose",function(a){return a||Symbol("Symbol.dispose")}),s("Array.prototype.values",function(a){return a||function(){return this[Symbol.iterator]()}}),s("Object.entries",function(a){return a||function(h){var m=[],y;for(y in h)Object.prototype.hasOwnProperty.call(h,y)&&m.push([y,h[y]]);return m}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var i=i||{},o=this||self;function l(a){var h=typeof a;return h=="object"&&a!=null||h=="function"}function u(a,h,m){return a.call.apply(a.bind,arguments)}function c(a,h,m){return c=u,c.apply(null,arguments)}function f(a,h){var m=Array.prototype.slice.call(arguments,1);return function(){var y=m.slice();return y.push.apply(y,arguments),a.apply(this,y)}}function p(a,h){function m(){}m.prototype=h.prototype,a.Z=h.prototype,a.prototype=new m,a.prototype.constructor=a,a.Ob=function(y,N,V){for(var z=Array(arguments.length-2),Z=2;Z<arguments.length;Z++)z[Z-2]=arguments[Z];return h.prototype[N].apply(y,z)}}var g=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?a=>a&&AsyncContext.Snapshot.wrap(a):a=>a;function w(a){const h=a.length;if(h>0){const m=Array(h);for(let y=0;y<h;y++)m[y]=a[y];return m}return[]}function S(a,h){for(let y=1;y<arguments.length;y++){const N=arguments[y];var m=typeof N;if(m=m!="object"?m:N?Array.isArray(N)?"array":m:"null",m=="array"||m=="object"&&typeof N.length=="number"){m=a.length||0;const V=N.length||0;a.length=m+V;for(let z=0;z<V;z++)a[m+z]=N[z]}else a.push(N)}}class b{constructor(h,m){this.i=h,this.j=m,this.h=0,this.g=null}get(){let h;return this.h>0?(this.h--,h=this.g,this.g=h.next,h.next=null):h=this.i(),h}}function P(a){o.setTimeout(()=>{throw a},0)}function I(){var a=E;let h=null;return a.g&&(h=a.g,a.g=a.g.next,a.g||(a.h=null),h.next=null),h}class v{constructor(){this.h=this.g=null}add(h,m){const y=C.get();y.set(h,m),this.h?this.h.next=y:this.g=y,this.h=y}}var C=new b(()=>new D,a=>a.reset());class D{constructor(){this.next=this.g=this.h=null}set(h,m){this.h=h,this.g=m,this.next=null}reset(){this.next=this.g=this.h=null}}let j,L=!1,E=new v,_=()=>{const a=Promise.resolve(void 0);j=()=>{a.then(x)}};function x(){for(var a;a=I();){try{a.h.call(a.g)}catch(m){P(m)}var h=C;h.j(a),h.h<100&&(h.h++,a.next=h.g,h.g=a)}L=!1}function R(){this.u=this.u,this.C=this.C}R.prototype.u=!1,R.prototype.dispose=function(){this.u||(this.u=!0,this.N())},R.prototype[Symbol.dispose]=function(){this.dispose()},R.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function T(a,h){this.type=a,this.g=this.target=h,this.defaultPrevented=!1}T.prototype.h=function(){this.defaultPrevented=!0};var A=function(){if(!o.addEventListener||!Object.defineProperty)return!1;var a=!1,h=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const m=()=>{};o.addEventListener("test",m,h),o.removeEventListener("test",m,h)}catch{}return a}();function k(a){return/^[\s\xa0]*$/.test(a)}function se(a,h){T.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a&&this.init(a,h)}p(se,T),se.prototype.init=function(a,h){const m=this.type=a.type,y=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement,this.g=h,h=a.relatedTarget,h||(m=="mouseover"?h=a.fromElement:m=="mouseout"&&(h=a.toElement)),this.relatedTarget=h,y?(this.clientX=y.clientX!==void 0?y.clientX:y.pageX,this.clientY=y.clientY!==void 0?y.clientY:y.pageY,this.screenX=y.screenX||0,this.screenY=y.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=a.pointerType,this.state=a.state,this.i=a,a.defaultPrevented&&se.Z.h.call(this)},se.prototype.h=function(){se.Z.h.call(this);const a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var Ze="closure_listenable_"+(Math.random()*1e6|0),ln=0;function Gt(a,h,m,y,N){this.listener=a,this.proxy=null,this.src=h,this.type=m,this.capture=!!y,this.ha=N,this.key=++ln,this.da=this.fa=!1}function $(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function Q(a,h,m){for(const y in a)h.call(m,a[y],y,a)}function J(a,h){for(const m in a)h.call(void 0,a[m],m,a)}function ve(a){const h={};for(const m in a)h[m]=a[m];return h}const Pe="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function Jr(a,h){let m,y;for(let N=1;N<arguments.length;N++){y=arguments[N];for(m in y)a[m]=y[m];for(let V=0;V<Pe.length;V++)m=Pe[V],Object.prototype.hasOwnProperty.call(y,m)&&(a[m]=y[m])}}function Mt(a){this.src=a,this.g={},this.h=0}Mt.prototype.add=function(a,h,m,y,N){const V=a.toString();a=this.g[V],a||(a=this.g[V]=[],this.h++);const z=Kt(a,h,y,N);return z>-1?(h=a[z],m||(h.fa=!1)):(h=new Gt(h,this.src,V,!!y,N),h.fa=m,a.push(h)),h};function Zr(a,h){const m=h.type;if(m in a.g){var y=a.g[m],N=Array.prototype.indexOf.call(y,h,void 0),V;(V=N>=0)&&Array.prototype.splice.call(y,N,1),V&&($(h),a.g[m].length==0&&(delete a.g[m],a.h--))}}function Kt(a,h,m,y){for(let N=0;N<a.length;++N){const V=a[N];if(!V.da&&V.listener==h&&V.capture==!!m&&V.ha==y)return N}return-1}var Yn="closure_lm_"+(Math.random()*1e6|0),Wc={};function Lm(a,h,m,y,N){if(Array.isArray(h)){for(let V=0;V<h.length;V++)Lm(a,h[V],m,y,N);return null}return m=Um(m),a&&a[Ze]?a.J(h,m,l(y)?!!y.capture:!1,N):DI(a,h,m,!1,y,N)}function DI(a,h,m,y,N,V){if(!h)throw Error("Invalid event type");const z=l(N)?!!N.capture:!!N;let Z=Kc(a);if(Z||(a[Yn]=Z=new Mt(a)),m=Z.add(h,m,y,z,V),m.proxy)return m;if(y=OI(),m.proxy=y,y.src=a,y.listener=m,a.addEventListener)A||(N=z),N===void 0&&(N=!1),a.addEventListener(h.toString(),y,N);else if(a.attachEvent)a.attachEvent(jm(h.toString()),y);else if(a.addListener&&a.removeListener)a.addListener(y);else throw Error("addEventListener and attachEvent are unavailable.");return m}function OI(){function a(m){return h.call(a.src,a.listener,m)}const h=VI;return a}function Mm(a,h,m,y,N){if(Array.isArray(h))for(var V=0;V<h.length;V++)Mm(a,h[V],m,y,N);else y=l(y)?!!y.capture:!!y,m=Um(m),a&&a[Ze]?(a=a.i,V=String(h).toString(),V in a.g&&(h=a.g[V],m=Kt(h,m,y,N),m>-1&&($(h[m]),Array.prototype.splice.call(h,m,1),h.length==0&&(delete a.g[V],a.h--)))):a&&(a=Kc(a))&&(h=a.g[h.toString()],a=-1,h&&(a=Kt(h,m,y,N)),(m=a>-1?h[a]:null)&&Gc(m))}function Gc(a){if(typeof a!="number"&&a&&!a.da){var h=a.src;if(h&&h[Ze])Zr(h.i,a);else{var m=a.type,y=a.proxy;h.removeEventListener?h.removeEventListener(m,y,a.capture):h.detachEvent?h.detachEvent(jm(m),y):h.addListener&&h.removeListener&&h.removeListener(y),(m=Kc(h))?(Zr(m,a),m.h==0&&(m.src=null,h[Yn]=null)):$(a)}}}function jm(a){return a in Wc?Wc[a]:Wc[a]="on"+a}function VI(a,h){if(a.da)a=!0;else{h=new se(h,this);const m=a.listener,y=a.ha||a.src;a.fa&&Gc(a),a=m.call(y,h)}return a}function Kc(a){return a=a[Yn],a instanceof Mt?a:null}var Qc="__closure_events_fn_"+(Math.random()*1e9>>>0);function Um(a){return typeof a=="function"?a:(a[Qc]||(a[Qc]=function(h){return a.handleEvent(h)}),a[Qc])}function et(){R.call(this),this.i=new Mt(this),this.M=this,this.G=null}p(et,R),et.prototype[Ze]=!0,et.prototype.removeEventListener=function(a,h,m,y){Mm(this,a,h,m,y)};function ct(a,h){var m,y=a.G;if(y)for(m=[];y;y=y.G)m.push(y);if(a=a.M,y=h.type||h,typeof h=="string")h=new T(h,a);else if(h instanceof T)h.target=h.target||a;else{var N=h;h=new T(y,a),Jr(h,N)}N=!0;let V,z;if(m)for(z=m.length-1;z>=0;z--)V=h.g=m[z],N=Qa(V,y,!0,h)&&N;if(V=h.g=a,N=Qa(V,y,!0,h)&&N,N=Qa(V,y,!1,h)&&N,m)for(z=0;z<m.length;z++)V=h.g=m[z],N=Qa(V,y,!1,h)&&N}et.prototype.N=function(){if(et.Z.N.call(this),this.i){var a=this.i;for(const h in a.g){const m=a.g[h];for(let y=0;y<m.length;y++)$(m[y]);delete a.g[h],a.h--}}this.G=null},et.prototype.J=function(a,h,m,y){return this.i.add(String(a),h,!1,m,y)},et.prototype.K=function(a,h,m,y){return this.i.add(String(a),h,!0,m,y)};function Qa(a,h,m,y){if(h=a.i.g[String(h)],!h)return!0;h=h.concat();let N=!0;for(let V=0;V<h.length;++V){const z=h[V];if(z&&!z.da&&z.capture==m){const Z=z.listener,je=z.ha||z.src;z.fa&&Zr(a.i,z),N=Z.call(je,y)!==!1&&N}}return N&&!y.defaultPrevented}function LI(a,h){if(typeof a!="function")if(a&&typeof a.handleEvent=="function")a=c(a.handleEvent,a);else throw Error("Invalid listener argument");return Number(h)>2147483647?-1:o.setTimeout(a,h||0)}function Fm(a){a.g=LI(()=>{a.g=null,a.i&&(a.i=!1,Fm(a))},a.l);const h=a.h;a.h=null,a.m.apply(null,h)}class MI extends R{constructor(h,m){super(),this.m=h,this.l=m,this.h=null,this.i=!1,this.g=null}j(h){this.h=arguments,this.g?this.i=!0:Fm(this)}N(){super.N(),this.g&&(o.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Qi(a){R.call(this),this.h=a,this.g={}}p(Qi,R);var zm=[];function Bm(a){Q(a.g,function(h,m){this.g.hasOwnProperty(m)&&Gc(h)},a),a.g={}}Qi.prototype.N=function(){Qi.Z.N.call(this),Bm(this)},Qi.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Xc=o.JSON.stringify,jI=o.JSON.parse,UI=class{stringify(a){return o.JSON.stringify(a,void 0)}parse(a){return o.JSON.parse(a,void 0)}};function $m(){}function qm(){}var Xi={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function Yc(){T.call(this,"d")}p(Yc,T);function Jc(){T.call(this,"c")}p(Jc,T);var es={},Hm=null;function Xa(){return Hm=Hm||new et}es.Ia="serverreachability";function Wm(a){T.call(this,es.Ia,a)}p(Wm,T);function Yi(a){const h=Xa();ct(h,new Wm(h))}es.STAT_EVENT="statevent";function Gm(a,h){T.call(this,es.STAT_EVENT,a),this.stat=h}p(Gm,T);function ht(a){const h=Xa();ct(h,new Gm(h,a))}es.Ja="timingevent";function Km(a,h){T.call(this,es.Ja,a),this.size=h}p(Km,T);function Ji(a,h){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return o.setTimeout(function(){a()},h)}function Zi(){this.g=!0}Zi.prototype.ua=function(){this.g=!1};function FI(a,h,m,y,N,V){a.info(function(){if(a.g)if(V){var z="",Z=V.split("&");for(let he=0;he<Z.length;he++){var je=Z[he].split("=");if(je.length>1){const $e=je[0];je=je[1];const cn=$e.split("_");z=cn.length>=2&&cn[1]=="type"?z+($e+"="+je+"&"):z+($e+"=redacted&")}}}else z=null;else z=V;return"XMLHTTP REQ ("+y+") [attempt "+N+"]: "+h+`
`+m+`
`+z})}function zI(a,h,m,y,N,V,z){a.info(function(){return"XMLHTTP RESP ("+y+") [ attempt "+N+"]: "+h+`
`+m+`
`+V+" "+z})}function js(a,h,m,y){a.info(function(){return"XMLHTTP TEXT ("+h+"): "+$I(a,m)+(y?" "+y:"")})}function BI(a,h){a.info(function(){return"TIMEOUT: "+h})}Zi.prototype.info=function(){};function $I(a,h){if(!a.g)return h;if(!h)return null;try{const V=JSON.parse(h);if(V){for(a=0;a<V.length;a++)if(Array.isArray(V[a])){var m=V[a];if(!(m.length<2)){var y=m[1];if(Array.isArray(y)&&!(y.length<1)){var N=y[0];if(N!="noop"&&N!="stop"&&N!="close")for(let z=1;z<y.length;z++)y[z]=""}}}}return Xc(V)}catch{return h}}var Ya={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},Qm={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},Xm;function Zc(){}p(Zc,$m),Zc.prototype.g=function(){return new XMLHttpRequest},Xm=new Zc;function eo(a){return encodeURIComponent(String(a))}function qI(a){var h=1;a=a.split(":");const m=[];for(;h>0&&a.length;)m.push(a.shift()),h--;return a.length&&m.push(a.join(":")),m}function Jn(a,h,m,y){this.j=a,this.i=h,this.l=m,this.S=y||1,this.V=new Qi(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new Ym}function Ym(){this.i=null,this.g="",this.h=!1}var Jm={},eh={};function th(a,h,m){a.M=1,a.A=Za(un(h)),a.u=m,a.R=!0,Zm(a,null)}function Zm(a,h){a.F=Date.now(),Ja(a),a.B=un(a.A);var m=a.B,y=a.S;Array.isArray(y)||(y=[String(y)]),dg(m.i,"t",y),a.C=0,m=a.j.L,a.h=new Ym,a.g=bg(a.j,m?h:null,!a.u),a.P>0&&(a.O=new MI(c(a.Y,a,a.g),a.P)),h=a.V,m=a.g,y=a.ba;var N="readystatechange";Array.isArray(N)||(N&&(zm[0]=N.toString()),N=zm);for(let V=0;V<N.length;V++){const z=Lm(m,N[V],y||h.handleEvent,!1,h.h||h);if(!z)break;h.g[z.key]=z}h=a.J?ve(a.J):{},a.u?(a.v||(a.v="POST"),h["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.B,a.v,a.u,h)):(a.v="GET",a.g.ea(a.B,a.v,null,h)),Yi(),FI(a.i,a.v,a.B,a.l,a.S,a.u)}Jn.prototype.ba=function(a){a=a.target;const h=this.O;h&&tr(a)==3?h.j():this.Y(a)},Jn.prototype.Y=function(a){try{if(a==this.g)e:{const Z=tr(this.g),je=this.g.ya(),he=this.g.ca();if(!(Z<3)&&(Z!=3||this.g&&(this.h.h||this.g.la()||vg(this.g)))){this.K||Z!=4||je==7||(je==8||he<=0?Yi(3):Yi(2)),nh(this);var h=this.g.ca();this.X=h;var m=HI(this);if(this.o=h==200,zI(this.i,this.v,this.B,this.l,this.S,Z,h),this.o){if(this.U&&!this.L){t:{if(this.g){var y,N=this.g;if((y=N.g?N.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!k(y)){var V=y;break t}}V=null}if(a=V)js(this.i,this.l,a,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,rh(this,a);else{this.o=!1,this.m=3,ht(12),ts(this),to(this);break e}}if(this.R){a=!0;let $e;for(;!this.K&&this.C<m.length;)if($e=WI(this,m),$e==eh){Z==4&&(this.m=4,ht(14),a=!1),js(this.i,this.l,null,"[Incomplete Response]");break}else if($e==Jm){this.m=4,ht(15),js(this.i,this.l,m,"[Invalid Chunk]"),a=!1;break}else js(this.i,this.l,$e,null),rh(this,$e);if(eg(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),Z!=4||m.length!=0||this.h.h||(this.m=1,ht(16),a=!1),this.o=this.o&&a,!a)js(this.i,this.l,m,"[Invalid Chunked Response]"),ts(this),to(this);else if(m.length>0&&!this.W){this.W=!0;var z=this.j;z.g==this&&z.aa&&!z.P&&(z.j.info("Great, no buffering proxy detected. Bytes received: "+m.length),hh(z),z.P=!0,ht(11))}}else js(this.i,this.l,m,null),rh(this,m);Z==4&&ts(this),this.o&&!this.K&&(Z==4?kg(this.j,this):(this.o=!1,Ja(this)))}else o1(this.g),h==400&&m.indexOf("Unknown SID")>0?(this.m=3,ht(12)):(this.m=0,ht(13)),ts(this),to(this)}}}catch{}finally{}};function HI(a){if(!eg(a))return a.g.la();const h=vg(a.g);if(h==="")return"";let m="";const y=h.length,N=tr(a.g)==4;if(!a.h.i){if(typeof TextDecoder>"u")return ts(a),to(a),"";a.h.i=new o.TextDecoder}for(let V=0;V<y;V++)a.h.h=!0,m+=a.h.i.decode(h[V],{stream:!(N&&V==y-1)});return h.length=0,a.h.g+=m,a.C=0,a.h.g}function eg(a){return a.g?a.v=="GET"&&a.M!=2&&a.j.Aa:!1}function WI(a,h){var m=a.C,y=h.indexOf(`
`,m);return y==-1?eh:(m=Number(h.substring(m,y)),isNaN(m)?Jm:(y+=1,y+m>h.length?eh:(h=h.slice(y,y+m),a.C=y+m,h)))}Jn.prototype.cancel=function(){this.K=!0,ts(this)};function Ja(a){a.T=Date.now()+a.H,tg(a,a.H)}function tg(a,h){if(a.D!=null)throw Error("WatchDog timer not null");a.D=Ji(c(a.aa,a),h)}function nh(a){a.D&&(o.clearTimeout(a.D),a.D=null)}Jn.prototype.aa=function(){this.D=null;const a=Date.now();a-this.T>=0?(BI(this.i,this.B),this.M!=2&&(Yi(),ht(17)),ts(this),this.m=2,to(this)):tg(this,this.T-a)};function to(a){a.j.I==0||a.K||kg(a.j,a)}function ts(a){nh(a);var h=a.O;h&&typeof h.dispose=="function"&&h.dispose(),a.O=null,Bm(a.V),a.g&&(h=a.g,a.g=null,h.abort(),h.dispose())}function rh(a,h){try{var m=a.j;if(m.I!=0&&(m.g==a||sh(m.h,a))){if(!a.L&&sh(m.h,a)&&m.I==3){try{var y=m.Ba.g.parse(h)}catch{y=null}if(Array.isArray(y)&&y.length==3){var N=y;if(N[0]==0){e:if(!m.v){if(m.g)if(m.g.F+3e3<a.F)sl(m),nl(m);else break e;ch(m),ht(18)}}else m.xa=N[1],0<m.xa-m.K&&N[2]<37500&&m.F&&m.A==0&&!m.C&&(m.C=Ji(c(m.Va,m),6e3));sg(m.h)<=1&&m.ta&&(m.ta=void 0)}else rs(m,11)}else if((a.L||m.g==a)&&sl(m),!k(h))for(N=m.Ba.g.parse(h),h=0;h<N.length;h++){let he=N[h];const $e=he[0];if(!($e<=m.K))if(m.K=$e,he=he[1],m.I==2)if(he[0]=="c"){m.M=he[1],m.ba=he[2];const cn=he[3];cn!=null&&(m.ka=cn,m.j.info("VER="+m.ka));const ss=he[4];ss!=null&&(m.za=ss,m.j.info("SVER="+m.za));const nr=he[5];nr!=null&&typeof nr=="number"&&nr>0&&(y=1.5*nr,m.O=y,m.j.info("backChannelRequestTimeoutMs_="+y)),y=m;const rr=a.g;if(rr){const ol=rr.g?rr.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(ol){var V=y.h;V.g||ol.indexOf("spdy")==-1&&ol.indexOf("quic")==-1&&ol.indexOf("h2")==-1||(V.j=V.l,V.g=new Set,V.h&&(ih(V,V.h),V.h=null))}if(y.G){const dh=rr.g?rr.g.getResponseHeader("X-HTTP-Session-Id"):null;dh&&(y.wa=dh,me(y.J,y.G,dh))}}m.I=3,m.l&&m.l.ra(),m.aa&&(m.T=Date.now()-a.F,m.j.info("Handshake RTT: "+m.T+"ms")),y=m;var z=a;if(y.na=Rg(y,y.L?y.ba:null,y.W),z.L){ig(y.h,z);var Z=z,je=y.O;je&&(Z.H=je),Z.D&&(nh(Z),Ja(Z)),y.g=z}else Ig(y);m.i.length>0&&rl(m)}else he[0]!="stop"&&he[0]!="close"||rs(m,7);else m.I==3&&(he[0]=="stop"||he[0]=="close"?he[0]=="stop"?rs(m,7):uh(m):he[0]!="noop"&&m.l&&m.l.qa(he),m.A=0)}}Yi(4)}catch{}}var GI=class{constructor(a,h){this.g=a,this.map=h}};function ng(a){this.l=a||10,o.PerformanceNavigationTiming?(a=o.performance.getEntriesByType("navigation"),a=a.length>0&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(o.chrome&&o.chrome.loadTimes&&o.chrome.loadTimes()&&o.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function rg(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function sg(a){return a.h?1:a.g?a.g.size:0}function sh(a,h){return a.h?a.h==h:a.g?a.g.has(h):!1}function ih(a,h){a.g?a.g.add(h):a.h=h}function ig(a,h){a.h&&a.h==h?a.h=null:a.g&&a.g.has(h)&&a.g.delete(h)}ng.prototype.cancel=function(){if(this.i=og(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function og(a){if(a.h!=null)return a.i.concat(a.h.G);if(a.g!=null&&a.g.size!==0){let h=a.i;for(const m of a.g.values())h=h.concat(m.G);return h}return w(a.i)}var ag=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function KI(a,h){if(a){a=a.split("&");for(let m=0;m<a.length;m++){const y=a[m].indexOf("=");let N,V=null;y>=0?(N=a[m].substring(0,y),V=a[m].substring(y+1)):N=a[m],h(N,V?decodeURIComponent(V.replace(/\+/g," ")):"")}}}function Zn(a){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let h;a instanceof Zn?(this.l=a.l,no(this,a.j),this.o=a.o,this.g=a.g,ro(this,a.u),this.h=a.h,oh(this,fg(a.i)),this.m=a.m):a&&(h=String(a).match(ag))?(this.l=!1,no(this,h[1]||"",!0),this.o=so(h[2]||""),this.g=so(h[3]||"",!0),ro(this,h[4]),this.h=so(h[5]||"",!0),oh(this,h[6]||"",!0),this.m=so(h[7]||"")):(this.l=!1,this.i=new oo(null,this.l))}Zn.prototype.toString=function(){const a=[];var h=this.j;h&&a.push(io(h,lg,!0),":");var m=this.g;return(m||h=="file")&&(a.push("//"),(h=this.o)&&a.push(io(h,lg,!0),"@"),a.push(eo(m).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),m=this.u,m!=null&&a.push(":",String(m))),(m=this.h)&&(this.g&&m.charAt(0)!="/"&&a.push("/"),a.push(io(m,m.charAt(0)=="/"?YI:XI,!0))),(m=this.i.toString())&&a.push("?",m),(m=this.m)&&a.push("#",io(m,ZI)),a.join("")},Zn.prototype.resolve=function(a){const h=un(this);let m=!!a.j;m?no(h,a.j):m=!!a.o,m?h.o=a.o:m=!!a.g,m?h.g=a.g:m=a.u!=null;var y=a.h;if(m)ro(h,a.u);else if(m=!!a.h){if(y.charAt(0)!="/")if(this.g&&!this.h)y="/"+y;else{var N=h.h.lastIndexOf("/");N!=-1&&(y=h.h.slice(0,N+1)+y)}if(N=y,N==".."||N==".")y="";else if(N.indexOf("./")!=-1||N.indexOf("/.")!=-1){y=N.lastIndexOf("/",0)==0,N=N.split("/");const V=[];for(let z=0;z<N.length;){const Z=N[z++];Z=="."?y&&z==N.length&&V.push(""):Z==".."?((V.length>1||V.length==1&&V[0]!="")&&V.pop(),y&&z==N.length&&V.push("")):(V.push(Z),y=!0)}y=V.join("/")}else y=N}return m?h.h=y:m=a.i.toString()!=="",m?oh(h,fg(a.i)):m=!!a.m,m&&(h.m=a.m),h};function un(a){return new Zn(a)}function no(a,h,m){a.j=m?so(h,!0):h,a.j&&(a.j=a.j.replace(/:$/,""))}function ro(a,h){if(h){if(h=Number(h),isNaN(h)||h<0)throw Error("Bad port number "+h);a.u=h}else a.u=null}function oh(a,h,m){h instanceof oo?(a.i=h,e1(a.i,a.l)):(m||(h=io(h,JI)),a.i=new oo(h,a.l))}function me(a,h,m){a.i.set(h,m)}function Za(a){return me(a,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),a}function so(a,h){return a?h?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function io(a,h,m){return typeof a=="string"?(a=encodeURI(a).replace(h,QI),m&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function QI(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var lg=/[#\/\?@]/g,XI=/[#\?:]/g,YI=/[#\?]/g,JI=/[#\?@]/g,ZI=/#/g;function oo(a,h){this.h=this.g=null,this.i=a||null,this.j=!!h}function ns(a){a.g||(a.g=new Map,a.h=0,a.i&&KI(a.i,function(h,m){a.add(decodeURIComponent(h.replace(/\+/g," ")),m)}))}t=oo.prototype,t.add=function(a,h){ns(this),this.i=null,a=Us(this,a);let m=this.g.get(a);return m||this.g.set(a,m=[]),m.push(h),this.h+=1,this};function ug(a,h){ns(a),h=Us(a,h),a.g.has(h)&&(a.i=null,a.h-=a.g.get(h).length,a.g.delete(h))}function cg(a,h){return ns(a),h=Us(a,h),a.g.has(h)}t.forEach=function(a,h){ns(this),this.g.forEach(function(m,y){m.forEach(function(N){a.call(h,N,y,this)},this)},this)};function hg(a,h){ns(a);let m=[];if(typeof h=="string")cg(a,h)&&(m=m.concat(a.g.get(Us(a,h))));else for(a=Array.from(a.g.values()),h=0;h<a.length;h++)m=m.concat(a[h]);return m}t.set=function(a,h){return ns(this),this.i=null,a=Us(this,a),cg(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[h]),this.h+=1,this},t.get=function(a,h){return a?(a=hg(this,a),a.length>0?String(a[0]):h):h};function dg(a,h,m){ug(a,h),m.length>0&&(a.i=null,a.g.set(Us(a,h),w(m)),a.h+=m.length)}t.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],h=Array.from(this.g.keys());for(let y=0;y<h.length;y++){var m=h[y];const N=eo(m);m=hg(this,m);for(let V=0;V<m.length;V++){let z=N;m[V]!==""&&(z+="="+eo(m[V])),a.push(z)}}return this.i=a.join("&")};function fg(a){const h=new oo;return h.i=a.i,a.g&&(h.g=new Map(a.g),h.h=a.h),h}function Us(a,h){return h=String(h),a.j&&(h=h.toLowerCase()),h}function e1(a,h){h&&!a.j&&(ns(a),a.i=null,a.g.forEach(function(m,y){const N=y.toLowerCase();y!=N&&(ug(this,y),dg(this,N,m))},a)),a.j=h}function t1(a,h){const m=new Zi;if(o.Image){const y=new Image;y.onload=f(er,m,"TestLoadImage: loaded",!0,h,y),y.onerror=f(er,m,"TestLoadImage: error",!1,h,y),y.onabort=f(er,m,"TestLoadImage: abort",!1,h,y),y.ontimeout=f(er,m,"TestLoadImage: timeout",!1,h,y),o.setTimeout(function(){y.ontimeout&&y.ontimeout()},1e4),y.src=a}else h(!1)}function n1(a,h){const m=new Zi,y=new AbortController,N=setTimeout(()=>{y.abort(),er(m,"TestPingServer: timeout",!1,h)},1e4);fetch(a,{signal:y.signal}).then(V=>{clearTimeout(N),V.ok?er(m,"TestPingServer: ok",!0,h):er(m,"TestPingServer: server error",!1,h)}).catch(()=>{clearTimeout(N),er(m,"TestPingServer: error",!1,h)})}function er(a,h,m,y,N){try{N&&(N.onload=null,N.onerror=null,N.onabort=null,N.ontimeout=null),y(m)}catch{}}function r1(){this.g=new UI}function ah(a){this.i=a.Sb||null,this.h=a.ab||!1}p(ah,$m),ah.prototype.g=function(){return new el(this.i,this.h)};function el(a,h){et.call(this),this.H=a,this.o=h,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}p(el,et),t=el.prototype,t.open=function(a,h){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=a,this.D=h,this.readyState=1,lo(this)},t.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const h={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};a&&(h.body=a),(this.H||o).fetch(new Request(this.D,h)).then(this.Pa.bind(this),this.ga.bind(this))},t.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,ao(this)),this.readyState=0},t.Pa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,lo(this)),this.g&&(this.readyState=3,lo(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof o.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;pg(this)}else a.text().then(this.Oa.bind(this),this.ga.bind(this))};function pg(a){a.j.read().then(a.Ma.bind(a)).catch(a.ga.bind(a))}t.Ma=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var h=a.value?a.value:new Uint8Array(0);(h=this.B.decode(h,{stream:!a.done}))&&(this.response=this.responseText+=h)}a.done?ao(this):lo(this),this.readyState==3&&pg(this)}},t.Oa=function(a){this.g&&(this.response=this.responseText=a,ao(this))},t.Na=function(a){this.g&&(this.response=a,ao(this))},t.ga=function(){this.g&&ao(this)};function ao(a){a.readyState=4,a.l=null,a.j=null,a.B=null,lo(a)}t.setRequestHeader=function(a,h){this.A.append(a,h)},t.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},t.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],h=this.h.entries();for(var m=h.next();!m.done;)m=m.value,a.push(m[0]+": "+m[1]),m=h.next();return a.join(`\r
`)};function lo(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(el.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function mg(a){let h="";return Q(a,function(m,y){h+=y,h+=":",h+=m,h+=`\r
`}),h}function lh(a,h,m){e:{for(y in m){var y=!1;break e}y=!0}y||(m=mg(m),typeof a=="string"?m!=null&&eo(m):me(a,h,m))}function Re(a){et.call(this),this.headers=new Map,this.L=a||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}p(Re,et);var s1=/^https?$/i,i1=["POST","PUT"];t=Re.prototype,t.Fa=function(a){this.H=a},t.ea=function(a,h,m,y){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);h=h?h.toUpperCase():"GET",this.D=a,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():Xm.g(),this.g.onreadystatechange=g(c(this.Ca,this));try{this.B=!0,this.g.open(h,String(a),!0),this.B=!1}catch(V){gg(this,V);return}if(a=m||"",m=new Map(this.headers),y)if(Object.getPrototypeOf(y)===Object.prototype)for(var N in y)m.set(N,y[N]);else if(typeof y.keys=="function"&&typeof y.get=="function")for(const V of y.keys())m.set(V,y.get(V));else throw Error("Unknown input type for opt_headers: "+String(y));y=Array.from(m.keys()).find(V=>V.toLowerCase()=="content-type"),N=o.FormData&&a instanceof o.FormData,!(Array.prototype.indexOf.call(i1,h,void 0)>=0)||y||N||m.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[V,z]of m)this.g.setRequestHeader(V,z);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(a),this.v=!1}catch(V){gg(this,V)}};function gg(a,h){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=h,a.o=5,yg(a),tl(a)}function yg(a){a.A||(a.A=!0,ct(a,"complete"),ct(a,"error"))}t.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=a||7,ct(this,"complete"),ct(this,"abort"),tl(this))},t.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),tl(this,!0)),Re.Z.N.call(this)},t.Ca=function(){this.u||(this.B||this.v||this.j?_g(this):this.Xa())},t.Xa=function(){_g(this)};function _g(a){if(a.h&&typeof i<"u"){if(a.v&&tr(a)==4)setTimeout(a.Ca.bind(a),0);else if(ct(a,"readystatechange"),tr(a)==4){a.h=!1;try{const V=a.ca();e:switch(V){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var h=!0;break e;default:h=!1}var m;if(!(m=h)){var y;if(y=V===0){let z=String(a.D).match(ag)[1]||null;!z&&o.self&&o.self.location&&(z=o.self.location.protocol.slice(0,-1)),y=!s1.test(z?z.toLowerCase():"")}m=y}if(m)ct(a,"complete"),ct(a,"success");else{a.o=6;try{var N=tr(a)>2?a.g.statusText:""}catch{N=""}a.l=N+" ["+a.ca()+"]",yg(a)}}finally{tl(a)}}}}function tl(a,h){if(a.g){a.m&&(clearTimeout(a.m),a.m=null);const m=a.g;a.g=null,h||ct(a,"ready");try{m.onreadystatechange=null}catch{}}}t.isActive=function(){return!!this.g};function tr(a){return a.g?a.g.readyState:0}t.ca=function(){try{return tr(this)>2?this.g.status:-1}catch{return-1}},t.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},t.La=function(a){if(this.g){var h=this.g.responseText;return a&&h.indexOf(a)==0&&(h=h.substring(a.length)),jI(h)}};function vg(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.F){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function o1(a){const h={};a=(a.g&&tr(a)>=2&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let y=0;y<a.length;y++){if(k(a[y]))continue;var m=qI(a[y]);const N=m[0];if(m=m[1],typeof m!="string")continue;m=m.trim();const V=h[N]||[];h[N]=V,V.push(m)}J(h,function(y){return y.join(", ")})}t.ya=function(){return this.o},t.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function uo(a,h,m){return m&&m.internalChannelParams&&m.internalChannelParams[a]||h}function wg(a){this.za=0,this.i=[],this.j=new Zi,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=uo("failFast",!1,a),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=uo("baseRetryDelayMs",5e3,a),this.Za=uo("retryDelaySeedMs",1e4,a),this.Ta=uo("forwardChannelMaxRetries",2,a),this.va=uo("forwardChannelRequestTimeoutMs",2e4,a),this.ma=a&&a.xmlHttpFactory||void 0,this.Ua=a&&a.Rb||void 0,this.Aa=a&&a.useFetchStreams||!1,this.O=void 0,this.L=a&&a.supportsCrossDomainXhr||!1,this.M="",this.h=new ng(a&&a.concurrentRequestLimit),this.Ba=new r1,this.S=a&&a.fastHandshake||!1,this.R=a&&a.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=a&&a.Pb||!1,a&&a.ua&&this.j.ua(),a&&a.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&a&&a.detectBufferingProxy||!1,this.ia=void 0,a&&a.longPollingTimeout&&a.longPollingTimeout>0&&(this.ia=a.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}t=wg.prototype,t.ka=8,t.I=1,t.connect=function(a,h,m,y){ht(0),this.W=a,this.H=h||{},m&&y!==void 0&&(this.H.OSID=m,this.H.OAID=y),this.F=this.X,this.J=Rg(this,null,this.W),rl(this)};function uh(a){if(Eg(a),a.I==3){var h=a.V++,m=un(a.J);if(me(m,"SID",a.M),me(m,"RID",h),me(m,"TYPE","terminate"),co(a,m),h=new Jn(a,a.j,h),h.M=2,h.A=Za(un(m)),m=!1,o.navigator&&o.navigator.sendBeacon)try{m=o.navigator.sendBeacon(h.A.toString(),"")}catch{}!m&&o.Image&&(new Image().src=h.A,m=!0),m||(h.g=bg(h.j,null),h.g.ea(h.A)),h.F=Date.now(),Ja(h)}Ag(a)}function nl(a){a.g&&(hh(a),a.g.cancel(),a.g=null)}function Eg(a){nl(a),a.v&&(o.clearTimeout(a.v),a.v=null),sl(a),a.h.cancel(),a.m&&(typeof a.m=="number"&&o.clearTimeout(a.m),a.m=null)}function rl(a){if(!rg(a.h)&&!a.m){a.m=!0;var h=a.Ea;j||_(),L||(j(),L=!0),E.add(h,a),a.D=0}}function a1(a,h){return sg(a.h)>=a.h.j-(a.m?1:0)?!1:a.m?(a.i=h.G.concat(a.i),!0):a.I==1||a.I==2||a.D>=(a.Sa?0:a.Ta)?!1:(a.m=Ji(c(a.Ea,a,h),Cg(a,a.D)),a.D++,!0)}t.Ea=function(a){if(this.m)if(this.m=null,this.I==1){if(!a){this.V=Math.floor(Math.random()*1e5),a=this.V++;const N=new Jn(this,this.j,a);let V=this.o;if(this.U&&(V?(V=ve(V),Jr(V,this.U)):V=this.U),this.u!==null||this.R||(N.J=V,V=null),this.S)e:{for(var h=0,m=0;m<this.i.length;m++){t:{var y=this.i[m];if("__data__"in y.map&&(y=y.map.__data__,typeof y=="string")){y=y.length;break t}y=void 0}if(y===void 0)break;if(h+=y,h>4096){h=m;break e}if(h===4096||m===this.i.length-1){h=m+1;break e}}h=1e3}else h=1e3;h=xg(this,N,h),m=un(this.J),me(m,"RID",a),me(m,"CVER",22),this.G&&me(m,"X-HTTP-Session-Id",this.G),co(this,m),V&&(this.R?h="headers="+eo(mg(V))+"&"+h:this.u&&lh(m,this.u,V)),ih(this.h,N),this.Ra&&me(m,"TYPE","init"),this.S?(me(m,"$req",h),me(m,"SID","null"),N.U=!0,th(N,m,null)):th(N,m,h),this.I=2}}else this.I==3&&(a?Tg(this,a):this.i.length==0||rg(this.h)||Tg(this))};function Tg(a,h){var m;h?m=h.l:m=a.V++;const y=un(a.J);me(y,"SID",a.M),me(y,"RID",m),me(y,"AID",a.K),co(a,y),a.u&&a.o&&lh(y,a.u,a.o),m=new Jn(a,a.j,m,a.D+1),a.u===null&&(m.J=a.o),h&&(a.i=h.G.concat(a.i)),h=xg(a,m,1e3),m.H=Math.round(a.va*.5)+Math.round(a.va*.5*Math.random()),ih(a.h,m),th(m,y,h)}function co(a,h){a.H&&Q(a.H,function(m,y){me(h,y,m)}),a.l&&Q({},function(m,y){me(h,y,m)})}function xg(a,h,m){m=Math.min(a.i.length,m);const y=a.l?c(a.l.Ka,a.l,a):null;e:{var N=a.i;let Z=-1;for(;;){const je=["count="+m];Z==-1?m>0?(Z=N[0].g,je.push("ofs="+Z)):Z=0:je.push("ofs="+Z);let he=!0;for(let $e=0;$e<m;$e++){var V=N[$e].g;const cn=N[$e].map;if(V-=Z,V<0)Z=Math.max(0,N[$e].g-100),he=!1;else try{V="req"+V+"_"||"";try{var z=cn instanceof Map?cn:Object.entries(cn);for(const[ss,nr]of z){let rr=nr;l(nr)&&(rr=Xc(nr)),je.push(V+ss+"="+encodeURIComponent(rr))}}catch(ss){throw je.push(V+"type="+encodeURIComponent("_badmap")),ss}}catch{y&&y(cn)}}if(he){z=je.join("&");break e}}z=void 0}return a=a.i.splice(0,m),h.G=a,z}function Ig(a){if(!a.g&&!a.v){a.Y=1;var h=a.Da;j||_(),L||(j(),L=!0),E.add(h,a),a.A=0}}function ch(a){return a.g||a.v||a.A>=3?!1:(a.Y++,a.v=Ji(c(a.Da,a),Cg(a,a.A)),a.A++,!0)}t.Da=function(){if(this.v=null,Sg(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var a=4*this.T;this.j.info("BP detection timer enabled: "+a),this.B=Ji(c(this.Wa,this),a)}},t.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,ht(10),nl(this),Sg(this))};function hh(a){a.B!=null&&(o.clearTimeout(a.B),a.B=null)}function Sg(a){a.g=new Jn(a,a.j,"rpc",a.Y),a.u===null&&(a.g.J=a.o),a.g.P=0;var h=un(a.na);me(h,"RID","rpc"),me(h,"SID",a.M),me(h,"AID",a.K),me(h,"CI",a.F?"0":"1"),!a.F&&a.ia&&me(h,"TO",a.ia),me(h,"TYPE","xmlhttp"),co(a,h),a.u&&a.o&&lh(h,a.u,a.o),a.O&&(a.g.H=a.O);var m=a.g;a=a.ba,m.M=1,m.A=Za(un(h)),m.u=null,m.R=!0,Zm(m,a)}t.Va=function(){this.C!=null&&(this.C=null,nl(this),ch(this),ht(19))};function sl(a){a.C!=null&&(o.clearTimeout(a.C),a.C=null)}function kg(a,h){var m=null;if(a.g==h){sl(a),hh(a),a.g=null;var y=2}else if(sh(a.h,h))m=h.G,ig(a.h,h),y=1;else return;if(a.I!=0){if(h.o)if(y==1){m=h.u?h.u.length:0,h=Date.now()-h.F;var N=a.D;y=Xa(),ct(y,new Km(y,m)),rl(a)}else Ig(a);else if(N=h.m,N==3||N==0&&h.X>0||!(y==1&&a1(a,h)||y==2&&ch(a)))switch(m&&m.length>0&&(h=a.h,h.i=h.i.concat(m)),N){case 1:rs(a,5);break;case 4:rs(a,10);break;case 3:rs(a,6);break;default:rs(a,2)}}}function Cg(a,h){let m=a.Qa+Math.floor(Math.random()*a.Za);return a.isActive()||(m*=2),m*h}function rs(a,h){if(a.j.info("Error code "+h),h==2){var m=c(a.bb,a),y=a.Ua;const N=!y;y=new Zn(y||"//www.google.com/images/cleardot.gif"),o.location&&o.location.protocol=="http"||no(y,"https"),Za(y),N?t1(y.toString(),m):n1(y.toString(),m)}else ht(2);a.I=0,a.l&&a.l.pa(h),Ag(a),Eg(a)}t.bb=function(a){a?(this.j.info("Successfully pinged google.com"),ht(2)):(this.j.info("Failed to ping google.com"),ht(1))};function Ag(a){if(a.I=0,a.ja=[],a.l){const h=og(a.h);(h.length!=0||a.i.length!=0)&&(S(a.ja,h),S(a.ja,a.i),a.h.i.length=0,w(a.i),a.i.length=0),a.l.oa()}}function Rg(a,h,m){var y=m instanceof Zn?un(m):new Zn(m);if(y.g!="")h&&(y.g=h+"."+y.g),ro(y,y.u);else{var N=o.location;y=N.protocol,h=h?h+"."+N.hostname:N.hostname,N=+N.port;const V=new Zn(null);y&&no(V,y),h&&(V.g=h),N&&ro(V,N),m&&(V.h=m),y=V}return m=a.G,h=a.wa,m&&h&&me(y,m,h),me(y,"VER",a.ka),co(a,y),y}function bg(a,h,m){if(h&&!a.L)throw Error("Can't create secondary domain capable XhrIo object.");return h=a.Aa&&!a.ma?new Re(new ah({ab:m})):new Re(a.ma),h.Fa(a.L),h}t.isActive=function(){return!!this.l&&this.l.isActive(this)};function Pg(){}t=Pg.prototype,t.ra=function(){},t.qa=function(){},t.pa=function(){},t.oa=function(){},t.isActive=function(){return!0},t.Ka=function(){};function il(){}il.prototype.g=function(a,h){return new kt(a,h)};function kt(a,h){et.call(this),this.g=new wg(h),this.l=a,this.h=h&&h.messageUrlParams||null,a=h&&h.messageHeaders||null,h&&h.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=h&&h.initMessageHeaders||null,h&&h.messageContentType&&(a?a["X-WebChannel-Content-Type"]=h.messageContentType:a={"X-WebChannel-Content-Type":h.messageContentType}),h&&h.sa&&(a?a["X-WebChannel-Client-Profile"]=h.sa:a={"X-WebChannel-Client-Profile":h.sa}),this.g.U=a,(a=h&&h.Qb)&&!k(a)&&(this.g.u=a),this.A=h&&h.supportsCrossDomainXhr||!1,this.v=h&&h.sendRawJson||!1,(h=h&&h.httpSessionIdParam)&&!k(h)&&(this.g.G=h,a=this.h,a!==null&&h in a&&(a=this.h,h in a&&delete a[h])),this.j=new Fs(this)}p(kt,et),kt.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},kt.prototype.close=function(){uh(this.g)},kt.prototype.o=function(a){var h=this.g;if(typeof a=="string"){var m={};m.__data__=a,a=m}else this.v&&(m={},m.__data__=Xc(a),a=m);h.i.push(new GI(h.Ya++,a)),h.I==3&&rl(h)},kt.prototype.N=function(){this.g.l=null,delete this.j,uh(this.g),delete this.g,kt.Z.N.call(this)};function Ng(a){Yc.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var h=a.__sm__;if(h){e:{for(const m in h){a=m;break e}a=void 0}(this.i=a)&&(a=this.i,h=h!==null&&a in h?h[a]:void 0),this.data=h}else this.data=a}p(Ng,Yc);function Dg(){Jc.call(this),this.status=1}p(Dg,Jc);function Fs(a){this.g=a}p(Fs,Pg),Fs.prototype.ra=function(){ct(this.g,"a")},Fs.prototype.qa=function(a){ct(this.g,new Ng(a))},Fs.prototype.pa=function(a){ct(this.g,new Dg)},Fs.prototype.oa=function(){ct(this.g,"b")},il.prototype.createWebChannel=il.prototype.g,kt.prototype.send=kt.prototype.o,kt.prototype.open=kt.prototype.m,kt.prototype.close=kt.prototype.close,LE=function(){return new il},VE=function(){return Xa()},OE=es,of={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},Ya.NO_ERROR=0,Ya.TIMEOUT=8,Ya.HTTP_ERROR=6,Wl=Ya,Qm.COMPLETE="complete",DE=Qm,qm.EventType=Xi,Xi.OPEN="a",Xi.CLOSE="b",Xi.ERROR="c",Xi.MESSAGE="d",et.prototype.listen=et.prototype.J,Ao=qm,Re.prototype.listenOnce=Re.prototype.K,Re.prototype.getLastError=Re.prototype.Ha,Re.prototype.getLastErrorCode=Re.prototype.ya,Re.prototype.getStatus=Re.prototype.ca,Re.prototype.getResponseJson=Re.prototype.La,Re.prototype.getResponseText=Re.prototype.la,Re.prototype.send=Re.prototype.ea,Re.prototype.setWithCredentials=Re.prototype.Fa,NE=Re}).apply(typeof Il<"u"?Il:typeof self<"u"?self:typeof window<"u"?window:{});/**
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
 */let ji="12.13.0";function ER(t){ji=t}/**
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
 */const xs=new Ap("@firebase/firestore");function $s(){return xs.logLevel}function q(t,...e){if(xs.logLevel<=re.DEBUG){const n=e.map(Pp);xs.debug(`Firestore (${ji}): ${t}`,...n)}}function Wn(t,...e){if(xs.logLevel<=re.ERROR){const n=e.map(Pp);xs.error(`Firestore (${ji}): ${t}`,...n)}}function Lr(t,...e){if(xs.logLevel<=re.WARN){const n=e.map(Pp);xs.warn(`Firestore (${ji}): ${t}`,...n)}}function Pp(t){if(typeof t=="string")return t;try{return function(n){return JSON.stringify(n)}(t)}catch{return t}}/**
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
 */function K(t,e,n){let r="Unexpected state";typeof e=="string"?r=e:n=e,ME(t,r,n)}function ME(t,e,n){let r=`FIRESTORE (${ji}) INTERNAL ASSERTION FAILED: ${e} (ID: ${t.toString(16)})`;if(n!==void 0)try{r+=" CONTEXT: "+JSON.stringify(n)}catch{r+=" CONTEXT: "+n}throw Wn(r),new Error(r)}function le(t,e,n,r){let s="Unexpected state";typeof n=="string"?s=n:r=n,t||ME(e,s,r)}function Y(t,e){return t}/**
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
 */class jE{constructor(e,n){this.user=n,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class UE{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,n){e.enqueueRetryable(()=>n(st.UNAUTHENTICATED))}shutdown(){}}class TR{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,n){this.changeListener=n,e.enqueueRetryable(()=>n(this.token.user))}shutdown(){this.changeListener=null}}class xR{constructor(e){this.t=e,this.currentUser=st.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,n){le(this.o===void 0,42304);let r=this.i;const s=u=>this.i!==r?(r=this.i,n(u)):Promise.resolve();let i=new Mn;this.o=()=>{this.i++,this.currentUser=this.u(),i.resolve(),i=new Mn,e.enqueueRetryable(()=>s(this.currentUser))};const o=()=>{const u=i;e.enqueueRetryable(async()=>{await u.promise,await s(this.currentUser)})},l=u=>{q("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=u,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(u=>l(u)),setTimeout(()=>{if(!this.auth){const u=this.t.getImmediate({optional:!0});u?l(u):(q("FirebaseAuthCredentialsProvider","Auth not yet detected"),i.resolve(),i=new Mn)}},0),o()}getToken(){const e=this.i,n=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(n).then(r=>this.i!==e?(q("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(le(typeof r.accessToken=="string",31837,{l:r}),new jE(r.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return le(e===null||typeof e=="string",2055,{h:e}),new st(e)}}class IR{constructor(e,n,r){this.P=e,this.T=n,this.I=r,this.type="FirstParty",this.user=st.FIRST_PARTY,this.R=new Map}A(){return this.I?this.I():null}get headers(){this.R.set("X-Goog-AuthUser",this.P);const e=this.A();return e&&this.R.set("Authorization",e),this.T&&this.R.set("X-Goog-Iam-Authorization-Token",this.T),this.R}}class SR{constructor(e,n,r){this.P=e,this.T=n,this.I=r}getToken(){return Promise.resolve(new IR(this.P,this.T,this.I))}start(e,n){e.enqueueRetryable(()=>n(st.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class c_{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class kR{constructor(e,n){this.V=n,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,At(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,n){le(this.o===void 0,3512);const r=i=>{i.error!=null&&q("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${i.error.message}`);const o=i.token!==this.m;return this.m=i.token,q("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?n(i.token):Promise.resolve()};this.o=i=>{e.enqueueRetryable(()=>r(i))};const s=i=>{q("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=i,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit(i=>s(i)),setTimeout(()=>{if(!this.appCheck){const i=this.V.getImmediate({optional:!0});i?s(i):q("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.p)return Promise.resolve(new c_(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(n=>n?(le(typeof n.token=="string",44558,{tokenResult:n}),this.m=n.token,new c_(n.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
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
 */function CR(t){const e=typeof self<"u"&&(self.crypto||self.msCrypto),n=new Uint8Array(t);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(n);else for(let r=0;r<t;r++)n[r]=Math.floor(256*Math.random());return n}/**
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
 */class gc{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",n=62*Math.floor(4.129032258064516);let r="";for(;r.length<20;){const s=CR(40);for(let i=0;i<s.length;++i)r.length<20&&s[i]<n&&(r+=e.charAt(s[i]%62))}return r}}function ee(t,e){return t<e?-1:t>e?1:0}function af(t,e){const n=Math.min(t.length,e.length);for(let r=0;r<n;r++){const s=t.charAt(r),i=e.charAt(r);if(s!==i)return Hh(s)===Hh(i)?ee(s,i):Hh(s)?1:-1}return ee(t.length,e.length)}const AR=55296,RR=57343;function Hh(t){const e=t.charCodeAt(0);return e>=AR&&e<=RR}function Si(t,e,n){return t.length===e.length&&t.every((r,s)=>n(r,e[s]))}/**
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
 */const h_="__name__";class fn{constructor(e,n,r){n===void 0?n=0:n>e.length&&K(637,{offset:n,range:e.length}),r===void 0?r=e.length-n:r>e.length-n&&K(1746,{length:r,range:e.length-n}),this.segments=e,this.offset=n,this.len=r}get length(){return this.len}isEqual(e){return fn.comparator(this,e)===0}child(e){const n=this.segments.slice(this.offset,this.limit());return e instanceof fn?e.forEach(r=>{n.push(r)}):n.push(e),this.construct(n)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let n=0;n<this.length;n++)if(this.get(n)!==e.get(n))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let n=0;n<this.length;n++)if(this.get(n)!==e.get(n))return!1;return!0}forEach(e){for(let n=this.offset,r=this.limit();n<r;n++)e(this.segments[n])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,n){const r=Math.min(e.length,n.length);for(let s=0;s<r;s++){const i=fn.compareSegments(e.get(s),n.get(s));if(i!==0)return i}return ee(e.length,n.length)}static compareSegments(e,n){const r=fn.isNumericId(e),s=fn.isNumericId(n);return r&&!s?-1:!r&&s?1:r&&s?fn.extractNumericId(e).compare(fn.extractNumericId(n)):af(e,n)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return Ar.fromString(e.substring(4,e.length-2))}}class de extends fn{construct(e,n,r){return new de(e,n,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const n=[];for(const r of e){if(r.indexOf("//")>=0)throw new B(M.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);n.push(...r.split("/").filter(s=>s.length>0))}return new de(n)}static emptyPath(){return new de([])}}const bR=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class We extends fn{construct(e,n,r){return new We(e,n,r)}static isValidIdentifier(e){return bR.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),We.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===h_}static keyField(){return new We([h_])}static fromServerFormat(e){const n=[];let r="",s=0;const i=()=>{if(r.length===0)throw new B(M.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);n.push(r),r=""};let o=!1;for(;s<e.length;){const l=e[s];if(l==="\\"){if(s+1===e.length)throw new B(M.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const u=e[s+1];if(u!=="\\"&&u!=="."&&u!=="`")throw new B(M.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=u,s+=2}else l==="`"?(o=!o,s++):l!=="."||o?(r+=l,s++):(i(),s++)}if(i(),o)throw new B(M.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new We(n)}static emptyPath(){return new We([])}}/**
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
 */function FE(t,e,n){if(!n)throw new B(M.INVALID_ARGUMENT,`Function ${t}() cannot be called with an empty ${e}.`)}function zE(t,e,n,r){if(e===!0&&r===!0)throw new B(M.INVALID_ARGUMENT,`${t} and ${n} cannot be used together.`)}function d_(t){if(!W.isDocumentKey(t))throw new B(M.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${t} has ${t.length}.`)}function f_(t){if(W.isDocumentKey(t))throw new B(M.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${t} has ${t.length}.`)}function BE(t){return typeof t=="object"&&t!==null&&(Object.getPrototypeOf(t)===Object.prototype||Object.getPrototypeOf(t)===null)}function yc(t){if(t===void 0)return"undefined";if(t===null)return"null";if(typeof t=="string")return t.length>20&&(t=`${t.substring(0,20)}...`),JSON.stringify(t);if(typeof t=="number"||typeof t=="boolean")return""+t;if(typeof t=="object"){if(t instanceof Array)return"an array";{const e=function(r){return r.constructor?r.constructor.name:null}(t);return e?`a custom ${e} object`:"an object"}}return typeof t=="function"?"a function":K(12329,{type:typeof t})}function at(t,e){if("_delegate"in t&&(t=t._delegate),!(t instanceof e)){if(e.name===t.constructor.name)throw new B(M.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const n=yc(t);throw new B(M.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${n}`)}}return t}/**
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
 */function Me(t,e){const n={typeString:t};return e&&(n.value=e),n}function Da(t,e){if(!BE(t))throw new B(M.INVALID_ARGUMENT,"JSON must be an object");let n;for(const r in e)if(e[r]){const s=e[r].typeString,i="value"in e[r]?{value:e[r].value}:void 0;if(!(r in t)){n=`JSON missing required field: '${r}'`;break}const o=t[r];if(s&&typeof o!==s){n=`JSON field '${r}' must be a ${s}.`;break}if(i!==void 0&&o!==i.value){n=`Expected '${r}' field to equal '${i.value}'`;break}}if(n)throw new B(M.INVALID_ARGUMENT,n);return!0}/**
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
 */const p_=-62135596800,m_=1e6;class fe{static now(){return fe.fromMillis(Date.now())}static fromDate(e){return fe.fromMillis(e.getTime())}static fromMillis(e){const n=Math.floor(e/1e3),r=Math.floor((e-1e3*n)*m_);return new fe(n,r)}constructor(e,n){if(this.seconds=e,this.nanoseconds=n,n<0)throw new B(M.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+n);if(n>=1e9)throw new B(M.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+n);if(e<p_)throw new B(M.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new B(M.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/m_}_compareTo(e){return this.seconds===e.seconds?ee(this.nanoseconds,e.nanoseconds):ee(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:fe._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(Da(e,fe._jsonSchema))return new fe(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-p_;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}fe._jsonSchemaVersion="firestore/timestamp/1.0",fe._jsonSchema={type:Me("string",fe._jsonSchemaVersion),seconds:Me("number"),nanoseconds:Me("number")};/**
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
 */const pa=-1;function PR(t,e){const n=t.toTimestamp().seconds,r=t.toTimestamp().nanoseconds+1,s=X.fromTimestamp(r===1e9?new fe(n+1,0):new fe(n,r));return new Mr(s,W.empty(),e)}function NR(t){return new Mr(t.readTime,t.key,pa)}class Mr{constructor(e,n,r){this.readTime=e,this.documentKey=n,this.largestBatchId=r}static min(){return new Mr(X.min(),W.empty(),pa)}static max(){return new Mr(X.max(),W.empty(),pa)}}function DR(t,e){let n=t.readTime.compareTo(e.readTime);return n!==0?n:(n=W.comparator(t.documentKey,e.documentKey),n!==0?n:ee(t.largestBatchId,e.largestBatchId))}/**
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
 */const OR="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class VR{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
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
 */async function Ui(t){if(t.code!==M.FAILED_PRECONDITION||t.message!==OR)throw t;q("LocalStore","Unexpectedly lost primary lease")}/**
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
 */class U{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(n=>{this.isDone=!0,this.result=n,this.nextCallback&&this.nextCallback(n)},n=>{this.isDone=!0,this.error=n,this.catchCallback&&this.catchCallback(n)})}catch(e){return this.next(void 0,e)}next(e,n){return this.callbackAttached&&K(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(n,this.error):this.wrapSuccess(e,this.result):new U((r,s)=>{this.nextCallback=i=>{this.wrapSuccess(e,i).next(r,s)},this.catchCallback=i=>{this.wrapFailure(n,i).next(r,s)}})}toPromise(){return new Promise((e,n)=>{this.next(e,n)})}wrapUserFunction(e){try{const n=e();return n instanceof U?n:U.resolve(n)}catch(n){return U.reject(n)}}wrapSuccess(e,n){return e?this.wrapUserFunction(()=>e(n)):U.resolve(n)}wrapFailure(e,n){return e?this.wrapUserFunction(()=>e(n)):U.reject(n)}static resolve(e){return new U((n,r)=>{n(e)})}static reject(e){return new U((n,r)=>{r(e)})}static waitFor(e){return new U((n,r)=>{let s=0,i=0,o=!1;e.forEach(l=>{++s,l.next(()=>{++i,o&&i===s&&n()},u=>r(u))}),o=!0,i===s&&n()})}static or(e){let n=U.resolve(!1);for(const r of e)n=n.next(s=>s?U.resolve(s):r());return n}static forEach(e,n){const r=[];return e.forEach((s,i)=>{r.push(n.call(this,s,i))}),this.waitFor(r)}static mapArray(e,n){return new U((r,s)=>{const i=e.length,o=new Array(i);let l=0;for(let u=0;u<i;u++){const c=u;n(e[c]).next(f=>{o[c]=f,++l,l===i&&r(o)},f=>s(f))}})}static doWhile(e,n){return new U((r,s)=>{const i=()=>{e()===!0?n().next(()=>{i()},s):r()};i()})}}function LR(t){const e=t.match(/Android ([\d.]+)/i),n=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(n)}function Fi(t){return t.name==="IndexedDbTransactionError"}/**
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
 */class _c{constructor(e,n){this.previousValue=e,n&&(n.sequenceNumberHandler=r=>this.ae(r),this.ue=r=>n.writeSequenceNumber(r))}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ue&&this.ue(e),e}}_c.ce=-1;/**
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
 */const Np=-1;function vc(t){return t==null}function bu(t){return t===0&&1/t==-1/0}function MR(t){return typeof t=="number"&&Number.isInteger(t)&&!bu(t)&&t<=Number.MAX_SAFE_INTEGER&&t>=Number.MIN_SAFE_INTEGER}/**
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
 */const $E="";function jR(t){let e="";for(let n=0;n<t.length;n++)e.length>0&&(e=g_(e)),e=UR(t.get(n),e);return g_(e)}function UR(t,e){let n=e;const r=t.length;for(let s=0;s<r;s++){const i=t.charAt(s);switch(i){case"\0":n+="";break;case $E:n+="";break;default:n+=i}}return n}function g_(t){return t+$E+""}/**
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
 */function y_(t){let e=0;for(const n in t)Object.prototype.hasOwnProperty.call(t,n)&&e++;return e}function Qr(t,e){for(const n in t)Object.prototype.hasOwnProperty.call(t,n)&&e(n,t[n])}function qE(t){for(const e in t)if(Object.prototype.hasOwnProperty.call(t,e))return!1;return!0}/**
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
 */class Be{constructor(e){this.comparator=e,this.data=new Te(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((n,r)=>(e(n),!1))}forEachInRange(e,n){const r=this.data.getIteratorFrom(e[0]);for(;r.hasNext();){const s=r.getNext();if(this.comparator(s.key,e[1])>=0)return;n(s.key)}}forEachWhile(e,n){let r;for(r=n!==void 0?this.data.getIteratorFrom(n):this.data.getIterator();r.hasNext();)if(!e(r.getNext().key))return}firstAfterOrEqual(e){const n=this.data.getIteratorFrom(e);return n.hasNext()?n.getNext().key:null}getIterator(){return new __(this.data.getIterator())}getIteratorFrom(e){return new __(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let n=this;return n.size<e.size&&(n=e,e=this),e.forEach(r=>{n=n.add(r)}),n}isEqual(e){if(!(e instanceof Be)||this.size!==e.size)return!1;const n=this.data.getIterator(),r=e.data.getIterator();for(;n.hasNext();){const s=n.getNext().key,i=r.getNext().key;if(this.comparator(s,i)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(n=>{e.push(n)}),e}toString(){const e=[];return this.forEach(n=>e.push(n)),"SortedSet("+e.toString()+")"}copy(e){const n=new Be(this.comparator);return n.data=e,n}}class __{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}/**
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
 */class Pt{constructor(e){this.fields=e,e.sort(We.comparator)}static empty(){return new Pt([])}unionWith(e){let n=new Be(We.comparator);for(const r of this.fields)n=n.add(r);for(const r of e)n=n.add(r);return new Pt(n.toArray())}covers(e){for(const n of this.fields)if(n.isPrefixOf(e))return!0;return!1}isEqual(e){return Si(this.fields,e.fields,(n,r)=>n.isEqual(r))}}/**
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
 */class HE extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
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
 */class Ke{constructor(e){this.binaryString=e}static fromBase64String(e){const n=function(s){try{return atob(s)}catch(i){throw typeof DOMException<"u"&&i instanceof DOMException?new HE("Invalid base64 string: "+i):i}}(e);return new Ke(n)}static fromUint8Array(e){const n=function(s){let i="";for(let o=0;o<s.length;++o)i+=String.fromCharCode(s[o]);return i}(e);return new Ke(n)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(n){return btoa(n)}(this.binaryString)}toUint8Array(){return function(n){const r=new Uint8Array(n.length);for(let s=0;s<n.length;s++)r[s]=n.charCodeAt(s);return r}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return ee(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}Ke.EMPTY_BYTE_STRING=new Ke("");const FR=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function jr(t){if(le(!!t,39018),typeof t=="string"){let e=0;const n=FR.exec(t);if(le(!!n,46558,{timestamp:t}),n[1]){let s=n[1];s=(s+"000000000").substr(0,9),e=Number(s)}const r=new Date(t);return{seconds:Math.floor(r.getTime()/1e3),nanos:e}}return{seconds:Ne(t.seconds),nanos:Ne(t.nanos)}}function Ne(t){return typeof t=="number"?t:typeof t=="string"?Number(t):0}function Ur(t){return typeof t=="string"?Ke.fromBase64String(t):Ke.fromUint8Array(t)}/**
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
 */const WE="server_timestamp",GE="__type__",KE="__previous_value__",QE="__local_write_time__";function Dp(t){var n,r;return((r=(((n=t==null?void 0:t.mapValue)==null?void 0:n.fields)||{})[GE])==null?void 0:r.stringValue)===WE}function wc(t){const e=t.mapValue.fields[KE];return Dp(e)?wc(e):e}function ma(t){const e=jr(t.mapValue.fields[QE].timestampValue);return new fe(e.seconds,e.nanos)}/**
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
 */class zR{constructor(e,n,r,s,i,o,l,u,c,f,p){this.databaseId=e,this.appId=n,this.persistenceKey=r,this.host=s,this.ssl=i,this.forceLongPolling=o,this.autoDetectLongPolling=l,this.longPollingOptions=u,this.useFetchStreams=c,this.isUsingEmulator=f,this.apiKey=p}}const Pu="(default)";class ki{constructor(e,n){this.projectId=e,this.database=n||Pu}static empty(){return new ki("","")}get isDefaultDatabase(){return this.database===Pu}isEqual(e){return e instanceof ki&&e.projectId===this.projectId&&e.database===this.database}}function BR(t,e){if(!Object.prototype.hasOwnProperty.apply(t.options,["projectId"]))throw new B(M.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new ki(t.options.projectId,e)}/**
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
 */const XE="__type__",$R="__max__",kl={mapValue:{}},YE="__vector__",Nu="value";function Fr(t){return"nullValue"in t?0:"booleanValue"in t?1:"integerValue"in t||"doubleValue"in t?2:"timestampValue"in t?3:"stringValue"in t?5:"bytesValue"in t?6:"referenceValue"in t?7:"geoPointValue"in t?8:"arrayValue"in t?9:"mapValue"in t?Dp(t)?4:HR(t)?9007199254740991:qR(t)?10:11:K(28295,{value:t})}function Tn(t,e){if(t===e)return!0;const n=Fr(t);if(n!==Fr(e))return!1;switch(n){case 0:case 9007199254740991:return!0;case 1:return t.booleanValue===e.booleanValue;case 4:return ma(t).isEqual(ma(e));case 3:return function(s,i){if(typeof s.timestampValue=="string"&&typeof i.timestampValue=="string"&&s.timestampValue.length===i.timestampValue.length)return s.timestampValue===i.timestampValue;const o=jr(s.timestampValue),l=jr(i.timestampValue);return o.seconds===l.seconds&&o.nanos===l.nanos}(t,e);case 5:return t.stringValue===e.stringValue;case 6:return function(s,i){return Ur(s.bytesValue).isEqual(Ur(i.bytesValue))}(t,e);case 7:return t.referenceValue===e.referenceValue;case 8:return function(s,i){return Ne(s.geoPointValue.latitude)===Ne(i.geoPointValue.latitude)&&Ne(s.geoPointValue.longitude)===Ne(i.geoPointValue.longitude)}(t,e);case 2:return function(s,i){if("integerValue"in s&&"integerValue"in i)return Ne(s.integerValue)===Ne(i.integerValue);if("doubleValue"in s&&"doubleValue"in i){const o=Ne(s.doubleValue),l=Ne(i.doubleValue);return o===l?bu(o)===bu(l):isNaN(o)&&isNaN(l)}return!1}(t,e);case 9:return Si(t.arrayValue.values||[],e.arrayValue.values||[],Tn);case 10:case 11:return function(s,i){const o=s.mapValue.fields||{},l=i.mapValue.fields||{};if(y_(o)!==y_(l))return!1;for(const u in o)if(o.hasOwnProperty(u)&&(l[u]===void 0||!Tn(o[u],l[u])))return!1;return!0}(t,e);default:return K(52216,{left:t})}}function ga(t,e){return(t.values||[]).find(n=>Tn(n,e))!==void 0}function Ci(t,e){if(t===e)return 0;const n=Fr(t),r=Fr(e);if(n!==r)return ee(n,r);switch(n){case 0:case 9007199254740991:return 0;case 1:return ee(t.booleanValue,e.booleanValue);case 2:return function(i,o){const l=Ne(i.integerValue||i.doubleValue),u=Ne(o.integerValue||o.doubleValue);return l<u?-1:l>u?1:l===u?0:isNaN(l)?isNaN(u)?0:-1:1}(t,e);case 3:return v_(t.timestampValue,e.timestampValue);case 4:return v_(ma(t),ma(e));case 5:return af(t.stringValue,e.stringValue);case 6:return function(i,o){const l=Ur(i),u=Ur(o);return l.compareTo(u)}(t.bytesValue,e.bytesValue);case 7:return function(i,o){const l=i.split("/"),u=o.split("/");for(let c=0;c<l.length&&c<u.length;c++){const f=ee(l[c],u[c]);if(f!==0)return f}return ee(l.length,u.length)}(t.referenceValue,e.referenceValue);case 8:return function(i,o){const l=ee(Ne(i.latitude),Ne(o.latitude));return l!==0?l:ee(Ne(i.longitude),Ne(o.longitude))}(t.geoPointValue,e.geoPointValue);case 9:return w_(t.arrayValue,e.arrayValue);case 10:return function(i,o){var g,w,S,b;const l=i.fields||{},u=o.fields||{},c=(g=l[Nu])==null?void 0:g.arrayValue,f=(w=u[Nu])==null?void 0:w.arrayValue,p=ee(((S=c==null?void 0:c.values)==null?void 0:S.length)||0,((b=f==null?void 0:f.values)==null?void 0:b.length)||0);return p!==0?p:w_(c,f)}(t.mapValue,e.mapValue);case 11:return function(i,o){if(i===kl.mapValue&&o===kl.mapValue)return 0;if(i===kl.mapValue)return 1;if(o===kl.mapValue)return-1;const l=i.fields||{},u=Object.keys(l),c=o.fields||{},f=Object.keys(c);u.sort(),f.sort();for(let p=0;p<u.length&&p<f.length;++p){const g=af(u[p],f[p]);if(g!==0)return g;const w=Ci(l[u[p]],c[f[p]]);if(w!==0)return w}return ee(u.length,f.length)}(t.mapValue,e.mapValue);default:throw K(23264,{he:n})}}function v_(t,e){if(typeof t=="string"&&typeof e=="string"&&t.length===e.length)return ee(t,e);const n=jr(t),r=jr(e),s=ee(n.seconds,r.seconds);return s!==0?s:ee(n.nanos,r.nanos)}function w_(t,e){const n=t.values||[],r=e.values||[];for(let s=0;s<n.length&&s<r.length;++s){const i=Ci(n[s],r[s]);if(i)return i}return ee(n.length,r.length)}function Ai(t){return lf(t)}function lf(t){return"nullValue"in t?"null":"booleanValue"in t?""+t.booleanValue:"integerValue"in t?""+t.integerValue:"doubleValue"in t?""+t.doubleValue:"timestampValue"in t?function(n){const r=jr(n);return`time(${r.seconds},${r.nanos})`}(t.timestampValue):"stringValue"in t?t.stringValue:"bytesValue"in t?function(n){return Ur(n).toBase64()}(t.bytesValue):"referenceValue"in t?function(n){return W.fromName(n).toString()}(t.referenceValue):"geoPointValue"in t?function(n){return`geo(${n.latitude},${n.longitude})`}(t.geoPointValue):"arrayValue"in t?function(n){let r="[",s=!0;for(const i of n.values||[])s?s=!1:r+=",",r+=lf(i);return r+"]"}(t.arrayValue):"mapValue"in t?function(n){const r=Object.keys(n.fields||{}).sort();let s="{",i=!0;for(const o of r)i?i=!1:s+=",",s+=`${o}:${lf(n.fields[o])}`;return s+"}"}(t.mapValue):K(61005,{value:t})}function Gl(t){switch(Fr(t)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=wc(t);return e?16+Gl(e):16;case 5:return 2*t.stringValue.length;case 6:return Ur(t.bytesValue).approximateByteSize();case 7:return t.referenceValue.length;case 9:return function(r){return(r.values||[]).reduce((s,i)=>s+Gl(i),0)}(t.arrayValue);case 10:case 11:return function(r){let s=0;return Qr(r.fields,(i,o)=>{s+=i.length+Gl(o)}),s}(t.mapValue);default:throw K(13486,{value:t})}}function E_(t,e){return{referenceValue:`projects/${t.projectId}/databases/${t.database}/documents/${e.path.canonicalString()}`}}function uf(t){return!!t&&"integerValue"in t}function Op(t){return!!t&&"arrayValue"in t}function T_(t){return!!t&&"nullValue"in t}function x_(t){return!!t&&"doubleValue"in t&&isNaN(Number(t.doubleValue))}function Kl(t){return!!t&&"mapValue"in t}function qR(t){var n,r;return((r=(((n=t==null?void 0:t.mapValue)==null?void 0:n.fields)||{})[XE])==null?void 0:r.stringValue)===YE}function Fo(t){if(t.geoPointValue)return{geoPointValue:{...t.geoPointValue}};if(t.timestampValue&&typeof t.timestampValue=="object")return{timestampValue:{...t.timestampValue}};if(t.mapValue){const e={mapValue:{fields:{}}};return Qr(t.mapValue.fields,(n,r)=>e.mapValue.fields[n]=Fo(r)),e}if(t.arrayValue){const e={arrayValue:{values:[]}};for(let n=0;n<(t.arrayValue.values||[]).length;++n)e.arrayValue.values[n]=Fo(t.arrayValue.values[n]);return e}return{...t}}function HR(t){return(((t.mapValue||{}).fields||{}).__type__||{}).stringValue===$R}/**
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
 */class Et{constructor(e){this.value=e}static empty(){return new Et({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let n=this.value;for(let r=0;r<e.length-1;++r)if(n=(n.mapValue.fields||{})[e.get(r)],!Kl(n))return null;return n=(n.mapValue.fields||{})[e.lastSegment()],n||null}}set(e,n){this.getFieldsMap(e.popLast())[e.lastSegment()]=Fo(n)}setAll(e){let n=We.emptyPath(),r={},s=[];e.forEach((o,l)=>{if(!n.isImmediateParentOf(l)){const u=this.getFieldsMap(n);this.applyChanges(u,r,s),r={},s=[],n=l.popLast()}o?r[l.lastSegment()]=Fo(o):s.push(l.lastSegment())});const i=this.getFieldsMap(n);this.applyChanges(i,r,s)}delete(e){const n=this.field(e.popLast());Kl(n)&&n.mapValue.fields&&delete n.mapValue.fields[e.lastSegment()]}isEqual(e){return Tn(this.value,e.value)}getFieldsMap(e){let n=this.value;n.mapValue.fields||(n.mapValue={fields:{}});for(let r=0;r<e.length;++r){let s=n.mapValue.fields[e.get(r)];Kl(s)&&s.mapValue.fields||(s={mapValue:{fields:{}}},n.mapValue.fields[e.get(r)]=s),n=s}return n.mapValue.fields}applyChanges(e,n,r){Qr(n,(s,i)=>e[s]=i);for(const s of r)delete e[s]}clone(){return new Et(Fo(this.value))}}function JE(t){const e=[];return Qr(t.fields,(n,r)=>{const s=new We([n]);if(Kl(r)){const i=JE(r.mapValue).fields;if(i.length===0)e.push(s);else for(const o of i)e.push(s.child(o))}else e.push(s)}),new Pt(e)}/**
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
 */class Du{constructor(e,n){this.position=e,this.inclusive=n}}function I_(t,e,n){let r=0;for(let s=0;s<t.position.length;s++){const i=e[s],o=t.position[s];if(i.field.isKeyField()?r=W.comparator(W.fromName(o.referenceValue),n.key):r=Ci(o,n.data.field(i.field)),i.dir==="desc"&&(r*=-1),r!==0)break}return r}function S_(t,e){if(t===null)return e===null;if(e===null||t.inclusive!==e.inclusive||t.position.length!==e.position.length)return!1;for(let n=0;n<t.position.length;n++)if(!Tn(t.position[n],e.position[n]))return!1;return!0}/**
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
 */class ya{constructor(e,n="asc"){this.field=e,this.dir=n}}function WR(t,e){return t.dir===e.dir&&t.field.isEqual(e.field)}/**
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
 */class ZE{}class Le extends ZE{constructor(e,n,r){super(),this.field=e,this.op=n,this.value=r}static create(e,n,r){return e.isKeyField()?n==="in"||n==="not-in"?this.createKeyFieldInFilter(e,n,r):new KR(e,n,r):n==="array-contains"?new YR(e,r):n==="in"?new JR(e,r):n==="not-in"?new ZR(e,r):n==="array-contains-any"?new eb(e,r):new Le(e,n,r)}static createKeyFieldInFilter(e,n,r){return n==="in"?new QR(e,r):new XR(e,r)}matches(e){const n=e.data.field(this.field);return this.op==="!="?n!==null&&n.nullValue===void 0&&this.matchesComparison(Ci(n,this.value)):n!==null&&Fr(this.value)===Fr(n)&&this.matchesComparison(Ci(n,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return K(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class on extends ZE{constructor(e,n){super(),this.filters=e,this.op=n,this.Pe=null}static create(e,n){return new on(e,n)}matches(e){return eT(this)?this.filters.find(n=>!n.matches(e))===void 0:this.filters.find(n=>n.matches(e))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce((e,n)=>e.concat(n.getFlattenedFilters()),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function eT(t){return t.op==="and"}function tT(t){return GR(t)&&eT(t)}function GR(t){for(const e of t.filters)if(e instanceof on)return!1;return!0}function cf(t){if(t instanceof Le)return t.field.canonicalString()+t.op.toString()+Ai(t.value);if(tT(t))return t.filters.map(e=>cf(e)).join(",");{const e=t.filters.map(n=>cf(n)).join(",");return`${t.op}(${e})`}}function nT(t,e){return t instanceof Le?function(r,s){return s instanceof Le&&r.op===s.op&&r.field.isEqual(s.field)&&Tn(r.value,s.value)}(t,e):t instanceof on?function(r,s){return s instanceof on&&r.op===s.op&&r.filters.length===s.filters.length?r.filters.reduce((i,o,l)=>i&&nT(o,s.filters[l]),!0):!1}(t,e):void K(19439)}function rT(t){return t instanceof Le?function(n){return`${n.field.canonicalString()} ${n.op} ${Ai(n.value)}`}(t):t instanceof on?function(n){return n.op.toString()+" {"+n.getFilters().map(rT).join(" ,")+"}"}(t):"Filter"}class KR extends Le{constructor(e,n,r){super(e,n,r),this.key=W.fromName(r.referenceValue)}matches(e){const n=W.comparator(e.key,this.key);return this.matchesComparison(n)}}class QR extends Le{constructor(e,n){super(e,"in",n),this.keys=sT("in",n)}matches(e){return this.keys.some(n=>n.isEqual(e.key))}}class XR extends Le{constructor(e,n){super(e,"not-in",n),this.keys=sT("not-in",n)}matches(e){return!this.keys.some(n=>n.isEqual(e.key))}}function sT(t,e){var n;return(((n=e.arrayValue)==null?void 0:n.values)||[]).map(r=>W.fromName(r.referenceValue))}class YR extends Le{constructor(e,n){super(e,"array-contains",n)}matches(e){const n=e.data.field(this.field);return Op(n)&&ga(n.arrayValue,this.value)}}class JR extends Le{constructor(e,n){super(e,"in",n)}matches(e){const n=e.data.field(this.field);return n!==null&&ga(this.value.arrayValue,n)}}class ZR extends Le{constructor(e,n){super(e,"not-in",n)}matches(e){if(ga(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const n=e.data.field(this.field);return n!==null&&n.nullValue===void 0&&!ga(this.value.arrayValue,n)}}class eb extends Le{constructor(e,n){super(e,"array-contains-any",n)}matches(e){const n=e.data.field(this.field);return!(!Op(n)||!n.arrayValue.values)&&n.arrayValue.values.some(r=>ga(this.value.arrayValue,r))}}/**
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
 */class tb{constructor(e,n=null,r=[],s=[],i=null,o=null,l=null){this.path=e,this.collectionGroup=n,this.orderBy=r,this.filters=s,this.limit=i,this.startAt=o,this.endAt=l,this.Te=null}}function k_(t,e=null,n=[],r=[],s=null,i=null,o=null){return new tb(t,e,n,r,s,i,o)}function Vp(t){const e=Y(t);if(e.Te===null){let n=e.path.canonicalString();e.collectionGroup!==null&&(n+="|cg:"+e.collectionGroup),n+="|f:",n+=e.filters.map(r=>cf(r)).join(","),n+="|ob:",n+=e.orderBy.map(r=>function(i){return i.field.canonicalString()+i.dir}(r)).join(","),vc(e.limit)||(n+="|l:",n+=e.limit),e.startAt&&(n+="|lb:",n+=e.startAt.inclusive?"b:":"a:",n+=e.startAt.position.map(r=>Ai(r)).join(",")),e.endAt&&(n+="|ub:",n+=e.endAt.inclusive?"a:":"b:",n+=e.endAt.position.map(r=>Ai(r)).join(",")),e.Te=n}return e.Te}function Lp(t,e){if(t.limit!==e.limit||t.orderBy.length!==e.orderBy.length)return!1;for(let n=0;n<t.orderBy.length;n++)if(!WR(t.orderBy[n],e.orderBy[n]))return!1;if(t.filters.length!==e.filters.length)return!1;for(let n=0;n<t.filters.length;n++)if(!nT(t.filters[n],e.filters[n]))return!1;return t.collectionGroup===e.collectionGroup&&!!t.path.isEqual(e.path)&&!!S_(t.startAt,e.startAt)&&S_(t.endAt,e.endAt)}function hf(t){return W.isDocumentKey(t.path)&&t.collectionGroup===null&&t.filters.length===0}/**
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
 */class zi{constructor(e,n=null,r=[],s=[],i=null,o="F",l=null,u=null){this.path=e,this.collectionGroup=n,this.explicitOrderBy=r,this.filters=s,this.limit=i,this.limitType=o,this.startAt=l,this.endAt=u,this.Ie=null,this.Ee=null,this.Re=null,this.startAt,this.endAt}}function nb(t,e,n,r,s,i,o,l){return new zi(t,e,n,r,s,i,o,l)}function Ec(t){return new zi(t)}function C_(t){return t.filters.length===0&&t.limit===null&&t.startAt==null&&t.endAt==null&&(t.explicitOrderBy.length===0||t.explicitOrderBy.length===1&&t.explicitOrderBy[0].field.isKeyField())}function rb(t){return W.isDocumentKey(t.path)&&t.collectionGroup===null&&t.filters.length===0}function iT(t){return t.collectionGroup!==null}function zo(t){const e=Y(t);if(e.Ie===null){e.Ie=[];const n=new Set;for(const i of e.explicitOrderBy)e.Ie.push(i),n.add(i.field.canonicalString());const r=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let l=new Be(We.comparator);return o.filters.forEach(u=>{u.getFlattenedFilters().forEach(c=>{c.isInequality()&&(l=l.add(c.field))})}),l})(e).forEach(i=>{n.has(i.canonicalString())||i.isKeyField()||e.Ie.push(new ya(i,r))}),n.has(We.keyField().canonicalString())||e.Ie.push(new ya(We.keyField(),r))}return e.Ie}function vn(t){const e=Y(t);return e.Ee||(e.Ee=sb(e,zo(t))),e.Ee}function sb(t,e){if(t.limitType==="F")return k_(t.path,t.collectionGroup,e,t.filters,t.limit,t.startAt,t.endAt);{e=e.map(s=>{const i=s.dir==="desc"?"asc":"desc";return new ya(s.field,i)});const n=t.endAt?new Du(t.endAt.position,t.endAt.inclusive):null,r=t.startAt?new Du(t.startAt.position,t.startAt.inclusive):null;return k_(t.path,t.collectionGroup,e,t.filters,t.limit,n,r)}}function df(t,e){const n=t.filters.concat([e]);return new zi(t.path,t.collectionGroup,t.explicitOrderBy.slice(),n,t.limit,t.limitType,t.startAt,t.endAt)}function ib(t,e){const n=t.explicitOrderBy.concat([e]);return new zi(t.path,t.collectionGroup,n,t.filters.slice(),t.limit,t.limitType,t.startAt,t.endAt)}function Ou(t,e,n){return new zi(t.path,t.collectionGroup,t.explicitOrderBy.slice(),t.filters.slice(),e,n,t.startAt,t.endAt)}function Tc(t,e){return Lp(vn(t),vn(e))&&t.limitType===e.limitType}function oT(t){return`${Vp(vn(t))}|lt:${t.limitType}`}function qs(t){return`Query(target=${function(n){let r=n.path.canonicalString();return n.collectionGroup!==null&&(r+=" collectionGroup="+n.collectionGroup),n.filters.length>0&&(r+=`, filters: [${n.filters.map(s=>rT(s)).join(", ")}]`),vc(n.limit)||(r+=", limit: "+n.limit),n.orderBy.length>0&&(r+=`, orderBy: [${n.orderBy.map(s=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(s)).join(", ")}]`),n.startAt&&(r+=", startAt: ",r+=n.startAt.inclusive?"b:":"a:",r+=n.startAt.position.map(s=>Ai(s)).join(",")),n.endAt&&(r+=", endAt: ",r+=n.endAt.inclusive?"a:":"b:",r+=n.endAt.position.map(s=>Ai(s)).join(",")),`Target(${r})`}(vn(t))}; limitType=${t.limitType})`}function xc(t,e){return e.isFoundDocument()&&function(r,s){const i=s.key.path;return r.collectionGroup!==null?s.key.hasCollectionId(r.collectionGroup)&&r.path.isPrefixOf(i):W.isDocumentKey(r.path)?r.path.isEqual(i):r.path.isImmediateParentOf(i)}(t,e)&&function(r,s){for(const i of zo(r))if(!i.field.isKeyField()&&s.data.field(i.field)===null)return!1;return!0}(t,e)&&function(r,s){for(const i of r.filters)if(!i.matches(s))return!1;return!0}(t,e)&&function(r,s){return!(r.startAt&&!function(o,l,u){const c=I_(o,l,u);return o.inclusive?c<=0:c<0}(r.startAt,zo(r),s)||r.endAt&&!function(o,l,u){const c=I_(o,l,u);return o.inclusive?c>=0:c>0}(r.endAt,zo(r),s))}(t,e)}function ob(t){return t.collectionGroup||(t.path.length%2==1?t.path.lastSegment():t.path.get(t.path.length-2))}function aT(t){return(e,n)=>{let r=!1;for(const s of zo(t)){const i=ab(s,e,n);if(i!==0)return i;r=r||s.field.isKeyField()}return 0}}function ab(t,e,n){const r=t.field.isKeyField()?W.comparator(e.key,n.key):function(i,o,l){const u=o.data.field(i),c=l.data.field(i);return u!==null&&c!==null?Ci(u,c):K(42886)}(t.field,e,n);switch(t.dir){case"asc":return r;case"desc":return-1*r;default:return K(19790,{direction:t.dir})}}/**
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
 */class Ns{constructor(e,n){this.mapKeyFn=e,this.equalsFn=n,this.inner={},this.innerSize=0}get(e){const n=this.mapKeyFn(e),r=this.inner[n];if(r!==void 0){for(const[s,i]of r)if(this.equalsFn(s,e))return i}}has(e){return this.get(e)!==void 0}set(e,n){const r=this.mapKeyFn(e),s=this.inner[r];if(s===void 0)return this.inner[r]=[[e,n]],void this.innerSize++;for(let i=0;i<s.length;i++)if(this.equalsFn(s[i][0],e))return void(s[i]=[e,n]);s.push([e,n]),this.innerSize++}delete(e){const n=this.mapKeyFn(e),r=this.inner[n];if(r===void 0)return!1;for(let s=0;s<r.length;s++)if(this.equalsFn(r[s][0],e))return r.length===1?delete this.inner[n]:r.splice(s,1),this.innerSize--,!0;return!1}forEach(e){Qr(this.inner,(n,r)=>{for(const[s,i]of r)e(s,i)})}isEmpty(){return qE(this.inner)}size(){return this.innerSize}}/**
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
 */const lb=new Te(W.comparator);function Gn(){return lb}const lT=new Te(W.comparator);function Ro(...t){let e=lT;for(const n of t)e=e.insert(n.key,n);return e}function uT(t){let e=lT;return t.forEach((n,r)=>e=e.insert(n,r.overlayedDocument)),e}function ds(){return Bo()}function cT(){return Bo()}function Bo(){return new Ns(t=>t.toString(),(t,e)=>t.isEqual(e))}const ub=new Te(W.comparator),cb=new Be(W.comparator);function te(...t){let e=cb;for(const n of t)e=e.add(n);return e}const hb=new Be(ee);function db(){return hb}/**
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
 */function Mp(t,e){if(t.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:bu(e)?"-0":e}}function hT(t){return{integerValue:""+t}}function dT(t,e){return MR(e)?hT(e):Mp(t,e)}/**
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
 */class Ic{constructor(){this._=void 0}}function fb(t,e,n){return t instanceof _a?function(s,i){const o={fields:{[GE]:{stringValue:WE},[QE]:{timestampValue:{seconds:s.seconds,nanos:s.nanoseconds}}}};return i&&Dp(i)&&(i=wc(i)),i&&(o.fields[KE]=i),{mapValue:o}}(n,e):t instanceof Ri?pT(t,e):t instanceof va?mT(t,e):function(s,i){const o=fT(s,i),l=A_(o)+A_(s.Ae);return uf(o)&&uf(s.Ae)?hT(l):Mp(s.serializer,l)}(t,e)}function pb(t,e,n){return t instanceof Ri?pT(t,e):t instanceof va?mT(t,e):n}function fT(t,e){return t instanceof wa?function(r){return uf(r)||function(i){return!!i&&"doubleValue"in i}(r)}(e)?e:{integerValue:0}:null}class _a extends Ic{}class Ri extends Ic{constructor(e){super(),this.elements=e}}function pT(t,e){const n=gT(e);for(const r of t.elements)n.some(s=>Tn(s,r))||n.push(r);return{arrayValue:{values:n}}}class va extends Ic{constructor(e){super(),this.elements=e}}function mT(t,e){let n=gT(e);for(const r of t.elements)n=n.filter(s=>!Tn(s,r));return{arrayValue:{values:n}}}class wa extends Ic{constructor(e,n){super(),this.serializer=e,this.Ae=n}}function A_(t){return Ne(t.integerValue||t.doubleValue)}function gT(t){return Op(t)&&t.arrayValue.values?t.arrayValue.values.slice():[]}/**
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
 */class jp{constructor(e,n){this.field=e,this.transform=n}}function mb(t,e){return t.field.isEqual(e.field)&&function(r,s){return r instanceof Ri&&s instanceof Ri||r instanceof va&&s instanceof va?Si(r.elements,s.elements,Tn):r instanceof wa&&s instanceof wa?Tn(r.Ae,s.Ae):r instanceof _a&&s instanceof _a}(t.transform,e.transform)}class gb{constructor(e,n){this.version=e,this.transformResults=n}}class mt{constructor(e,n){this.updateTime=e,this.exists=n}static none(){return new mt}static exists(e){return new mt(void 0,e)}static updateTime(e){return new mt(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function Ql(t,e){return t.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(t.updateTime):t.exists===void 0||t.exists===e.isFoundDocument()}class Sc{}function yT(t,e){if(!t.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return t.isNoDocument()?new kc(t.key,mt.none()):new Oa(t.key,t.data,mt.none());{const n=t.data,r=Et.empty();let s=new Be(We.comparator);for(let i of e.fields)if(!s.has(i)){let o=n.field(i);o===null&&i.length>1&&(i=i.popLast(),o=n.field(i)),o===null?r.delete(i):r.set(i,o),s=s.add(i)}return new Xr(t.key,r,new Pt(s.toArray()),mt.none())}}function yb(t,e,n){t instanceof Oa?function(s,i,o){const l=s.value.clone(),u=b_(s.fieldTransforms,i,o.transformResults);l.setAll(u),i.convertToFoundDocument(o.version,l).setHasCommittedMutations()}(t,e,n):t instanceof Xr?function(s,i,o){if(!Ql(s.precondition,i))return void i.convertToUnknownDocument(o.version);const l=b_(s.fieldTransforms,i,o.transformResults),u=i.data;u.setAll(_T(s)),u.setAll(l),i.convertToFoundDocument(o.version,u).setHasCommittedMutations()}(t,e,n):function(s,i,o){i.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,n)}function $o(t,e,n,r){return t instanceof Oa?function(i,o,l,u){if(!Ql(i.precondition,o))return l;const c=i.value.clone(),f=P_(i.fieldTransforms,u,o);return c.setAll(f),o.convertToFoundDocument(o.version,c).setHasLocalMutations(),null}(t,e,n,r):t instanceof Xr?function(i,o,l,u){if(!Ql(i.precondition,o))return l;const c=P_(i.fieldTransforms,u,o),f=o.data;return f.setAll(_T(i)),f.setAll(c),o.convertToFoundDocument(o.version,f).setHasLocalMutations(),l===null?null:l.unionWith(i.fieldMask.fields).unionWith(i.fieldTransforms.map(p=>p.field))}(t,e,n,r):function(i,o,l){return Ql(i.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):l}(t,e,n)}function _b(t,e){let n=null;for(const r of t.fieldTransforms){const s=e.data.field(r.field),i=fT(r.transform,s||null);i!=null&&(n===null&&(n=Et.empty()),n.set(r.field,i))}return n||null}function R_(t,e){return t.type===e.type&&!!t.key.isEqual(e.key)&&!!t.precondition.isEqual(e.precondition)&&!!function(r,s){return r===void 0&&s===void 0||!(!r||!s)&&Si(r,s,(i,o)=>mb(i,o))}(t.fieldTransforms,e.fieldTransforms)&&(t.type===0?t.value.isEqual(e.value):t.type!==1||t.data.isEqual(e.data)&&t.fieldMask.isEqual(e.fieldMask))}class Oa extends Sc{constructor(e,n,r,s=[]){super(),this.key=e,this.value=n,this.precondition=r,this.fieldTransforms=s,this.type=0}getFieldMask(){return null}}class Xr extends Sc{constructor(e,n,r,s,i=[]){super(),this.key=e,this.data=n,this.fieldMask=r,this.precondition=s,this.fieldTransforms=i,this.type=1}getFieldMask(){return this.fieldMask}}function _T(t){const e=new Map;return t.fieldMask.fields.forEach(n=>{if(!n.isEmpty()){const r=t.data.field(n);e.set(n,r)}}),e}function b_(t,e,n){const r=new Map;le(t.length===n.length,32656,{Ve:n.length,de:t.length});for(let s=0;s<n.length;s++){const i=t[s],o=i.transform,l=e.data.field(i.field);r.set(i.field,pb(o,l,n[s]))}return r}function P_(t,e,n){const r=new Map;for(const s of t){const i=s.transform,o=n.data.field(s.field);r.set(s.field,fb(i,o,e))}return r}class kc extends Sc{constructor(e,n){super(),this.key=e,this.precondition=n,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class vb extends Sc{constructor(e,n){super(),this.key=e,this.precondition=n,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
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
 */class wb{constructor(e,n,r,s){this.batchId=e,this.localWriteTime=n,this.baseMutations=r,this.mutations=s}applyToRemoteDocument(e,n){const r=n.mutationResults;for(let s=0;s<this.mutations.length;s++){const i=this.mutations[s];i.key.isEqual(e.key)&&yb(i,e,r[s])}}applyToLocalView(e,n){for(const r of this.baseMutations)r.key.isEqual(e.key)&&(n=$o(r,e,n,this.localWriteTime));for(const r of this.mutations)r.key.isEqual(e.key)&&(n=$o(r,e,n,this.localWriteTime));return n}applyToLocalDocumentSet(e,n){const r=cT();return this.mutations.forEach(s=>{const i=e.get(s.key),o=i.overlayedDocument;let l=this.applyToLocalView(o,i.mutatedFields);l=n.has(s.key)?null:l;const u=yT(o,l);u!==null&&r.set(s.key,u),o.isValidDocument()||o.convertToNoDocument(X.min())}),r}keys(){return this.mutations.reduce((e,n)=>e.add(n.key),te())}isEqual(e){return this.batchId===e.batchId&&Si(this.mutations,e.mutations,(n,r)=>R_(n,r))&&Si(this.baseMutations,e.baseMutations,(n,r)=>R_(n,r))}}class Up{constructor(e,n,r,s){this.batch=e,this.commitVersion=n,this.mutationResults=r,this.docVersions=s}static from(e,n,r){le(e.mutations.length===r.length,58842,{me:e.mutations.length,fe:r.length});let s=function(){return ub}();const i=e.mutations;for(let o=0;o<i.length;o++)s=s.insert(i[o].key,r[o].version);return new Up(e,n,r,s)}}/**
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
 */class Eb{constructor(e,n){this.largestBatchId=e,this.mutation=n}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
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
 */class Tb{constructor(e,n){this.count=e,this.unchangedNames=n}}/**
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
 */var Oe,ie;function xb(t){switch(t){case M.OK:return K(64938);case M.CANCELLED:case M.UNKNOWN:case M.DEADLINE_EXCEEDED:case M.RESOURCE_EXHAUSTED:case M.INTERNAL:case M.UNAVAILABLE:case M.UNAUTHENTICATED:return!1;case M.INVALID_ARGUMENT:case M.NOT_FOUND:case M.ALREADY_EXISTS:case M.PERMISSION_DENIED:case M.FAILED_PRECONDITION:case M.ABORTED:case M.OUT_OF_RANGE:case M.UNIMPLEMENTED:case M.DATA_LOSS:return!0;default:return K(15467,{code:t})}}function vT(t){if(t===void 0)return Wn("GRPC error has no .code"),M.UNKNOWN;switch(t){case Oe.OK:return M.OK;case Oe.CANCELLED:return M.CANCELLED;case Oe.UNKNOWN:return M.UNKNOWN;case Oe.DEADLINE_EXCEEDED:return M.DEADLINE_EXCEEDED;case Oe.RESOURCE_EXHAUSTED:return M.RESOURCE_EXHAUSTED;case Oe.INTERNAL:return M.INTERNAL;case Oe.UNAVAILABLE:return M.UNAVAILABLE;case Oe.UNAUTHENTICATED:return M.UNAUTHENTICATED;case Oe.INVALID_ARGUMENT:return M.INVALID_ARGUMENT;case Oe.NOT_FOUND:return M.NOT_FOUND;case Oe.ALREADY_EXISTS:return M.ALREADY_EXISTS;case Oe.PERMISSION_DENIED:return M.PERMISSION_DENIED;case Oe.FAILED_PRECONDITION:return M.FAILED_PRECONDITION;case Oe.ABORTED:return M.ABORTED;case Oe.OUT_OF_RANGE:return M.OUT_OF_RANGE;case Oe.UNIMPLEMENTED:return M.UNIMPLEMENTED;case Oe.DATA_LOSS:return M.DATA_LOSS;default:return K(39323,{code:t})}}(ie=Oe||(Oe={}))[ie.OK=0]="OK",ie[ie.CANCELLED=1]="CANCELLED",ie[ie.UNKNOWN=2]="UNKNOWN",ie[ie.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",ie[ie.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",ie[ie.NOT_FOUND=5]="NOT_FOUND",ie[ie.ALREADY_EXISTS=6]="ALREADY_EXISTS",ie[ie.PERMISSION_DENIED=7]="PERMISSION_DENIED",ie[ie.UNAUTHENTICATED=16]="UNAUTHENTICATED",ie[ie.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",ie[ie.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",ie[ie.ABORTED=10]="ABORTED",ie[ie.OUT_OF_RANGE=11]="OUT_OF_RANGE",ie[ie.UNIMPLEMENTED=12]="UNIMPLEMENTED",ie[ie.INTERNAL=13]="INTERNAL",ie[ie.UNAVAILABLE=14]="UNAVAILABLE",ie[ie.DATA_LOSS=15]="DATA_LOSS";/**
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
 */function Ib(){return new TextEncoder}/**
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
 */const Sb=new Ar([4294967295,4294967295],0);function N_(t){const e=Ib().encode(t),n=new PE;return n.update(e),new Uint8Array(n.digest())}function D_(t){const e=new DataView(t.buffer),n=e.getUint32(0,!0),r=e.getUint32(4,!0),s=e.getUint32(8,!0),i=e.getUint32(12,!0);return[new Ar([n,r],0),new Ar([s,i],0)]}class Fp{constructor(e,n,r){if(this.bitmap=e,this.padding=n,this.hashCount=r,n<0||n>=8)throw new bo(`Invalid padding: ${n}`);if(r<0)throw new bo(`Invalid hash count: ${r}`);if(e.length>0&&this.hashCount===0)throw new bo(`Invalid hash count: ${r}`);if(e.length===0&&n!==0)throw new bo(`Invalid padding when bitmap length is 0: ${n}`);this.ge=8*e.length-n,this.pe=Ar.fromNumber(this.ge)}ye(e,n,r){let s=e.add(n.multiply(Ar.fromNumber(r)));return s.compare(Sb)===1&&(s=new Ar([s.getBits(0),s.getBits(1)],0)),s.modulo(this.pe).toNumber()}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.ge===0)return!1;const n=N_(e),[r,s]=D_(n);for(let i=0;i<this.hashCount;i++){const o=this.ye(r,s,i);if(!this.we(o))return!1}return!0}static create(e,n,r){const s=e%8==0?0:8-e%8,i=new Uint8Array(Math.ceil(e/8)),o=new Fp(i,s,n);return r.forEach(l=>o.insert(l)),o}insert(e){if(this.ge===0)return;const n=N_(e),[r,s]=D_(n);for(let i=0;i<this.hashCount;i++){const o=this.ye(r,s,i);this.Se(o)}}Se(e){const n=Math.floor(e/8),r=e%8;this.bitmap[n]|=1<<r}}class bo extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
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
 */class Xl{constructor(e,n,r,s){this.be=e,this.removedTargetIds=n,this.key=r,this.De=s}}class wT{constructor(e,n){this.targetId=e,this.Ce=n}}class ET{constructor(e,n,r=Ke.EMPTY_BYTE_STRING,s=null){this.state=e,this.targetIds=n,this.resumeToken=r,this.cause=s}}class O_{constructor(){this.ve=0,this.Fe=V_(),this.Me=Ke.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e)}ke(){let e=te(),n=te(),r=te();return this.Fe.forEach((s,i)=>{switch(i){case 0:e=e.add(s);break;case 2:n=n.add(s);break;case 1:r=r.add(s);break;default:K(38017,{changeType:i})}}),new La(this.Me,this.xe,e,n,r)}Ke(){this.Oe=!1,this.Fe=V_()}qe(e,n){this.Oe=!0,this.Fe=this.Fe.insert(e,n)}Ue(e){this.Oe=!0,this.Fe=this.Fe.remove(e)}$e(){this.ve+=1}We(){this.ve-=1,le(this.ve>=0,3241,{ve:this.ve})}Qe(){this.Oe=!0,this.xe=!0}}class kb{constructor(e){this.Ge=e,this.ze=new Map,this.je=Gn(),this.Je=Cl(),this.He=Cl(),this.Ze=new Te(ee)}Xe(e){for(const n of e.be)e.De&&e.De.isFoundDocument()?this.Ye(n,e.De):this.et(n,e.key,e.De);for(const n of e.removedTargetIds)this.et(n,e.key,e.De)}tt(e){this.forEachTarget(e,n=>{const r=this.nt(n);switch(e.state){case 0:this.rt(n)&&r.Le(e.resumeToken);break;case 1:r.We(),r.Ne||r.Ke(),r.Le(e.resumeToken);break;case 2:r.We(),r.Ne||this.removeTarget(n);break;case 3:this.rt(n)&&(r.Qe(),r.Le(e.resumeToken));break;case 4:this.rt(n)&&(this.it(n),r.Le(e.resumeToken));break;default:K(56790,{state:e.state})}})}forEachTarget(e,n){e.targetIds.length>0?e.targetIds.forEach(n):this.ze.forEach((r,s)=>{this.rt(s)&&n(s)})}st(e){const n=e.targetId,r=e.Ce.count,s=this.ot(n);if(s){const i=s.target;if(hf(i))if(r===0){const o=new W(i.path);this.et(n,o,ot.newNoDocument(o,X.min()))}else le(r===1,20013,{expectedCount:r});else{const o=this._t(n);if(o!==r){const l=this.ut(e),u=l?this.ct(l,e,o):1;if(u!==0){this.it(n);const c=u===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ze=this.Ze.insert(n,c)}}}}}ut(e){const n=e.Ce.unchangedNames;if(!n||!n.bits)return null;const{bits:{bitmap:r="",padding:s=0},hashCount:i=0}=n;let o,l;try{o=Ur(r).toUint8Array()}catch(u){if(u instanceof HE)return Lr("Decoding the base64 bloom filter in existence filter failed ("+u.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw u}try{l=new Fp(o,s,i)}catch(u){return Lr(u instanceof bo?"BloomFilter error: ":"Applying bloom filter failed: ",u),null}return l.ge===0?null:l}ct(e,n,r){return n.Ce.count===r-this.Pt(e,n.targetId)?0:2}Pt(e,n){const r=this.Ge.getRemoteKeysForTarget(n);let s=0;return r.forEach(i=>{const o=this.Ge.ht(),l=`projects/${o.projectId}/databases/${o.database}/documents/${i.path.canonicalString()}`;e.mightContain(l)||(this.et(n,i,null),s++)}),s}Tt(e){const n=new Map;this.ze.forEach((i,o)=>{const l=this.ot(o);if(l){if(i.current&&hf(l.target)){const u=new W(l.target.path);this.It(u).has(o)||this.Et(o,u)||this.et(o,u,ot.newNoDocument(u,e))}i.Be&&(n.set(o,i.ke()),i.Ke())}});let r=te();this.He.forEach((i,o)=>{let l=!0;o.forEachWhile(u=>{const c=this.ot(u);return!c||c.purpose==="TargetPurposeLimboResolution"||(l=!1,!1)}),l&&(r=r.add(i))}),this.je.forEach((i,o)=>o.setReadTime(e));const s=new Va(e,n,this.Ze,this.je,r);return this.je=Gn(),this.Je=Cl(),this.He=Cl(),this.Ze=new Te(ee),s}Ye(e,n){if(!this.rt(e))return;const r=this.Et(e,n.key)?2:0;this.nt(e).qe(n.key,r),this.je=this.je.insert(n.key,n),this.Je=this.Je.insert(n.key,this.It(n.key).add(e)),this.He=this.He.insert(n.key,this.Rt(n.key).add(e))}et(e,n,r){if(!this.rt(e))return;const s=this.nt(e);this.Et(e,n)?s.qe(n,1):s.Ue(n),this.He=this.He.insert(n,this.Rt(n).delete(e)),this.He=this.He.insert(n,this.Rt(n).add(e)),r&&(this.je=this.je.insert(n,r))}removeTarget(e){this.ze.delete(e)}_t(e){const n=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+n.addedDocuments.size-n.removedDocuments.size}$e(e){this.nt(e).$e()}nt(e){let n=this.ze.get(e);return n||(n=new O_,this.ze.set(e,n)),n}Rt(e){let n=this.He.get(e);return n||(n=new Be(ee),this.He=this.He.insert(e,n)),n}It(e){let n=this.Je.get(e);return n||(n=new Be(ee),this.Je=this.Je.insert(e,n)),n}rt(e){const n=this.ot(e)!==null;return n||q("WatchChangeAggregator","Detected inactive target",e),n}ot(e){const n=this.ze.get(e);return n&&n.Ne?null:this.Ge.At(e)}it(e){this.ze.set(e,new O_),this.Ge.getRemoteKeysForTarget(e).forEach(n=>{this.et(e,n,null)})}Et(e,n){return this.Ge.getRemoteKeysForTarget(e).has(n)}}function Cl(){return new Te(W.comparator)}function V_(){return new Te(W.comparator)}const Cb={asc:"ASCENDING",desc:"DESCENDING"},Ab={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},Rb={and:"AND",or:"OR"};class bb{constructor(e,n){this.databaseId=e,this.useProto3Json=n}}function ff(t,e){return t.useProto3Json||vc(e)?e:{value:e}}function Vu(t,e){return t.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function TT(t,e){return t.useProto3Json?e.toBase64():e.toUint8Array()}function Pb(t,e){return Vu(t,e.toTimestamp())}function wn(t){return le(!!t,49232),X.fromTimestamp(function(n){const r=jr(n);return new fe(r.seconds,r.nanos)}(t))}function zp(t,e){return pf(t,e).canonicalString()}function pf(t,e){const n=function(s){return new de(["projects",s.projectId,"databases",s.database])}(t).child("documents");return e===void 0?n:n.child(e)}function xT(t){const e=de.fromString(t);return le(AT(e),10190,{key:e.toString()}),e}function mf(t,e){return zp(t.databaseId,e.path)}function Wh(t,e){const n=xT(e);if(n.get(1)!==t.databaseId.projectId)throw new B(M.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+n.get(1)+" vs "+t.databaseId.projectId);if(n.get(3)!==t.databaseId.database)throw new B(M.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+n.get(3)+" vs "+t.databaseId.database);return new W(ST(n))}function IT(t,e){return zp(t.databaseId,e)}function Nb(t){const e=xT(t);return e.length===4?de.emptyPath():ST(e)}function gf(t){return new de(["projects",t.databaseId.projectId,"databases",t.databaseId.database]).canonicalString()}function ST(t){return le(t.length>4&&t.get(4)==="documents",29091,{key:t.toString()}),t.popFirst(5)}function L_(t,e,n){return{name:mf(t,e),fields:n.value.mapValue.fields}}function Db(t,e){let n;if("targetChange"in e){e.targetChange;const r=function(c){return c==="NO_CHANGE"?0:c==="ADD"?1:c==="REMOVE"?2:c==="CURRENT"?3:c==="RESET"?4:K(39313,{state:c})}(e.targetChange.targetChangeType||"NO_CHANGE"),s=e.targetChange.targetIds||[],i=function(c,f){return c.useProto3Json?(le(f===void 0||typeof f=="string",58123),Ke.fromBase64String(f||"")):(le(f===void 0||f instanceof Buffer||f instanceof Uint8Array,16193),Ke.fromUint8Array(f||new Uint8Array))}(t,e.targetChange.resumeToken),o=e.targetChange.cause,l=o&&function(c){const f=c.code===void 0?M.UNKNOWN:vT(c.code);return new B(f,c.message||"")}(o);n=new ET(r,s,i,l||null)}else if("documentChange"in e){e.documentChange;const r=e.documentChange;r.document,r.document.name,r.document.updateTime;const s=Wh(t,r.document.name),i=wn(r.document.updateTime),o=r.document.createTime?wn(r.document.createTime):X.min(),l=new Et({mapValue:{fields:r.document.fields}}),u=ot.newFoundDocument(s,i,o,l),c=r.targetIds||[],f=r.removedTargetIds||[];n=new Xl(c,f,u.key,u)}else if("documentDelete"in e){e.documentDelete;const r=e.documentDelete;r.document;const s=Wh(t,r.document),i=r.readTime?wn(r.readTime):X.min(),o=ot.newNoDocument(s,i),l=r.removedTargetIds||[];n=new Xl([],l,o.key,o)}else if("documentRemove"in e){e.documentRemove;const r=e.documentRemove;r.document;const s=Wh(t,r.document),i=r.removedTargetIds||[];n=new Xl([],i,s,null)}else{if(!("filter"in e))return K(11601,{Vt:e});{e.filter;const r=e.filter;r.targetId;const{count:s=0,unchangedNames:i}=r,o=new Tb(s,i),l=r.targetId;n=new wT(l,o)}}return n}function Ob(t,e){let n;if(e instanceof Oa)n={update:L_(t,e.key,e.value)};else if(e instanceof kc)n={delete:mf(t,e.key)};else if(e instanceof Xr)n={update:L_(t,e.key,e.data),updateMask:$b(e.fieldMask)};else{if(!(e instanceof vb))return K(16599,{dt:e.type});n={verify:mf(t,e.key)}}return e.fieldTransforms.length>0&&(n.updateTransforms=e.fieldTransforms.map(r=>function(i,o){const l=o.transform;if(l instanceof _a)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(l instanceof Ri)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:l.elements}};if(l instanceof va)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:l.elements}};if(l instanceof wa)return{fieldPath:o.field.canonicalString(),increment:l.Ae};throw K(20930,{transform:o.transform})}(0,r))),e.precondition.isNone||(n.currentDocument=function(s,i){return i.updateTime!==void 0?{updateTime:Pb(s,i.updateTime)}:i.exists!==void 0?{exists:i.exists}:K(27497)}(t,e.precondition)),n}function Vb(t,e){return t&&t.length>0?(le(e!==void 0,14353),t.map(n=>function(s,i){let o=s.updateTime?wn(s.updateTime):wn(i);return o.isEqual(X.min())&&(o=wn(i)),new gb(o,s.transformResults||[])}(n,e))):[]}function Lb(t,e){return{documents:[IT(t,e.path)]}}function Mb(t,e){const n={structuredQuery:{}},r=e.path;let s;e.collectionGroup!==null?(s=r,n.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(s=r.popLast(),n.structuredQuery.from=[{collectionId:r.lastSegment()}]),n.parent=IT(t,s);const i=function(c){if(c.length!==0)return CT(on.create(c,"and"))}(e.filters);i&&(n.structuredQuery.where=i);const o=function(c){if(c.length!==0)return c.map(f=>function(g){return{field:Hs(g.field),direction:Fb(g.dir)}}(f))}(e.orderBy);o&&(n.structuredQuery.orderBy=o);const l=ff(t,e.limit);return l!==null&&(n.structuredQuery.limit=l),e.startAt&&(n.structuredQuery.startAt=function(c){return{before:c.inclusive,values:c.position}}(e.startAt)),e.endAt&&(n.structuredQuery.endAt=function(c){return{before:!c.inclusive,values:c.position}}(e.endAt)),{ft:n,parent:s}}function jb(t){let e=Nb(t.parent);const n=t.structuredQuery,r=n.from?n.from.length:0;let s=null;if(r>0){le(r===1,65062);const f=n.from[0];f.allDescendants?s=f.collectionId:e=e.child(f.collectionId)}let i=[];n.where&&(i=function(p){const g=kT(p);return g instanceof on&&tT(g)?g.getFilters():[g]}(n.where));let o=[];n.orderBy&&(o=function(p){return p.map(g=>function(S){return new ya(Ws(S.field),function(P){switch(P){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(S.direction))}(g))}(n.orderBy));let l=null;n.limit&&(l=function(p){let g;return g=typeof p=="object"?p.value:p,vc(g)?null:g}(n.limit));let u=null;n.startAt&&(u=function(p){const g=!!p.before,w=p.values||[];return new Du(w,g)}(n.startAt));let c=null;return n.endAt&&(c=function(p){const g=!p.before,w=p.values||[];return new Du(w,g)}(n.endAt)),nb(e,s,o,i,l,"F",u,c)}function Ub(t,e){const n=function(s){switch(s){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return K(28987,{purpose:s})}}(e.purpose);return n==null?null:{"goog-listen-tags":n}}function kT(t){return t.unaryFilter!==void 0?function(n){switch(n.unaryFilter.op){case"IS_NAN":const r=Ws(n.unaryFilter.field);return Le.create(r,"==",{doubleValue:NaN});case"IS_NULL":const s=Ws(n.unaryFilter.field);return Le.create(s,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const i=Ws(n.unaryFilter.field);return Le.create(i,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Ws(n.unaryFilter.field);return Le.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return K(61313);default:return K(60726)}}(t):t.fieldFilter!==void 0?function(n){return Le.create(Ws(n.fieldFilter.field),function(s){switch(s){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return K(58110);default:return K(50506)}}(n.fieldFilter.op),n.fieldFilter.value)}(t):t.compositeFilter!==void 0?function(n){return on.create(n.compositeFilter.filters.map(r=>kT(r)),function(s){switch(s){case"AND":return"and";case"OR":return"or";default:return K(1026)}}(n.compositeFilter.op))}(t):K(30097,{filter:t})}function Fb(t){return Cb[t]}function zb(t){return Ab[t]}function Bb(t){return Rb[t]}function Hs(t){return{fieldPath:t.canonicalString()}}function Ws(t){return We.fromServerFormat(t.fieldPath)}function CT(t){return t instanceof Le?function(n){if(n.op==="=="){if(x_(n.value))return{unaryFilter:{field:Hs(n.field),op:"IS_NAN"}};if(T_(n.value))return{unaryFilter:{field:Hs(n.field),op:"IS_NULL"}}}else if(n.op==="!="){if(x_(n.value))return{unaryFilter:{field:Hs(n.field),op:"IS_NOT_NAN"}};if(T_(n.value))return{unaryFilter:{field:Hs(n.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:Hs(n.field),op:zb(n.op),value:n.value}}}(t):t instanceof on?function(n){const r=n.getFilters().map(s=>CT(s));return r.length===1?r[0]:{compositeFilter:{op:Bb(n.op),filters:r}}}(t):K(54877,{filter:t})}function $b(t){const e=[];return t.fields.forEach(n=>e.push(n.canonicalString())),{fieldPaths:e}}function AT(t){return t.length>=4&&t.get(0)==="projects"&&t.get(2)==="databases"}function RT(t){return!!t&&typeof t._toProto=="function"&&t._protoValueType==="ProtoValue"}/**
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
 */class qb{constructor(e){this.yt=e}}function Hb(t){const e=jb({parent:t.parent,structuredQuery:t.structuredQuery});return t.limitType==="LAST"?Ou(e,e.limit,"L"):e}/**
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
 */class Wb{constructor(){this.bn=new Gb}addToCollectionParentIndex(e,n){return this.bn.add(n),U.resolve()}getCollectionParents(e,n){return U.resolve(this.bn.getEntries(n))}addFieldIndex(e,n){return U.resolve()}deleteFieldIndex(e,n){return U.resolve()}deleteAllFieldIndexes(e){return U.resolve()}createTargetIndexes(e,n){return U.resolve()}getDocumentsMatchingTarget(e,n){return U.resolve(null)}getIndexType(e,n){return U.resolve(0)}getFieldIndexes(e,n){return U.resolve([])}getNextCollectionGroupToUpdate(e){return U.resolve(null)}getMinOffset(e,n){return U.resolve(Mr.min())}getMinOffsetFromCollectionGroup(e,n){return U.resolve(Mr.min())}updateCollectionGroup(e,n,r){return U.resolve()}updateIndexEntries(e,n){return U.resolve()}}class Gb{constructor(){this.index={}}add(e){const n=e.lastSegment(),r=e.popLast(),s=this.index[n]||new Be(de.comparator),i=!s.has(r);return this.index[n]=s.add(r),i}has(e){const n=e.lastSegment(),r=e.popLast(),s=this.index[n];return s&&s.has(r)}getEntries(e){return(this.index[e]||new Be(de.comparator)).toArray()}}/**
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
 */const M_={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},bT=41943040;class _t{static withCacheSize(e){return new _t(e,_t.DEFAULT_COLLECTION_PERCENTILE,_t.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,n,r){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=n,this.maximumSequenceNumbersToCollect=r}}/**
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
 */_t.DEFAULT_COLLECTION_PERCENTILE=10,_t.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,_t.DEFAULT=new _t(bT,_t.DEFAULT_COLLECTION_PERCENTILE,_t.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),_t.DISABLED=new _t(-1,0,0);/**
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
 */const j_="LruGarbageCollector",Kb=1048576;function U_([t,e],[n,r]){const s=ee(t,n);return s===0?ee(e,r):s}class Qb{constructor(e){this.Pr=e,this.buffer=new Be(U_),this.Tr=0}Ir(){return++this.Tr}Er(e){const n=[e,this.Ir()];if(this.buffer.size<this.Pr)this.buffer=this.buffer.add(n);else{const r=this.buffer.last();U_(n,r)<0&&(this.buffer=this.buffer.delete(r).add(n))}}get maxValue(){return this.buffer.last()[0]}}class Xb{constructor(e,n,r){this.garbageCollector=e,this.asyncQueue=n,this.localStore=r,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Ar(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Ar(e){q(j_,`Garbage collection scheduled in ${e}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(n){Fi(n)?q(j_,"Ignoring IndexedDB error during garbage collection: ",n):await Ui(n)}await this.Ar(3e5)})}}class Yb{constructor(e,n){this.Vr=e,this.params=n}calculateTargetCount(e,n){return this.Vr.dr(e).next(r=>Math.floor(n/100*r))}nthSequenceNumber(e,n){if(n===0)return U.resolve(_c.ce);const r=new Qb(n);return this.Vr.forEachTarget(e,s=>r.Er(s.sequenceNumber)).next(()=>this.Vr.mr(e,s=>r.Er(s))).next(()=>r.maxValue)}removeTargets(e,n,r){return this.Vr.removeTargets(e,n,r)}removeOrphanedDocuments(e,n){return this.Vr.removeOrphanedDocuments(e,n)}collect(e,n){return this.params.cacheSizeCollectionThreshold===-1?(q("LruGarbageCollector","Garbage collection skipped; disabled"),U.resolve(M_)):this.getCacheSize(e).next(r=>r<this.params.cacheSizeCollectionThreshold?(q("LruGarbageCollector",`Garbage collection skipped; Cache size ${r} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),M_):this.gr(e,n))}getCacheSize(e){return this.Vr.getCacheSize(e)}gr(e,n){let r,s,i,o,l,u,c;const f=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(p=>(p>this.params.maximumSequenceNumbersToCollect?(q("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${p}`),s=this.params.maximumSequenceNumbersToCollect):s=p,o=Date.now(),this.nthSequenceNumber(e,s))).next(p=>(r=p,l=Date.now(),this.removeTargets(e,r,n))).next(p=>(i=p,u=Date.now(),this.removeOrphanedDocuments(e,r))).next(p=>(c=Date.now(),$s()<=re.DEBUG&&q("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-f}ms
	Determined least recently used ${s} in `+(l-o)+`ms
	Removed ${i} targets in `+(u-l)+`ms
	Removed ${p} documents in `+(c-u)+`ms
Total Duration: ${c-f}ms`),U.resolve({didRun:!0,sequenceNumbersCollected:s,targetsRemoved:i,documentsRemoved:p})))}}function Jb(t,e){return new Yb(t,e)}/**
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
 */class Zb{constructor(){this.changes=new Ns(e=>e.toString(),(e,n)=>e.isEqual(n)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,n){this.assertNotApplied(),this.changes.set(e,ot.newInvalidDocument(e).setReadTime(n))}getEntry(e,n){this.assertNotApplied();const r=this.changes.get(n);return r!==void 0?U.resolve(r):this.getFromCache(e,n)}getEntries(e,n){return this.getAllFromCache(e,n)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
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
 */class eP{constructor(e,n){this.overlayedDocument=e,this.mutatedFields=n}}/**
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
 */class tP{constructor(e,n,r,s){this.remoteDocumentCache=e,this.mutationQueue=n,this.documentOverlayCache=r,this.indexManager=s}getDocument(e,n){let r=null;return this.documentOverlayCache.getOverlay(e,n).next(s=>(r=s,this.remoteDocumentCache.getEntry(e,n))).next(s=>(r!==null&&$o(r.mutation,s,Pt.empty(),fe.now()),s))}getDocuments(e,n){return this.remoteDocumentCache.getEntries(e,n).next(r=>this.getLocalViewOfDocuments(e,r,te()).next(()=>r))}getLocalViewOfDocuments(e,n,r=te()){const s=ds();return this.populateOverlays(e,s,n).next(()=>this.computeViews(e,n,s,r).next(i=>{let o=Ro();return i.forEach((l,u)=>{o=o.insert(l,u.overlayedDocument)}),o}))}getOverlayedDocuments(e,n){const r=ds();return this.populateOverlays(e,r,n).next(()=>this.computeViews(e,n,r,te()))}populateOverlays(e,n,r){const s=[];return r.forEach(i=>{n.has(i)||s.push(i)}),this.documentOverlayCache.getOverlays(e,s).next(i=>{i.forEach((o,l)=>{n.set(o,l)})})}computeViews(e,n,r,s){let i=Gn();const o=Bo(),l=function(){return Bo()}();return n.forEach((u,c)=>{const f=r.get(c.key);s.has(c.key)&&(f===void 0||f.mutation instanceof Xr)?i=i.insert(c.key,c):f!==void 0?(o.set(c.key,f.mutation.getFieldMask()),$o(f.mutation,c,f.mutation.getFieldMask(),fe.now())):o.set(c.key,Pt.empty())}),this.recalculateAndSaveOverlays(e,i).next(u=>(u.forEach((c,f)=>o.set(c,f)),n.forEach((c,f)=>l.set(c,new eP(f,o.get(c)??null))),l))}recalculateAndSaveOverlays(e,n){const r=Bo();let s=new Te((o,l)=>o-l),i=te();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,n).next(o=>{for(const l of o)l.keys().forEach(u=>{const c=n.get(u);if(c===null)return;let f=r.get(u)||Pt.empty();f=l.applyToLocalView(c,f),r.set(u,f);const p=(s.get(l.batchId)||te()).add(u);s=s.insert(l.batchId,p)})}).next(()=>{const o=[],l=s.getReverseIterator();for(;l.hasNext();){const u=l.getNext(),c=u.key,f=u.value,p=cT();f.forEach(g=>{if(!i.has(g)){const w=yT(n.get(g),r.get(g));w!==null&&p.set(g,w),i=i.add(g)}}),o.push(this.documentOverlayCache.saveOverlays(e,c,p))}return U.waitFor(o)}).next(()=>r)}recalculateAndSaveOverlaysForDocumentKeys(e,n){return this.remoteDocumentCache.getEntries(e,n).next(r=>this.recalculateAndSaveOverlays(e,r))}getDocumentsMatchingQuery(e,n,r,s){return rb(n)?this.getDocumentsMatchingDocumentQuery(e,n.path):iT(n)?this.getDocumentsMatchingCollectionGroupQuery(e,n,r,s):this.getDocumentsMatchingCollectionQuery(e,n,r,s)}getNextDocuments(e,n,r,s){return this.remoteDocumentCache.getAllFromCollectionGroup(e,n,r,s).next(i=>{const o=s-i.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,n,r.largestBatchId,s-i.size):U.resolve(ds());let l=pa,u=i;return o.next(c=>U.forEach(c,(f,p)=>(l<p.largestBatchId&&(l=p.largestBatchId),i.get(f)?U.resolve():this.remoteDocumentCache.getEntry(e,f).next(g=>{u=u.insert(f,g)}))).next(()=>this.populateOverlays(e,c,i)).next(()=>this.computeViews(e,u,c,te())).next(f=>({batchId:l,changes:uT(f)})))})}getDocumentsMatchingDocumentQuery(e,n){return this.getDocument(e,new W(n)).next(r=>{let s=Ro();return r.isFoundDocument()&&(s=s.insert(r.key,r)),s})}getDocumentsMatchingCollectionGroupQuery(e,n,r,s){const i=n.collectionGroup;let o=Ro();return this.indexManager.getCollectionParents(e,i).next(l=>U.forEach(l,u=>{const c=function(p,g){return new zi(g,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt)}(n,u.child(i));return this.getDocumentsMatchingCollectionQuery(e,c,r,s).next(f=>{f.forEach((p,g)=>{o=o.insert(p,g)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,n,r,s){let i;return this.documentOverlayCache.getOverlaysForCollection(e,n.path,r.largestBatchId).next(o=>(i=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,n,r,i,s))).next(o=>{i.forEach((u,c)=>{const f=c.getKey();o.get(f)===null&&(o=o.insert(f,ot.newInvalidDocument(f)))});let l=Ro();return o.forEach((u,c)=>{const f=i.get(u);f!==void 0&&$o(f.mutation,c,Pt.empty(),fe.now()),xc(n,c)&&(l=l.insert(u,c))}),l})}}/**
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
 */class nP{constructor(e){this.serializer=e,this.Nr=new Map,this.Br=new Map}getBundleMetadata(e,n){return U.resolve(this.Nr.get(n))}saveBundleMetadata(e,n){return this.Nr.set(n.id,function(s){return{id:s.id,version:s.version,createTime:wn(s.createTime)}}(n)),U.resolve()}getNamedQuery(e,n){return U.resolve(this.Br.get(n))}saveNamedQuery(e,n){return this.Br.set(n.name,function(s){return{name:s.name,query:Hb(s.bundledQuery),readTime:wn(s.readTime)}}(n)),U.resolve()}}/**
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
 */class rP{constructor(){this.overlays=new Te(W.comparator),this.Lr=new Map}getOverlay(e,n){return U.resolve(this.overlays.get(n))}getOverlays(e,n){const r=ds();return U.forEach(n,s=>this.getOverlay(e,s).next(i=>{i!==null&&r.set(s,i)})).next(()=>r)}saveOverlays(e,n,r){return r.forEach((s,i)=>{this.St(e,n,i)}),U.resolve()}removeOverlaysForBatchId(e,n,r){const s=this.Lr.get(r);return s!==void 0&&(s.forEach(i=>this.overlays=this.overlays.remove(i)),this.Lr.delete(r)),U.resolve()}getOverlaysForCollection(e,n,r){const s=ds(),i=n.length+1,o=new W(n.child("")),l=this.overlays.getIteratorFrom(o);for(;l.hasNext();){const u=l.getNext().value,c=u.getKey();if(!n.isPrefixOf(c.path))break;c.path.length===i&&u.largestBatchId>r&&s.set(u.getKey(),u)}return U.resolve(s)}getOverlaysForCollectionGroup(e,n,r,s){let i=new Te((c,f)=>c-f);const o=this.overlays.getIterator();for(;o.hasNext();){const c=o.getNext().value;if(c.getKey().getCollectionGroup()===n&&c.largestBatchId>r){let f=i.get(c.largestBatchId);f===null&&(f=ds(),i=i.insert(c.largestBatchId,f)),f.set(c.getKey(),c)}}const l=ds(),u=i.getIterator();for(;u.hasNext()&&(u.getNext().value.forEach((c,f)=>l.set(c,f)),!(l.size()>=s)););return U.resolve(l)}St(e,n,r){const s=this.overlays.get(r.key);if(s!==null){const o=this.Lr.get(s.largestBatchId).delete(r.key);this.Lr.set(s.largestBatchId,o)}this.overlays=this.overlays.insert(r.key,new Eb(n,r));let i=this.Lr.get(n);i===void 0&&(i=te(),this.Lr.set(n,i)),this.Lr.set(n,i.add(r.key))}}/**
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
 */class sP{constructor(){this.sessionToken=Ke.EMPTY_BYTE_STRING}getSessionToken(e){return U.resolve(this.sessionToken)}setSessionToken(e,n){return this.sessionToken=n,U.resolve()}}/**
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
 */class Bp{constructor(){this.kr=new Be(qe.Kr),this.qr=new Be(qe.Ur)}isEmpty(){return this.kr.isEmpty()}addReference(e,n){const r=new qe(e,n);this.kr=this.kr.add(r),this.qr=this.qr.add(r)}$r(e,n){e.forEach(r=>this.addReference(r,n))}removeReference(e,n){this.Wr(new qe(e,n))}Qr(e,n){e.forEach(r=>this.removeReference(r,n))}Gr(e){const n=new W(new de([])),r=new qe(n,e),s=new qe(n,e+1),i=[];return this.qr.forEachInRange([r,s],o=>{this.Wr(o),i.push(o.key)}),i}zr(){this.kr.forEach(e=>this.Wr(e))}Wr(e){this.kr=this.kr.delete(e),this.qr=this.qr.delete(e)}jr(e){const n=new W(new de([])),r=new qe(n,e),s=new qe(n,e+1);let i=te();return this.qr.forEachInRange([r,s],o=>{i=i.add(o.key)}),i}containsKey(e){const n=new qe(e,0),r=this.kr.firstAfterOrEqual(n);return r!==null&&e.isEqual(r.key)}}class qe{constructor(e,n){this.key=e,this.Jr=n}static Kr(e,n){return W.comparator(e.key,n.key)||ee(e.Jr,n.Jr)}static Ur(e,n){return ee(e.Jr,n.Jr)||W.comparator(e.key,n.key)}}/**
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
 */class iP{constructor(e,n){this.indexManager=e,this.referenceDelegate=n,this.mutationQueue=[],this.Yn=1,this.Hr=new Be(qe.Kr)}checkEmpty(e){return U.resolve(this.mutationQueue.length===0)}addMutationBatch(e,n,r,s){const i=this.Yn;this.Yn++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new wb(i,n,r,s);this.mutationQueue.push(o);for(const l of s)this.Hr=this.Hr.add(new qe(l.key,i)),this.indexManager.addToCollectionParentIndex(e,l.key.path.popLast());return U.resolve(o)}lookupMutationBatch(e,n){return U.resolve(this.Zr(n))}getNextMutationBatchAfterBatchId(e,n){const r=n+1,s=this.Xr(r),i=s<0?0:s;return U.resolve(this.mutationQueue.length>i?this.mutationQueue[i]:null)}getHighestUnacknowledgedBatchId(){return U.resolve(this.mutationQueue.length===0?Np:this.Yn-1)}getAllMutationBatches(e){return U.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,n){const r=new qe(n,0),s=new qe(n,Number.POSITIVE_INFINITY),i=[];return this.Hr.forEachInRange([r,s],o=>{const l=this.Zr(o.Jr);i.push(l)}),U.resolve(i)}getAllMutationBatchesAffectingDocumentKeys(e,n){let r=new Be(ee);return n.forEach(s=>{const i=new qe(s,0),o=new qe(s,Number.POSITIVE_INFINITY);this.Hr.forEachInRange([i,o],l=>{r=r.add(l.Jr)})}),U.resolve(this.Yr(r))}getAllMutationBatchesAffectingQuery(e,n){const r=n.path,s=r.length+1;let i=r;W.isDocumentKey(i)||(i=i.child(""));const o=new qe(new W(i),0);let l=new Be(ee);return this.Hr.forEachWhile(u=>{const c=u.key.path;return!!r.isPrefixOf(c)&&(c.length===s&&(l=l.add(u.Jr)),!0)},o),U.resolve(this.Yr(l))}Yr(e){const n=[];return e.forEach(r=>{const s=this.Zr(r);s!==null&&n.push(s)}),n}removeMutationBatch(e,n){le(this.ei(n.batchId,"removed")===0,55003),this.mutationQueue.shift();let r=this.Hr;return U.forEach(n.mutations,s=>{const i=new qe(s.key,n.batchId);return r=r.delete(i),this.referenceDelegate.markPotentiallyOrphaned(e,s.key)}).next(()=>{this.Hr=r})}nr(e){}containsKey(e,n){const r=new qe(n,0),s=this.Hr.firstAfterOrEqual(r);return U.resolve(n.isEqual(s&&s.key))}performConsistencyCheck(e){return this.mutationQueue.length,U.resolve()}ei(e,n){return this.Xr(e)}Xr(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Zr(e){const n=this.Xr(e);return n<0||n>=this.mutationQueue.length?null:this.mutationQueue[n]}}/**
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
 */class oP{constructor(e){this.ti=e,this.docs=function(){return new Te(W.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,n){const r=n.key,s=this.docs.get(r),i=s?s.size:0,o=this.ti(n);return this.docs=this.docs.insert(r,{document:n.mutableCopy(),size:o}),this.size+=o-i,this.indexManager.addToCollectionParentIndex(e,r.path.popLast())}removeEntry(e){const n=this.docs.get(e);n&&(this.docs=this.docs.remove(e),this.size-=n.size)}getEntry(e,n){const r=this.docs.get(n);return U.resolve(r?r.document.mutableCopy():ot.newInvalidDocument(n))}getEntries(e,n){let r=Gn();return n.forEach(s=>{const i=this.docs.get(s);r=r.insert(s,i?i.document.mutableCopy():ot.newInvalidDocument(s))}),U.resolve(r)}getDocumentsMatchingQuery(e,n,r,s){let i=Gn();const o=n.path,l=new W(o.child("__id-9223372036854775808__")),u=this.docs.getIteratorFrom(l);for(;u.hasNext();){const{key:c,value:{document:f}}=u.getNext();if(!o.isPrefixOf(c.path))break;c.path.length>o.length+1||DR(NR(f),r)<=0||(s.has(f.key)||xc(n,f))&&(i=i.insert(f.key,f.mutableCopy()))}return U.resolve(i)}getAllFromCollectionGroup(e,n,r,s){K(9500)}ni(e,n){return U.forEach(this.docs,r=>n(r))}newChangeBuffer(e){return new aP(this)}getSize(e){return U.resolve(this.size)}}class aP extends Zb{constructor(e){super(),this.Mr=e}applyChanges(e){const n=[];return this.changes.forEach((r,s)=>{s.isValidDocument()?n.push(this.Mr.addEntry(e,s)):this.Mr.removeEntry(r)}),U.waitFor(n)}getFromCache(e,n){return this.Mr.getEntry(e,n)}getAllFromCache(e,n){return this.Mr.getEntries(e,n)}}/**
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
 */class lP{constructor(e){this.persistence=e,this.ri=new Ns(n=>Vp(n),Lp),this.lastRemoteSnapshotVersion=X.min(),this.highestTargetId=0,this.ii=0,this.si=new Bp,this.targetCount=0,this.oi=zr._r()}forEachTarget(e,n){return this.ri.forEach((r,s)=>n(s)),U.resolve()}getLastRemoteSnapshotVersion(e){return U.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return U.resolve(this.ii)}allocateTargetId(e){return this.highestTargetId=this.oi.next(),U.resolve(this.highestTargetId)}setTargetsMetadata(e,n,r){return r&&(this.lastRemoteSnapshotVersion=r),n>this.ii&&(this.ii=n),U.resolve()}lr(e){this.ri.set(e.target,e);const n=e.targetId;n>this.highestTargetId&&(this.oi=new zr(n),this.highestTargetId=n),e.sequenceNumber>this.ii&&(this.ii=e.sequenceNumber)}addTargetData(e,n){return this.lr(n),this.targetCount+=1,U.resolve()}updateTargetData(e,n){return this.lr(n),U.resolve()}removeTargetData(e,n){return this.ri.delete(n.target),this.si.Gr(n.targetId),this.targetCount-=1,U.resolve()}removeTargets(e,n,r){let s=0;const i=[];return this.ri.forEach((o,l)=>{l.sequenceNumber<=n&&r.get(l.targetId)===null&&(this.ri.delete(o),i.push(this.removeMatchingKeysForTargetId(e,l.targetId)),s++)}),U.waitFor(i).next(()=>s)}getTargetCount(e){return U.resolve(this.targetCount)}getTargetData(e,n){const r=this.ri.get(n)||null;return U.resolve(r)}addMatchingKeys(e,n,r){return this.si.$r(n,r),U.resolve()}removeMatchingKeys(e,n,r){this.si.Qr(n,r);const s=this.persistence.referenceDelegate,i=[];return s&&n.forEach(o=>{i.push(s.markPotentiallyOrphaned(e,o))}),U.waitFor(i)}removeMatchingKeysForTargetId(e,n){return this.si.Gr(n),U.resolve()}getMatchingKeysForTargetId(e,n){const r=this.si.jr(n);return U.resolve(r)}containsKey(e,n){return U.resolve(this.si.containsKey(n))}}/**
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
 */class PT{constructor(e,n){this._i={},this.overlays={},this.ai=new _c(0),this.ui=!1,this.ui=!0,this.ci=new sP,this.referenceDelegate=e(this),this.li=new lP(this),this.indexManager=new Wb,this.remoteDocumentCache=function(s){return new oP(s)}(r=>this.referenceDelegate.hi(r)),this.serializer=new qb(n),this.Pi=new nP(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.ui=!1,Promise.resolve()}get started(){return this.ui}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let n=this.overlays[e.toKey()];return n||(n=new rP,this.overlays[e.toKey()]=n),n}getMutationQueue(e,n){let r=this._i[e.toKey()];return r||(r=new iP(n,this.referenceDelegate),this._i[e.toKey()]=r),r}getGlobalsCache(){return this.ci}getTargetCache(){return this.li}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Pi}runTransaction(e,n,r){q("MemoryPersistence","Starting transaction:",e);const s=new uP(this.ai.next());return this.referenceDelegate.Ti(),r(s).next(i=>this.referenceDelegate.Ii(s).next(()=>i)).toPromise().then(i=>(s.raiseOnCommittedEvent(),i))}Ei(e,n){return U.or(Object.values(this._i).map(r=>()=>r.containsKey(e,n)))}}class uP extends VR{constructor(e){super(),this.currentSequenceNumber=e}}class $p{constructor(e){this.persistence=e,this.Ri=new Bp,this.Ai=null}static Vi(e){return new $p(e)}get di(){if(this.Ai)return this.Ai;throw K(60996)}addReference(e,n,r){return this.Ri.addReference(r,n),this.di.delete(r.toString()),U.resolve()}removeReference(e,n,r){return this.Ri.removeReference(r,n),this.di.add(r.toString()),U.resolve()}markPotentiallyOrphaned(e,n){return this.di.add(n.toString()),U.resolve()}removeTarget(e,n){this.Ri.Gr(n.targetId).forEach(s=>this.di.add(s.toString()));const r=this.persistence.getTargetCache();return r.getMatchingKeysForTargetId(e,n.targetId).next(s=>{s.forEach(i=>this.di.add(i.toString()))}).next(()=>r.removeTargetData(e,n))}Ti(){this.Ai=new Set}Ii(e){const n=this.persistence.getRemoteDocumentCache().newChangeBuffer();return U.forEach(this.di,r=>{const s=W.fromPath(r);return this.mi(e,s).next(i=>{i||n.removeEntry(s,X.min())})}).next(()=>(this.Ai=null,n.apply(e)))}updateLimboDocument(e,n){return this.mi(e,n).next(r=>{r?this.di.delete(n.toString()):this.di.add(n.toString())})}hi(e){return 0}mi(e,n){return U.or([()=>U.resolve(this.Ri.containsKey(n)),()=>this.persistence.getTargetCache().containsKey(e,n),()=>this.persistence.Ei(e,n)])}}class Lu{constructor(e,n){this.persistence=e,this.fi=new Ns(r=>jR(r.path),(r,s)=>r.isEqual(s)),this.garbageCollector=Jb(this,n)}static Vi(e,n){return new Lu(e,n)}Ti(){}Ii(e){return U.resolve()}forEachTarget(e,n){return this.persistence.getTargetCache().forEachTarget(e,n)}dr(e){const n=this.pr(e);return this.persistence.getTargetCache().getTargetCount(e).next(r=>n.next(s=>r+s))}pr(e){let n=0;return this.mr(e,r=>{n++}).next(()=>n)}mr(e,n){return U.forEach(this.fi,(r,s)=>this.wr(e,r,s).next(i=>i?U.resolve():n(s)))}removeTargets(e,n,r){return this.persistence.getTargetCache().removeTargets(e,n,r)}removeOrphanedDocuments(e,n){let r=0;const s=this.persistence.getRemoteDocumentCache(),i=s.newChangeBuffer();return s.ni(e,o=>this.wr(e,o,n).next(l=>{l||(r++,i.removeEntry(o,X.min()))})).next(()=>i.apply(e)).next(()=>r)}markPotentiallyOrphaned(e,n){return this.fi.set(n,e.currentSequenceNumber),U.resolve()}removeTarget(e,n){const r=n.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,r)}addReference(e,n,r){return this.fi.set(r,e.currentSequenceNumber),U.resolve()}removeReference(e,n,r){return this.fi.set(r,e.currentSequenceNumber),U.resolve()}updateLimboDocument(e,n){return this.fi.set(n,e.currentSequenceNumber),U.resolve()}hi(e){let n=e.key.toString().length;return e.isFoundDocument()&&(n+=Gl(e.data.value)),n}wr(e,n,r){return U.or([()=>this.persistence.Ei(e,n),()=>this.persistence.getTargetCache().containsKey(e,n),()=>{const s=this.fi.get(n);return U.resolve(s!==void 0&&s>r)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
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
 */class qp{constructor(e,n,r,s){this.targetId=e,this.fromCache=n,this.Ts=r,this.Is=s}static Es(e,n){let r=te(),s=te();for(const i of n.docChanges)switch(i.type){case 0:r=r.add(i.doc.key);break;case 1:s=s.add(i.doc.key)}return new qp(e,n.fromCache,r,s)}}/**
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
 */class cP{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
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
 */class hP{constructor(){this.Rs=!1,this.As=!1,this.Vs=100,this.ds=function(){return rA()?8:LR(ut())>0?6:4}()}initialize(e,n){this.fs=e,this.indexManager=n,this.Rs=!0}getDocumentsMatchingQuery(e,n,r,s){const i={result:null};return this.gs(e,n).next(o=>{i.result=o}).next(()=>{if(!i.result)return this.ps(e,n,s,r).next(o=>{i.result=o})}).next(()=>{if(i.result)return;const o=new cP;return this.ys(e,n,o).next(l=>{if(i.result=l,this.As)return this.ws(e,n,o,l.size)})}).next(()=>i.result)}ws(e,n,r,s){return r.documentReadCount<this.Vs?($s()<=re.DEBUG&&q("QueryEngine","SDK will not create cache indexes for query:",qs(n),"since it only creates cache indexes for collection contains","more than or equal to",this.Vs,"documents"),U.resolve()):($s()<=re.DEBUG&&q("QueryEngine","Query:",qs(n),"scans",r.documentReadCount,"local documents and returns",s,"documents as results."),r.documentReadCount>this.ds*s?($s()<=re.DEBUG&&q("QueryEngine","The SDK decides to create cache indexes for query:",qs(n),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,vn(n))):U.resolve())}gs(e,n){if(C_(n))return U.resolve(null);let r=vn(n);return this.indexManager.getIndexType(e,r).next(s=>s===0?null:(n.limit!==null&&s===1&&(n=Ou(n,null,"F"),r=vn(n)),this.indexManager.getDocumentsMatchingTarget(e,r).next(i=>{const o=te(...i);return this.fs.getDocuments(e,o).next(l=>this.indexManager.getMinOffset(e,r).next(u=>{const c=this.Ss(n,l);return this.bs(n,c,o,u.readTime)?this.gs(e,Ou(n,null,"F")):this.Ds(e,c,n,u)}))})))}ps(e,n,r,s){return C_(n)||s.isEqual(X.min())?U.resolve(null):this.fs.getDocuments(e,r).next(i=>{const o=this.Ss(n,i);return this.bs(n,o,r,s)?U.resolve(null):($s()<=re.DEBUG&&q("QueryEngine","Re-using previous result from %s to execute query: %s",s.toString(),qs(n)),this.Ds(e,o,n,PR(s,pa)).next(l=>l))})}Ss(e,n){let r=new Be(aT(e));return n.forEach((s,i)=>{xc(e,i)&&(r=r.add(i))}),r}bs(e,n,r,s){if(e.limit===null)return!1;if(r.size!==n.size)return!0;const i=e.limitType==="F"?n.last():n.first();return!!i&&(i.hasPendingWrites||i.version.compareTo(s)>0)}ys(e,n,r){return $s()<=re.DEBUG&&q("QueryEngine","Using full collection scan to execute query:",qs(n)),this.fs.getDocumentsMatchingQuery(e,n,Mr.min(),r)}Ds(e,n,r,s){return this.fs.getDocumentsMatchingQuery(e,r,s).next(i=>(n.forEach(o=>{i=i.insert(o.key,o)}),i))}}/**
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
 */const Hp="LocalStore",dP=3e8;class fP{constructor(e,n,r,s){this.persistence=e,this.Cs=n,this.serializer=s,this.vs=new Te(ee),this.Fs=new Ns(i=>Vp(i),Lp),this.Ms=new Map,this.xs=e.getRemoteDocumentCache(),this.li=e.getTargetCache(),this.Pi=e.getBundleCache(),this.Os(r)}Os(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new tP(this.xs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.xs.setIndexManager(this.indexManager),this.Cs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",n=>e.collect(n,this.vs))}}function pP(t,e,n,r){return new fP(t,e,n,r)}async function NT(t,e){const n=Y(t);return await n.persistence.runTransaction("Handle user change","readonly",r=>{let s;return n.mutationQueue.getAllMutationBatches(r).next(i=>(s=i,n.Os(e),n.mutationQueue.getAllMutationBatches(r))).next(i=>{const o=[],l=[];let u=te();for(const c of s){o.push(c.batchId);for(const f of c.mutations)u=u.add(f.key)}for(const c of i){l.push(c.batchId);for(const f of c.mutations)u=u.add(f.key)}return n.localDocuments.getDocuments(r,u).next(c=>({Ns:c,removedBatchIds:o,addedBatchIds:l}))})})}function mP(t,e){const n=Y(t);return n.persistence.runTransaction("Acknowledge batch","readwrite-primary",r=>{const s=e.batch.keys(),i=n.xs.newChangeBuffer({trackRemovals:!0});return function(l,u,c,f){const p=c.batch,g=p.keys();let w=U.resolve();return g.forEach(S=>{w=w.next(()=>f.getEntry(u,S)).next(b=>{const P=c.docVersions.get(S);le(P!==null,48541),b.version.compareTo(P)<0&&(p.applyToRemoteDocument(b,c),b.isValidDocument()&&(b.setReadTime(c.commitVersion),f.addEntry(b)))})}),w.next(()=>l.mutationQueue.removeMutationBatch(u,p))}(n,r,e,i).next(()=>i.apply(r)).next(()=>n.mutationQueue.performConsistencyCheck(r)).next(()=>n.documentOverlayCache.removeOverlaysForBatchId(r,s,e.batch.batchId)).next(()=>n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(r,function(l){let u=te();for(let c=0;c<l.mutationResults.length;++c)l.mutationResults[c].transformResults.length>0&&(u=u.add(l.batch.mutations[c].key));return u}(e))).next(()=>n.localDocuments.getDocuments(r,s))})}function DT(t){const e=Y(t);return e.persistence.runTransaction("Get last remote snapshot version","readonly",n=>e.li.getLastRemoteSnapshotVersion(n))}function gP(t,e){const n=Y(t),r=e.snapshotVersion;let s=n.vs;return n.persistence.runTransaction("Apply remote event","readwrite-primary",i=>{const o=n.xs.newChangeBuffer({trackRemovals:!0});s=n.vs;const l=[];e.targetChanges.forEach((f,p)=>{const g=s.get(p);if(!g)return;l.push(n.li.removeMatchingKeys(i,f.removedDocuments,p).next(()=>n.li.addMatchingKeys(i,f.addedDocuments,p)));let w=g.withSequenceNumber(i.currentSequenceNumber);e.targetMismatches.get(p)!==null?w=w.withResumeToken(Ke.EMPTY_BYTE_STRING,X.min()).withLastLimboFreeSnapshotVersion(X.min()):f.resumeToken.approximateByteSize()>0&&(w=w.withResumeToken(f.resumeToken,r)),s=s.insert(p,w),function(b,P,I){return b.resumeToken.approximateByteSize()===0||P.snapshotVersion.toMicroseconds()-b.snapshotVersion.toMicroseconds()>=dP?!0:I.addedDocuments.size+I.modifiedDocuments.size+I.removedDocuments.size>0}(g,w,f)&&l.push(n.li.updateTargetData(i,w))});let u=Gn(),c=te();if(e.documentUpdates.forEach(f=>{e.resolvedLimboDocuments.has(f)&&l.push(n.persistence.referenceDelegate.updateLimboDocument(i,f))}),l.push(yP(i,o,e.documentUpdates).next(f=>{u=f.Bs,c=f.Ls})),!r.isEqual(X.min())){const f=n.li.getLastRemoteSnapshotVersion(i).next(p=>n.li.setTargetsMetadata(i,i.currentSequenceNumber,r));l.push(f)}return U.waitFor(l).next(()=>o.apply(i)).next(()=>n.localDocuments.getLocalViewOfDocuments(i,u,c)).next(()=>u)}).then(i=>(n.vs=s,i))}function yP(t,e,n){let r=te(),s=te();return n.forEach(i=>r=r.add(i)),e.getEntries(t,r).next(i=>{let o=Gn();return n.forEach((l,u)=>{const c=i.get(l);u.isFoundDocument()!==c.isFoundDocument()&&(s=s.add(l)),u.isNoDocument()&&u.version.isEqual(X.min())?(e.removeEntry(l,u.readTime),o=o.insert(l,u)):!c.isValidDocument()||u.version.compareTo(c.version)>0||u.version.compareTo(c.version)===0&&c.hasPendingWrites?(e.addEntry(u),o=o.insert(l,u)):q(Hp,"Ignoring outdated watch update for ",l,". Current version:",c.version," Watch version:",u.version)}),{Bs:o,Ls:s}})}function _P(t,e){const n=Y(t);return n.persistence.runTransaction("Get next mutation batch","readonly",r=>(e===void 0&&(e=Np),n.mutationQueue.getNextMutationBatchAfterBatchId(r,e)))}function vP(t,e){const n=Y(t);return n.persistence.runTransaction("Allocate target","readwrite",r=>{let s;return n.li.getTargetData(r,e).next(i=>i?(s=i,U.resolve(s)):n.li.allocateTargetId(r).next(o=>(s=new Dn(e,o,"TargetPurposeListen",r.currentSequenceNumber),n.li.addTargetData(r,s).next(()=>s))))}).then(r=>{const s=n.vs.get(r.targetId);return(s===null||r.snapshotVersion.compareTo(s.snapshotVersion)>0)&&(n.vs=n.vs.insert(r.targetId,r),n.Fs.set(e,r.targetId)),r})}async function yf(t,e,n){const r=Y(t),s=r.vs.get(e),i=n?"readwrite":"readwrite-primary";try{n||await r.persistence.runTransaction("Release target",i,o=>r.persistence.referenceDelegate.removeTarget(o,s))}catch(o){if(!Fi(o))throw o;q(Hp,`Failed to update sequence numbers for target ${e}: ${o}`)}r.vs=r.vs.remove(e),r.Fs.delete(s.target)}function F_(t,e,n){const r=Y(t);let s=X.min(),i=te();return r.persistence.runTransaction("Execute query","readwrite",o=>function(u,c,f){const p=Y(u),g=p.Fs.get(f);return g!==void 0?U.resolve(p.vs.get(g)):p.li.getTargetData(c,f)}(r,o,vn(e)).next(l=>{if(l)return s=l.lastLimboFreeSnapshotVersion,r.li.getMatchingKeysForTargetId(o,l.targetId).next(u=>{i=u})}).next(()=>r.Cs.getDocumentsMatchingQuery(o,e,n?s:X.min(),n?i:te())).next(l=>(wP(r,ob(e),l),{documents:l,ks:i})))}function wP(t,e,n){let r=t.Ms.get(e)||X.min();n.forEach((s,i)=>{i.readTime.compareTo(r)>0&&(r=i.readTime)}),t.Ms.set(e,r)}class z_{constructor(){this.activeTargetIds=db()}Qs(e){this.activeTargetIds=this.activeTargetIds.add(e)}Gs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Ws(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class EP{constructor(){this.vo=new z_,this.Fo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,n,r){}addLocalQueryTarget(e,n=!0){return n&&this.vo.Qs(e),this.Fo[e]||"not-current"}updateQueryState(e,n,r){this.Fo[e]=n}removeLocalQueryTarget(e){this.vo.Gs(e)}isLocalQueryTarget(e){return this.vo.activeTargetIds.has(e)}clearQueryState(e){delete this.Fo[e]}getAllActiveQueryTargets(){return this.vo.activeTargetIds}isActiveQueryTarget(e){return this.vo.activeTargetIds.has(e)}start(){return this.vo=new z_,Promise.resolve()}handleUserChange(e,n,r){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
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
 */class TP{Mo(e){}shutdown(){}}/**
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
 */const B_="ConnectivityMonitor";class $_{constructor(){this.xo=()=>this.Oo(),this.No=()=>this.Bo(),this.Lo=[],this.ko()}Mo(e){this.Lo.push(e)}shutdown(){window.removeEventListener("online",this.xo),window.removeEventListener("offline",this.No)}ko(){window.addEventListener("online",this.xo),window.addEventListener("offline",this.No)}Oo(){q(B_,"Network connectivity changed: AVAILABLE");for(const e of this.Lo)e(0)}Bo(){q(B_,"Network connectivity changed: UNAVAILABLE");for(const e of this.Lo)e(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
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
 */let Al=null;function _f(){return Al===null?Al=function(){return 268435456+Math.round(2147483648*Math.random())}():Al++,"0x"+Al.toString(16)}/**
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
 */const Gh="RestConnection",xP={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery",ExecutePipeline:"executePipeline"};class IP{get Ko(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const n=e.ssl?"https":"http",r=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.qo=n+"://"+e.host,this.Uo=`projects/${r}/databases/${s}`,this.$o=this.databaseId.database===Pu?`project_id=${r}`:`project_id=${r}&database_id=${s}`}Wo(e,n,r,s,i){const o=_f(),l=this.Qo(e,n.toUriEncodedString());q(Gh,`Sending RPC '${e}' ${o}:`,l,r);const u={"google-cloud-resource-prefix":this.Uo,"x-goog-request-params":this.$o};this.Go(u,s,i);const{host:c}=new URL(l),f=bs(c);return this.zo(e,l,u,r,f).then(p=>(q(Gh,`Received RPC '${e}' ${o}: `,p),p),p=>{throw Lr(Gh,`RPC '${e}' ${o} failed with error: `,p,"url: ",l,"request:",r),p})}jo(e,n,r,s,i,o){return this.Wo(e,n,r,s,i)}Go(e,n,r){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+ji}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),n&&n.headers.forEach((s,i)=>e[i]=s),r&&r.headers.forEach((s,i)=>e[i]=s)}Qo(e,n){const r=xP[e];let s=`${this.qo}/v1/${n}:${r}`;return this.databaseInfo.apiKey&&(s=`${s}?key=${encodeURIComponent(this.databaseInfo.apiKey)}`),s}terminate(){}}/**
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
 */class SP{constructor(e){this.Jo=e.Jo,this.Ho=e.Ho}Zo(e){this.Xo=e}Yo(e){this.e_=e}t_(e){this.n_=e}onMessage(e){this.r_=e}close(){this.Ho()}send(e){this.Jo(e)}i_(){this.Xo()}s_(){this.e_()}o_(e){this.n_(e)}__(e){this.r_(e)}}/**
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
 */const rt="WebChannelConnection",wo=(t,e,n)=>{t.listen(e,r=>{try{n(r)}catch(s){setTimeout(()=>{throw s},0)}})};class di extends IP{constructor(e){super(e),this.a_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}static u_(){if(!di.c_){const e=VE();wo(e,OE.STAT_EVENT,n=>{n.stat===of.PROXY?q(rt,"STAT_EVENT: detected buffering proxy"):n.stat===of.NOPROXY&&q(rt,"STAT_EVENT: detected no buffering proxy")}),di.c_=!0}}zo(e,n,r,s,i){const o=_f();return new Promise((l,u)=>{const c=new NE;c.setWithCredentials(!0),c.listenOnce(DE.COMPLETE,()=>{try{switch(c.getLastErrorCode()){case Wl.NO_ERROR:const p=c.getResponseJson();q(rt,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(p)),l(p);break;case Wl.TIMEOUT:q(rt,`RPC '${e}' ${o} timed out`),u(new B(M.DEADLINE_EXCEEDED,"Request time out"));break;case Wl.HTTP_ERROR:const g=c.getStatus();if(q(rt,`RPC '${e}' ${o} failed with status:`,g,"response text:",c.getResponseText()),g>0){let w=c.getResponseJson();Array.isArray(w)&&(w=w[0]);const S=w==null?void 0:w.error;if(S&&S.status&&S.message){const b=function(I){const v=I.toLowerCase().replace(/_/g,"-");return Object.values(M).indexOf(v)>=0?v:M.UNKNOWN}(S.status);u(new B(b,S.message))}else u(new B(M.UNKNOWN,"Server responded with status "+c.getStatus()))}else u(new B(M.UNAVAILABLE,"Connection failed."));break;default:K(9055,{l_:e,streamId:o,h_:c.getLastErrorCode(),P_:c.getLastError()})}}finally{q(rt,`RPC '${e}' ${o} completed.`)}});const f=JSON.stringify(s);q(rt,`RPC '${e}' ${o} sending request:`,s),c.send(n,"POST",f,r,15)})}T_(e,n,r){const s=_f(),i=[this.qo,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=this.createWebChannelTransport(),l={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;u!==void 0&&(l.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(l.useFetchStreams=!0),this.Go(l.initMessageHeaders,n,r),l.encodeInitMessageHeaders=!0;const c=i.join("");q(rt,`Creating RPC '${e}' stream ${s}: ${c}`,l);const f=o.createWebChannel(c,l);this.I_(f);let p=!1,g=!1;const w=new SP({Jo:S=>{g?q(rt,`Not sending because RPC '${e}' stream ${s} is closed:`,S):(p||(q(rt,`Opening RPC '${e}' stream ${s} transport.`),f.open(),p=!0),q(rt,`RPC '${e}' stream ${s} sending:`,S),f.send(S))},Ho:()=>f.close()});return wo(f,Ao.EventType.OPEN,()=>{g||(q(rt,`RPC '${e}' stream ${s} transport opened.`),w.i_())}),wo(f,Ao.EventType.CLOSE,()=>{g||(g=!0,q(rt,`RPC '${e}' stream ${s} transport closed`),w.o_(),this.E_(f))}),wo(f,Ao.EventType.ERROR,S=>{g||(g=!0,Lr(rt,`RPC '${e}' stream ${s} transport errored. Name:`,S.name,"Message:",S.message),w.o_(new B(M.UNAVAILABLE,"The operation could not be completed")))}),wo(f,Ao.EventType.MESSAGE,S=>{var b;if(!g){const P=S.data[0];le(!!P,16349);const I=P,v=(I==null?void 0:I.error)||((b=I[0])==null?void 0:b.error);if(v){q(rt,`RPC '${e}' stream ${s} received error:`,v);const C=v.status;let D=function(E){const _=Oe[E];if(_!==void 0)return vT(_)}(C),j=v.message;C==="NOT_FOUND"&&j.includes("database")&&j.includes("does not exist")&&j.includes(this.databaseId.database)&&Lr(`Database '${this.databaseId.database}' not found. Please check your project configuration.`),D===void 0&&(D=M.INTERNAL,j="Unknown error status: "+C+" with message "+v.message),g=!0,w.o_(new B(D,j)),f.close()}else q(rt,`RPC '${e}' stream ${s} received:`,P),w.__(P)}}),di.u_(),setTimeout(()=>{w.s_()},0),w}terminate(){this.a_.forEach(e=>e.close()),this.a_=[]}I_(e){this.a_.push(e)}E_(e){this.a_=this.a_.filter(n=>n===e)}Go(e,n,r){super.Go(e,n,r),this.databaseInfo.apiKey&&(e["x-goog-api-key"]=this.databaseInfo.apiKey)}createWebChannelTransport(){return LE()}}/**
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
 */function kP(t){return new di(t)}function Kh(){return typeof document<"u"?document:null}/**
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
 */function Cc(t){return new bb(t,!0)}/**
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
 */di.c_=!1;class OT{constructor(e,n,r=1e3,s=1.5,i=6e4){this.Ci=e,this.timerId=n,this.R_=r,this.A_=s,this.V_=i,this.d_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.d_=0}g_(){this.d_=this.V_}p_(e){this.cancel();const n=Math.floor(this.d_+this.y_()),r=Math.max(0,Date.now()-this.f_),s=Math.max(0,n-r);s>0&&q("ExponentialBackoff",`Backing off for ${s} ms (base delay: ${this.d_} ms, delay with jitter: ${n} ms, last attempt: ${r} ms ago)`),this.m_=this.Ci.enqueueAfterDelay(this.timerId,s,()=>(this.f_=Date.now(),e())),this.d_*=this.A_,this.d_<this.R_&&(this.d_=this.R_),this.d_>this.V_&&(this.d_=this.V_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.d_}}/**
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
 */const q_="PersistentStream";class VT{constructor(e,n,r,s,i,o,l,u){this.Ci=e,this.S_=r,this.b_=s,this.connection=i,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=l,this.listener=u,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new OT(e,n)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Ci.enqueueAfterDelay(this.S_,6e4,()=>this.k_()))}K_(e){this.q_(),this.stream.send(e)}async k_(){if(this.O_())return this.close(0)}q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,n){this.q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():n&&n.code===M.RESOURCE_EXHAUSTED?(Wn(n.toString()),Wn("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):n&&n.code===M.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.W_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.t_(n)}W_(){}auth(){this.state=1;const e=this.Q_(this.D_),n=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([r,s])=>{this.D_===n&&this.G_(r,s)},r=>{e(()=>{const s=new B(M.UNKNOWN,"Fetching auth token failed: "+r.message);return this.z_(s)})})}G_(e,n){const r=this.Q_(this.D_);this.stream=this.j_(e,n),this.stream.Zo(()=>{r(()=>this.listener.Zo())}),this.stream.Yo(()=>{r(()=>(this.state=2,this.v_=this.Ci.enqueueAfterDelay(this.b_,1e4,()=>(this.O_()&&(this.state=3),Promise.resolve())),this.listener.Yo()))}),this.stream.t_(s=>{r(()=>this.z_(s))}),this.stream.onMessage(s=>{r(()=>++this.F_==1?this.J_(s):this.onNext(s))})}N_(){this.state=5,this.M_.p_(async()=>{this.state=0,this.start()})}z_(e){return q(q_,`close with error: ${e}`),this.stream=null,this.close(4,e)}Q_(e){return n=>{this.Ci.enqueueAndForget(()=>this.D_===e?n():(q(q_,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class CP extends VT{constructor(e,n,r,s,i,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",n,r,s,o),this.serializer=i}j_(e,n){return this.connection.T_("Listen",e,n)}J_(e){return this.onNext(e)}onNext(e){this.M_.reset();const n=Db(this.serializer,e),r=function(i){if(!("targetChange"in i))return X.min();const o=i.targetChange;return o.targetIds&&o.targetIds.length?X.min():o.readTime?wn(o.readTime):X.min()}(e);return this.listener.H_(n,r)}Z_(e){const n={};n.database=gf(this.serializer),n.addTarget=function(i,o){let l;const u=o.target;if(l=hf(u)?{documents:Lb(i,u)}:{query:Mb(i,u).ft},l.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){l.resumeToken=TT(i,o.resumeToken);const c=ff(i,o.expectedCount);c!==null&&(l.expectedCount=c)}else if(o.snapshotVersion.compareTo(X.min())>0){l.readTime=Vu(i,o.snapshotVersion.toTimestamp());const c=ff(i,o.expectedCount);c!==null&&(l.expectedCount=c)}return l}(this.serializer,e);const r=Ub(this.serializer,e);r&&(n.labels=r),this.K_(n)}X_(e){const n={};n.database=gf(this.serializer),n.removeTarget=e,this.K_(n)}}class AP extends VT{constructor(e,n,r,s,i,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",n,r,s,o),this.serializer=i}get Y_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}W_(){this.Y_&&this.ea([])}j_(e,n){return this.connection.T_("Write",e,n)}J_(e){return le(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,le(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta()}onNext(e){le(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();const n=Vb(e.writeResults,e.commitTime),r=wn(e.commitTime);return this.listener.na(r,n)}ra(){const e={};e.database=gf(this.serializer),this.K_(e)}ea(e){const n={streamToken:this.lastStreamToken,writes:e.map(r=>Ob(this.serializer,r))};this.K_(n)}}/**
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
 */class RP{}class bP extends RP{constructor(e,n,r,s){super(),this.authCredentials=e,this.appCheckCredentials=n,this.connection=r,this.serializer=s,this.ia=!1}sa(){if(this.ia)throw new B(M.FAILED_PRECONDITION,"The client has already been terminated.")}Wo(e,n,r,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([i,o])=>this.connection.Wo(e,pf(n,r),s,i,o)).catch(i=>{throw i.name==="FirebaseError"?(i.code===M.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),i):new B(M.UNKNOWN,i.toString())})}jo(e,n,r,s,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,l])=>this.connection.jo(e,pf(n,r),s,o,l,i)).catch(o=>{throw o.name==="FirebaseError"?(o.code===M.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new B(M.UNKNOWN,o.toString())})}terminate(){this.ia=!0,this.connection.terminate()}}function PP(t,e,n,r){return new bP(t,e,n,r)}class NP{constructor(e,n){this.asyncQueue=e,this.onlineStateHandler=n,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve())))}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ca("Offline")))}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e)}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}la(e){const n=`Could not reach Cloud Firestore backend. ${e}
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
 */const xn="RemoteStore";class DP{constructor(e,n,r,s,i){this.localStore=e,this.datastore=n,this.asyncQueue=r,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Map,this.Ra=new Map,this.Aa=new zr(1e3),this.Va=new zr(1001),this.da=new Set,this.ma=[],this.fa=i,this.fa.Mo(o=>{r.enqueueAndForget(async()=>{Ds(this)&&(q(xn,"Restarting streams for network reachability change."),await async function(u){const c=Y(u);c.da.add(4),await Ma(c),c.ga.set("Unknown"),c.da.delete(4),await Ac(c)}(this))})}),this.ga=new NP(r,s)}}async function Ac(t){if(Ds(t))for(const e of t.ma)await e(!0)}async function Ma(t){for(const e of t.ma)await e(!1)}function vf(t,e){return t.Ea.get(e)||void 0}function LT(t,e){const n=Y(t),r=vf(n,e.targetId);if(r!==void 0&&n.Ia.has(r))return;const s=function(l,u){const c=vf(l,u);c!==void 0&&l.Ra.delete(c);const f=function(g,w){return w%2!=0?g.Va.next():g.Aa.next()}(l,u);return l.Ea.set(u,f),l.Ra.set(f,u),f}(n,e.targetId);q(xn,"remoteStoreListen mapping SDK target ID to remote",e.targetId,s);const i=new Dn(e.target,s,e.purpose,e.sequenceNumber,e.snapshotVersion,e.lastLimboFreeSnapshotVersion,e.resumeToken);n.Ia.set(s,i),Qp(n)?Kp(n):Bi(n).O_()&&Gp(n,i)}function Wp(t,e){const n=Y(t),r=Bi(n),s=vf(n,e);q(xn,"remoteStoreUnlisten removing mapping of SDK target ID to remote",e,s),n.Ia.delete(s),n.Ea.delete(e),n.Ra.delete(s),r.O_()&&MT(n,s),n.Ia.size===0&&(r.O_()?r.L_():Ds(n)&&n.ga.set("Unknown"))}function Gp(t,e){if(t.pa.$e(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(X.min())>0){const n=t.Ra.get(e.targetId);if(n===void 0)return void q(xn,"SDK target ID not found for remote ID: "+e.targetId);const r=t.remoteSyncer.getRemoteKeysForTarget(n).size;e=e.withExpectedCount(r)}Bi(t).Z_(e)}function MT(t,e){t.pa.$e(e),Bi(t).X_(e)}function Kp(t){t.pa=new kb({getRemoteKeysForTarget:e=>{const n=t.Ra.get(e);return n!==void 0?t.remoteSyncer.getRemoteKeysForTarget(n):te()},At:e=>t.Ia.get(e)||null,ht:()=>t.datastore.serializer.databaseId}),Bi(t).start(),t.ga.ua()}function Qp(t){return Ds(t)&&!Bi(t).x_()&&t.Ia.size>0}function Ds(t){return Y(t).da.size===0}function jT(t){t.pa=void 0}async function OP(t){t.ga.set("Online")}async function VP(t){t.Ia.forEach((e,n)=>{Gp(t,e)})}async function LP(t,e){jT(t),Qp(t)?(t.ga.ha(e),Kp(t)):t.ga.set("Unknown")}async function MP(t,e,n){if(t.ga.set("Online"),e instanceof ET&&e.state===2&&e.cause)try{await async function(s,i){const o=i.cause;for(const l of i.targetIds){if(s.Ia.has(l)){const u=s.Ra.get(l);u!==void 0&&(await s.remoteSyncer.rejectListen(u,o),s.Ea.delete(u),s.Ra.delete(l)),s.Ia.delete(l)}s.pa.removeTarget(l)}}(t,e)}catch(r){q(xn,"Failed to remove targets %s: %s ",e.targetIds.join(","),r),await Mu(t,r)}else if(e instanceof Xl?t.pa.Xe(e):e instanceof wT?t.pa.st(e):t.pa.tt(e),!n.isEqual(X.min()))try{const r=await DT(t.localStore);n.compareTo(r)>=0&&await function(i,o){const l=i.pa.Tt(o);l.targetChanges.forEach((c,f)=>{if(c.resumeToken.approximateByteSize()>0){const p=i.Ia.get(f);p&&i.Ia.set(f,p.withResumeToken(c.resumeToken,o))}}),l.targetMismatches.forEach((c,f)=>{const p=i.Ia.get(c);if(!p)return;i.Ia.set(c,p.withResumeToken(Ke.EMPTY_BYTE_STRING,p.snapshotVersion)),MT(i,c);const g=new Dn(p.target,c,f,p.sequenceNumber);Gp(i,g)});const u=function(f,p){const g=new Map;p.targetChanges.forEach((S,b)=>{const P=f.Ra.get(b);P!==void 0&&g.set(P,S)});let w=new Te(ee);return p.targetMismatches.forEach((S,b)=>{const P=f.Ra.get(S);P!==void 0&&(w=w.insert(P,b))}),new Va(p.snapshotVersion,g,w,p.documentUpdates,p.resolvedLimboDocuments)}(i,l);return i.remoteSyncer.applyRemoteEvent(u)}(t,n)}catch(r){q(xn,"Failed to raise snapshot:",r),await Mu(t,r)}}async function Mu(t,e,n){if(!Fi(e))throw e;t.da.add(1),await Ma(t),t.ga.set("Offline"),n||(n=()=>DT(t.localStore)),t.asyncQueue.enqueueRetryable(async()=>{q(xn,"Retrying IndexedDB access"),await n(),t.da.delete(1),await Ac(t)})}function UT(t,e){return e().catch(n=>Mu(t,n,e))}async function Rc(t){const e=Y(t),n=Br(e);let r=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:Np;for(;jP(e);)try{const s=await _P(e.localStore,r);if(s===null){e.Ta.length===0&&n.L_();break}r=s.batchId,UP(e,s)}catch(s){await Mu(e,s)}FT(e)&&zT(e)}function jP(t){return Ds(t)&&t.Ta.length<10}function UP(t,e){t.Ta.push(e);const n=Br(t);n.O_()&&n.Y_&&n.ea(e.mutations)}function FT(t){return Ds(t)&&!Br(t).x_()&&t.Ta.length>0}function zT(t){Br(t).start()}async function FP(t){Br(t).ra()}async function zP(t){const e=Br(t);for(const n of t.Ta)e.ea(n.mutations)}async function BP(t,e,n){const r=t.Ta.shift(),s=Up.from(r,e,n);await UT(t,()=>t.remoteSyncer.applySuccessfulWrite(s)),await Rc(t)}async function $P(t,e){e&&Br(t).Y_&&await async function(r,s){if(function(o){return xb(o)&&o!==M.ABORTED}(s.code)){const i=r.Ta.shift();Br(r).B_(),await UT(r,()=>r.remoteSyncer.rejectFailedWrite(i.batchId,s)),await Rc(r)}}(t,e),FT(t)&&zT(t)}async function H_(t,e){const n=Y(t);n.asyncQueue.verifyOperationInProgress(),q(xn,"RemoteStore received new credentials");const r=Ds(n);n.da.add(3),await Ma(n),r&&n.ga.set("Unknown"),await n.remoteSyncer.handleCredentialChange(e),n.da.delete(3),await Ac(n)}async function qP(t,e){const n=Y(t);e?(n.da.delete(2),await Ac(n)):e||(n.da.add(2),await Ma(n),n.ga.set("Unknown"))}function Bi(t){return t.ya||(t.ya=function(n,r,s){const i=Y(n);return i.sa(),new CP(r,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(t.datastore,t.asyncQueue,{Zo:OP.bind(null,t),Yo:VP.bind(null,t),t_:LP.bind(null,t),H_:MP.bind(null,t)}),t.ma.push(async e=>{e?(t.ya.B_(),Qp(t)?Kp(t):t.ga.set("Unknown")):(await t.ya.stop(),jT(t))})),t.ya}function Br(t){return t.wa||(t.wa=function(n,r,s){const i=Y(n);return i.sa(),new AP(r,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(t.datastore,t.asyncQueue,{Zo:()=>Promise.resolve(),Yo:FP.bind(null,t),t_:$P.bind(null,t),ta:zP.bind(null,t),na:BP.bind(null,t)}),t.ma.push(async e=>{e?(t.wa.B_(),await Rc(t)):(await t.wa.stop(),t.Ta.length>0&&(q(xn,`Stopping write stream with ${t.Ta.length} pending writes`),t.Ta=[]))})),t.wa}/**
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
 */class Xp{constructor(e,n,r,s,i){this.asyncQueue=e,this.timerId=n,this.targetTimeMs=r,this.op=s,this.removalCallback=i,this.deferred=new Mn,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,n,r,s,i){const o=Date.now()+r,l=new Xp(e,n,o,s,i);return l.start(r),l}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new B(M.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Yp(t,e){if(Wn("AsyncQueue",`${e}: ${t}`),Fi(t))return new B(M.UNAVAILABLE,`${e}: ${t}`);throw t}/**
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
 */class fi{static emptySet(e){return new fi(e.comparator)}constructor(e){this.comparator=e?(n,r)=>e(n,r)||W.comparator(n.key,r.key):(n,r)=>W.comparator(n.key,r.key),this.keyedMap=Ro(),this.sortedSet=new Te(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const n=this.keyedMap.get(e);return n?this.sortedSet.indexOf(n):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((n,r)=>(e(n),!1))}add(e){const n=this.delete(e.key);return n.copy(n.keyedMap.insert(e.key,e),n.sortedSet.insert(e,null))}delete(e){const n=this.get(e);return n?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(n)):this}isEqual(e){if(!(e instanceof fi)||this.size!==e.size)return!1;const n=this.sortedSet.getIterator(),r=e.sortedSet.getIterator();for(;n.hasNext();){const s=n.getNext().key,i=r.getNext().key;if(!s.isEqual(i))return!1}return!0}toString(){const e=[];return this.forEach(n=>{e.push(n.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,n){const r=new fi;return r.comparator=this.comparator,r.keyedMap=e,r.sortedSet=n,r}}/**
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
 */class W_{constructor(){this.Sa=new Te(W.comparator)}track(e){const n=e.doc.key,r=this.Sa.get(n);r?e.type!==0&&r.type===3?this.Sa=this.Sa.insert(n,e):e.type===3&&r.type!==1?this.Sa=this.Sa.insert(n,{type:r.type,doc:e.doc}):e.type===2&&r.type===2?this.Sa=this.Sa.insert(n,{type:2,doc:e.doc}):e.type===2&&r.type===0?this.Sa=this.Sa.insert(n,{type:0,doc:e.doc}):e.type===1&&r.type===0?this.Sa=this.Sa.remove(n):e.type===1&&r.type===2?this.Sa=this.Sa.insert(n,{type:1,doc:r.doc}):e.type===0&&r.type===1?this.Sa=this.Sa.insert(n,{type:2,doc:e.doc}):K(63341,{Vt:e,ba:r}):this.Sa=this.Sa.insert(n,e)}Da(){const e=[];return this.Sa.inorderTraversal((n,r)=>{e.push(r)}),e}}class bi{constructor(e,n,r,s,i,o,l,u,c){this.query=e,this.docs=n,this.oldDocs=r,this.docChanges=s,this.mutatedKeys=i,this.fromCache=o,this.syncStateChanged=l,this.excludesMetadataChanges=u,this.hasCachedResults=c}static fromInitialDocuments(e,n,r,s,i){const o=[];return n.forEach(l=>{o.push({type:0,doc:l})}),new bi(e,n,fi.emptySet(n),o,r,s,!0,!1,i)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&Tc(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const n=this.docChanges,r=e.docChanges;if(n.length!==r.length)return!1;for(let s=0;s<n.length;s++)if(n[s].type!==r[s].type||!n[s].doc.isEqual(r[s].doc))return!1;return!0}}/**
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
 */class HP{constructor(){this.Ca=void 0,this.va=[]}Fa(){return this.va.some(e=>e.Ma())}}class WP{constructor(){this.queries=G_(),this.onlineState="Unknown",this.xa=new Set}terminate(){(function(n,r){const s=Y(n),i=s.queries;s.queries=G_(),i.forEach((o,l)=>{for(const u of l.va)u.onError(r)})})(this,new B(M.ABORTED,"Firestore shutting down"))}}function G_(){return new Ns(t=>oT(t),Tc)}async function Jp(t,e){const n=Y(t);let r=3;const s=e.query;let i=n.queries.get(s);i?!i.Fa()&&e.Ma()&&(r=2):(i=new HP,r=e.Ma()?0:1);try{switch(r){case 0:i.Ca=await n.onListen(s,!0);break;case 1:i.Ca=await n.onListen(s,!1);break;case 2:await n.onFirstRemoteStoreListen(s)}}catch(o){const l=Yp(o,`Initialization of query '${qs(e.query)}' failed`);return void e.onError(l)}n.queries.set(s,i),i.va.push(e),e.Oa(n.onlineState),i.Ca&&e.Na(i.Ca)&&em(n)}async function Zp(t,e){const n=Y(t),r=e.query;let s=3;const i=n.queries.get(r);if(i){const o=i.va.indexOf(e);o>=0&&(i.va.splice(o,1),i.va.length===0?s=e.Ma()?0:1:!i.Fa()&&e.Ma()&&(s=2))}switch(s){case 0:return n.queries.delete(r),n.onUnlisten(r,!0);case 1:return n.queries.delete(r),n.onUnlisten(r,!1);case 2:return n.onLastRemoteStoreUnlisten(r);default:return}}function GP(t,e){const n=Y(t);let r=!1;for(const s of e){const i=s.query,o=n.queries.get(i);if(o){for(const l of o.va)l.Na(s)&&(r=!0);o.Ca=s}}r&&em(n)}function KP(t,e,n){const r=Y(t),s=r.queries.get(e);if(s)for(const i of s.va)i.onError(n);r.queries.delete(e)}function em(t){t.xa.forEach(e=>{e.next()})}var wf,K_;(K_=wf||(wf={})).Ba="default",K_.Cache="cache";class tm{constructor(e,n,r){this.query=e,this.La=n,this.ka=!1,this.Ka=null,this.onlineState="Unknown",this.options=r||{}}Na(e){if(!this.options.includeMetadataChanges){const r=[];for(const s of e.docChanges)s.type!==3&&r.push(s);e=new bi(e.query,e.docs,e.oldDocs,r,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let n=!1;return this.ka?this.qa(e)&&(this.La.next(e),n=!0):this.Ua(e,this.onlineState)&&(this.$a(e),n=!0),this.Ka=e,n}onError(e){this.La.error(e)}Oa(e){this.onlineState=e;let n=!1;return this.Ka&&!this.ka&&this.Ua(this.Ka,e)&&(this.$a(this.Ka),n=!0),n}Ua(e,n){if(!e.fromCache||!this.Ma())return!0;const r=n!=="Offline";return(!this.options.Wa||!r)&&(!e.docs.isEmpty()||e.hasCachedResults||n==="Offline")}qa(e){if(e.docChanges.length>0)return!0;const n=this.Ka&&this.Ka.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!n)&&this.options.includeMetadataChanges===!0}$a(e){e=bi.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.ka=!0,this.La.next(e)}Ma(){return this.options.source!==wf.Cache}}/**
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
 */class BT{constructor(e){this.key=e}}class $T{constructor(e){this.key=e}}class QP{constructor(e,n){this.query=e,this.tu=n,this.nu=null,this.hasCachedResults=!1,this.current=!1,this.ru=te(),this.mutatedKeys=te(),this.iu=aT(e),this.su=new fi(this.iu)}get ou(){return this.tu}_u(e,n){const r=n?n.au:new W_,s=n?n.su:this.su;let i=n?n.mutatedKeys:this.mutatedKeys,o=s,l=!1;const u=this.query.limitType==="F"&&s.size===this.query.limit?s.last():null,c=this.query.limitType==="L"&&s.size===this.query.limit?s.first():null;if(e.inorderTraversal((f,p)=>{const g=s.get(f),w=xc(this.query,p)?p:null,S=!!g&&this.mutatedKeys.has(g.key),b=!!w&&(w.hasLocalMutations||this.mutatedKeys.has(w.key)&&w.hasCommittedMutations);let P=!1;g&&w?g.data.isEqual(w.data)?S!==b&&(r.track({type:3,doc:w}),P=!0):this.uu(g,w)||(r.track({type:2,doc:w}),P=!0,(u&&this.iu(w,u)>0||c&&this.iu(w,c)<0)&&(l=!0)):!g&&w?(r.track({type:0,doc:w}),P=!0):g&&!w&&(r.track({type:1,doc:g}),P=!0,(u||c)&&(l=!0)),P&&(w?(o=o.add(w),i=b?i.add(f):i.delete(f)):(o=o.delete(f),i=i.delete(f)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const f=this.query.limitType==="F"?o.last():o.first();o=o.delete(f.key),i=i.delete(f.key),r.track({type:1,doc:f})}return{su:o,au:r,bs:l,mutatedKeys:i}}uu(e,n){return e.hasLocalMutations&&n.hasCommittedMutations&&!n.hasLocalMutations}applyChanges(e,n,r,s){const i=this.su;this.su=e.su,this.mutatedKeys=e.mutatedKeys;const o=e.au.Da();o.sort((f,p)=>function(w,S){const b=P=>{switch(P){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return K(20277,{Vt:P})}};return b(w)-b(S)}(f.type,p.type)||this.iu(f.doc,p.doc)),this.cu(r),s=s??!1;const l=n&&!s?this.lu():[],u=this.ru.size===0&&this.current&&!s?1:0,c=u!==this.nu;return this.nu=u,o.length!==0||c?{snapshot:new bi(this.query,e.su,i,o,e.mutatedKeys,u===0,c,!1,!!r&&r.resumeToken.approximateByteSize()>0),hu:l}:{hu:l}}Oa(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({su:this.su,au:new W_,mutatedKeys:this.mutatedKeys,bs:!1},!1)):{hu:[]}}Pu(e){return!this.tu.has(e)&&!!this.su.has(e)&&!this.su.get(e).hasLocalMutations}cu(e){e&&(e.addedDocuments.forEach(n=>this.tu=this.tu.add(n)),e.modifiedDocuments.forEach(n=>{}),e.removedDocuments.forEach(n=>this.tu=this.tu.delete(n)),this.current=e.current)}lu(){if(!this.current)return[];const e=this.ru;this.ru=te(),this.su.forEach(r=>{this.Pu(r.key)&&(this.ru=this.ru.add(r.key))});const n=[];return e.forEach(r=>{this.ru.has(r)||n.push(new $T(r))}),this.ru.forEach(r=>{e.has(r)||n.push(new BT(r))}),n}Tu(e){this.tu=e.ks,this.ru=te();const n=this._u(e.documents);return this.applyChanges(n,!0)}Iu(){return bi.fromInitialDocuments(this.query,this.su,this.mutatedKeys,this.nu===0,this.hasCachedResults)}}const nm="SyncEngine";class XP{constructor(e,n,r){this.query=e,this.targetId=n,this.view=r}}class YP{constructor(e){this.key=e,this.Eu=!1}}class JP{constructor(e,n,r,s,i,o){this.localStore=e,this.remoteStore=n,this.eventManager=r,this.sharedClientState=s,this.currentUser=i,this.maxConcurrentLimboResolutions=o,this.Ru={},this.Au=new Ns(l=>oT(l),Tc),this.Vu=new Map,this.du=new Set,this.mu=new Te(W.comparator),this.fu=new Map,this.gu=new Bp,this.pu={},this.yu=new Map,this.wu=zr.ar(),this.onlineState="Unknown",this.Su=void 0}get isPrimaryClient(){return this.Su===!0}}async function ZP(t,e,n=!0){const r=QT(t);let s;const i=r.Au.get(e);return i?(r.sharedClientState.addLocalQueryTarget(i.targetId),s=i.view.Iu()):s=await qT(r,e,n,!0),s}async function eN(t,e){const n=QT(t);await qT(n,e,!0,!1)}async function qT(t,e,n,r){const s=await vP(t.localStore,vn(e)),i=s.targetId,o=t.sharedClientState.addLocalQueryTarget(i,n);let l;return r&&(l=await tN(t,e,i,o==="current",s.resumeToken)),t.isPrimaryClient&&n&&LT(t.remoteStore,s),l}async function tN(t,e,n,r,s){t.bu=(p,g,w)=>async function(b,P,I,v){let C=P.view._u(I);C.bs&&(C=await F_(b.localStore,P.query,!1).then(({documents:E})=>P.view._u(E,C)));const D=v&&v.targetChanges.get(P.targetId),j=v&&v.targetMismatches.get(P.targetId)!=null,L=P.view.applyChanges(C,b.isPrimaryClient,D,j);return X_(b,P.targetId,L.hu),L.snapshot}(t,p,g,w);const i=await F_(t.localStore,e,!0),o=new QP(e,i.ks),l=o._u(i.documents),u=La.createSynthesizedTargetChangeForCurrentChange(n,r&&t.onlineState!=="Offline",s),c=o.applyChanges(l,t.isPrimaryClient,u);X_(t,n,c.hu);const f=new XP(e,n,o);return t.Au.set(e,f),t.Vu.has(n)?t.Vu.get(n).push(e):t.Vu.set(n,[e]),c.snapshot}async function nN(t,e,n){const r=Y(t),s=r.Au.get(e),i=r.Vu.get(s.targetId);if(i.length>1)return r.Vu.set(s.targetId,i.filter(o=>!Tc(o,e))),void r.Au.delete(e);r.isPrimaryClient?(r.sharedClientState.removeLocalQueryTarget(s.targetId),r.sharedClientState.isActiveQueryTarget(s.targetId)||await yf(r.localStore,s.targetId,!1).then(()=>{r.sharedClientState.clearQueryState(s.targetId),n&&Wp(r.remoteStore,s.targetId),Ef(r,s.targetId)}).catch(Ui)):(Ef(r,s.targetId),await yf(r.localStore,s.targetId,!0))}async function rN(t,e){const n=Y(t),r=n.Au.get(e),s=n.Vu.get(r.targetId);n.isPrimaryClient&&s.length===1&&(n.sharedClientState.removeLocalQueryTarget(r.targetId),Wp(n.remoteStore,r.targetId))}async function sN(t,e,n){const r=hN(t);try{const s=await function(o,l){const u=Y(o),c=fe.now(),f=l.reduce((w,S)=>w.add(S.key),te());let p,g;return u.persistence.runTransaction("Locally write mutations","readwrite",w=>{let S=Gn(),b=te();return u.xs.getEntries(w,f).next(P=>{S=P,S.forEach((I,v)=>{v.isValidDocument()||(b=b.add(I))})}).next(()=>u.localDocuments.getOverlayedDocuments(w,S)).next(P=>{p=P;const I=[];for(const v of l){const C=_b(v,p.get(v.key).overlayedDocument);C!=null&&I.push(new Xr(v.key,C,JE(C.value.mapValue),mt.exists(!0)))}return u.mutationQueue.addMutationBatch(w,c,I,l)}).next(P=>{g=P;const I=P.applyToLocalDocumentSet(p,b);return u.documentOverlayCache.saveOverlays(w,P.batchId,I)})}).then(()=>({batchId:g.batchId,changes:uT(p)}))}(r.localStore,e);r.sharedClientState.addPendingMutation(s.batchId),function(o,l,u){let c=o.pu[o.currentUser.toKey()];c||(c=new Te(ee)),c=c.insert(l,u),o.pu[o.currentUser.toKey()]=c}(r,s.batchId,n),await ja(r,s.changes),await Rc(r.remoteStore)}catch(s){const i=Yp(s,"Failed to persist write");n.reject(i)}}async function HT(t,e){const n=Y(t);try{const r=await gP(n.localStore,e);e.targetChanges.forEach((s,i)=>{const o=n.fu.get(i);o&&(le(s.addedDocuments.size+s.modifiedDocuments.size+s.removedDocuments.size<=1,22616),s.addedDocuments.size>0?o.Eu=!0:s.modifiedDocuments.size>0?le(o.Eu,14607):s.removedDocuments.size>0&&(le(o.Eu,42227),o.Eu=!1))}),await ja(n,r,e)}catch(r){await Ui(r)}}function Q_(t,e,n){const r=Y(t);if(r.isPrimaryClient&&n===0||!r.isPrimaryClient&&n===1){const s=[];r.Au.forEach((i,o)=>{const l=o.view.Oa(e);l.snapshot&&s.push(l.snapshot)}),function(o,l){const u=Y(o);u.onlineState=l;let c=!1;u.queries.forEach((f,p)=>{for(const g of p.va)g.Oa(l)&&(c=!0)}),c&&em(u)}(r.eventManager,e),s.length&&r.Ru.H_(s),r.onlineState=e,r.isPrimaryClient&&r.sharedClientState.setOnlineState(e)}}async function iN(t,e,n){const r=Y(t);r.sharedClientState.updateQueryState(e,"rejected",n);const s=r.fu.get(e),i=s&&s.key;if(i){let o=new Te(W.comparator);o=o.insert(i,ot.newNoDocument(i,X.min()));const l=te().add(i),u=new Va(X.min(),new Map,new Te(ee),o,l);await HT(r,u),r.mu=r.mu.remove(i),r.fu.delete(e),rm(r)}else await yf(r.localStore,e,!1).then(()=>Ef(r,e,n)).catch(Ui)}async function oN(t,e){const n=Y(t),r=e.batch.batchId;try{const s=await mP(n.localStore,e);GT(n,r,null),WT(n,r),n.sharedClientState.updateMutationState(r,"acknowledged"),await ja(n,s)}catch(s){await Ui(s)}}async function aN(t,e,n){const r=Y(t);try{const s=await function(o,l){const u=Y(o);return u.persistence.runTransaction("Reject batch","readwrite-primary",c=>{let f;return u.mutationQueue.lookupMutationBatch(c,l).next(p=>(le(p!==null,37113),f=p.keys(),u.mutationQueue.removeMutationBatch(c,p))).next(()=>u.mutationQueue.performConsistencyCheck(c)).next(()=>u.documentOverlayCache.removeOverlaysForBatchId(c,f,l)).next(()=>u.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(c,f)).next(()=>u.localDocuments.getDocuments(c,f))})}(r.localStore,e);GT(r,e,n),WT(r,e),r.sharedClientState.updateMutationState(e,"rejected",n),await ja(r,s)}catch(s){await Ui(s)}}function WT(t,e){(t.yu.get(e)||[]).forEach(n=>{n.resolve()}),t.yu.delete(e)}function GT(t,e,n){const r=Y(t);let s=r.pu[r.currentUser.toKey()];if(s){const i=s.get(e);i&&(n?i.reject(n):i.resolve(),s=s.remove(e)),r.pu[r.currentUser.toKey()]=s}}function Ef(t,e,n=null){t.sharedClientState.removeLocalQueryTarget(e);for(const r of t.Vu.get(e))t.Au.delete(r),n&&t.Ru.Du(r,n);t.Vu.delete(e),t.isPrimaryClient&&t.gu.Gr(e).forEach(r=>{t.gu.containsKey(r)||KT(t,r)})}function KT(t,e){t.du.delete(e.path.canonicalString());const n=t.mu.get(e);n!==null&&(Wp(t.remoteStore,n),t.mu=t.mu.remove(e),t.fu.delete(n),rm(t))}function X_(t,e,n){for(const r of n)r instanceof BT?(t.gu.addReference(r.key,e),lN(t,r)):r instanceof $T?(q(nm,"Document no longer in limbo: "+r.key),t.gu.removeReference(r.key,e),t.gu.containsKey(r.key)||KT(t,r.key)):K(19791,{Cu:r})}function lN(t,e){const n=e.key,r=n.path.canonicalString();t.mu.get(n)||t.du.has(r)||(q(nm,"New document in limbo: "+n),t.du.add(r),rm(t))}function rm(t){for(;t.du.size>0&&t.mu.size<t.maxConcurrentLimboResolutions;){const e=t.du.values().next().value;t.du.delete(e);const n=new W(de.fromString(e)),r=t.wu.next();t.fu.set(r,new YP(n)),t.mu=t.mu.insert(n,r),LT(t.remoteStore,new Dn(vn(Ec(n.path)),r,"TargetPurposeLimboResolution",_c.ce))}}async function ja(t,e,n){const r=Y(t),s=[],i=[],o=[];r.Au.isEmpty()||(r.Au.forEach((l,u)=>{o.push(r.bu(u,e,n).then(c=>{var f;if((c||n)&&r.isPrimaryClient){const p=c?!c.fromCache:(f=n==null?void 0:n.targetChanges.get(u.targetId))==null?void 0:f.current;r.sharedClientState.updateQueryState(u.targetId,p?"current":"not-current")}if(c){s.push(c);const p=qp.Es(u.targetId,c);i.push(p)}}))}),await Promise.all(o),r.Ru.H_(s),await async function(u,c){const f=Y(u);try{await f.persistence.runTransaction("notifyLocalViewChanges","readwrite",p=>U.forEach(c,g=>U.forEach(g.Ts,w=>f.persistence.referenceDelegate.addReference(p,g.targetId,w)).next(()=>U.forEach(g.Is,w=>f.persistence.referenceDelegate.removeReference(p,g.targetId,w)))))}catch(p){if(!Fi(p))throw p;q(Hp,"Failed to update sequence numbers: "+p)}for(const p of c){const g=p.targetId;if(!p.fromCache){const w=f.vs.get(g),S=w.snapshotVersion,b=w.withLastLimboFreeSnapshotVersion(S);f.vs=f.vs.insert(g,b)}}}(r.localStore,i))}async function uN(t,e){const n=Y(t);if(!n.currentUser.isEqual(e)){q(nm,"User change. New user:",e.toKey());const r=await NT(n.localStore,e);n.currentUser=e,function(i,o){i.yu.forEach(l=>{l.forEach(u=>{u.reject(new B(M.CANCELLED,o))})}),i.yu.clear()}(n,"'waitForPendingWrites' promise is rejected due to a user change."),n.sharedClientState.handleUserChange(e,r.removedBatchIds,r.addedBatchIds),await ja(n,r.Ns)}}function cN(t,e){const n=Y(t),r=n.fu.get(e);if(r&&r.Eu)return te().add(r.key);{let s=te();const i=n.Vu.get(e);if(!i)return s;for(const o of i){const l=n.Au.get(o);s=s.unionWith(l.view.ou)}return s}}function QT(t){const e=Y(t);return e.remoteStore.remoteSyncer.applyRemoteEvent=HT.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=cN.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=iN.bind(null,e),e.Ru.H_=GP.bind(null,e.eventManager),e.Ru.Du=KP.bind(null,e.eventManager),e}function hN(t){const e=Y(t);return e.remoteStore.remoteSyncer.applySuccessfulWrite=oN.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=aN.bind(null,e),e}class ju{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=Cc(e.databaseInfo.databaseId),this.sharedClientState=this.Mu(e),this.persistence=this.xu(e),await this.persistence.start(),this.localStore=this.Ou(e),this.gcScheduler=this.Nu(e,this.localStore),this.indexBackfillerScheduler=this.Bu(e,this.localStore)}Nu(e,n){return null}Bu(e,n){return null}Ou(e){return pP(this.persistence,new hP,e.initialUser,this.serializer)}xu(e){return new PT($p.Vi,this.serializer)}Mu(e){return new EP}async terminate(){var e,n;(e=this.gcScheduler)==null||e.stop(),(n=this.indexBackfillerScheduler)==null||n.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}ju.provider={build:()=>new ju};class dN extends ju{constructor(e){super(),this.cacheSizeBytes=e}Nu(e,n){le(this.persistence.referenceDelegate instanceof Lu,46915);const r=this.persistence.referenceDelegate.garbageCollector;return new Xb(r,e.asyncQueue,n)}xu(e){const n=this.cacheSizeBytes!==void 0?_t.withCacheSize(this.cacheSizeBytes):_t.DEFAULT;return new PT(r=>Lu.Vi(r,n),this.serializer)}}class Tf{async initialize(e,n){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(n),this.remoteStore=this.createRemoteStore(n),this.eventManager=this.createEventManager(n),this.syncEngine=this.createSyncEngine(n,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=r=>Q_(this.syncEngine,r,1),this.remoteStore.remoteSyncer.handleCredentialChange=uN.bind(null,this.syncEngine),await qP(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new WP}()}createDatastore(e){const n=Cc(e.databaseInfo.databaseId),r=kP(e.databaseInfo);return PP(e.authCredentials,e.appCheckCredentials,r,n)}createRemoteStore(e){return function(r,s,i,o,l){return new DP(r,s,i,o,l)}(this.localStore,this.datastore,e.asyncQueue,n=>Q_(this.syncEngine,n,0),function(){return $_.v()?new $_:new TP}())}createSyncEngine(e,n){return function(s,i,o,l,u,c,f){const p=new JP(s,i,o,l,u,c);return f&&(p.Su=!0),p}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,n)}async terminate(){var e,n;await async function(s){const i=Y(s);q(xn,"RemoteStore shutting down."),i.da.add(5),await Ma(i),i.fa.shutdown(),i.ga.set("Unknown")}(this.remoteStore),(e=this.datastore)==null||e.terminate(),(n=this.eventManager)==null||n.terminate()}}Tf.provider={build:()=>new Tf};/**
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
 */class sm{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.ku(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.ku(this.observer.error,e):Wn("Uncaught Error in snapshot listener:",e.toString()))}Ku(){this.muted=!0}ku(e,n){setTimeout(()=>{this.muted||e(n)},0)}}/**
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
 */const $r="FirestoreClient";class fN{constructor(e,n,r,s,i){this.authCredentials=e,this.appCheckCredentials=n,this.asyncQueue=r,this._databaseInfo=s,this.user=st.UNAUTHENTICATED,this.clientId=gc.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=i,this.authCredentials.start(r,async o=>{q($r,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(r,o=>(q($r,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this._databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new Mn;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(n){const r=Yp(n,"Failed to shutdown persistence");e.reject(r)}}),e.promise}}async function Qh(t,e){t.asyncQueue.verifyOperationInProgress(),q($r,"Initializing OfflineComponentProvider");const n=t.configuration;await e.initialize(n);let r=n.initialUser;t.setCredentialChangeListener(async s=>{r.isEqual(s)||(await NT(e.localStore,s),r=s)}),e.persistence.setDatabaseDeletedListener(()=>t.terminate()),t._offlineComponents=e}async function Y_(t,e){t.asyncQueue.verifyOperationInProgress();const n=await pN(t);q($r,"Initializing OnlineComponentProvider"),await e.initialize(n,t.configuration),t.setCredentialChangeListener(r=>H_(e.remoteStore,r)),t.setAppCheckTokenChangeListener((r,s)=>H_(e.remoteStore,s)),t._onlineComponents=e}async function pN(t){if(!t._offlineComponents)if(t._uninitializedComponentsProvider){q($r,"Using user provided OfflineComponentProvider");try{await Qh(t,t._uninitializedComponentsProvider._offline)}catch(e){const n=e;if(!function(s){return s.name==="FirebaseError"?s.code===M.FAILED_PRECONDITION||s.code===M.UNIMPLEMENTED:!(typeof DOMException<"u"&&s instanceof DOMException)||s.code===22||s.code===20||s.code===11}(n))throw n;Lr("Error using user provided cache. Falling back to memory cache: "+n),await Qh(t,new ju)}}else q($r,"Using default OfflineComponentProvider"),await Qh(t,new dN(void 0));return t._offlineComponents}async function XT(t){return t._onlineComponents||(t._uninitializedComponentsProvider?(q($r,"Using user provided OnlineComponentProvider"),await Y_(t,t._uninitializedComponentsProvider._online)):(q($r,"Using default OnlineComponentProvider"),await Y_(t,new Tf))),t._onlineComponents}function mN(t){return XT(t).then(e=>e.syncEngine)}async function Uu(t){const e=await XT(t),n=e.eventManager;return n.onListen=ZP.bind(null,e.syncEngine),n.onUnlisten=nN.bind(null,e.syncEngine),n.onFirstRemoteStoreListen=eN.bind(null,e.syncEngine),n.onLastRemoteStoreUnlisten=rN.bind(null,e.syncEngine),n}function gN(t,e,n,r){const s=new sm(r),i=new tm(e,s,n);return t.asyncQueue.enqueueAndForget(async()=>Jp(await Uu(t),i)),()=>{s.Ku(),t.asyncQueue.enqueueAndForget(async()=>Zp(await Uu(t),i))}}function yN(t,e,n={}){const r=new Mn;return t.asyncQueue.enqueueAndForget(async()=>function(i,o,l,u,c){const f=new sm({next:g=>{f.Ku(),o.enqueueAndForget(()=>Zp(i,p));const w=g.docs.has(l);!w&&g.fromCache?c.reject(new B(M.UNAVAILABLE,"Failed to get document because the client is offline.")):w&&g.fromCache&&u&&u.source==="server"?c.reject(new B(M.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):c.resolve(g)},error:g=>c.reject(g)}),p=new tm(Ec(l.path),f,{includeMetadataChanges:!0,Wa:!0});return Jp(i,p)}(await Uu(t),t.asyncQueue,e,n,r)),r.promise}function _N(t,e,n={}){const r=new Mn;return t.asyncQueue.enqueueAndForget(async()=>function(i,o,l,u,c){const f=new sm({next:g=>{f.Ku(),o.enqueueAndForget(()=>Zp(i,p)),g.fromCache&&u.source==="server"?c.reject(new B(M.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):c.resolve(g)},error:g=>c.reject(g)}),p=new tm(l,f,{includeMetadataChanges:!0,Wa:!0});return Jp(i,p)}(await Uu(t),t.asyncQueue,e,n,r)),r.promise}function vN(t,e){const n=new Mn;return t.asyncQueue.enqueueAndForget(async()=>sN(await mN(t),e,n)),n.promise}/**
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
 */function YT(t){const e={};return t.timeoutSeconds!==void 0&&(e.timeoutSeconds=t.timeoutSeconds),e}/**
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
 */const wN="ComponentProvider",J_=new Map;function EN(t,e,n,r,s){return new zR(t,e,n,s.host,s.ssl,s.experimentalForceLongPolling,s.experimentalAutoDetectLongPolling,YT(s.experimentalLongPollingOptions),s.useFetchStreams,s.isUsingEmulator,r)}/**
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
 */const JT="firestore.googleapis.com",Z_=!0;class ev{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new B(M.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=JT,this.ssl=Z_}else this.host=e.host,this.ssl=e.ssl??Z_;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=bT;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<Kb)throw new B(M.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}zE("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=YT(e.experimentalLongPollingOptions??{}),function(r){if(r.timeoutSeconds!==void 0){if(isNaN(r.timeoutSeconds))throw new B(M.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (must not be NaN)`);if(r.timeoutSeconds<5)throw new B(M.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (minimum allowed value is 5)`);if(r.timeoutSeconds>30)throw new B(M.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(r,s){return r.timeoutSeconds===s.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class bc{constructor(e,n,r,s){this._authCredentials=e,this._appCheckCredentials=n,this._databaseId=r,this._app=s,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new ev({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new B(M.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new B(M.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new ev(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(r){if(!r)return new UE;switch(r.type){case"firstParty":return new SR(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new B(M.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(n){const r=J_.get(n);r&&(q(wN,"Removing Datastore"),J_.delete(n),r.terminate())}(this),Promise.resolve()}}function ZT(t,e,n,r={}){var c;t=at(t,bc);const s=bs(e),i=t._getSettings(),o={...i,emulatorOptions:t._getEmulatorOptions()},l=`${e}:${n}`;s&&Cp(`https://${l}`),i.host!==JT&&i.host!==l&&Lr("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const u={...i,host:l,ssl:s,emulatorOptions:r};if(!Or(u,o)&&(t._setSettings(u),r.mockUserToken)){let f,p;if(typeof r.mockUserToken=="string")f=r.mockUserToken,p=st.MOCK_USER;else{f=SE(r.mockUserToken,(c=t._app)==null?void 0:c.options.projectId);const g=r.mockUserToken.sub||r.mockUserToken.user_id;if(!g)throw new B(M.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");p=new st(g)}t._authCredentials=new TR(new jE(f,p))}}/**
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
 */class kn{constructor(e,n,r){this.converter=n,this._query=r,this.type="query",this.firestore=e}withConverter(e){return new kn(this.firestore,e,this._query)}}class Ie{constructor(e,n,r){this.converter=n,this._key=r,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new jn(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new Ie(this.firestore,e,this._key)}toJSON(){return{type:Ie._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,n,r){if(Da(n,Ie._jsonSchema))return new Ie(e,r||null,new W(de.fromString(n.referencePath)))}}Ie._jsonSchemaVersion="firestore/documentReference/1.0",Ie._jsonSchema={type:Me("string",Ie._jsonSchemaVersion),referencePath:Me("string")};class jn extends kn{constructor(e,n,r){super(e,n,Ec(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new Ie(this.firestore,null,new W(e))}withConverter(e){return new jn(this.firestore,e,this._path)}}function xf(t,e,...n){if(t=ce(t),FE("collection","path",e),t instanceof bc){const r=de.fromString(e,...n);return f_(r),new jn(t,null,r)}{if(!(t instanceof Ie||t instanceof jn))throw new B(M.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=t._path.child(de.fromString(e,...n));return f_(r),new jn(t.firestore,null,r)}}function ze(t,e,...n){if(t=ce(t),arguments.length===1&&(e=gc.newId()),FE("doc","path",e),t instanceof bc){const r=de.fromString(e,...n);return d_(r),new Ie(t,null,new W(r))}{if(!(t instanceof Ie||t instanceof jn))throw new B(M.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=t._path.child(de.fromString(e,...n));return d_(r),new Ie(t.firestore,t instanceof jn?t.converter:null,new W(r))}}/**
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
 */const tv="AsyncQueue";class nv{constructor(e=Promise.resolve()){this.rc=[],this.sc=!1,this.oc=[],this._c=null,this.ac=!1,this.uc=!1,this.cc=[],this.M_=new OT(this,"async_queue_retry"),this.lc=()=>{const r=Kh();r&&q(tv,"Visibility state changed to "+r.visibilityState),this.M_.w_()},this.hc=e;const n=Kh();n&&typeof n.addEventListener=="function"&&n.addEventListener("visibilitychange",this.lc)}get isShuttingDown(){return this.sc}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.Pc(),this.Tc(e)}enterRestrictedMode(e){if(!this.sc){this.sc=!0,this.uc=e||!1;const n=Kh();n&&typeof n.removeEventListener=="function"&&n.removeEventListener("visibilitychange",this.lc)}}enqueue(e){if(this.Pc(),this.sc)return new Promise(()=>{});const n=new Mn;return this.Tc(()=>this.sc&&this.uc?Promise.resolve():(e().then(n.resolve,n.reject),n.promise)).then(()=>n.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.rc.push(e),this.Ic()))}async Ic(){if(this.rc.length!==0){try{await this.rc[0](),this.rc.shift(),this.M_.reset()}catch(e){if(!Fi(e))throw e;q(tv,"Operation failed with retryable error: "+e)}this.rc.length>0&&this.M_.p_(()=>this.Ic())}}Tc(e){const n=this.hc.then(()=>(this.ac=!0,e().catch(r=>{throw this._c=r,this.ac=!1,Wn("INTERNAL UNHANDLED ERROR: ",rv(r)),r}).then(r=>(this.ac=!1,r))));return this.hc=n,n}enqueueAfterDelay(e,n,r){this.Pc(),this.cc.indexOf(e)>-1&&(n=0);const s=Xp.createAndSchedule(this,e,n,r,i=>this.Ec(i));return this.oc.push(s),s}Pc(){this._c&&K(47125,{Rc:rv(this._c)})}verifyOperationInProgress(){}async Ac(){let e;do e=this.hc,await e;while(e!==this.hc)}Vc(e){for(const n of this.oc)if(n.timerId===e)return!0;return!1}dc(e){return this.Ac().then(()=>{this.oc.sort((n,r)=>n.targetTimeMs-r.targetTimeMs);for(const n of this.oc)if(n.skipDelay(),e!=="all"&&n.timerId===e)break;return this.Ac()})}mc(e){this.cc.push(e)}Ec(e){const n=this.oc.indexOf(e);this.oc.splice(n,1)}}function rv(t){let e=t.message||"";return t.stack&&(e=t.stack.includes(t.message)?t.stack:t.message+`
`+t.stack),e}class an extends bc{constructor(e,n,r,s){super(e,n,r,s),this.type="firestore",this._queue=new nv,this._persistenceKey=(s==null?void 0:s.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new nv(e),this._firestoreClient=void 0,await e}}}function ex(t,e){const n=typeof t=="object"?t:bp(),r=typeof t=="string"?t:Pu,s=mc(n,"firestore").getImmediate({identifier:r});if(!s._initialized){const i=TE("firestore");i&&ZT(s,...i)}return s}function $i(t){if(t._terminated)throw new B(M.FAILED_PRECONDITION,"The client has already been terminated.");return t._firestoreClient||TN(t),t._firestoreClient}function TN(t){var r,s,i,o;const e=t._freezeSettings(),n=EN(t._databaseId,((r=t._app)==null?void 0:r.options.appId)||"",t._persistenceKey,(s=t._app)==null?void 0:s.options.apiKey,e);t._componentsProvider||(i=e.localCache)!=null&&i._offlineComponentProvider&&((o=e.localCache)!=null&&o._onlineComponentProvider)&&(t._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),t._firestoreClient=new fN(t._authCredentials,t._appCheckCredentials,t._queue,n,t._componentsProvider&&function(u){const c=u==null?void 0:u._online.build();return{_offline:u==null?void 0:u._offline.build(c),_online:c}}(t._componentsProvider))}/**
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
 */class Ua{constructor(...e){for(let n=0;n<e.length;++n)if(e[n].length===0)throw new B(M.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new We(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}/**
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
 */class Os{constructor(e){this._methodName=e}}/**
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
 */const xN=/^__.*__$/;class IN{constructor(e,n,r){this.data=e,this.fieldMask=n,this.fieldTransforms=r}toMutation(e,n){return this.fieldMask!==null?new Xr(e,this.data,this.fieldMask,n,this.fieldTransforms):new Oa(e,this.data,n,this.fieldTransforms)}}class tx{constructor(e,n,r){this.data=e,this.fieldMask=n,this.fieldTransforms=r}toMutation(e,n){return new Xr(e,this.data,this.fieldMask,n,this.fieldTransforms)}}function nx(t){switch(t){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw K(40011,{dataSource:t})}}class Pc{constructor(e,n,r,s,i,o){this.settings=e,this.databaseId=n,this.serializer=r,this.ignoreUndefinedProperties=s,i===void 0&&this.fc(),this.fieldTransforms=i||[],this.fieldMask=o||[]}get path(){return this.settings.path}get dataSource(){return this.settings.dataSource}i(e){return new Pc({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}yc(e){var s;const n=(s=this.path)==null?void 0:s.child(e),r=this.i({path:n,arrayElement:!1});return r.wc(e),r}Sc(e){var s;const n=(s=this.path)==null?void 0:s.child(e),r=this.i({path:n,arrayElement:!1});return r.fc(),r}bc(e){return this.i({path:void 0,arrayElement:!0})}Dc(e){return Fu(e,this.settings.methodName,this.settings.hasConverter||!1,this.path,this.settings.targetDoc)}contains(e){return this.fieldMask.find(n=>e.isPrefixOf(n))!==void 0||this.fieldTransforms.find(n=>e.isPrefixOf(n.field))!==void 0}fc(){if(this.path)for(let e=0;e<this.path.length;e++)this.wc(this.path.get(e))}wc(e){if(e.length===0)throw this.Dc("Document fields must not be empty");if(nx(this.dataSource)&&xN.test(e))throw this.Dc('Document fields cannot begin and end with "__"')}}class SN{constructor(e,n,r){this.databaseId=e,this.ignoreUndefinedProperties=n,this.serializer=r||Cc(e)}V(e,n,r,s=!1){return new Pc({dataSource:e,methodName:n,targetDoc:r,path:We.emptyPath(),arrayElement:!1,hasConverter:s},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function Fa(t){const e=t._freezeSettings(),n=Cc(t._databaseId);return new SN(t._databaseId,!!e.ignoreUndefinedProperties,n)}function im(t,e,n,r,s,i={}){const o=t.V(i.merge||i.mergeFields?2:0,e,n,s);um("Data must be an object, but it was:",o,r);const l=ix(r,o);let u,c;if(i.merge)u=new Pt(o.fieldMask),c=o.fieldTransforms;else if(i.mergeFields){const f=[];for(const p of i.mergeFields){const g=Is(e,p,n);if(!o.contains(g))throw new B(M.INVALID_ARGUMENT,`Field '${g}' is specified in your field mask but missing from your input data.`);lx(f,g)||f.push(g)}u=new Pt(f),c=o.fieldTransforms.filter(p=>u.covers(p.field))}else u=null,c=o.fieldTransforms;return new IN(new Et(l),u,c)}class Nc extends Os{_toFieldTransform(e){if(e.dataSource!==2)throw e.dataSource===1?e.Dc(`${this._methodName}() can only appear at the top level of your update data`):e.Dc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof Nc}}function kN(t,e,n){return new Pc({dataSource:3,targetDoc:e.settings.targetDoc,methodName:t._methodName,arrayElement:n},e.databaseId,e.serializer,e.ignoreUndefinedProperties)}class om extends Os{_toFieldTransform(e){return new jp(e.path,new _a)}isEqual(e){return e instanceof om}}class am extends Os{constructor(e,n){super(e),this.vc=n}_toFieldTransform(e){const n=kN(this,e,!0),r=this.vc.map(i=>qi(i,n)),s=new Ri(r);return new jp(e.path,s)}isEqual(e){return e instanceof am&&Or(this.vc,e.vc)}}class lm extends Os{constructor(e,n){super(e),this.Fc=n}_toFieldTransform(e){const n=new wa(e.serializer,dT(e.serializer,this.Fc));return new jp(e.path,n)}isEqual(e){return e instanceof lm&&this.Fc===e.Fc}}function rx(t,e,n,r){const s=t.V(1,e,n);um("Data must be an object, but it was:",s,r);const i=[],o=Et.empty();Qr(r,(u,c)=>{const f=ax(e,u,n);c=ce(c);const p=s.Sc(f);if(c instanceof Nc)i.push(f);else{const g=qi(c,p);g!=null&&(i.push(f),o.set(f,g))}});const l=new Pt(i);return new tx(o,l,s.fieldTransforms)}function sx(t,e,n,r,s,i){const o=t.V(1,e,n),l=[Is(e,r,n)],u=[s];if(i.length%2!=0)throw new B(M.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let g=0;g<i.length;g+=2)l.push(Is(e,i[g])),u.push(i[g+1]);const c=[],f=Et.empty();for(let g=l.length-1;g>=0;--g)if(!lx(c,l[g])){const w=l[g];let S=u[g];S=ce(S);const b=o.Sc(w);if(S instanceof Nc)c.push(w);else{const P=qi(S,b);P!=null&&(c.push(w),f.set(w,P))}}const p=new Pt(c);return new tx(f,p,o.fieldTransforms)}function CN(t,e,n,r=!1){return qi(n,t.V(r?4:3,e))}function qi(t,e){if(ox(t=ce(t)))return um("Unsupported field value:",e,t),ix(t,e);if(t instanceof Os)return function(r,s){if(!nx(s.dataSource))throw s.Dc(`${r._methodName}() can only be used with update() and set()`);if(!s.path)throw s.Dc(`${r._methodName}() is not currently supported inside arrays`);const i=r._toFieldTransform(s);i&&s.fieldTransforms.push(i)}(t,e),null;if(t===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),t instanceof Array){if(e.settings.arrayElement&&e.dataSource!==4)throw e.Dc("Nested arrays are not supported");return function(r,s){const i=[];let o=0;for(const l of r){let u=qi(l,s.bc(o));u==null&&(u={nullValue:"NULL_VALUE"}),i.push(u),o++}return{arrayValue:{values:i}}}(t,e)}return function(r,s){if((r=ce(r))===null)return{nullValue:"NULL_VALUE"};if(typeof r=="number")return dT(s.serializer,r);if(typeof r=="boolean")return{booleanValue:r};if(typeof r=="string")return{stringValue:r};if(r instanceof Date){const i=fe.fromDate(r);return{timestampValue:Vu(s.serializer,i)}}if(r instanceof fe){const i=new fe(r.seconds,1e3*Math.floor(r.nanoseconds/1e3));return{timestampValue:Vu(s.serializer,i)}}if(r instanceof nn)return{geoPointValue:{latitude:r.latitude,longitude:r.longitude}};if(r instanceof Rt)return{bytesValue:TT(s.serializer,r._byteString)};if(r instanceof Ie){const i=s.databaseId,o=r.firestore._databaseId;if(!o.isEqual(i))throw s.Dc(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${i.projectId}/${i.database}`);return{referenceValue:zp(r.firestore._databaseId||s.databaseId,r._key.path)}}if(r instanceof $t)return function(o,l){const u=o instanceof $t?o.toArray():o;return{mapValue:{fields:{[XE]:{stringValue:YE},[Nu]:{arrayValue:{values:u.map(f=>{if(typeof f!="number")throw l.Dc("VectorValues must only contain numeric values.");return Mp(l.serializer,f)})}}}}}}(r,s);if(RT(r))return r._toProto(s.serializer);throw s.Dc(`Unsupported field value: ${yc(r)}`)}(t,e)}function ix(t,e){const n={};return qE(t)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Qr(t,(r,s)=>{const i=qi(s,e.yc(r));i!=null&&(n[r]=i)}),{mapValue:{fields:n}}}function ox(t){return!(typeof t!="object"||t===null||t instanceof Array||t instanceof Date||t instanceof fe||t instanceof nn||t instanceof Rt||t instanceof Ie||t instanceof Os||t instanceof $t||RT(t))}function um(t,e,n){if(!ox(n)||!BE(n)){const r=yc(n);throw r==="an object"?e.Dc(t+" a custom object"):e.Dc(t+" "+r)}}function Is(t,e,n){if((e=ce(e))instanceof Ua)return e._internalPath;if(typeof e=="string")return ax(t,e);throw Fu("Field path arguments must be of type string or ",t,!1,void 0,n)}const AN=new RegExp("[~\\*/\\[\\]]");function ax(t,e,n){if(e.search(AN)>=0)throw Fu(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,t,!1,void 0,n);try{return new Ua(...e.split("."))._internalPath}catch{throw Fu(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,t,!1,void 0,n)}}function Fu(t,e,n,r,s){const i=r&&!r.isEmpty(),o=s!==void 0;let l=`Function ${e}() called with invalid data`;n&&(l+=" (via `toFirestore()`)"),l+=". ";let u="";return(i||o)&&(u+=" (found",i&&(u+=` in field ${r}`),o&&(u+=` in document ${s}`),u+=")"),new B(M.INVALID_ARGUMENT,l+t+u)}function lx(t,e){return t.some(n=>n.isEqual(e))}/**
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
 */class ux{convertValue(e,n="none"){switch(Fr(e)){case 0:return null;case 1:return e.booleanValue;case 2:return Ne(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,n);case 5:return e.stringValue;case 6:return this.convertBytes(Ur(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,n);case 11:return this.convertObject(e.mapValue,n);case 10:return this.convertVectorValue(e.mapValue);default:throw K(62114,{value:e})}}convertObject(e,n){return this.convertObjectMap(e.fields,n)}convertObjectMap(e,n="none"){const r={};return Qr(e,(s,i)=>{r[s]=this.convertValue(i,n)}),r}convertVectorValue(e){var r,s,i;const n=(i=(s=(r=e.fields)==null?void 0:r[Nu].arrayValue)==null?void 0:s.values)==null?void 0:i.map(o=>Ne(o.doubleValue));return new $t(n)}convertGeoPoint(e){return new nn(Ne(e.latitude),Ne(e.longitude))}convertArray(e,n){return(e.values||[]).map(r=>this.convertValue(r,n))}convertServerTimestamp(e,n){switch(n){case"previous":const r=wc(e);return r==null?null:this.convertValue(r,n);case"estimate":return this.convertTimestamp(ma(e));default:return null}}convertTimestamp(e){const n=jr(e);return new fe(n.seconds,n.nanos)}convertDocumentKey(e,n){const r=de.fromString(e);le(AT(r),9688,{name:e});const s=new ki(r.get(1),r.get(3)),i=new W(r.popFirst(5));return s.isEqual(n)||Wn(`Document ${i} contains a document reference within a different database (${s.projectId}/${s.database}) which is not supported. It will be treated as a reference in the current database (${n.projectId}/${n.database}) instead.`),i}}/**
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
 */class cm extends ux{constructor(e){super(),this.firestore=e}convertBytes(e){return new Rt(e)}convertReference(e){const n=this.convertDocumentKey(e,this.firestore._databaseId);return new Ie(this.firestore,null,n)}}function qr(){return new om("serverTimestamp")}function Yl(...t){return new am("arrayUnion",t)}function Jl(t){return new lm("increment",t)}const sv="@firebase/firestore",iv="4.14.1";/**
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
 */function ov(t){return function(n,r){if(typeof n!="object"||n===null)return!1;const s=n;for(const i of r)if(i in s&&typeof s[i]=="function")return!0;return!1}(t,["next","error","complete"])}/**
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
 */class cx{constructor(e,n,r,s,i){this._firestore=e,this._userDataWriter=n,this._key=r,this._document=s,this._converter=i}get id(){return this._key.path.lastSegment()}get ref(){return new Ie(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new RN(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}_fieldsProto(){var e;return((e=this._document)==null?void 0:e.data.clone().value.mapValue.fields)??void 0}get(e){if(this._document){const n=this._document.data.field(Is("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n)}}}class RN extends cx{data(){return super.data()}}/**
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
 */function hx(t){if(t.limitType==="L"&&t.explicitOrderBy.length===0)throw new B(M.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class hm{}class Dc extends hm{}function dm(t,e,...n){let r=[];e instanceof hm&&r.push(e),r=r.concat(n),function(i){const o=i.filter(u=>u instanceof Oc).length,l=i.filter(u=>u instanceof za).length;if(o>1||o>0&&l>0)throw new B(M.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(r);for(const s of r)t=s._apply(t);return t}class za extends Dc{constructor(e,n,r){super(),this._field=e,this._op=n,this._value=r,this.type="where"}static _create(e,n,r){return new za(e,n,r)}_apply(e){const n=this._parse(e);return fx(e._query,n),new kn(e.firestore,e.converter,df(e._query,n))}_parse(e){const n=Fa(e.firestore);return function(i,o,l,u,c,f,p){let g;if(c.isKeyField()){if(f==="array-contains"||f==="array-contains-any")throw new B(M.INVALID_ARGUMENT,`Invalid Query. You can't perform '${f}' queries on documentId().`);if(f==="in"||f==="not-in"){lv(p,f);const S=[];for(const b of p)S.push(av(u,i,b));g={arrayValue:{values:S}}}else g=av(u,i,p)}else f!=="in"&&f!=="not-in"&&f!=="array-contains-any"||lv(p,f),g=CN(l,o,p,f==="in"||f==="not-in");return Le.create(c,f,g)}(e._query,"where",n,e.firestore._databaseId,this._field,this._op,this._value)}}function fm(t,e,n){const r=e,s=Is("where",t);return za._create(s,r,n)}class Oc extends hm{constructor(e,n){super(),this.type=e,this._queryConstraints=n}static _create(e,n){return new Oc(e,n)}_parse(e){const n=this._queryConstraints.map(r=>r._parse(e)).filter(r=>r.getFilters().length>0);return n.length===1?n[0]:on.create(n,this._getOperator())}_apply(e){const n=this._parse(e);return n.getFilters().length===0?e:(function(s,i){let o=s;const l=i.getFlattenedFilters();for(const u of l)fx(o,u),o=df(o,u)}(e._query,n),new kn(e.firestore,e.converter,df(e._query,n)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class Vc extends Dc{constructor(e,n){super(),this._field=e,this._direction=n,this.type="orderBy"}static _create(e,n){return new Vc(e,n)}_apply(e){const n=function(s,i,o){if(s.startAt!==null)throw new B(M.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(s.endAt!==null)throw new B(M.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new ya(i,o)}(e._query,this._field,this._direction);return new kn(e.firestore,e.converter,ib(e._query,n))}}function Ba(t,e="asc"){const n=e,r=Is("orderBy",t);return Vc._create(r,n)}class Lc extends Dc{constructor(e,n,r){super(),this.type=e,this._limit=n,this._limitType=r}static _create(e,n,r){return new Lc(e,n,r)}_apply(e){return new kn(e.firestore,e.converter,Ou(e._query,this._limit,this._limitType))}}function dx(t){return Lc._create("limit",t,"F")}function av(t,e,n){if(typeof(n=ce(n))=="string"){if(n==="")throw new B(M.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!iT(e)&&n.indexOf("/")!==-1)throw new B(M.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${n}' contains a '/' character.`);const r=e.path.child(de.fromString(n));if(!W.isDocumentKey(r))throw new B(M.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${r}' is not because it has an odd number of segments (${r.length}).`);return E_(t,new W(r))}if(n instanceof Ie)return E_(t,n._key);throw new B(M.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${yc(n)}.`)}function lv(t,e){if(!Array.isArray(t)||t.length===0)throw new B(M.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function fx(t,e){const n=function(s,i){for(const o of s)for(const l of o.getFlattenedFilters())if(i.indexOf(l.op)>=0)return l.op;return null}(t.filters,function(s){switch(s){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(n!==null)throw n===e.op?new B(M.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new B(M.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${n.toString()}' filters.`)}function pm(t,e,n){let r;return r=t?n&&(n.merge||n.mergeFields)?t.toFirestore(e,n):t.toFirestore(e):e,r}class ii{constructor(e,n){this.hasPendingWrites=e,this.fromCache=n}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class Rr extends cx{constructor(e,n,r,s,i,o){super(e,n,r,s,o),this._firestore=e,this._firestoreImpl=e,this.metadata=i}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const n=new qo(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(n,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,n={}){if(this._document){const r=this._document.data.field(Is("DocumentSnapshot.get",e));if(r!==null)return this._userDataWriter.convertValue(r,n.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new B(M.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,n={};return n.type=Rr._jsonSchemaVersion,n.bundle="",n.bundleSource="DocumentSnapshot",n.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?n:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),n.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),n)}}Rr._jsonSchemaVersion="firestore/documentSnapshot/1.0",Rr._jsonSchema={type:Me("string",Rr._jsonSchemaVersion),bundleSource:Me("string","DocumentSnapshot"),bundleName:Me("string"),bundle:Me("string")};class qo extends Rr{data(e={}){return super.data(e)}}class br{constructor(e,n,r,s){this._firestore=e,this._userDataWriter=n,this._snapshot=s,this.metadata=new ii(s.hasPendingWrites,s.fromCache),this.query=r}get docs(){const e=[];return this.forEach(n=>e.push(n)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,n){this._snapshot.docs.forEach(r=>{e.call(n,new qo(this._firestore,this._userDataWriter,r.key,r,new ii(this._snapshot.mutatedKeys.has(r.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const n=!!e.includeMetadataChanges;if(n&&this._snapshot.excludesMetadataChanges)throw new B(M.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===n||(this._cachedChanges=function(s,i){if(s._snapshot.oldDocs.isEmpty()){let o=0;return s._snapshot.docChanges.map(l=>{const u=new qo(s._firestore,s._userDataWriter,l.doc.key,l.doc,new ii(s._snapshot.mutatedKeys.has(l.doc.key),s._snapshot.fromCache),s.query.converter);return l.doc,{type:"added",doc:u,oldIndex:-1,newIndex:o++}})}{let o=s._snapshot.oldDocs;return s._snapshot.docChanges.filter(l=>i||l.type!==3).map(l=>{const u=new qo(s._firestore,s._userDataWriter,l.doc.key,l.doc,new ii(s._snapshot.mutatedKeys.has(l.doc.key),s._snapshot.fromCache),s.query.converter);let c=-1,f=-1;return l.type!==0&&(c=o.indexOf(l.doc.key),o=o.delete(l.doc.key)),l.type!==1&&(o=o.add(l.doc),f=o.indexOf(l.doc.key)),{type:bN(l.type),doc:u,oldIndex:c,newIndex:f}})}}(this,n),this._cachedChangesIncludeMetadataChanges=n),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new B(M.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=br._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=gc.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const n=[],r=[],s=[];return this.docs.forEach(i=>{i._document!==null&&(n.push(i._document),r.push(this._userDataWriter.convertObjectMap(i._document.data.value.mapValue.fields,"previous")),s.push(i.ref.path))}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function bN(t){switch(t){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return K(61501,{type:t})}}/**
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
 */class px{constructor(e,n){this._firestore=e,this._commitHandler=n,this._mutations=[],this._committed=!1,this._dataReader=Fa(e)}set(e,n,r){this._verifyNotCommitted();const s=Xh(e,this._firestore),i=pm(s.converter,n,r),o=im(this._dataReader,"WriteBatch.set",s._key,i,s.converter!==null,r);return this._mutations.push(o.toMutation(s._key,mt.none())),this}update(e,n,r,...s){this._verifyNotCommitted();const i=Xh(e,this._firestore);let o;return o=typeof(n=ce(n))=="string"||n instanceof Ua?sx(this._dataReader,"WriteBatch.update",i._key,n,r,s):rx(this._dataReader,"WriteBatch.update",i._key,n),this._mutations.push(o.toMutation(i._key,mt.exists(!0))),this}delete(e){this._verifyNotCommitted();const n=Xh(e,this._firestore);return this._mutations=this._mutations.concat(new kc(n._key,mt.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new B(M.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function Xh(t,e){if((t=ce(t)).firestore!==e)throw new B(M.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return t}/**
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
 */function mx(t){t=at(t,Ie);const e=at(t.firestore,an),n=$i(e);return yN(n,t._key).then(r=>yx(e,t,r))}function zu(t){t=at(t,kn);const e=at(t.firestore,an),n=$i(e),r=new cm(e);return hx(t._query),_N(n,t._query).then(s=>new br(e,r,t,s))}function gx(t,e,n){t=at(t,Ie);const r=at(t.firestore,an),s=pm(t.converter,e,n),i=Fa(r);return Hi(r,[im(i,"setDoc",t._key,s,t.converter!==null,n).toMutation(t._key,mt.none())])}function Un(t,e,n,...r){t=at(t,Ie);const s=at(t.firestore,an),i=Fa(s);let o;return o=typeof(e=ce(e))=="string"||e instanceof Ua?sx(i,"updateDoc",t._key,e,n,r):rx(i,"updateDoc",t._key,e),Hi(s,[o.toMutation(t._key,mt.exists(!0))])}function $a(t){return Hi(at(t.firestore,an),[new kc(t._key,mt.none())])}function qa(t,e){const n=at(t.firestore,an),r=ze(t),s=pm(t.converter,e),i=Fa(t.firestore);return Hi(n,[im(i,"addDoc",r._key,s,t.converter!==null,{}).toMutation(r._key,mt.exists(!1))]).then(()=>r)}function Mc(t,...e){var c,f,p;t=ce(t);let n={includeMetadataChanges:!1,source:"default"},r=0;typeof e[r]!="object"||ov(e[r])||(n=e[r++]);const s={includeMetadataChanges:n.includeMetadataChanges,source:n.source};if(ov(e[r])){const g=e[r];e[r]=(c=g.next)==null?void 0:c.bind(g),e[r+1]=(f=g.error)==null?void 0:f.bind(g),e[r+2]=(p=g.complete)==null?void 0:p.bind(g)}let i,o,l;if(t instanceof Ie)o=at(t.firestore,an),l=Ec(t._key.path),i={next:g=>{e[r]&&e[r](yx(o,t,g))},error:e[r+1],complete:e[r+2]};else{const g=at(t,kn);o=at(g.firestore,an),l=g._query;const w=new cm(o);i={next:S=>{e[r]&&e[r](new br(o,w,g,S))},error:e[r+1],complete:e[r+2]},hx(t._query)}const u=$i(o);return gN(u,l,s,i)}function Hi(t,e){const n=$i(t);return vN(n,e)}function yx(t,e,n){const r=n.docs.get(e._key),s=new cm(t);return new Rr(t,s,e._key,r,new ii(n.hasPendingWrites,n.fromCache),e.converter)}function _x(t){return t=at(t,an),$i(t),new px(t,e=>Hi(t,e))}(function(e,n=!0){ER(Ps),Ts(new Vr("firestore",(r,{instanceIdentifier:s,options:i})=>{const o=r.getProvider("app").getImmediate(),l=new an(new xR(r.getProvider("auth-internal")),new kR(o,r.getProvider("app-check-internal")),BR(o,s),o);return i={useFetchStreams:n,...i},l._setSettings(i),l},"PUBLIC").setMultipleInstances(!0)),_n(sv,iv,e),_n(sv,iv,"esm2020")})();const vx=Object.freeze(Object.defineProperty({__proto__:null,AbstractUserDataWriter:ux,Bytes:Rt,CollectionReference:jn,DocumentReference:Ie,DocumentSnapshot:Rr,FieldPath:Ua,FieldValue:Os,Firestore:an,FirestoreError:B,GeoPoint:nn,Query:kn,QueryCompositeFilterConstraint:Oc,QueryConstraint:Dc,QueryDocumentSnapshot:qo,QueryFieldFilterConstraint:za,QueryLimitConstraint:Lc,QueryOrderByConstraint:Vc,QuerySnapshot:br,SnapshotMetadata:ii,Timestamp:fe,VectorValue:$t,WriteBatch:px,_AutoId:gc,_ByteString:Ke,_DatabaseId:ki,_DocumentKey:W,_EmptyAuthCredentialsProvider:UE,_FieldPath:We,_cast:at,_logWarn:Lr,_validateIsNotUsedTogether:zE,addDoc:qa,arrayUnion:Yl,collection:xf,connectFirestoreEmulator:ZT,deleteDoc:$a,doc:ze,ensureFirestoreConfigured:$i,executeWrite:Hi,getDoc:mx,getDocs:zu,getFirestore:ex,increment:Jl,limit:dx,onSnapshot:Mc,orderBy:Ba,query:dm,serverTimestamp:qr,setDoc:gx,updateDoc:Un,where:fm,writeBatch:_x},Symbol.toStringTag,{value:"Module"}));var PN="firebase",NN="12.13.0";/**
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
 */_n(PN,NN,"app");function wx(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const DN=wx,Ex=new Pa("auth","Firebase",wx());/**
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
 */const Bu=new Ap("@firebase/auth");function ON(t,...e){Bu.logLevel<=re.WARN&&Bu.warn(`Auth (${Ps}): ${t}`,...e)}function Zl(t,...e){Bu.logLevel<=re.ERROR&&Bu.error(`Auth (${Ps}): ${t}`,...e)}/**
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
 */function Wt(t,...e){throw gm(t,...e)}function rn(t,...e){return gm(t,...e)}function mm(t,e,n){const r={...DN(),[e]:n};return new Pa("auth","Firebase",r).create(e,{appName:t.name})}function Pr(t){return mm(t,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function VN(t,e,n){const r=n;if(!(e instanceof r))throw r.name!==e.constructor.name&&Wt(t,"argument-error"),mm(t,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function gm(t,...e){if(typeof t!="string"){const n=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=t.name),t._errorFactory.create(n,...r)}return Ex.create(t,...e)}function G(t,e,...n){if(!t)throw gm(e,...n)}function On(t){const e="INTERNAL ASSERTION FAILED: "+t;throw Zl(e),new Error(e)}function Kn(t,e){t||On(e)}/**
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
 */function If(){var t;return typeof self<"u"&&((t=self.location)==null?void 0:t.href)||""}function LN(){return uv()==="http:"||uv()==="https:"}function uv(){var t;return typeof self<"u"&&((t=self.location)==null?void 0:t.protocol)||null}/**
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
 */function MN(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(LN()||eA()||"connection"in navigator)?navigator.onLine:!0}function jN(){if(typeof navigator>"u")return null;const t=navigator;return t.languages&&t.languages[0]||t.language||null}/**
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
 */class Ha{constructor(e,n){this.shortDelay=e,this.longDelay=n,Kn(n>e,"Short delay should be less than long delay!"),this.isMobile=YC()||tA()}get(){return MN()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
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
 */function ym(t,e){Kn(t.emulator,"Emulator should always be set here");const{url:n}=t.emulator;return e?`${n}${e.startsWith("/")?e.slice(1):e}`:n}/**
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
 */const UN={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
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
 */const FN=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],zN=new Ha(3e4,6e4);function Vs(t,e){return t.tenantId&&!e.tenantId?{...e,tenantId:t.tenantId}:e}async function Yr(t,e,n,r,s={}){return xx(t,s,async()=>{let i={},o={};r&&(e==="GET"?o=r:i={body:JSON.stringify(r)});const l=Na({key:t.config.apiKey,...o}).slice(1),u=await t._getAdditionalHeaders();u["Content-Type"]="application/json",t.languageCode&&(u["X-Firebase-Locale"]=t.languageCode);const c={method:e,headers:u,...i};return ZC()||(c.referrerPolicy="no-referrer"),t.emulatorConfig&&bs(t.emulatorConfig.host)&&(c.credentials="include"),Tx.fetch()(await Ix(t,t.config.apiHost,n,l),c)})}async function xx(t,e,n){t._canInitEmulator=!1;const r={...UN,...e};try{const s=new $N(t),i=await Promise.race([n(),s.promise]);s.clearNetworkTimeout();const o=await i.json();if("needConfirmation"in o)throw Rl(t,"account-exists-with-different-credential",o);if(i.ok&&!("errorMessage"in o))return o;{const l=i.ok?o.errorMessage:o.error.message,[u,c]=l.split(" : ");if(u==="FEDERATED_USER_ID_ALREADY_LINKED")throw Rl(t,"credential-already-in-use",o);if(u==="EMAIL_EXISTS")throw Rl(t,"email-already-in-use",o);if(u==="USER_DISABLED")throw Rl(t,"user-disabled",o);const f=r[u]||u.toLowerCase().replace(/[_\s]+/g,"-");if(c)throw mm(t,f,c);Wt(t,f)}}catch(s){if(s instanceof Sn)throw s;Wt(t,"network-request-failed",{message:String(s)})}}async function jc(t,e,n,r,s={}){const i=await Yr(t,e,n,r,s);return"mfaPendingCredential"in i&&Wt(t,"multi-factor-auth-required",{_serverResponse:i}),i}async function Ix(t,e,n,r){const s=`${e}${n}?${r}`,i=t,o=i.config.emulator?ym(t.config,s):`${t.config.apiScheme}://${s}`;return FN.includes(n)&&(await i._persistenceManagerAvailable,i._getPersistenceType()==="COOKIE")?i._getPersistence()._getFinalTarget(o).toString():o}function BN(t){switch(t){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class $N{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((n,r)=>{this.timer=setTimeout(()=>r(rn(this.auth,"network-request-failed")),zN.get())})}}function Rl(t,e,n){const r={appName:t.name};n.email&&(r.email=n.email),n.phoneNumber&&(r.phoneNumber=n.phoneNumber);const s=rn(t,e,r);return s.customData._tokenResponse=n,s}function cv(t){return t!==void 0&&t.enterprise!==void 0}class qN{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const n of this.recaptchaEnforcementState)if(n.provider&&n.provider===e)return BN(n.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}async function HN(t,e){return Yr(t,"GET","/v2/recaptchaConfig",Vs(t,e))}/**
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
 */async function WN(t,e){return Yr(t,"POST","/v1/accounts:delete",e)}async function $u(t,e){return Yr(t,"POST","/v1/accounts:lookup",e)}/**
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
 */function Ho(t){if(t)try{const e=new Date(Number(t));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function GN(t,e=!1){const n=ce(t),r=await n.getIdToken(e),s=_m(r);G(s&&s.exp&&s.auth_time&&s.iat,n.auth,"internal-error");const i=typeof s.firebase=="object"?s.firebase:void 0,o=i==null?void 0:i.sign_in_provider;return{claims:s,token:r,authTime:Ho(Yh(s.auth_time)),issuedAtTime:Ho(Yh(s.iat)),expirationTime:Ho(Yh(s.exp)),signInProvider:o||null,signInSecondFactor:(i==null?void 0:i.sign_in_second_factor)||null}}function Yh(t){return Number(t)*1e3}function _m(t){const[e,n,r]=t.split(".");if(e===void 0||n===void 0||r===void 0)return Zl("JWT malformed, contained fewer than 3 sections"),null;try{const s=wE(n);return s?JSON.parse(s):(Zl("Failed to decode base64 JWT payload"),null)}catch(s){return Zl("Caught error parsing JWT payload as JSON",s==null?void 0:s.toString()),null}}function hv(t){const e=_m(t);return G(e,"internal-error"),G(typeof e.exp<"u","internal-error"),G(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
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
 */async function Ea(t,e,n=!1){if(n)return e;try{return await e}catch(r){throw r instanceof Sn&&KN(r)&&t.auth.currentUser===t&&await t.auth.signOut(),r}}function KN({code:t}){return t==="auth/user-disabled"||t==="auth/user-token-expired"}/**
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
 */class QN{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const n=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),n}else{this.errorBackoff=3e4;const r=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,r)}}schedule(e=!1){if(!this.isRunning)return;const n=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},n)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
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
 */class Sf{constructor(e,n){this.createdAt=e,this.lastLoginAt=n,this._initializeTime()}_initializeTime(){this.lastSignInTime=Ho(this.lastLoginAt),this.creationTime=Ho(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
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
 */async function qu(t){var p;const e=t.auth,n=await t.getIdToken(),r=await Ea(t,$u(e,{idToken:n}));G(r==null?void 0:r.users.length,e,"internal-error");const s=r.users[0];t._notifyReloadListener(s);const i=(p=s.providerUserInfo)!=null&&p.length?Sx(s.providerUserInfo):[],o=YN(t.providerData,i),l=t.isAnonymous,u=!(t.email&&s.passwordHash)&&!(o!=null&&o.length),c=l?u:!1,f={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:o,metadata:new Sf(s.createdAt,s.lastLoginAt),isAnonymous:c};Object.assign(t,f)}async function XN(t){const e=ce(t);await qu(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function YN(t,e){return[...t.filter(r=>!e.some(s=>s.providerId===r.providerId)),...e]}function Sx(t){return t.map(({providerId:e,...n})=>({providerId:e,uid:n.rawId||"",displayName:n.displayName||null,email:n.email||null,phoneNumber:n.phoneNumber||null,photoURL:n.photoUrl||null}))}/**
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
 */async function JN(t,e){const n=await xx(t,{},async()=>{const r=Na({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:s,apiKey:i}=t.config,o=await Ix(t,s,"/v1/token",`key=${i}`),l=await t._getAdditionalHeaders();l["Content-Type"]="application/x-www-form-urlencoded";const u={method:"POST",headers:l,body:r};return t.emulatorConfig&&bs(t.emulatorConfig.host)&&(u.credentials="include"),Tx.fetch()(o,u)});return{accessToken:n.access_token,expiresIn:n.expires_in,refreshToken:n.refresh_token}}async function ZN(t,e){return Yr(t,"POST","/v2/accounts:revokeToken",Vs(t,e))}/**
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
 */class pi{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){G(e.idToken,"internal-error"),G(typeof e.idToken<"u","internal-error"),G(typeof e.refreshToken<"u","internal-error");const n="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):hv(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,n)}updateFromIdToken(e){G(e.length!==0,"internal-error");const n=hv(e);this.updateTokensAndExpiration(e,null,n)}async getToken(e,n=!1){return!n&&this.accessToken&&!this.isExpired?this.accessToken:(G(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,n){const{accessToken:r,refreshToken:s,expiresIn:i}=await JN(e,n);this.updateTokensAndExpiration(r,s,Number(i))}updateTokensAndExpiration(e,n,r){this.refreshToken=n||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,n){const{refreshToken:r,accessToken:s,expirationTime:i}=n,o=new pi;return r&&(G(typeof r=="string","internal-error",{appName:e}),o.refreshToken=r),s&&(G(typeof s=="string","internal-error",{appName:e}),o.accessToken=s),i&&(G(typeof i=="number","internal-error",{appName:e}),o.expirationTime=i),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new pi,this.toJSON())}_performRefresh(){return On("not implemented")}}/**
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
 */function ir(t,e){G(typeof t=="string"||typeof t>"u","internal-error",{appName:e})}class Zt{constructor({uid:e,auth:n,stsTokenManager:r,...s}){this.providerId="firebase",this.proactiveRefresh=new QN(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=n,this.stsTokenManager=r,this.accessToken=r.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new Sf(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const n=await Ea(this,this.stsTokenManager.getToken(this.auth,e));return G(n,this.auth,"internal-error"),this.accessToken!==n&&(this.accessToken=n,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),n}getIdTokenResult(e){return GN(this,e)}reload(){return XN(this)}_assign(e){this!==e&&(G(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(n=>({...n})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const n=new Zt({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return n.metadata._copy(this.metadata),n}_onReload(e){G(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,n=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),n&&await qu(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(At(this.auth.app))return Promise.reject(Pr(this.auth));const e=await this.getIdToken();return await Ea(this,WN(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,n){const r=n.displayName??void 0,s=n.email??void 0,i=n.phoneNumber??void 0,o=n.photoURL??void 0,l=n.tenantId??void 0,u=n._redirectEventId??void 0,c=n.createdAt??void 0,f=n.lastLoginAt??void 0,{uid:p,emailVerified:g,isAnonymous:w,providerData:S,stsTokenManager:b}=n;G(p&&b,e,"internal-error");const P=pi.fromJSON(this.name,b);G(typeof p=="string",e,"internal-error"),ir(r,e.name),ir(s,e.name),G(typeof g=="boolean",e,"internal-error"),G(typeof w=="boolean",e,"internal-error"),ir(i,e.name),ir(o,e.name),ir(l,e.name),ir(u,e.name),ir(c,e.name),ir(f,e.name);const I=new Zt({uid:p,auth:e,email:s,emailVerified:g,displayName:r,isAnonymous:w,photoURL:o,phoneNumber:i,tenantId:l,stsTokenManager:P,createdAt:c,lastLoginAt:f});return S&&Array.isArray(S)&&(I.providerData=S.map(v=>({...v}))),u&&(I._redirectEventId=u),I}static async _fromIdTokenResponse(e,n,r=!1){const s=new pi;s.updateFromServerResponse(n);const i=new Zt({uid:n.localId,auth:e,stsTokenManager:s,isAnonymous:r});return await qu(i),i}static async _fromGetAccountInfoResponse(e,n,r){const s=n.users[0];G(s.localId!==void 0,"internal-error");const i=s.providerUserInfo!==void 0?Sx(s.providerUserInfo):[],o=!(s.email&&s.passwordHash)&&!(i!=null&&i.length),l=new pi;l.updateFromIdToken(r);const u=new Zt({uid:s.localId,auth:e,stsTokenManager:l,isAnonymous:o}),c={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:i,metadata:new Sf(s.createdAt,s.lastLoginAt),isAnonymous:!(s.email&&s.passwordHash)&&!(i!=null&&i.length)};return Object.assign(u,c),u}}/**
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
 */const dv=new Map;function Vn(t){Kn(t instanceof Function,"Expected a class definition");let e=dv.get(t);return e?(Kn(e instanceof t,"Instance stored in cache mismatched with class"),e):(e=new t,dv.set(t,e),e)}/**
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
 */class kx{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,n){this.storage[e]=n}async _get(e){const n=this.storage[e];return n===void 0?null:n}async _remove(e){delete this.storage[e]}_addListener(e,n){}_removeListener(e,n){}}kx.type="NONE";const fv=kx;/**
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
 */function eu(t,e,n){return`firebase:${t}:${e}:${n}`}class mi{constructor(e,n,r){this.persistence=e,this.auth=n,this.userKey=r;const{config:s,name:i}=this.auth;this.fullUserKey=eu(this.userKey,s.apiKey,i),this.fullPersistenceKey=eu("persistence",s.apiKey,i),this.boundEventHandler=n._onStorageEvent.bind(n),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const n=await $u(this.auth,{idToken:e}).catch(()=>{});return n?Zt._fromGetAccountInfoResponse(this.auth,n,e):null}return Zt._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const n=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,n)return this.setCurrentUser(n)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,n,r="authUser"){if(!n.length)return new mi(Vn(fv),e,r);const s=(await Promise.all(n.map(async c=>{if(await c._isAvailable())return c}))).filter(c=>c);let i=s[0]||Vn(fv);const o=eu(r,e.config.apiKey,e.name);let l=null;for(const c of n)try{const f=await c._get(o);if(f){let p;if(typeof f=="string"){const g=await $u(e,{idToken:f}).catch(()=>{});if(!g)break;p=await Zt._fromGetAccountInfoResponse(e,g,f)}else p=Zt._fromJSON(e,f);c!==i&&(l=p),i=c;break}}catch{}const u=s.filter(c=>c._shouldAllowMigration);return!i._shouldAllowMigration||!u.length?new mi(i,e,r):(i=u[0],l&&await i._set(o,l.toJSON()),await Promise.all(n.map(async c=>{if(c!==i)try{await c._remove(o)}catch{}})),new mi(i,e,r))}}/**
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
 */function pv(t){const e=t.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(bx(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(Cx(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(Nx(e))return"Blackberry";if(Dx(e))return"Webos";if(Ax(e))return"Safari";if((e.includes("chrome/")||Rx(e))&&!e.includes("edge/"))return"Chrome";if(Px(e))return"Android";{const n=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=t.match(n);if((r==null?void 0:r.length)===2)return r[1]}return"Other"}function Cx(t=ut()){return/firefox\//i.test(t)}function Ax(t=ut()){const e=t.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function Rx(t=ut()){return/crios\//i.test(t)}function bx(t=ut()){return/iemobile/i.test(t)}function Px(t=ut()){return/android/i.test(t)}function Nx(t=ut()){return/blackberry/i.test(t)}function Dx(t=ut()){return/webos/i.test(t)}function vm(t=ut()){return/iphone|ipad|ipod/i.test(t)||/macintosh/i.test(t)&&/mobile/i.test(t)}function e2(t=ut()){var e;return vm(t)&&!!((e=window.navigator)!=null&&e.standalone)}function t2(){return nA()&&document.documentMode===10}function Ox(t=ut()){return vm(t)||Px(t)||Dx(t)||Nx(t)||/windows phone/i.test(t)||bx(t)}/**
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
 */function Vx(t,e=[]){let n;switch(t){case"Browser":n=pv(ut());break;case"Worker":n=`${pv(ut())}-${t}`;break;default:n=t}const r=e.length?e.join(","):"FirebaseCore-web";return`${n}/JsCore/${Ps}/${r}`}/**
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
 */class n2{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,n){const r=i=>new Promise((o,l)=>{try{const u=e(i);o(u)}catch(u){l(u)}});r.onAbort=n,this.queue.push(r);const s=this.queue.length-1;return()=>{this.queue[s]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const n=[];try{for(const r of this.queue)await r(e),r.onAbort&&n.push(r.onAbort)}catch(r){n.reverse();for(const s of n)try{s()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r==null?void 0:r.message})}}}/**
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
 */async function r2(t,e={}){return Yr(t,"GET","/v2/passwordPolicy",Vs(t,e))}/**
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
 */const s2=6;class i2{constructor(e){var r;const n=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=n.minPasswordLength??s2,n.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=n.maxPasswordLength),n.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=n.containsLowercaseCharacter),n.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=n.containsUppercaseCharacter),n.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=n.containsNumericCharacter),n.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=n.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((r=e.allowedNonAlphanumericCharacters)==null?void 0:r.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const n={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,n),this.validatePasswordCharacterOptions(e,n),n.isValid&&(n.isValid=n.meetsMinPasswordLength??!0),n.isValid&&(n.isValid=n.meetsMaxPasswordLength??!0),n.isValid&&(n.isValid=n.containsLowercaseLetter??!0),n.isValid&&(n.isValid=n.containsUppercaseLetter??!0),n.isValid&&(n.isValid=n.containsNumericCharacter??!0),n.isValid&&(n.isValid=n.containsNonAlphanumericCharacter??!0),n}validatePasswordLengthOptions(e,n){const r=this.customStrengthOptions.minPasswordLength,s=this.customStrengthOptions.maxPasswordLength;r&&(n.meetsMinPasswordLength=e.length>=r),s&&(n.meetsMaxPasswordLength=e.length<=s)}validatePasswordCharacterOptions(e,n){this.updatePasswordCharacterOptionsStatuses(n,!1,!1,!1,!1);let r;for(let s=0;s<e.length;s++)r=e.charAt(s),this.updatePasswordCharacterOptionsStatuses(n,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,n,r,s,i){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=n)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=s)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=i))}}/**
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
 */class o2{constructor(e,n,r,s){this.app=e,this.heartbeatServiceProvider=n,this.appCheckServiceProvider=r,this.config=s,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new mv(this),this.idTokenSubscription=new mv(this),this.beforeStateQueue=new n2(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=Ex,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=s.sdkClientVersion,this._persistenceManagerAvailable=new Promise(i=>this._resolvePersistenceManagerAvailable=i)}_initializeWithPersistence(e,n){return n&&(this._popupRedirectResolver=Vn(n)),this._initializationPromise=this.queue(async()=>{var r,s,i;if(!this._deleted&&(this.persistenceManager=await mi.create(this,e),(r=this._resolvePersistenceManagerAvailable)==null||r.call(this),!this._deleted)){if((s=this._popupRedirectResolver)!=null&&s._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(n),this.lastNotifiedUid=((i=this.currentUser)==null?void 0:i.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const n=await $u(this,{idToken:e}),r=await Zt._fromGetAccountInfoResponse(this,n,e);await this.directlySetCurrentUser(r)}catch(n){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",n),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var i;if(At(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(l=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(l,l))}):this.directlySetCurrentUser(null)}const n=await this.assertedPersistence.getCurrentUser();let r=n,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(i=this.redirectUser)==null?void 0:i._redirectEventId,l=r==null?void 0:r._redirectEventId,u=await this.tryRedirectSignIn(e);(!o||o===l)&&(u!=null&&u.user)&&(r=u.user,s=!0)}if(!r)return this.directlySetCurrentUser(null);if(!r._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(r)}catch(o){r=n,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return r?this.reloadAndSetCurrentUserOrClear(r):this.directlySetCurrentUser(null)}return G(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===r._redirectEventId?this.directlySetCurrentUser(r):this.reloadAndSetCurrentUserOrClear(r)}async tryRedirectSignIn(e){let n=null;try{n=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return n}async reloadAndSetCurrentUserOrClear(e){try{await qu(e)}catch(n){if((n==null?void 0:n.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=jN()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(At(this.app))return Promise.reject(Pr(this));const n=e?ce(e):null;return n&&G(n.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(n&&n._clone(this))}async _updateCurrentUser(e,n=!1){if(!this._deleted)return e&&G(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),n||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return At(this.app)?Promise.reject(Pr(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return At(this.app)?Promise.reject(Pr(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(Vn(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const n=this._getPasswordPolicyInternal();return n.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):n.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await r2(this),n=new i2(e);this.tenantId===null?this._projectPasswordPolicy=n:this._tenantPasswordPolicies[this.tenantId]=n}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new Pa("auth","Firebase",e())}onAuthStateChanged(e,n,r){return this.registerStateListener(this.authStateSubscription,e,n,r)}beforeAuthStateChanged(e,n){return this.beforeStateQueue.pushCallback(e,n)}onIdTokenChanged(e,n,r){return this.registerStateListener(this.idTokenSubscription,e,n,r)}authStateReady(){return new Promise((e,n)=>{if(this.currentUser)e();else{const r=this.onAuthStateChanged(()=>{r(),e()},n)}})}async revokeAccessToken(e){if(this.currentUser){const n=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:n};this.tenantId!=null&&(r.tenantId=this.tenantId),await ZN(this,r)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,n){const r=await this.getOrInitRedirectPersistenceManager(n);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const n=e&&Vn(e)||this._popupRedirectResolver;G(n,this,"argument-error"),this.redirectPersistenceManager=await mi.create(this,[Vn(n._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var n,r;return this._isInitialized&&await this.queue(async()=>{}),((n=this._currentUser)==null?void 0:n._redirectEventId)===e?this._currentUser:((r=this.redirectUser)==null?void 0:r._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var n;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((n=this.currentUser)==null?void 0:n.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,n,r,s){if(this._deleted)return()=>{};const i=typeof n=="function"?n:n.next.bind(n);let o=!1;const l=this._isInitialized?Promise.resolve():this._initializationPromise;if(G(l,this,"internal-error"),l.then(()=>{o||i(this.currentUser)}),typeof n=="function"){const u=e.addObserver(n,r,s);return()=>{o=!0,u()}}else{const u=e.addObserver(n);return()=>{o=!0,u()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return G(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=Vx(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var s;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const n=await((s=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:s.getHeartbeatsHeader());n&&(e["X-Firebase-Client"]=n);const r=await this._getAppCheckToken();return r&&(e["X-Firebase-AppCheck"]=r),e}async _getAppCheckToken(){var n;if(At(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((n=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:n.getToken());return e!=null&&e.error&&ON(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function Ls(t){return ce(t)}class mv{constructor(e){this.auth=e,this.observer=null,this.addObserver=cA(n=>this.observer=n)}get next(){return G(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
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
 */let Uc={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function a2(t){Uc=t}function Lx(t){return Uc.loadJS(t)}function l2(){return Uc.recaptchaEnterpriseScript}function u2(){return Uc.gapiScript}function c2(t){return`__${t}${Math.floor(Math.random()*1e6)}`}class h2{constructor(){this.enterprise=new d2}ready(e){e()}execute(e,n){return Promise.resolve("token")}render(e,n){return""}}class d2{ready(e){e()}execute(e,n){return Promise.resolve("token")}render(e,n){return""}}const f2="recaptcha-enterprise",Mx="NO_RECAPTCHA";class p2{constructor(e){this.type=f2,this.auth=Ls(e)}async verify(e="verify",n=!1){async function r(i){if(!n){if(i.tenantId==null&&i._agentRecaptchaConfig!=null)return i._agentRecaptchaConfig.siteKey;if(i.tenantId!=null&&i._tenantRecaptchaConfigs[i.tenantId]!==void 0)return i._tenantRecaptchaConfigs[i.tenantId].siteKey}return new Promise(async(o,l)=>{HN(i,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(u=>{if(u.recaptchaKey===void 0)l(new Error("recaptcha Enterprise site key undefined"));else{const c=new qN(u);return i.tenantId==null?i._agentRecaptchaConfig=c:i._tenantRecaptchaConfigs[i.tenantId]=c,o(c.siteKey)}}).catch(u=>{l(u)})})}function s(i,o,l){const u=window.grecaptcha;cv(u)?u.enterprise.ready(()=>{u.enterprise.execute(i,{action:e}).then(c=>{o(c)}).catch(()=>{o(Mx)})}):l(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new h2().execute("siteKey",{action:"verify"}):new Promise((i,o)=>{r(this.auth).then(l=>{if(!n&&cv(window.grecaptcha))s(l,i,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let u=l2();u.length!==0&&(u+=l),Lx(u).then(()=>{s(l,i,o)}).catch(c=>{o(c)})}}).catch(l=>{o(l)})})}}async function gv(t,e,n,r=!1,s=!1){const i=new p2(t);let o;if(s)o=Mx;else try{o=await i.verify(n)}catch{o=await i.verify(n,!0)}const l={...e};if(n==="mfaSmsEnrollment"||n==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in l){const u=l.phoneEnrollmentInfo.phoneNumber,c=l.phoneEnrollmentInfo.recaptchaToken;Object.assign(l,{phoneEnrollmentInfo:{phoneNumber:u,recaptchaToken:c,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in l){const u=l.phoneSignInInfo.recaptchaToken;Object.assign(l,{phoneSignInInfo:{recaptchaToken:u,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return l}return r?Object.assign(l,{captchaResp:o}):Object.assign(l,{captchaResponse:o}),Object.assign(l,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(l,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),l}async function yv(t,e,n,r,s){var i;if((i=t._getRecaptchaConfig())!=null&&i.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const o=await gv(t,e,n,n==="getOobCode");return r(t,o)}else return r(t,e).catch(async o=>{if(o.code==="auth/missing-recaptcha-token"){console.log(`${n} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const l=await gv(t,e,n,n==="getOobCode");return r(t,l)}else return Promise.reject(o)})}/**
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
 */function m2(t,e){const n=mc(t,"auth");if(n.isInitialized()){const s=n.getImmediate(),i=n.getOptions();if(Or(i,e??{}))return s;Wt(s,"already-initialized")}return n.initialize({options:e})}function g2(t,e){const n=(e==null?void 0:e.persistence)||[],r=(Array.isArray(n)?n:[n]).map(Vn);e!=null&&e.errorMap&&t._updateErrorMap(e.errorMap),t._initializeWithPersistence(r,e==null?void 0:e.popupRedirectResolver)}function y2(t,e,n){const r=Ls(t);G(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");const s=!1,i=jx(e),{host:o,port:l}=_2(e),u=l===null?"":`:${l}`,c={url:`${i}//${o}${u}/`},f=Object.freeze({host:o,port:l,protocol:i.replace(":",""),options:Object.freeze({disableWarnings:s})});if(!r._canInitEmulator){G(r.config.emulator&&r.emulatorConfig,r,"emulator-config-failed"),G(Or(c,r.config.emulator)&&Or(f,r.emulatorConfig),r,"emulator-config-failed");return}r.config.emulator=c,r.emulatorConfig=f,r.settings.appVerificationDisabledForTesting=!0,bs(o)?Cp(`${i}//${o}${u}`):v2()}function jx(t){const e=t.indexOf(":");return e<0?"":t.substr(0,e+1)}function _2(t){const e=jx(t),n=/(\/\/)?([^?#/]+)/.exec(t.substr(e.length));if(!n)return{host:"",port:null};const r=n[2].split("@").pop()||"",s=/^(\[[^\]]+\])(:|$)/.exec(r);if(s){const i=s[1];return{host:i,port:_v(r.substr(i.length+1))}}else{const[i,o]=r.split(":");return{host:i,port:_v(o)}}}function _v(t){if(!t)return null;const e=Number(t);return isNaN(e)?null:e}function v2(){function t(){const e=document.createElement("p"),n=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",n.position="fixed",n.width="100%",n.backgroundColor="#ffffff",n.border=".1em solid #000000",n.color="#b50000",n.bottom="0px",n.left="0px",n.margin="0px",n.zIndex="10000",n.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",t):t())}/**
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
 */class wm{constructor(e,n){this.providerId=e,this.signInMethod=n}toJSON(){return On("not implemented")}_getIdTokenResponse(e){return On("not implemented")}_linkToIdToken(e,n){return On("not implemented")}_getReauthenticationResolver(e){return On("not implemented")}}async function w2(t,e){return Yr(t,"POST","/v1/accounts:signUp",e)}/**
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
 */async function E2(t,e){return jc(t,"POST","/v1/accounts:signInWithPassword",Vs(t,e))}/**
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
 */async function T2(t,e){return jc(t,"POST","/v1/accounts:signInWithEmailLink",Vs(t,e))}async function x2(t,e){return jc(t,"POST","/v1/accounts:signInWithEmailLink",Vs(t,e))}/**
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
 */class Ta extends wm{constructor(e,n,r,s=null){super("password",r),this._email=e,this._password=n,this._tenantId=s}static _fromEmailAndPassword(e,n){return new Ta(e,n,"password")}static _fromEmailAndCode(e,n,r=null){return new Ta(e,n,"emailLink",r)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const n=typeof e=="string"?JSON.parse(e):e;if(n!=null&&n.email&&(n!=null&&n.password)){if(n.signInMethod==="password")return this._fromEmailAndPassword(n.email,n.password);if(n.signInMethod==="emailLink")return this._fromEmailAndCode(n.email,n.password,n.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const n={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return yv(e,n,"signInWithPassword",E2);case"emailLink":return T2(e,{email:this._email,oobCode:this._password});default:Wt(e,"internal-error")}}async _linkToIdToken(e,n){switch(this.signInMethod){case"password":const r={idToken:n,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return yv(e,r,"signUpPassword",w2);case"emailLink":return x2(e,{idToken:n,email:this._email,oobCode:this._password});default:Wt(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
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
 */async function gi(t,e){return jc(t,"POST","/v1/accounts:signInWithIdp",Vs(t,e))}/**
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
 */const I2="http://localhost";class Ss extends wm{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const n=new Ss(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(n.idToken=e.idToken),e.accessToken&&(n.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(n.nonce=e.nonce),e.pendingToken&&(n.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(n.accessToken=e.oauthToken,n.secret=e.oauthTokenSecret):Wt("argument-error"),n}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const n=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:s,...i}=n;if(!r||!s)return null;const o=new Ss(r,s);return o.idToken=i.idToken||void 0,o.accessToken=i.accessToken||void 0,o.secret=i.secret,o.nonce=i.nonce,o.pendingToken=i.pendingToken||null,o}_getIdTokenResponse(e){const n=this.buildRequest();return gi(e,n)}_linkToIdToken(e,n){const r=this.buildRequest();return r.idToken=n,gi(e,r)}_getReauthenticationResolver(e){const n=this.buildRequest();return n.autoCreate=!1,gi(e,n)}buildRequest(){const e={requestUri:I2,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const n={};this.idToken&&(n.id_token=this.idToken),this.accessToken&&(n.access_token=this.accessToken),this.secret&&(n.oauth_token_secret=this.secret),n.providerId=this.providerId,this.nonce&&!this.pendingToken&&(n.nonce=this.nonce),e.postBody=Na(n)}return e}}/**
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
 */function S2(t){switch(t){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function k2(t){const e=ko(Co(t)).link,n=e?ko(Co(e)).deep_link_id:null,r=ko(Co(t)).deep_link_id;return(r?ko(Co(r)).link:null)||r||n||e||t}class Em{constructor(e){const n=ko(Co(e)),r=n.apiKey??null,s=n.oobCode??null,i=S2(n.mode??null);G(r&&s&&i,"argument-error"),this.apiKey=r,this.operation=i,this.code=s,this.continueUrl=n.continueUrl??null,this.languageCode=n.lang??null,this.tenantId=n.tenantId??null}static parseLink(e){const n=k2(e);try{return new Em(n)}catch{return null}}}/**
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
 */class Wi{constructor(){this.providerId=Wi.PROVIDER_ID}static credential(e,n){return Ta._fromEmailAndPassword(e,n)}static credentialWithLink(e,n){const r=Em.parseLink(n);return G(r,"argument-error"),Ta._fromEmailAndCode(e,r.code,r.tenantId)}}Wi.PROVIDER_ID="password";Wi.EMAIL_PASSWORD_SIGN_IN_METHOD="password";Wi.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
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
 */class Tm{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
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
 */class Wa extends Tm{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
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
 */class Pi{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,n,r,s=!1){const i=await Zt._fromIdTokenResponse(e,r,s),o=vv(r);return new Pi({user:i,providerId:o,_tokenResponse:r,operationType:n})}static async _forOperation(e,n,r){await e._updateTokensIfNecessary(r,!0);const s=vv(r);return new Pi({user:e,providerId:s,_tokenResponse:r,operationType:n})}}function vv(t){return t.providerId?t.providerId:"phoneNumber"in t?"phone":null}/**
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
 */class Hu extends Sn{constructor(e,n,r,s){super(n.code,n.message),this.operationType=r,this.user=s,Object.setPrototypeOf(this,Hu.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:n.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,n,r,s){return new Hu(e,n,r,s)}}function Ux(t,e,n,r){return(e==="reauthenticate"?n._getReauthenticationResolver(t):n._getIdTokenResponse(t)).catch(i=>{throw i.code==="auth/multi-factor-auth-required"?Hu._fromErrorAndOperation(t,i,e,r):i})}async function C2(t,e,n=!1){const r=await Ea(t,e._linkToIdToken(t.auth,await t.getIdToken()),n);return Pi._forOperation(t,"link",r)}/**
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
 */async function A2(t,e,n=!1){const{auth:r}=t;if(At(r.app))return Promise.reject(Pr(r));const s="reauthenticate";try{const i=await Ea(t,Ux(r,s,e,t),n);G(i.idToken,r,"internal-error");const o=_m(i.idToken);G(o,r,"internal-error");const{sub:l}=o;return G(t.uid===l,r,"user-mismatch"),Pi._forOperation(t,s,i)}catch(i){throw(i==null?void 0:i.code)==="auth/user-not-found"&&Wt(r,"user-mismatch"),i}}/**
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
 */async function Fx(t,e,n=!1){if(At(t.app))return Promise.reject(Pr(t));const r="signIn",s=await Ux(t,r,e),i=await Pi._fromIdTokenResponse(t,r,s);return n||await t._updateCurrentUser(i.user),i}async function R2(t,e){return Fx(Ls(t),e)}/**
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
 */async function b2(t){const e=Ls(t);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}function P2(t,e,n){return At(t.app)?Promise.reject(Pr(t)):R2(ce(t),Wi.credential(e,n)).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&b2(t),r})}/**
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
 */function N2(t,e){return ce(t).setPersistence(e)}function D2(t,e,n,r){return ce(t).onIdTokenChanged(e,n,r)}function O2(t,e,n){return ce(t).beforeAuthStateChanged(e,n)}function V2(t,e,n,r){return ce(t).onAuthStateChanged(e,n,r)}function L2(t){return ce(t).signOut()}const Wu="__sak";/**
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
 */const M2=1e3,j2=10;class Bx extends zx{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,n)=>this.onStorageEvent(e,n),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=Ox(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const n of Object.keys(this.listeners)){const r=this.storage.getItem(n),s=this.localCache[n];r!==s&&e(n,s,r)}}onStorageEvent(e,n=!1){if(!e.key){this.forAllChangedKeys((o,l,u)=>{this.notifyListeners(o,u)});return}const r=e.key;n?this.detachListener():this.stopPolling();const s=()=>{const o=this.storage.getItem(r);!n&&this.localCache[r]===o||this.notifyListeners(r,o)},i=this.storage.getItem(r);t2()&&i!==e.newValue&&e.newValue!==e.oldValue?setTimeout(s,j2):s()}notifyListeners(e,n){this.localCache[e]=n;const r=this.listeners[e];if(r)for(const s of Array.from(r))s(n&&JSON.parse(n))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,n,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:n,newValue:r}),!0)})},M2)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,n){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(n)}_removeListener(e,n){this.listeners[e]&&(this.listeners[e].delete(n),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,n){await super._set(e,n),this.localCache[e]=JSON.stringify(n)}async _get(e){const n=await super._get(e);return this.localCache[e]=JSON.stringify(n),n}async _remove(e){await super._remove(e),delete this.localCache[e]}}Bx.type="LOCAL";const $x=Bx;/**
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
 */function U2(t){return Promise.all(t.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(n){return{fulfilled:!1,reason:n}}}))}/**
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
 */class Fc{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const n=this.receivers.find(s=>s.isListeningto(e));if(n)return n;const r=new Fc(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const n=e,{eventId:r,eventType:s,data:i}=n.data,o=this.handlersMap[s];if(!(o!=null&&o.size))return;n.ports[0].postMessage({status:"ack",eventId:r,eventType:s});const l=Array.from(o).map(async c=>c(n.origin,i)),u=await U2(l);n.ports[0].postMessage({status:"done",eventId:r,eventType:s,response:u})}_subscribe(e,n){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(n)}_unsubscribe(e,n){this.handlersMap[e]&&n&&this.handlersMap[e].delete(n),(!n||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Fc.receivers=[];/**
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
 */function xm(t="",e=10){let n="";for(let r=0;r<e;r++)n+=Math.floor(Math.random()*10);return t+n}/**
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
 */class F2{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,n,r=50){const s=typeof MessageChannel<"u"?new MessageChannel:null;if(!s)throw new Error("connection_unavailable");let i,o;return new Promise((l,u)=>{const c=xm("",20);s.port1.start();const f=setTimeout(()=>{u(new Error("unsupported_event"))},r);o={messageChannel:s,onMessage(p){const g=p;if(g.data.eventId===c)switch(g.data.status){case"ack":clearTimeout(f),i=setTimeout(()=>{u(new Error("timeout"))},3e3);break;case"done":clearTimeout(i),l(g.data.response);break;default:clearTimeout(f),clearTimeout(i),u(new Error("invalid_response"));break}}},this.handlers.add(o),s.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:c,data:n},[s.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
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
 */function En(){return window}function z2(t){En().location.href=t}/**
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
 */function Wx(){return typeof En().WorkerGlobalScope<"u"&&typeof En().importScripts=="function"}async function B2(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function $2(){var t;return((t=navigator==null?void 0:navigator.serviceWorker)==null?void 0:t.controller)||null}function q2(){return Wx()?self:null}/**
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
 */const Gx="firebaseLocalStorageDb",H2=1,Gu="firebaseLocalStorage",Kx="fbase_key";class Ga{constructor(e){this.request=e}toPromise(){return new Promise((e,n)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{n(this.request.error)})})}}function zc(t,e){return t.transaction([Gu],e?"readwrite":"readonly").objectStore(Gu)}function W2(){const t=indexedDB.deleteDatabase(Gx);return new Ga(t).toPromise()}function kf(){const t=indexedDB.open(Gx,H2);return new Promise((e,n)=>{t.addEventListener("error",()=>{n(t.error)}),t.addEventListener("upgradeneeded",()=>{const r=t.result;try{r.createObjectStore(Gu,{keyPath:Kx})}catch(s){n(s)}}),t.addEventListener("success",async()=>{const r=t.result;r.objectStoreNames.contains(Gu)?e(r):(r.close(),await W2(),e(await kf()))})})}async function wv(t,e,n){const r=zc(t,!0).put({[Kx]:e,value:n});return new Ga(r).toPromise()}async function G2(t,e){const n=zc(t,!1).get(e),r=await new Ga(n).toPromise();return r===void 0?null:r.value}function Ev(t,e){const n=zc(t,!0).delete(e);return new Ga(n).toPromise()}const K2=800,Q2=3;class Qx{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await kf(),this.db)}async _withRetries(e){let n=0;for(;;)try{const r=await this._openDb();return await e(r)}catch(r){if(n++>Q2)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Wx()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Fc._getInstance(q2()),this.receiver._subscribe("keyChanged",async(e,n)=>({keyProcessed:(await this._poll()).includes(n.key)})),this.receiver._subscribe("ping",async(e,n)=>["keyChanged"])}async initializeSender(){var n,r;if(this.activeServiceWorker=await B2(),!this.activeServiceWorker)return;this.sender=new F2(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(n=e[0])!=null&&n.fulfilled&&(r=e[0])!=null&&r.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||$2()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await kf();return await wv(e,Wu,"1"),await Ev(e,Wu),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,n){return this._withPendingWrite(async()=>(await this._withRetries(r=>wv(r,e,n)),this.localCache[e]=n,this.notifyServiceWorker(e)))}async _get(e){const n=await this._withRetries(r=>G2(r,e));return this.localCache[e]=n,n}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(n=>Ev(n,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(s=>{const i=zc(s,!1).getAll();return new Ga(i).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const n=[],r=new Set;if(e.length!==0)for(const{fbase_key:s,value:i}of e)r.add(s),JSON.stringify(this.localCache[s])!==JSON.stringify(i)&&(this.notifyListeners(s,i),n.push(s));for(const s of Object.keys(this.localCache))this.localCache[s]&&!r.has(s)&&(this.notifyListeners(s,null),n.push(s));return n}notifyListeners(e,n){this.localCache[e]=n;const r=this.listeners[e];if(r)for(const s of Array.from(r))s(n)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),K2)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,n){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(n)}_removeListener(e,n){this.listeners[e]&&(this.listeners[e].delete(n),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}Qx.type="LOCAL";const X2=Qx;new Ha(3e4,6e4);/**
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
 */class Im extends wm{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return gi(e,this._buildIdpRequest())}_linkToIdToken(e,n){return gi(e,this._buildIdpRequest(n))}_getReauthenticationResolver(e){return gi(e,this._buildIdpRequest())}_buildIdpRequest(e){const n={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(n.idToken=e),n}}function Y2(t){return Fx(t.auth,new Im(t),t.bypassAuthState)}function J2(t){const{auth:e,user:n}=t;return G(n,e,"internal-error"),A2(n,new Im(t),t.bypassAuthState)}async function Z2(t){const{auth:e,user:n}=t;return G(n,e,"internal-error"),C2(n,new Im(t),t.bypassAuthState)}/**
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
 */class Yx{constructor(e,n,r,s,i=!1){this.auth=e,this.resolver=r,this.user=s,this.bypassAuthState=i,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(n)?n:[n]}execute(){return new Promise(async(e,n)=>{this.pendingPromise={resolve:e,reject:n};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){const{urlResponse:n,sessionId:r,postBody:s,tenantId:i,error:o,type:l}=e;if(o){this.reject(o);return}const u={auth:this.auth,requestUri:n,sessionId:r,tenantId:i||void 0,postBody:s||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(l)(u))}catch(c){this.reject(c)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return Y2;case"linkViaPopup":case"linkViaRedirect":return Z2;case"reauthViaPopup":case"reauthViaRedirect":return J2;default:Wt(this.auth,"internal-error")}}resolve(e){Kn(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){Kn(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
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
 */const eD=new Ha(2e3,1e4);async function tD(t,e,n){if(At(t.app))return Promise.reject(rn(t,"operation-not-supported-in-this-environment"));const r=Ls(t);VN(t,e,Tm);const s=Xx(r,n);return new fs(r,"signInViaPopup",e,s).executeNotNull()}class fs extends Yx{constructor(e,n,r,s,i){super(e,n,s,i),this.provider=r,this.authWindow=null,this.pollId=null,fs.currentPopupAction&&fs.currentPopupAction.cancel(),fs.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return G(e,this.auth,"internal-error"),e}async onExecution(){Kn(this.filter.length===1,"Popup operations only handle one event");const e=xm();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(n=>{this.reject(n)}),this.resolver._isIframeWebStorageSupported(this.auth,n=>{n||this.reject(rn(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(rn(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,fs.currentPopupAction=null}pollUserCancellation(){const e=()=>{var n,r;if((r=(n=this.authWindow)==null?void 0:n.window)!=null&&r.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(rn(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,eD.get())};e()}}fs.currentPopupAction=null;/**
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
 */const nD="pendingRedirect",tu=new Map;class rD extends Yx{constructor(e,n,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],n,void 0,r),this.eventId=null}async execute(){let e=tu.get(this.auth._key());if(!e){try{const r=await sD(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(n){e=()=>Promise.reject(n)}tu.set(this.auth._key(),e)}return this.bypassAuthState||tu.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const n=await this.auth._redirectUserForId(e.eventId);if(n)return this.user=n,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function sD(t,e){const n=aD(e),r=oD(t);if(!await r._isAvailable())return!1;const s=await r._get(n)==="true";return await r._remove(n),s}function iD(t,e){tu.set(t._key(),e)}function oD(t){return Vn(t._redirectPersistence)}function aD(t){return eu(nD,t.config.apiKey,t.name)}async function lD(t,e,n=!1){if(At(t.app))return Promise.reject(Pr(t));const r=Ls(t),s=Xx(r,e),o=await new rD(r,s,n).execute();return o&&!n&&(delete o.user._redirectEventId,await r._persistUserIfCurrent(o.user),await r._setRedirectUser(null,e)),o}/**
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
 */const uD=10*60*1e3;class cD{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let n=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(n=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!hD(e)||(this.hasHandledPotentialRedirect=!0,n||(this.queuedRedirectEvent=e,n=!0)),n}sendToConsumer(e,n){var r;if(e.error&&!Jx(e)){const s=((r=e.error.code)==null?void 0:r.split("auth/")[1])||"internal-error";n.onError(rn(this.auth,s))}else n.onAuthEvent(e)}isEventForConsumer(e,n){const r=n.eventId===null||!!e.eventId&&e.eventId===n.eventId;return n.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=uD&&this.cachedEventUids.clear(),this.cachedEventUids.has(Tv(e))}saveEventToCache(e){this.cachedEventUids.add(Tv(e)),this.lastProcessedEventTime=Date.now()}}function Tv(t){return[t.type,t.eventId,t.sessionId,t.tenantId].filter(e=>e).join("-")}function Jx({type:t,error:e}){return t==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function hD(t){switch(t.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return Jx(t);default:return!1}}/**
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
 */async function dD(t,e={}){return Yr(t,"GET","/v1/projects",e)}/**
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
 */const fD=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,pD=/^https?/;async function mD(t){if(t.config.emulator)return;const{authorizedDomains:e}=await dD(t);for(const n of e)try{if(gD(n))return}catch{}Wt(t,"unauthorized-domain")}function gD(t){const e=If(),{protocol:n,hostname:r}=new URL(e);if(t.startsWith("chrome-extension://")){const o=new URL(t);return o.hostname===""&&r===""?n==="chrome-extension:"&&t.replace("chrome-extension://","")===e.replace("chrome-extension://",""):n==="chrome-extension:"&&o.hostname===r}if(!pD.test(n))return!1;if(fD.test(t))return r===t;const s=t.replace(/\./g,"\\.");return new RegExp("^(.+\\."+s+"|"+s+")$","i").test(r)}/**
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
 */const yD=new Ha(3e4,6e4);function xv(){const t=En().___jsl;if(t!=null&&t.H){for(const e of Object.keys(t.H))if(t.H[e].r=t.H[e].r||[],t.H[e].L=t.H[e].L||[],t.H[e].r=[...t.H[e].L],t.CP)for(let n=0;n<t.CP.length;n++)t.CP[n]=null}}function _D(t){return new Promise((e,n)=>{var s,i,o;function r(){xv(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{xv(),n(rn(t,"network-request-failed"))},timeout:yD.get()})}if((i=(s=En().gapi)==null?void 0:s.iframes)!=null&&i.Iframe)e(gapi.iframes.getContext());else if((o=En().gapi)!=null&&o.load)r();else{const l=c2("iframefcb");return En()[l]=()=>{gapi.load?r():n(rn(t,"network-request-failed"))},Lx(`${u2()}?onload=${l}`).catch(u=>n(u))}}).catch(e=>{throw nu=null,e})}let nu=null;function vD(t){return nu=nu||_D(t),nu}/**
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
 */const wD=new Ha(5e3,15e3),ED="__/auth/iframe",TD="emulator/auth/iframe",xD={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},ID=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function SD(t){const e=t.config;G(e.authDomain,t,"auth-domain-config-required");const n=e.emulator?ym(e,TD):`https://${t.config.authDomain}/${ED}`,r={apiKey:e.apiKey,appName:t.name,v:Ps},s=ID.get(t.config.apiHost);s&&(r.eid=s);const i=t._getFrameworks();return i.length&&(r.fw=i.join(",")),`${n}?${Na(r).slice(1)}`}async function kD(t){const e=await vD(t),n=En().gapi;return G(n,t,"internal-error"),e.open({where:document.body,url:SD(t),messageHandlersFilter:n.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:xD,dontclear:!0},r=>new Promise(async(s,i)=>{await r.restyle({setHideOnLeave:!1});const o=rn(t,"network-request-failed"),l=En().setTimeout(()=>{i(o)},wD.get());function u(){En().clearTimeout(l),s(r)}r.ping(u).then(u,()=>{i(o)})}))}/**
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
 */const CD={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},AD=500,RD=600,bD="_blank",PD="http://localhost";class Iv{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function ND(t,e,n,r=AD,s=RD){const i=Math.max((window.screen.availHeight-s)/2,0).toString(),o=Math.max((window.screen.availWidth-r)/2,0).toString();let l="";const u={...CD,width:r.toString(),height:s.toString(),top:i,left:o},c=ut().toLowerCase();n&&(l=Rx(c)?bD:n),Cx(c)&&(e=e||PD,u.scrollbars="yes");const f=Object.entries(u).reduce((g,[w,S])=>`${g}${w}=${S},`,"");if(e2(c)&&l!=="_self")return DD(e||"",l),new Iv(null);const p=window.open(e||"",l,f);G(p,t,"popup-blocked");try{p.focus()}catch{}return new Iv(p)}function DD(t,e){const n=document.createElement("a");n.href=t,n.target=e;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),n.dispatchEvent(r)}/**
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
 */const OD="__/auth/handler",VD="emulator/auth/handler",LD=encodeURIComponent("fac");async function Sv(t,e,n,r,s,i){G(t.config.authDomain,t,"auth-domain-config-required"),G(t.config.apiKey,t,"invalid-api-key");const o={apiKey:t.config.apiKey,appName:t.name,authType:n,redirectUrl:r,v:Ps,eventId:s};if(e instanceof Tm){e.setDefaultLanguage(t.languageCode),o.providerId=e.providerId||"",uA(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[f,p]of Object.entries({}))o[f]=p}if(e instanceof Wa){const f=e.getScopes().filter(p=>p!=="");f.length>0&&(o.scopes=f.join(","))}t.tenantId&&(o.tid=t.tenantId);const l=o;for(const f of Object.keys(l))l[f]===void 0&&delete l[f];const u=await t._getAppCheckToken(),c=u?`#${LD}=${encodeURIComponent(u)}`:"";return`${MD(t)}?${Na(l).slice(1)}${c}`}function MD({config:t}){return t.emulator?ym(t,VD):`https://${t.authDomain}/${OD}`}/**
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
 */const Jh="webStorageSupport";class jD{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=Hx,this._completeRedirectFn=lD,this._overrideRedirectResult=iD}async _openPopup(e,n,r,s){var o;Kn((o=this.eventManagers[e._key()])==null?void 0:o.manager,"_initialize() not called before _openPopup()");const i=await Sv(e,n,r,If(),s);return ND(e,i,xm())}async _openRedirect(e,n,r,s){await this._originValidation(e);const i=await Sv(e,n,r,If(),s);return z2(i),new Promise(()=>{})}_initialize(e){const n=e._key();if(this.eventManagers[n]){const{manager:s,promise:i}=this.eventManagers[n];return s?Promise.resolve(s):(Kn(i,"If manager is not set, promise should be"),i)}const r=this.initAndGetManager(e);return this.eventManagers[n]={promise:r},r.catch(()=>{delete this.eventManagers[n]}),r}async initAndGetManager(e){const n=await kD(e),r=new cD(e);return n.register("authEvent",s=>(G(s==null?void 0:s.authEvent,e,"invalid-auth-event"),{status:r.onEvent(s.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=n,r}_isIframeWebStorageSupported(e,n){this.iframes[e._key()].send(Jh,{type:Jh},s=>{var o;const i=(o=s==null?void 0:s[0])==null?void 0:o[Jh];i!==void 0&&n(!!i),Wt(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const n=e._key();return this.originValidationPromises[n]||(this.originValidationPromises[n]=mD(e)),this.originValidationPromises[n]}get _shouldInitProactively(){return Ox()||Ax()||vm()}}const UD=jD;var kv="@firebase/auth",Cv="1.13.1";/**
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
 */class FD{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const n=this.auth.onIdTokenChanged(r=>{e((r==null?void 0:r.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,n),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const n=this.internalListeners.get(e);n&&(this.internalListeners.delete(e),n(),this.updateProactiveRefresh())}assertAuthConfigured(){G(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
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
 */function zD(t){switch(t){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function BD(t){Ts(new Vr("auth",(e,{options:n})=>{const r=e.getProvider("app").getImmediate(),s=e.getProvider("heartbeat"),i=e.getProvider("app-check-internal"),{apiKey:o,authDomain:l}=r.options;G(o&&!o.includes(":"),"invalid-api-key",{appName:r.name});const u={apiKey:o,authDomain:l,clientPlatform:t,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:Vx(t)},c=new o2(r,s,i,u);return g2(c,n),c},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,n,r)=>{e.getProvider("auth-internal").initialize()})),Ts(new Vr("auth-internal",e=>{const n=Ls(e.getProvider("auth").getImmediate());return(r=>new FD(r))(n)},"PRIVATE").setInstantiationMode("EXPLICIT")),_n(kv,Cv,zD(t)),_n(kv,Cv,"esm2020")}/**
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
 */const $D=5*60,qD=IE("authIdTokenMaxAge")||$D;let Av=null;const HD=t=>async e=>{const n=e&&await e.getIdTokenResult(),r=n&&(new Date().getTime()-Date.parse(n.issuedAtTime))/1e3;if(r&&r>qD)return;const s=n==null?void 0:n.token;Av!==s&&(Av=s,await fetch(t,{method:s?"POST":"DELETE",headers:s?{Authorization:`Bearer ${s}`}:{}}))};function WD(t=bp()){const e=mc(t,"auth");if(e.isInitialized())return e.getImmediate();const n=m2(t,{popupRedirectResolver:UD,persistence:[X2,$x,Hx]}),r=IE("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){const i=new URL(r,location.origin);if(location.origin===i.origin){const o=HD(i.toString());O2(n,o,()=>o(n.currentUser)),D2(n,l=>o(l))}}const s=EE("auth");return s&&y2(n,`http://${s}`),n}function GD(){var t;return((t=document.getElementsByTagName("head"))==null?void 0:t[0])??document}a2({loadJS(t){return new Promise((e,n)=>{const r=document.createElement("script");r.setAttribute("src",t),r.onload=e,r.onerror=s=>{const i=rn("internal-error");i.customData=s,n(i)},r.type="text/javascript",r.charset="UTF-8",GD().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});BD("Browser");/**
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
 */const Zx="firebasestorage.googleapis.com",eI="storageBucket",KD=2*60*1e3,QD=10*60*1e3,XD=1e3;/**
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
 */class Ae extends Sn{constructor(e,n,r=0){super(Zh(e),`Firebase Storage: ${n} (${Zh(e)})`),this.status_=r,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,Ae.prototype)}get status(){return this.status_}set status(e){this.status_=e}_codeEquals(e){return Zh(e)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var _e;(function(t){t.UNKNOWN="unknown",t.OBJECT_NOT_FOUND="object-not-found",t.BUCKET_NOT_FOUND="bucket-not-found",t.PROJECT_NOT_FOUND="project-not-found",t.QUOTA_EXCEEDED="quota-exceeded",t.UNAUTHENTICATED="unauthenticated",t.UNAUTHORIZED="unauthorized",t.UNAUTHORIZED_APP="unauthorized-app",t.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",t.INVALID_CHECKSUM="invalid-checksum",t.CANCELED="canceled",t.INVALID_EVENT_NAME="invalid-event-name",t.INVALID_URL="invalid-url",t.INVALID_DEFAULT_BUCKET="invalid-default-bucket",t.NO_DEFAULT_BUCKET="no-default-bucket",t.CANNOT_SLICE_BLOB="cannot-slice-blob",t.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",t.NO_DOWNLOAD_URL="no-download-url",t.INVALID_ARGUMENT="invalid-argument",t.INVALID_ARGUMENT_COUNT="invalid-argument-count",t.APP_DELETED="app-deleted",t.INVALID_ROOT_OPERATION="invalid-root-operation",t.INVALID_FORMAT="invalid-format",t.INTERNAL_ERROR="internal-error",t.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(_e||(_e={}));function Zh(t){return"storage/"+t}function Sm(){const t="An unknown error occurred, please check the error payload for server response.";return new Ae(_e.UNKNOWN,t)}function YD(t){return new Ae(_e.OBJECT_NOT_FOUND,"Object '"+t+"' does not exist.")}function JD(t){return new Ae(_e.QUOTA_EXCEEDED,"Quota for bucket '"+t+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}function ZD(){const t="User is not authenticated, please authenticate using Firebase Authentication and try again.";return new Ae(_e.UNAUTHENTICATED,t)}function eO(){return new Ae(_e.UNAUTHORIZED_APP,"This app does not have permission to access Firebase Storage on this project.")}function tO(t){return new Ae(_e.UNAUTHORIZED,"User does not have permission to access '"+t+"'.")}function tI(){return new Ae(_e.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function nI(){return new Ae(_e.CANCELED,"User canceled the upload/download.")}function nO(t){return new Ae(_e.INVALID_URL,"Invalid URL '"+t+"'.")}function rO(t){return new Ae(_e.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+t+"'.")}function sO(){return new Ae(_e.NO_DEFAULT_BUCKET,"No default bucket found. Did you set the '"+eI+"' property when initializing the app?")}function rI(){return new Ae(_e.CANNOT_SLICE_BLOB,"Cannot slice blob for upload. Please retry the upload.")}function iO(){return new Ae(_e.SERVER_FILE_WRONG_SIZE,"Server recorded incorrect upload file size, please retry the upload.")}function oO(){return new Ae(_e.NO_DOWNLOAD_URL,"The given file does not have any download URLs.")}function aO(t){return new Ae(_e.UNSUPPORTED_ENVIRONMENT,`${t} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`)}function Cf(t){return new Ae(_e.INVALID_ARGUMENT,t)}function sI(){return new Ae(_e.APP_DELETED,"The Firebase app was deleted.")}function lO(t){return new Ae(_e.INVALID_ROOT_OPERATION,"The operation '"+t+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}function Wo(t,e){return new Ae(_e.INVALID_FORMAT,"String does not match format '"+t+"': "+e)}function Eo(t){throw new Ae(_e.INTERNAL_ERROR,"Internal error: "+t)}/**
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
 */class Nt{constructor(e,n){this.bucket=e,this.path_=n}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const e=encodeURIComponent;return"/b/"+e(this.bucket)+"/o/"+e(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(e,n){let r;try{r=Nt.makeFromUrl(e,n)}catch{return new Nt(e,"")}if(r.path==="")return r;throw rO(e)}static makeFromUrl(e,n){let r=null;const s="([A-Za-z0-9.\\-_]+)";function i(D){D.path.charAt(D.path.length-1)==="/"&&(D.path_=D.path_.slice(0,-1))}const o="(/(.*))?$",l=new RegExp("^gs://"+s+o,"i"),u={bucket:1,path:3};function c(D){D.path_=decodeURIComponent(D.path)}const f="v[A-Za-z0-9_]+",p=n.replace(/[.]/g,"\\."),g="(/([^?#]*).*)?$",w=new RegExp(`^https?://${p}/${f}/b/${s}/o${g}`,"i"),S={bucket:1,path:3},b=n===Zx?"(?:storage.googleapis.com|storage.cloud.google.com)":n,P="([^?#]*)",I=new RegExp(`^https?://${b}/${s}/${P}`,"i"),C=[{regex:l,indices:u,postModify:i},{regex:w,indices:S,postModify:c},{regex:I,indices:{bucket:1,path:2},postModify:c}];for(let D=0;D<C.length;D++){const j=C[D],L=j.regex.exec(e);if(L){const E=L[j.indices.bucket];let _=L[j.indices.path];_||(_=""),r=new Nt(E,_),j.postModify(r);break}}if(r==null)throw nO(e);return r}}class uO{constructor(e){this.promise_=Promise.reject(e)}getPromise(){return this.promise_}cancel(e=!1){}}/**
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
 */function cO(t,e,n){let r=1,s=null,i=null,o=!1,l=0;function u(){return l===2}let c=!1;function f(...P){c||(c=!0,e.apply(null,P))}function p(P){s=setTimeout(()=>{s=null,t(w,u())},P)}function g(){i&&clearTimeout(i)}function w(P,...I){if(c){g();return}if(P){g(),f.call(null,P,...I);return}if(u()||o){g(),f.call(null,P,...I);return}r<64&&(r*=2);let C;l===1?(l=2,C=0):C=(r+Math.random())*1e3,p(C)}let S=!1;function b(P){S||(S=!0,g(),!c&&(s!==null?(P||(l=2),clearTimeout(s),p(0)):P||(l=1)))}return p(0),i=setTimeout(()=>{o=!0,b(!0)},n),b}function hO(t){t(!1)}/**
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
 */function dO(t){return t!==void 0}function fO(t){return typeof t=="function"}function pO(t){return typeof t=="object"&&!Array.isArray(t)}function Bc(t){return typeof t=="string"||t instanceof String}function Rv(t){return km()&&t instanceof Blob}function km(){return typeof Blob<"u"}function bv(t,e,n,r){if(r<e)throw Cf(`Invalid value for '${t}'. Expected ${e} or greater.`);if(r>n)throw Cf(`Invalid value for '${t}'. Expected ${n} or less.`)}/**
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
 */class mO{constructor(e,n,r,s,i,o,l,u,c,f,p,g=!0,w=!1){this.url_=e,this.method_=n,this.headers_=r,this.body_=s,this.successCodes_=i,this.additionalRetryCodes_=o,this.callback_=l,this.errorCallback_=u,this.timeout_=c,this.progressCallback_=f,this.connectionFactory_=p,this.retry=g,this.isUsingEmulator=w,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((S,b)=>{this.resolve_=S,this.reject_=b,this.start_()})}start_(){const e=(r,s)=>{if(s){r(!1,new bl(!1,null,!0));return}const i=this.connectionFactory_();this.pendingConnection_=i;const o=l=>{const u=l.loaded,c=l.lengthComputable?l.total:-1;this.progressCallback_!==null&&this.progressCallback_(u,c)};this.progressCallback_!==null&&i.addUploadProgressListener(o),i.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&i.removeUploadProgressListener(o),this.pendingConnection_=null;const l=i.getErrorCode()===gs.NO_ERROR,u=i.getStatus();if(!l||oI(u,this.additionalRetryCodes_)&&this.retry){const f=i.getErrorCode()===gs.ABORT;r(!1,new bl(!1,null,f));return}const c=this.successCodes_.indexOf(u)!==-1;r(!0,new bl(c,i))})},n=(r,s)=>{const i=this.resolve_,o=this.reject_,l=s.connection;if(s.wasSuccessCode)try{const u=this.callback_(l,l.getResponse());dO(u)?i(u):i()}catch(u){o(u)}else if(l!==null){const u=Sm();u.serverResponse=l.getErrorText(),this.errorCallback_?o(this.errorCallback_(l,u)):o(u)}else if(s.canceled){const u=this.appDelete_?sI():nI();o(u)}else{const u=tI();o(u)}};this.canceled_?n(!1,new bl(!1,null,!0)):this.backoffId_=cO(e,n,this.timeout_)}getPromise(){return this.promise_}cancel(e){this.canceled_=!0,this.appDelete_=e||!1,this.backoffId_!==null&&hO(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class bl{constructor(e,n,r){this.wasSuccessCode=e,this.connection=n,this.canceled=!!r}}function gO(t,e){e!==null&&e.length>0&&(t.Authorization="Firebase "+e)}function yO(t,e){t["X-Firebase-Storage-Version"]="webjs/"+(e??"AppManager")}function _O(t,e){e&&(t["X-Firebase-GMPID"]=e)}function vO(t,e){e!==null&&(t["X-Firebase-AppCheck"]=e)}function wO(t,e,n,r,s,i,o=!0,l=!1){const u=iI(t.urlParams),c=t.url+u,f=Object.assign({},t.headers);return _O(f,e),gO(f,n),yO(f,i),vO(f,r),new mO(c,t.method,f,t.body,t.successCodes,t.additionalRetryCodes,t.handler,t.errorHandler,t.timeout,t.progressCallback,s,o,l)}/**
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
 */function EO(){return typeof BlobBuilder<"u"?BlobBuilder:typeof WebKitBlobBuilder<"u"?WebKitBlobBuilder:void 0}function TO(...t){const e=EO();if(e!==void 0){const n=new e;for(let r=0;r<t.length;r++)n.append(t[r]);return n.getBlob()}else{if(km())return new Blob(t);throw new Ae(_e.UNSUPPORTED_ENVIRONMENT,"This browser doesn't seem to support creating Blobs")}}function xO(t,e,n){return t.webkitSlice?t.webkitSlice(e,n):t.mozSlice?t.mozSlice(e,n):t.slice?t.slice(e,n):null}/**
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
 */function IO(t){if(typeof atob>"u")throw aO("base-64");return atob(t)}/**
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
 */const mn={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"};class ed{constructor(e,n){this.data=e,this.contentType=n||null}}function SO(t,e){switch(t){case mn.RAW:return new ed(aI(e));case mn.BASE64:case mn.BASE64URL:return new ed(lI(t,e));case mn.DATA_URL:return new ed(CO(e),AO(e))}throw Sm()}function aI(t){const e=[];for(let n=0;n<t.length;n++){let r=t.charCodeAt(n);if(r<=127)e.push(r);else if(r<=2047)e.push(192|r>>6,128|r&63);else if((r&64512)===55296)if(!(n<t.length-1&&(t.charCodeAt(n+1)&64512)===56320))e.push(239,191,189);else{const i=r,o=t.charCodeAt(++n);r=65536|(i&1023)<<10|o&1023,e.push(240|r>>18,128|r>>12&63,128|r>>6&63,128|r&63)}else(r&64512)===56320?e.push(239,191,189):e.push(224|r>>12,128|r>>6&63,128|r&63)}return new Uint8Array(e)}function kO(t){let e;try{e=decodeURIComponent(t)}catch{throw Wo(mn.DATA_URL,"Malformed data URL.")}return aI(e)}function lI(t,e){switch(t){case mn.BASE64:{const s=e.indexOf("-")!==-1,i=e.indexOf("_")!==-1;if(s||i)throw Wo(t,"Invalid character '"+(s?"-":"_")+"' found: is it base64url encoded?");break}case mn.BASE64URL:{const s=e.indexOf("+")!==-1,i=e.indexOf("/")!==-1;if(s||i)throw Wo(t,"Invalid character '"+(s?"+":"/")+"' found: is it base64 encoded?");e=e.replace(/-/g,"+").replace(/_/g,"/");break}}let n;try{n=IO(e)}catch(s){throw s.message.includes("polyfill")?s:Wo(t,"Invalid character found")}const r=new Uint8Array(n.length);for(let s=0;s<n.length;s++)r[s]=n.charCodeAt(s);return r}class uI{constructor(e){this.base64=!1,this.contentType=null;const n=e.match(/^data:([^,]+)?,/);if(n===null)throw Wo(mn.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");const r=n[1]||null;r!=null&&(this.base64=RO(r,";base64"),this.contentType=this.base64?r.substring(0,r.length-7):r),this.rest=e.substring(e.indexOf(",")+1)}}function CO(t){const e=new uI(t);return e.base64?lI(mn.BASE64,e.rest):kO(e.rest)}function AO(t){return new uI(t).contentType}function RO(t,e){return t.length>=e.length?t.substring(t.length-e.length)===e:!1}/**
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
 */class bn{constructor(e,n){let r=0,s="";Rv(e)?(this.data_=e,r=e.size,s=e.type):e instanceof ArrayBuffer?(n?this.data_=new Uint8Array(e):(this.data_=new Uint8Array(e.byteLength),this.data_.set(new Uint8Array(e))),r=this.data_.length):e instanceof Uint8Array&&(n?this.data_=e:(this.data_=new Uint8Array(e.length),this.data_.set(e)),r=e.length),this.size_=r,this.type_=s}size(){return this.size_}type(){return this.type_}slice(e,n){if(Rv(this.data_)){const r=this.data_,s=xO(r,e,n);return s===null?null:new bn(s)}else{const r=new Uint8Array(this.data_.buffer,e,n-e);return new bn(r,!0)}}static getBlob(...e){if(km()){const n=e.map(r=>r instanceof bn?r.data_:r);return new bn(TO.apply(null,n))}else{const n=e.map(o=>Bc(o)?SO(mn.RAW,o).data:o.data_);let r=0;n.forEach(o=>{r+=o.byteLength});const s=new Uint8Array(r);let i=0;return n.forEach(o=>{for(let l=0;l<o.length;l++)s[i++]=o[l]}),new bn(s,!0)}}uploadData(){return this.data_}}/**
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
 */function cI(t){let e;try{e=JSON.parse(t)}catch{return null}return pO(e)?e:null}/**
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
 */function bO(t){if(t.length===0)return null;const e=t.lastIndexOf("/");return e===-1?"":t.slice(0,e)}function PO(t,e){const n=e.split("/").filter(r=>r.length>0).join("/");return t.length===0?n:t+"/"+n}function hI(t){const e=t.lastIndexOf("/",t.length-2);return e===-1?t:t.slice(e+1)}/**
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
 */function NO(t,e){return e}class dt{constructor(e,n,r,s){this.server=e,this.local=n||e,this.writable=!!r,this.xform=s||NO}}let Pl=null;function DO(t){return!Bc(t)||t.length<2?t:hI(t)}function Cm(){if(Pl)return Pl;const t=[];t.push(new dt("bucket")),t.push(new dt("generation")),t.push(new dt("metageneration")),t.push(new dt("name","fullPath",!0));function e(i,o){return DO(o)}const n=new dt("name");n.xform=e,t.push(n);function r(i,o){return o!==void 0?Number(o):o}const s=new dt("size");return s.xform=r,t.push(s),t.push(new dt("timeCreated")),t.push(new dt("updated")),t.push(new dt("md5Hash",null,!0)),t.push(new dt("cacheControl",null,!0)),t.push(new dt("contentDisposition",null,!0)),t.push(new dt("contentEncoding",null,!0)),t.push(new dt("contentLanguage",null,!0)),t.push(new dt("contentType",null,!0)),t.push(new dt("metadata","customMetadata",!0)),Pl=t,Pl}function OO(t,e){function n(){const r=t.bucket,s=t.fullPath,i=new Nt(r,s);return e._makeStorageReference(i)}Object.defineProperty(t,"ref",{get:n})}function VO(t,e,n){const r={};r.type="file";const s=n.length;for(let i=0;i<s;i++){const o=n[i];r[o.local]=o.xform(r,e[o.server])}return OO(r,t),r}function dI(t,e,n){const r=cI(e);return r===null?null:VO(t,r,n)}function LO(t,e,n,r){const s=cI(e);if(s===null||!Bc(s.downloadTokens))return null;const i=s.downloadTokens;if(i.length===0)return null;const o=encodeURIComponent;return i.split(",").map(c=>{const f=t.bucket,p=t.fullPath,g="/b/"+o(f)+"/o/"+o(p),w=Gi(g,n,r),S=iI({alt:"media",token:c});return w+S})[0]}function fI(t,e){const n={},r=e.length;for(let s=0;s<r;s++){const i=e[s];i.writable&&(n[i.server]=t[i.local])}return JSON.stringify(n)}class Ms{constructor(e,n,r,s){this.url=e,this.method=n,this.handler=r,this.timeout=s,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[]}}/**
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
 */function Fn(t){if(!t)throw Sm()}function Am(t,e){function n(r,s){const i=dI(t,s,e);return Fn(i!==null),i}return n}function MO(t,e){function n(r,s){const i=dI(t,s,e);return Fn(i!==null),LO(i,s,t.host,t._protocol)}return n}function Ka(t){function e(n,r){let s;return n.getStatus()===401?n.getErrorText().includes("Firebase App Check token is invalid")?s=eO():s=ZD():n.getStatus()===402?s=JD(t.bucket):n.getStatus()===403?s=tO(t.path):s=r,s.status=n.getStatus(),s.serverResponse=r.serverResponse,s}return e}function Rm(t){const e=Ka(t);function n(r,s){let i=e(r,s);return r.getStatus()===404&&(i=YD(t.path)),i.serverResponse=s.serverResponse,i}return n}function jO(t,e,n){const r=e.fullServerUrl(),s=Gi(r,t.host,t._protocol),i="GET",o=t.maxOperationRetryTime,l=new Ms(s,i,Am(t,n),o);return l.errorHandler=Rm(e),l}function UO(t,e,n){const r=e.fullServerUrl(),s=Gi(r,t.host,t._protocol),i="GET",o=t.maxOperationRetryTime,l=new Ms(s,i,MO(t,n),o);return l.errorHandler=Rm(e),l}function FO(t,e){const n=e.fullServerUrl(),r=Gi(n,t.host,t._protocol),s="DELETE",i=t.maxOperationRetryTime;function o(u,c){}const l=new Ms(r,s,o,i);return l.successCodes=[200,204],l.errorHandler=Rm(e),l}function zO(t,e){return t&&t.contentType||e&&e.type()||"application/octet-stream"}function pI(t,e,n){const r=Object.assign({},n);return r.fullPath=t.path,r.size=e.size(),r.contentType||(r.contentType=zO(null,e)),r}function mI(t,e,n,r,s){const i=e.bucketOnlyServerUrl(),o={"X-Goog-Upload-Protocol":"multipart"};function l(){let C="";for(let D=0;D<2;D++)C=C+Math.random().toString().slice(2);return C}const u=l();o["Content-Type"]="multipart/related; boundary="+u;const c=pI(e,r,s),f=fI(c,n),p="--"+u+`\r
Content-Type: application/json; charset=utf-8\r
\r
`+f+`\r
--`+u+`\r
Content-Type: `+c.contentType+`\r
\r
`,g=`\r
--`+u+"--",w=bn.getBlob(p,r,g);if(w===null)throw rI();const S={name:c.fullPath},b=Gi(i,t.host,t._protocol),P="POST",I=t.maxUploadRetryTime,v=new Ms(b,P,Am(t,n),I);return v.urlParams=S,v.headers=o,v.body=w.uploadData(),v.errorHandler=Ka(e),v}class Ku{constructor(e,n,r,s){this.current=e,this.total=n,this.finalized=!!r,this.metadata=s||null}}function bm(t,e){let n=null;try{n=t.getResponseHeader("X-Goog-Upload-Status")}catch{Fn(!1)}return Fn(!!n&&(e||["active"]).indexOf(n)!==-1),n}function BO(t,e,n,r,s){const i=e.bucketOnlyServerUrl(),o=pI(e,r,s),l={name:o.fullPath},u=Gi(i,t.host,t._protocol),c="POST",f={"X-Goog-Upload-Protocol":"resumable","X-Goog-Upload-Command":"start","X-Goog-Upload-Header-Content-Length":`${r.size()}`,"X-Goog-Upload-Header-Content-Type":o.contentType,"Content-Type":"application/json; charset=utf-8"},p=fI(o,n),g=t.maxUploadRetryTime;function w(b){bm(b);let P;try{P=b.getResponseHeader("X-Goog-Upload-URL")}catch{Fn(!1)}return Fn(Bc(P)),P}const S=new Ms(u,c,w,g);return S.urlParams=l,S.headers=f,S.body=p,S.errorHandler=Ka(e),S}function $O(t,e,n,r){const s={"X-Goog-Upload-Command":"query"};function i(c){const f=bm(c,["active","final"]);let p=null;try{p=c.getResponseHeader("X-Goog-Upload-Size-Received")}catch{Fn(!1)}p||Fn(!1);const g=Number(p);return Fn(!isNaN(g)),new Ku(g,r.size(),f==="final")}const o="POST",l=t.maxUploadRetryTime,u=new Ms(n,o,i,l);return u.headers=s,u.errorHandler=Ka(e),u}const Pv=256*1024;function qO(t,e,n,r,s,i,o,l){const u=new Ku(0,0);if(o?(u.current=o.current,u.total=o.total):(u.current=0,u.total=r.size()),r.size()!==u.total)throw iO();const c=u.total-u.current;let f=c;s>0&&(f=Math.min(f,s));const p=u.current,g=p+f;let w="";f===0?w="finalize":c===f?w="upload, finalize":w="upload";const S={"X-Goog-Upload-Command":w,"X-Goog-Upload-Offset":`${u.current}`},b=r.slice(p,g);if(b===null)throw rI();function P(D,j){const L=bm(D,["active","final"]),E=u.current+f,_=r.size();let x;return L==="final"?x=Am(e,i)(D,j):x=null,new Ku(E,_,L==="final",x)}const I="POST",v=e.maxUploadRetryTime,C=new Ms(n,I,P,v);return C.headers=S,C.body=b.uploadData(),C.progressCallback=l||null,C.errorHandler=Ka(t),C}const vt={RUNNING:"running",PAUSED:"paused",SUCCESS:"success",CANCELED:"canceled",ERROR:"error"};function td(t){switch(t){case"running":case"pausing":case"canceling":return vt.RUNNING;case"paused":return vt.PAUSED;case"success":return vt.SUCCESS;case"canceled":return vt.CANCELED;case"error":return vt.ERROR;default:return vt.ERROR}}/**
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
 */class HO{constructor(e,n,r){if(fO(e)||n!=null||r!=null)this.next=e,this.error=n??void 0,this.complete=r??void 0;else{const i=e;this.next=i.next,this.error=i.error,this.complete=i.complete}}}/**
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
 */function Bs(t){return(...e)=>{Promise.resolve().then(()=>t(...e))}}class WO{constructor(){this.sent_=!1,this.xhr_=new XMLHttpRequest,this.initXhr(),this.errorCode_=gs.NO_ERROR,this.sendPromise_=new Promise(e=>{this.xhr_.addEventListener("abort",()=>{this.errorCode_=gs.ABORT,e()}),this.xhr_.addEventListener("error",()=>{this.errorCode_=gs.NETWORK_ERROR,e()}),this.xhr_.addEventListener("load",()=>{e()})})}send(e,n,r,s,i){if(this.sent_)throw Eo("cannot .send() more than once");if(bs(e)&&r&&(this.xhr_.withCredentials=!0),this.sent_=!0,this.xhr_.open(n,e,!0),i!==void 0)for(const o in i)i.hasOwnProperty(o)&&this.xhr_.setRequestHeader(o,i[o].toString());return s!==void 0?this.xhr_.send(s):this.xhr_.send(),this.sendPromise_}getErrorCode(){if(!this.sent_)throw Eo("cannot .getErrorCode() before sending");return this.errorCode_}getStatus(){if(!this.sent_)throw Eo("cannot .getStatus() before sending");try{return this.xhr_.status}catch{return-1}}getResponse(){if(!this.sent_)throw Eo("cannot .getResponse() before sending");return this.xhr_.response}getErrorText(){if(!this.sent_)throw Eo("cannot .getErrorText() before sending");return this.xhr_.statusText}abort(){this.xhr_.abort()}getResponseHeader(e){return this.xhr_.getResponseHeader(e)}addUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.addEventListener("progress",e)}removeUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.removeEventListener("progress",e)}}class GO extends WO{initXhr(){this.xhr_.responseType="text"}}function fr(){return new GO}/**
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
 */class KO{isExponentialBackoffExpired(){return this.sleepTime>this.maxSleepTime}constructor(e,n,r=null){this._transferred=0,this._needToFetchStatus=!1,this._needToFetchMetadata=!1,this._observers=[],this._error=void 0,this._uploadUrl=void 0,this._request=void 0,this._chunkMultiplier=1,this._resolve=void 0,this._reject=void 0,this._ref=e,this._blob=n,this._metadata=r,this._mappings=Cm(),this._resumable=this._shouldDoResumable(this._blob),this._state="running",this._errorHandler=s=>{if(this._request=void 0,this._chunkMultiplier=1,s._codeEquals(_e.CANCELED))this._needToFetchStatus=!0,this.completeTransitions_();else{const i=this.isExponentialBackoffExpired();if(oI(s.status,[]))if(i)s=tI();else{this.sleepTime=Math.max(this.sleepTime*2,XD),this._needToFetchStatus=!0,this.completeTransitions_();return}this._error=s,this._transition("error")}},this._metadataErrorHandler=s=>{this._request=void 0,s._codeEquals(_e.CANCELED)?this.completeTransitions_():(this._error=s,this._transition("error"))},this.sleepTime=0,this.maxSleepTime=this._ref.storage.maxUploadRetryTime,this._promise=new Promise((s,i)=>{this._resolve=s,this._reject=i,this._start()}),this._promise.then(null,()=>{})}_makeProgressCallback(){const e=this._transferred;return n=>this._updateProgress(e+n)}_shouldDoResumable(e){return e.size()>256*1024}_start(){this._state==="running"&&this._request===void 0&&(this._resumable?this._uploadUrl===void 0?this._createResumable():this._needToFetchStatus?this._fetchStatus():this._needToFetchMetadata?this._fetchMetadata():this.pendingTimeout=setTimeout(()=>{this.pendingTimeout=void 0,this._continueUpload()},this.sleepTime):this._oneShotUpload())}_resolveToken(e){Promise.all([this._ref.storage._getAuthToken(),this._ref.storage._getAppCheckToken()]).then(([n,r])=>{switch(this._state){case"running":e(n,r);break;case"canceling":this._transition("canceled");break;case"pausing":this._transition("paused");break}})}_createResumable(){this._resolveToken((e,n)=>{const r=BO(this._ref.storage,this._ref._location,this._mappings,this._blob,this._metadata),s=this._ref.storage._makeRequest(r,fr,e,n);this._request=s,s.getPromise().then(i=>{this._request=void 0,this._uploadUrl=i,this._needToFetchStatus=!1,this.completeTransitions_()},this._errorHandler)})}_fetchStatus(){const e=this._uploadUrl;this._resolveToken((n,r)=>{const s=$O(this._ref.storage,this._ref._location,e,this._blob),i=this._ref.storage._makeRequest(s,fr,n,r);this._request=i,i.getPromise().then(o=>{o=o,this._request=void 0,this._updateProgress(o.current),this._needToFetchStatus=!1,o.finalized&&(this._needToFetchMetadata=!0),this.completeTransitions_()},this._errorHandler)})}_continueUpload(){const e=Pv*this._chunkMultiplier,n=new Ku(this._transferred,this._blob.size()),r=this._uploadUrl;this._resolveToken((s,i)=>{let o;try{o=qO(this._ref._location,this._ref.storage,r,this._blob,e,this._mappings,n,this._makeProgressCallback())}catch(u){this._error=u,this._transition("error");return}const l=this._ref.storage._makeRequest(o,fr,s,i,!1);this._request=l,l.getPromise().then(u=>{this._increaseMultiplier(),this._request=void 0,this._updateProgress(u.current),u.finalized?(this._metadata=u.metadata,this._transition("success")):this.completeTransitions_()},this._errorHandler)})}_increaseMultiplier(){Pv*this._chunkMultiplier*2<32*1024*1024&&(this._chunkMultiplier*=2)}_fetchMetadata(){this._resolveToken((e,n)=>{const r=jO(this._ref.storage,this._ref._location,this._mappings),s=this._ref.storage._makeRequest(r,fr,e,n);this._request=s,s.getPromise().then(i=>{this._request=void 0,this._metadata=i,this._transition("success")},this._metadataErrorHandler)})}_oneShotUpload(){this._resolveToken((e,n)=>{const r=mI(this._ref.storage,this._ref._location,this._mappings,this._blob,this._metadata),s=this._ref.storage._makeRequest(r,fr,e,n);this._request=s,s.getPromise().then(i=>{this._request=void 0,this._metadata=i,this._updateProgress(this._blob.size()),this._transition("success")},this._errorHandler)})}_updateProgress(e){const n=this._transferred;this._transferred=e,this._transferred!==n&&this._notifyObservers()}_transition(e){if(this._state!==e)switch(e){case"canceling":case"pausing":this._state=e,this._request!==void 0?this._request.cancel():this.pendingTimeout&&(clearTimeout(this.pendingTimeout),this.pendingTimeout=void 0,this.completeTransitions_());break;case"running":const n=this._state==="paused";this._state=e,n&&(this._notifyObservers(),this._start());break;case"paused":this._state=e,this._notifyObservers();break;case"canceled":this._error=nI(),this._state=e,this._notifyObservers();break;case"error":this._state=e,this._notifyObservers();break;case"success":this._state=e,this._notifyObservers();break}}completeTransitions_(){switch(this._state){case"pausing":this._transition("paused");break;case"canceling":this._transition("canceled");break;case"running":this._start();break}}get snapshot(){const e=td(this._state);return{bytesTransferred:this._transferred,totalBytes:this._blob.size(),state:e,metadata:this._metadata,task:this,ref:this._ref}}on(e,n,r,s){const i=new HO(n||void 0,r||void 0,s||void 0);return this._addObserver(i),()=>{this._removeObserver(i)}}then(e,n){return this._promise.then(e,n)}catch(e){return this.then(null,e)}_addObserver(e){this._observers.push(e),this._notifyObserver(e)}_removeObserver(e){const n=this._observers.indexOf(e);n!==-1&&this._observers.splice(n,1)}_notifyObservers(){this._finishPromise(),this._observers.slice().forEach(n=>{this._notifyObserver(n)})}_finishPromise(){if(this._resolve!==void 0){let e=!0;switch(td(this._state)){case vt.SUCCESS:Bs(this._resolve.bind(null,this.snapshot))();break;case vt.CANCELED:case vt.ERROR:const n=this._reject;Bs(n.bind(null,this._error))();break;default:e=!1;break}e&&(this._resolve=void 0,this._reject=void 0)}}_notifyObserver(e){switch(td(this._state)){case vt.RUNNING:case vt.PAUSED:e.next&&Bs(e.next.bind(e,this.snapshot))();break;case vt.SUCCESS:e.complete&&Bs(e.complete.bind(e))();break;case vt.CANCELED:case vt.ERROR:e.error&&Bs(e.error.bind(e,this._error))();break;default:e.error&&Bs(e.error.bind(e,this._error))()}}resume(){const e=this._state==="paused"||this._state==="pausing";return e&&this._transition("running"),e}pause(){const e=this._state==="running";return e&&this._transition("pausing"),e}cancel(){const e=this._state==="running"||this._state==="pausing";return e&&this._transition("canceling"),e}}/**
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
 */class ks{constructor(e,n){this._service=e,n instanceof Nt?this._location=n:this._location=Nt.makeFromUrl(n,e.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(e,n){return new ks(e,n)}get root(){const e=new Nt(this._location.bucket,"");return this._newRef(this._service,e)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return hI(this._location.path)}get storage(){return this._service}get parent(){const e=bO(this._location.path);if(e===null)return null;const n=new Nt(this._location.bucket,e);return new ks(this._service,n)}_throwIfRoot(e){if(this._location.path==="")throw lO(e)}}function QO(t,e,n){t._throwIfRoot("uploadBytes");const r=mI(t.storage,t._location,Cm(),new bn(e,!0),n);return t.storage.makeRequestWithTokens(r,fr).then(s=>({metadata:s,ref:t}))}function XO(t,e,n){return t._throwIfRoot("uploadBytesResumable"),new KO(t,new bn(e),n)}function YO(t){t._throwIfRoot("getDownloadURL");const e=UO(t.storage,t._location,Cm());return t.storage.makeRequestWithTokens(e,fr).then(n=>{if(n===null)throw oO();return n})}function JO(t){t._throwIfRoot("deleteObject");const e=FO(t.storage,t._location);return t.storage.makeRequestWithTokens(e,fr)}function ZO(t,e){const n=PO(t._location.path,e),r=new Nt(t._location.bucket,n);return new ks(t.storage,r)}/**
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
 */function eV(t){return/^[A-Za-z]+:\/\//.test(t)}function tV(t,e){return new ks(t,e)}function gI(t,e){if(t instanceof Pm){const n=t;if(n._bucket==null)throw sO();const r=new ks(n,n._bucket);return e!=null?gI(r,e):r}else return e!==void 0?ZO(t,e):t}function nV(t,e){if(e&&eV(e)){if(t instanceof Pm)return tV(t,e);throw Cf("To use ref(service, url), the first argument must be a Storage instance.")}else return gI(t,e)}function Nv(t,e){const n=e==null?void 0:e[eI];return n==null?null:Nt.makeFromBucketSpec(n,t)}function rV(t,e,n,r={}){t.host=`${e}:${n}`;const s=bs(e);s&&Cp(`https://${t.host}/b`),t._isUsingEmulator=!0,t._protocol=s?"https":"http";const{mockUserToken:i}=r;i&&(t._overrideAuthToken=typeof i=="string"?i:SE(i,t.app.options.projectId))}class Pm{constructor(e,n,r,s,i,o=!1){this.app=e,this._authProvider=n,this._appCheckProvider=r,this._url=s,this._firebaseVersion=i,this._isUsingEmulator=o,this._bucket=null,this._host=Zx,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=KD,this._maxUploadRetryTime=QD,this._requests=new Set,s!=null?this._bucket=Nt.makeFromBucketSpec(s,this._host):this._bucket=Nv(this._host,this.app.options)}get host(){return this._host}set host(e){this._host=e,this._url!=null?this._bucket=Nt.makeFromBucketSpec(this._url,e):this._bucket=Nv(e,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(e){bv("time",0,Number.POSITIVE_INFINITY,e),this._maxUploadRetryTime=e}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(e){bv("time",0,Number.POSITIVE_INFINITY,e),this._maxOperationRetryTime=e}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const e=this._authProvider.getImmediate({optional:!0});if(e){const n=await e.getToken();if(n!==null)return n.accessToken}return null}async _getAppCheckToken(){if(At(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=this._appCheckProvider.getImmediate({optional:!0});return e?(await e.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(e=>e.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(e){return new ks(this,e)}_makeRequest(e,n,r,s,i=!0){if(this._deleted)return new uO(sI());{const o=wO(e,this._appId,r,s,n,this._firebaseVersion,i,this._isUsingEmulator);return this._requests.add(o),o.getPromise().then(()=>this._requests.delete(o),()=>this._requests.delete(o)),o}}async makeRequestWithTokens(e,n){const[r,s]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(e,n,r,s).getPromise()}}const Dv="@firebase/storage",Ov="0.14.3";/**
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
 */const yI="storage";function sV(t,e,n){return t=ce(t),QO(t,e,n)}function iV(t,e,n){return t=ce(t),XO(t,e,n)}function _I(t){return t=ce(t),YO(t)}function oV(t){return t=ce(t),JO(t)}function Af(t,e){return t=ce(t),nV(t,e)}function aV(t=bp(),e){t=ce(t);const r=mc(t,yI).getImmediate({identifier:e}),s=TE("storage");return s&&lV(r,...s),r}function lV(t,e,n,r={}){rV(t,e,n,r)}function uV(t,{instanceIdentifier:e}){const n=t.getProvider("app").getImmediate(),r=t.getProvider("auth-internal"),s=t.getProvider("app-check-internal");return new Pm(n,r,s,e,Ps)}function cV(){Ts(new Vr(yI,uV,"PUBLIC").setMultipleInstances(!0)),_n(Dv,Ov,""),_n(Dv,Ov,"esm2020")}cV();const hV={apiKey:"AIzaSyDqVkAhkXALm3hLcrmzjiaS3flUezPFe2Q",authDomain:"barberia-elegance.firebaseapp.com",projectId:"barberia-elegance",storageBucket:"barberia-elegance.firebasestorage.app",messagingSenderId:"515311607907",appId:"1:515311607907:web:8add6005144015c5e85856"},Nm=i_().length?i_()[0]:AE(hV),xa=WD(Nm);N2(xa,$x).catch(()=>{});const Cs=ex(Nm),Rf=aV(Nm),dV={"barberiaelegance.synaptechspa.cl":"elegance","barberiaferraza.synaptechspa.cl":"ferraza","gitananails.synaptechspa.cl":"gitana"};function $c(){const e=new URL(window.location.href).searchParams.get("local");if(e)return sessionStorage.setItem("saas_current_tenant",e),e;const n=dV[window.location.hostname.toLowerCase()];return n||sessionStorage.getItem("saas_current_tenant")||"elegance"}function Ee(t){const e=$c();return e==="elegance"?xf(Cs,t):xf(Cs,`tenants/${e}/${t}`)}function Vv(t,e){return ze(Ee(t),e)}const Lv={elegance:{name:"𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐁𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩",accent:"emerald",emoji:"✂️"},ferraza:{name:"Barbería Ferraza",accent:"slate",emoji:"✂️"},gitana:{name:"Gitana Nails Studio",accent:"pink",emoji:"💅"}},vI=O.createContext(null);function fV({children:t}){const e=O.useMemo(()=>$c(),[]),n=Lv[e]??Lv.elegance;return d.jsx(vI.Provider,{value:{id:e,...n},children:t})}const wI=()=>O.useContext(vI),EI=O.createContext(null);function pV({children:t}){const[e,n]=O.useState(void 0),[r,s]=O.useState(null),[i,o]=O.useState(!0);return O.useEffect(()=>V2(xa,async u=>{if(!u){n(null),s(null),o(!1);return}n(u);try{const c=await mx(ze(Cs,"users",u.uid));s(c.exists()?c.data().rol:"cliente")}catch{s("cliente")}o(!1)}),[]),d.jsx(EI.Provider,{value:{user:e,role:r,loading:i},children:t})}const mV=()=>O.useContext(EI);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gV=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),TI=(...t)=>t.filter((e,n,r)=>!!e&&r.indexOf(e)===n).join(" ");/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var yV={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _V=O.forwardRef(({color:t="currentColor",size:e=24,strokeWidth:n=2,absoluteStrokeWidth:r,className:s="",children:i,iconNode:o,...l},u)=>O.createElement("svg",{ref:u,...yV,width:e,height:e,stroke:t,strokeWidth:r?Number(n)*24/Number(e):n,className:TI("lucide",s),...l},[...o.map(([c,f])=>O.createElement(c,f)),...Array.isArray(i)?i:[i]]));/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ae=(t,e)=>{const n=O.forwardRef(({className:r,...s},i)=>O.createElement(_V,{ref:i,iconNode:e,className:TI(`lucide-${gV(t)}`,r),...s}));return n.displayName=`${t}`,n};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xI=ae("BarChart3",[["path",{d:"M3 3v18h18",key:"1s2lah"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vV=ae("CalendarCheck",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"m9 16 2 2 4-4",key:"19s6y9"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wV=ae("CalendarDays",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const EV=ae("Calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const TV=ae("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const II=ae("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xV=ae("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const IV=ae("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const SV=ae("DollarSign",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kV=ae("Ellipsis",[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"19",cy:"12",r:"1",key:"1wjl8i"}],["circle",{cx:"5",cy:"12",r:"1",key:"1pcz8c"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const CV=ae("Gift",[["rect",{x:"3",y:"8",width:"18",height:"4",rx:"1",key:"bkv52"}],["path",{d:"M12 8v13",key:"1c76mn"}],["path",{d:"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7",key:"6wjy6b"}],["path",{d:"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5",key:"1ihvrl"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const SI=ae("ImageOff",[["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}],["path",{d:"M10.41 10.41a2 2 0 1 1-2.83-2.83",key:"1bzlo9"}],["line",{x1:"13.5",x2:"6",y1:"13.5",y2:"21",key:"1q0aeu"}],["line",{x1:"18",x2:"21",y1:"12",y2:"15",key:"5mozeu"}],["path",{d:"M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59",key:"mmje98"}],["path",{d:"M21 15V5a2 2 0 0 0-2-2H9",key:"43el77"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kI=ae("Images",[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18",key:"nf6bnh"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2",key:"12espp"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const AV=ae("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const RV=ae("Menu",[["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6",key:"1owob3"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18",key:"yk5zj1"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bV=ae("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dm=ae("Pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const PV=ae("Phone",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ki=ae("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const NV=ae("PowerOff",[["path",{d:"M18.36 6.64A9 9 0 0 1 20.77 15",key:"dxknvb"}],["path",{d:"M6.16 6.16a9 9 0 1 0 12.68 12.68",key:"1x7qb5"}],["path",{d:"M12 2v4",key:"3427ic"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const DV=ae("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const CI=ae("Scissors",[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const OV=ae("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const AI=ae("ShoppingBag",[["path",{d:"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z",key:"hou9p0"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M16 10a4 4 0 0 1-8 0",key:"1ltviw"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const VV=ae("Star",[["polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",key:"8f66p6"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const LV=ae("Tag",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qc=ae("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const MV=ae("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ia=ae("Trophy",[["path",{d:"M6 9H4.5a2.5 2.5 0 0 1 0-5H6",key:"17hqa7"}],["path",{d:"M18 9h1.5a2.5 2.5 0 0 0 0-5H18",key:"lmptdp"}],["path",{d:"M4 22h16",key:"57wxv0"}],["path",{d:"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",key:"1nw9bq"}],["path",{d:"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",key:"1np0yb"}],["path",{d:"M18 2H6v7a6 6 0 0 0 12 0V2Z",key:"u46fv3"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const RI=ae("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bI=ae("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jV=ae("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Om=ae("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]),UV=[{to:"agenda",label:"Agenda",Icon:wV},{to:"servicios",label:"Servicios",Icon:CI},{to:"equipo",label:"Equipo",Icon:jV},{to:"clientes",label:"Clientes",Icon:VV},{to:"premios",label:"Premios",Icon:Ia},{to:"productos",label:"Productos",Icon:AI},{to:"lookbook",label:"Lookbook",Icon:kI},{to:"metricas",label:"Métricas",Icon:xI}];function Mv({onClose:t}){const e=wI();return d.jsxs("aside",{className:"flex flex-col h-full bg-slate-900 border-r border-slate-800",children:[d.jsxs("div",{className:"px-5 pt-6 pb-5 border-b border-slate-800",children:[d.jsx("p",{className:"text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1",children:"Panel Admin"}),d.jsx("h1",{className:"text-sm font-bold text-white leading-tight",children:e.name})]}),d.jsx("nav",{className:"flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar",children:UV.map(({to:n,label:r,Icon:s})=>d.jsx(jC,{to:n,onClick:t,className:({isActive:i})=>`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${i?"bg-emerald-500/10 text-emerald-400":"text-slate-400 hover:text-white hover:bg-slate-800"}`,children:({isActive:i})=>d.jsxs(d.Fragment,{children:[d.jsx(s,{size:17,strokeWidth:i?2.5:2}),d.jsx("span",{className:"flex-1",children:r}),i&&d.jsx(II,{size:14,className:"text-emerald-500 opacity-60"})]})},n))}),d.jsx("div",{className:"px-3 py-4 border-t border-slate-800",children:d.jsxs("button",{onClick:()=>L2(xa),className:"flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all",children:[d.jsx(AV,{size:17}),"Cerrar sesión"]})})]})}function FV({children:t}){const[e,n]=O.useState(!1);return d.jsxs("div",{className:"flex h-screen bg-slate-950 overflow-hidden",children:[d.jsx("div",{className:"hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0",children:d.jsx(Mv,{})}),e&&d.jsxs("div",{className:"fixed inset-0 z-50 flex lg:hidden animate-fade-in",children:[d.jsx("div",{className:"absolute inset-0 bg-black/60 backdrop-blur-sm",onClick:()=>n(!1)}),d.jsx("div",{className:"relative z-10 w-64 flex flex-col animate-slide-in-right",children:d.jsx(Mv,{onClose:()=>n(!1)})})]}),d.jsxs("div",{className:"flex-1 flex flex-col min-w-0 overflow-hidden",children:[d.jsxs("header",{className:"lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0",children:[d.jsx("button",{onClick:()=>n(!0),className:"p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all",children:d.jsx(RV,{size:20})}),d.jsx("span",{className:"text-sm font-semibold text-white",children:"Panel Admin"})]}),d.jsx("main",{className:"flex-1 overflow-y-auto bg-slate-950 p-5 lg:p-7",children:t})]})]})}function In(t,e=[]){const[n,r]=O.useState([]),[s,i]=O.useState(!0),[o,l]=O.useState(null);return O.useEffect(()=>{const u=Ee(t),c=e.length?dm(u,...e):u;return Mc(c,p=>{r(p.docs.map(g=>({id:g.id,...g.data()}))),i(!1)},p=>{l(p),i(!1)})},[t]),{data:n,loading:s,error:o}}const nd={categoriasServicio:["Otro","Cortes","Combo","Barba","Extras"]};function zV(){const[t,e]=O.useState(nd),[n,r]=O.useState(!0);return O.useEffect(()=>{const i=Vv("configuracion","main");return Mc(i,l=>{e(l.exists()?{...nd,...l.data()}:nd),r(!1)},()=>r(!1))},[]),{config:t,loading:n,updateConfig:i=>gx(Vv("configuracion","main"),i,{merge:!0})}}function Hc({isOpen:t,onClose:e,title:n,subtitle:r,children:s,footer:i,maxWidth:o="max-w-md"}){return O.useEffect(()=>{if(!t)return;const l=u=>u.key==="Escape"&&e();return window.addEventListener("keydown",l),()=>window.removeEventListener("keydown",l)},[t,e]),t?d.jsxs("div",{className:"fixed inset-0 z-50 flex justify-end animate-fade-in",children:[d.jsx("div",{className:"absolute inset-0 bg-black/55 backdrop-blur-sm",onClick:e}),d.jsxs("div",{className:`relative z-10 w-full ${o} flex flex-col bg-slate-900 shadow-2xl border-l border-slate-800 animate-slide-in-right`,children:[d.jsxs("div",{className:"flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-slate-800 shrink-0",children:[d.jsxs("div",{children:[d.jsx("h2",{className:"text-base font-semibold text-white",children:n}),r&&d.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:r})]}),d.jsx("button",{onClick:e,className:"p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all shrink-0",children:d.jsx(Om,{size:18})})]}),d.jsx("div",{className:"flex-1 overflow-y-auto px-6 py-5 no-scrollbar",children:s}),i&&d.jsx("div",{className:"px-6 py-4 border-t border-slate-800 shrink-0",children:i})]})]}):null}const BV=["ph-scissors","ph-user-focus","ph-mask-happy","ph-magic-wand","ph-sparkle","ph-star","ph-crown","ph-fire","ph-drop","ph-wave","ph-lightning","ph-paint-brush","ph-gift","ph-eye","ph-smiley","ph-flower","ph-leaf","ph-diamond","ph-trophy","ph-confetti","ph-clock","ph-sun","ph-moon","ph-wind"],jv={nombre:"",categoria:"Otro",precio:"",duracion:"",icono:"ph-scissors"};function $V({value:t,onChange:e}){const[n,r]=O.useState(!1);return d.jsxs("div",{children:[d.jsxs("button",{type:"button",onClick:()=>r(s=>!s),className:"flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-slate-600 transition-colors",children:[d.jsx("i",{className:`ph ${t} text-base text-emerald-400`}),d.jsx("span",{children:"Elegir ícono"})]}),n&&d.jsx("div",{className:"mt-2 bg-slate-800 border border-slate-700 rounded-xl p-3 grid grid-cols-8 gap-1.5",children:BV.map(s=>d.jsx("button",{type:"button",title:s.replace("ph-",""),onClick:()=>{e(s),r(!1)},className:`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${t===s?"border-emerald-500 bg-emerald-500/10":"border-slate-600 hover:border-slate-400"}`,children:d.jsx("i",{className:`ph ${s} text-base ${t===s?"text-emerald-400":"text-slate-400"}`})},s))})]})}function qV(){const{data:t,loading:e}=In("servicios",[Ba("orden")]),{config:n,updateConfig:r}=zV(),s=n.categoriasServicio??["Otro"],[i,o]=O.useState(!1),[l,u]=O.useState(null),[c,f]=O.useState(jv),[p,g]=O.useState(!1),[w,S]=O.useState(""),[b,P]=O.useState(null),I=O.useRef(null),v=()=>{u(null),f({...jv,categoria:s[0]||"Otro"}),o(!0)},C=T=>{u(T.id),f({nombre:T.nombre,categoria:T.categoria||"Otro",precio:T.precio,duracion:T.duracion,icono:T.icono||"ph-scissors"}),o(!0)},D=async()=>{if(!(!c.nombre||!c.precio||!c.duracion)){g(!0);try{const T={nombre:c.nombre,categoria:c.categoria,precio:Number(c.precio),duracion:Number(c.duracion),icono:c.icono||"ph-scissors",updatedAt:qr()};l?await Un(ze(Ee("servicios"),l),T):await qa(Ee("servicios"),{...T,orden:t.length,createdAt:qr()}),o(!1)}finally{g(!1)}}},j=async T=>{confirm("¿Eliminar este servicio?")&&await $a(ze(Ee("servicios"),T))},L=async T=>{if(!I.current||I.current===T)return;const A=[...t],k=A.findIndex(Gt=>Gt.id===I.current),se=A.findIndex(Gt=>Gt.id===T);if(k===-1||se===-1)return;const[Ze]=A.splice(k,1);A.splice(se,0,Ze),I.current=null,P(null);const ln=_x(Cs);A.forEach((Gt,$)=>ln.update(ze(Ee("servicios"),Gt.id),{orden:$})),await ln.commit()},E=async()=>{const T=w.trim();T&&(s.map(A=>A.toLowerCase()).includes(T.toLowerCase())||(await r({categoriasServicio:[...s,T]}),S("")))},_=async T=>r({categoriasServicio:s.filter(A=>A!==T)}),x="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",R="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5";return d.jsxs("div",{className:"flex flex-col lg:flex-row gap-6 items-start",children:[d.jsxs("div",{className:"flex-1 min-w-0",children:[d.jsxs("div",{className:"flex items-center justify-between mb-4",children:[d.jsxs("div",{children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Servicios"}),d.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:"Arrastra para reordenar. El orden se guarda en Firestore."})]}),d.jsxs("button",{onClick:v,className:"flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors",children:[d.jsx(Ki,{size:16})," Nuevo servicio"]})]}),e?d.jsx("div",{className:"flex justify-center py-16",children:d.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):t.length===0?d.jsxs("div",{className:"flex flex-col items-center py-16 text-slate-600",children:[d.jsx(LV,{size:32,className:"mb-3"}),d.jsx("p",{className:"text-sm",children:"No hay servicios creados."})]}):d.jsx("div",{className:"space-y-2",children:t.map(T=>d.jsxs("div",{draggable:!0,onDragStart:()=>{I.current=T.id},onDragEnd:()=>{I.current=null,P(null)},onDragOver:A=>{A.preventDefault(),P(T.id)},onDragLeave:()=>P(null),onDrop:()=>L(T.id),className:`flex items-center gap-4 bg-slate-900 border rounded-xl p-4 transition-all cursor-grab active:cursor-grabbing select-none ${b===T.id?"border-emerald-500 bg-emerald-500/5":"border-slate-800 hover:border-slate-700"}`,children:[d.jsxs("svg",{className:"text-slate-600 shrink-0",width:"12",height:"18",viewBox:"0 0 12 18",fill:"currentColor",children:[d.jsx("circle",{cx:"3",cy:"3",r:"1.5"}),d.jsx("circle",{cx:"9",cy:"3",r:"1.5"}),d.jsx("circle",{cx:"3",cy:"9",r:"1.5"}),d.jsx("circle",{cx:"9",cy:"9",r:"1.5"}),d.jsx("circle",{cx:"3",cy:"15",r:"1.5"}),d.jsx("circle",{cx:"9",cy:"15",r:"1.5"})]}),d.jsx("div",{className:"w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0",children:d.jsx("i",{className:`ph ${T.icono||"ph-scissors"} text-base text-emerald-400`})}),d.jsxs("div",{className:"flex-1 min-w-0",children:[d.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[d.jsx("h4",{className:"font-bold text-white text-sm",children:T.nombre}),d.jsx("span",{className:"text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-950 text-slate-400 border-slate-700",children:T.categoria||"Otro"})]}),d.jsxs("p",{className:"text-xs text-slate-400 mt-0.5",children:["$",Number(T.precio||0).toLocaleString("es-CL")," · ",T.duracion," min"]})]}),d.jsxs("div",{className:"flex items-center gap-2 shrink-0",children:[d.jsx("button",{onClick:()=>C(T),className:"p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-colors",children:d.jsx("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:d.jsx("path",{d:"M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"})})}),d.jsx("button",{onClick:()=>j(T.id),className:"p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors",children:d.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[d.jsx("polyline",{points:"3,6 5,6 21,6"}),d.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"})]})})]})]},T.id))})]}),d.jsx("div",{className:"w-full lg:w-60 shrink-0",children:d.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-4",children:[d.jsx("h2",{className:"text-sm font-semibold text-white mb-3",children:"Categorías"}),d.jsx("div",{className:"space-y-1.5 mb-3",children:s.map(T=>d.jsxs("div",{className:"flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2",children:[d.jsx("span",{className:"text-xs text-white",children:T}),d.jsx("button",{onClick:()=>_(T),className:"text-slate-600 hover:text-red-400 transition-colors p-0.5 rounded",children:d.jsxs("svg",{width:"11",height:"11",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:[d.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),d.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]})})]},T))}),d.jsxs("div",{className:"flex gap-1.5",children:[d.jsx("input",{className:"flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",placeholder:"Nueva categoría...",value:w,onChange:T=>S(T.target.value),onKeyDown:T=>T.key==="Enter"&&E()}),d.jsx("button",{onClick:E,className:"px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors",children:"+"})]})]})}),d.jsx(Hc,{isOpen:i,onClose:()=>o(!1),title:l?"Editar servicio":"Nuevo servicio",footer:d.jsxs("div",{className:"flex gap-3 justify-end",children:[d.jsx("button",{onClick:()=>o(!1),className:"px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),d.jsxs("button",{onClick:D,disabled:p||!c.nombre||!c.precio||!c.duracion,className:"px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2",children:[p&&d.jsx("span",{className:"w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"}),l?"Guardar":"Crear servicio"]})]}),children:d.jsxs("div",{className:"space-y-4",children:[d.jsxs("div",{children:[d.jsx("label",{className:R,children:"Nombre del servicio"}),d.jsx("input",{className:x,placeholder:"Corte clásico",value:c.nombre,onChange:T=>f(A=>({...A,nombre:T.target.value}))})]}),d.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[d.jsxs("div",{children:[d.jsx("label",{className:R,children:"Precio ($)"}),d.jsx("input",{className:x,type:"number",placeholder:"12000",value:c.precio,onChange:T=>f(A=>({...A,precio:T.target.value}))})]}),d.jsxs("div",{children:[d.jsx("label",{className:R,children:"Duración (min)"}),d.jsx("input",{className:x,type:"number",placeholder:"45",value:c.duracion,onChange:T=>f(A=>({...A,duracion:T.target.value}))})]})]}),d.jsxs("div",{children:[d.jsx("label",{className:R,children:"Categoría"}),d.jsx("select",{className:x,value:c.categoria,onChange:T=>f(A=>({...A,categoria:T.target.value})),children:s.map(T=>d.jsx("option",{value:T,children:T},T))})]}),d.jsxs("div",{children:[d.jsx("label",{className:R,children:"Ícono"}),d.jsx($V,{value:c.icono,onChange:T=>f(A=>({...A,icono:T}))})]})]})})]})}const Vm=8,HV=20,Sa=30,Uv=(HV-Vm)*(60/Sa);function WV(t){return t.toISOString().split("T")[0]}function GV(t){const[e,n]=t.split(":").map(Number);return(e-Vm)*(60/Sa)+Math.floor(n/Sa)}function KV(t){return Math.max(1,Math.round(t/Sa))}const Fv={Confirmada:"bg-emerald-500/20 border-emerald-500/40 text-emerald-300",Cancelada:"bg-red-500/10     border-red-500/30     text-red-400",Completada:"bg-blue-500/10    border-blue-500/30    text-blue-400"};function QV({cita:t}){const e=GV(t.hora),n=KV(t.duracion||30),r=Fv[t.estado]??Fv.Confirmada;return d.jsxs("div",{title:`${t.servicioNombre} · ${t.clienteNombre}`,className:`absolute inset-x-0.5 rounded-md border px-2 py-1 overflow-hidden cursor-pointer hover:brightness-110 transition-all text-xs ${r}`,style:{top:`${e*40}px`,height:`${n*40-4}px`},children:[d.jsx("p",{className:"font-semibold truncate leading-tight",children:t.clienteNombre||"Cliente"}),d.jsx("p",{className:"truncate text-[10px] opacity-75",children:t.servicioNombre})]})}function XV(){const[t,e]=O.useState(new Date),n=WV(t),{data:r}=In("barberos"),{data:s}=In("citas",[fm("fecha","==",n)]),i=O.useMemo(()=>r.filter(u=>u.disponible!==!1),[r]),o=u=>{const c=new Date(t);c.setDate(c.getDate()+u),e(c)},l=Array.from({length:Uv},(u,c)=>{const f=c*Sa,p=Vm+Math.floor(f/60),g=f%60;return`${String(p).padStart(2,"0")}:${String(g).padStart(2,"0")}`});return d.jsxs("div",{className:"flex flex-col h-full gap-4",children:[d.jsxs("div",{className:"flex items-center justify-between shrink-0",children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Agenda"}),d.jsxs("div",{className:"flex items-center gap-2",children:[d.jsx("button",{onClick:()=>o(-1),className:"p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all",children:d.jsx(TV,{size:18})}),d.jsx("span",{className:"text-sm font-semibold text-white min-w-[130px] text-center capitalize",children:t.toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"})}),d.jsx("button",{onClick:()=>o(1),className:"p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all",children:d.jsx(II,{size:18})}),d.jsx("button",{onClick:()=>e(new Date),className:"ml-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all",children:"Hoy"})]})]}),d.jsx("div",{className:"flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-auto no-scrollbar",children:d.jsxs("div",{className:"flex min-w-max",children:[d.jsxs("div",{className:"w-16 shrink-0 sticky left-0 bg-slate-900 z-10 border-r border-slate-800",children:[d.jsx("div",{className:"h-10 border-b border-slate-800"})," ",l.map((u,c)=>d.jsx("div",{className:"h-10 flex items-center justify-end pr-3 text-[10px] font-mono text-slate-600 border-b border-slate-800/60",children:u.endsWith(":00")?u:""},c))]}),i.length===0?d.jsx("div",{className:"flex-1 flex items-center justify-center py-20 text-slate-600 text-sm",children:"Sin barberos activos"}):i.map(u=>{var f;const c=s.filter(p=>p.barberoId===u.id||p.barbero===u.nombre);return d.jsxs("div",{className:"flex-1 min-w-[160px] border-r border-slate-800 last:border-r-0",children:[d.jsxs("div",{className:"h-10 px-3 flex items-center gap-2 border-b border-slate-800 sticky top-0 bg-slate-900 z-10",children:[d.jsx("div",{className:"w-6 h-6 rounded-full overflow-hidden bg-emerald-500/20 flex items-center justify-center shrink-0",children:u.foto?d.jsx("img",{src:u.foto,alt:u.nombre,className:"w-full h-full object-cover"}):d.jsx("span",{className:"text-[10px] font-bold text-emerald-400",children:((f=u.nombre)==null?void 0:f[0])??"?"})}),d.jsx("span",{className:"text-xs font-semibold text-white truncate",children:u.nombre})]}),d.jsxs("div",{className:"relative",style:{height:`${Uv*40}px`},children:[l.map((p,g)=>d.jsx("div",{className:`absolute inset-x-0 h-10 border-b border-slate-800/40 ${g%2===0?"":"bg-slate-800/10"}`,style:{top:`${g*40}px`}},g)),c.map(p=>d.jsx(QV,{cita:p},p.id))]})]},u.id)})]})})]})}const YV="modulepreload",JV=function(t){return"/gestion-interna/"+t},zv={},PI=function(e,n,r){let s=Promise.resolve();if(n&&n.length>0){document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),l=(o==null?void 0:o.nonce)||(o==null?void 0:o.getAttribute("nonce"));s=Promise.allSettled(n.map(u=>{if(u=JV(u),u in zv)return;zv[u]=!0;const c=u.endsWith(".css"),f=c?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${u}"]${f}`))return;const p=document.createElement("link");if(p.rel=c?"stylesheet":YV,c||(p.as="script"),p.crossOrigin="",p.href=u,l&&p.setAttribute("nonce",l),document.head.appendChild(p),c)return new Promise((g,w)=>{p.addEventListener("load",g),p.addEventListener("error",()=>w(new Error(`Unable to preload CSS for ${u}`)))})}))}function i(o){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=o,window.dispatchEvent(l),!l.defaultPrevented)throw o}return s.then(o=>{for(const l of o||[])l.status==="rejected"&&i(l.reason);return e().catch(i)})},Bv={active:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20",inactive:"bg-slate-700/50   text-slate-400   border-slate-600/30",pending:"bg-amber-500/10   text-amber-400   border-amber-500/20",cancelled:"bg-red-500/10     text-red-400     border-red-500/20",completed:"bg-blue-500/10    text-blue-400    border-blue-500/20",admin:"bg-purple-500/10  text-purple-400  border-purple-500/20"};function ZV({variant:t="active",children:e,className:n=""}){return d.jsx("span",{className:`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${Bv[t]??Bv.active} ${n}`,children:e})}function eL({items:t,align:e="right"}){const[n,r]=O.useState(!1),s=O.useRef(null);return O.useEffect(()=>{if(!n)return;const i=o=>{var l;(l=s.current)!=null&&l.contains(o.target)||r(!1)};return document.addEventListener("mousedown",i),()=>document.removeEventListener("mousedown",i)},[n]),d.jsxs("div",{ref:s,className:"relative",children:[d.jsx("button",{onClick:i=>{i.stopPropagation(),r(o=>!o)},className:"p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-all",children:d.jsx(kV,{size:16})}),n&&d.jsx("div",{className:`absolute z-30 mt-1 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fade-in ${e==="right"?"right-0":"left-0"}`,children:t.map((i,o)=>i==="separator"?d.jsx("div",{className:"h-px bg-slate-700 my-1"},o):d.jsxs("button",{onClick:l=>{var u;l.stopPropagation(),r(!1),(u=i.onClick)==null||u.call(i)},className:`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left transition-colors ${i.danger?"text-red-400 hover:bg-red-950/40":"text-slate-300 hover:text-white hover:bg-slate-700"}`,children:[i.Icon&&d.jsx(i.Icon,{size:15}),i.label]},o))})]})}function tL({barber:t,onEdit:e}){const n=t.disponible!==!1,r=Ee("barberos").path,o=[{label:"Editar datos",Icon:Dm,onClick:()=>e(t)},{label:"Configurar horario",Icon:IV,onClick:()=>{}},"separator",{label:n?"Desactivar":"Activar",Icon:NV,onClick:()=>Un(ze(Cs,`${r}/${t.id}`),{disponible:!n})},{label:"Eliminar",Icon:qc,onClick:async()=>{if(!confirm(`¿Eliminar a ${t.nombre}?`))return;const{deleteDoc:l}=await PI(async()=>{const{deleteDoc:u}=await Promise.resolve().then(()=>vx);return{deleteDoc:u}},void 0);await l(ze(Cs,`${r}/${t.id}`))},danger:!0}];return d.jsxs("div",{className:"relative bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center gap-3 hover:border-slate-700 transition-all group",children:[d.jsx("div",{className:"absolute top-3 right-3",children:d.jsx(eL,{items:o})}),d.jsx("div",{className:"w-20 h-20 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0",children:t.foto?d.jsx("img",{src:t.foto,alt:t.nombre,className:"w-full h-full object-cover"}):d.jsx("div",{className:"w-full h-full flex items-center justify-center text-2xl font-bold text-slate-600",children:d.jsx(bI,{size:32})})}),d.jsxs("div",{className:"text-center",children:[d.jsx("p",{className:"font-semibold text-white text-sm",children:t.nombre}),t.especialidad&&d.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:t.especialidad}),d.jsx("div",{className:"mt-2",children:d.jsx(ZV,{variant:n?"active":"inactive",children:n?"Activo":"Inactivo"})})]}),d.jsxs("button",{className:"mt-1 flex items-center gap-1.5 w-full justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-all border border-slate-700",children:[d.jsx(EV,{size:13})," Ver Agenda"]})]})}const $v={nombre:"",especialidad:""};function nL(){const{data:t,loading:e}=In("barberos"),[n,r]=O.useState(!1),[s,i]=O.useState(null),[o,l]=O.useState($v),u=w=>{i(w),l({nombre:w.nombre,especialidad:w.especialidad||""}),r(!0)},c=()=>{i(null),l($v),r(!0)},f=async()=>{const w=Ee("barberos").path;if(s)await Un(ze(Cs,`${w}/${s.id}`),o);else{const{addDoc:S,serverTimestamp:b}=await PI(async()=>{const{addDoc:P,serverTimestamp:I}=await Promise.resolve().then(()=>vx);return{addDoc:P,serverTimestamp:I}},void 0);await S(Ee("barberos"),{...o,disponible:!0,createdAt:b()})}r(!1)},p="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",g="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5";return d.jsxs("div",{children:[d.jsxs("div",{className:"flex items-center justify-between mb-6",children:[d.jsxs("div",{children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Equipo"}),d.jsxs("p",{className:"text-sm text-slate-500 mt-0.5",children:[t.length," miembros"]})]}),d.jsxs("button",{onClick:c,className:"flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors",children:[d.jsx(Ki,{size:16})," Agregar"]})]}),e?d.jsx("div",{className:"flex justify-center py-20",children:d.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):d.jsx("div",{className:"grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",children:t.map(w=>d.jsx(tL,{barber:w,onEdit:u},w.id))}),d.jsx(Hc,{isOpen:n,onClose:()=>r(!1),title:s?"Editar barbero":"Nuevo barbero",footer:d.jsxs("div",{className:"flex gap-3 justify-end",children:[d.jsx("button",{onClick:()=>r(!1),className:"px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),d.jsx("button",{onClick:f,className:"px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all",children:s?"Guardar":"Crear"})]}),children:d.jsxs("div",{className:"space-y-4",children:[d.jsxs("div",{children:[d.jsx("label",{className:g,children:"Nombre"}),d.jsx("input",{className:p,placeholder:"Nicolás Fabián",value:o.nombre,onChange:w=>l(S=>({...S,nombre:w.target.value}))})]}),d.jsxs("div",{children:[d.jsx("label",{className:g,children:"Especialidad"}),d.jsx("input",{className:p,placeholder:"Cortes y barba clásica",value:o.especialidad,onChange:w=>l(S=>({...S,especialidad:w.target.value}))})]})]})})]})}function NI(t=""){return t.trim().split(/\s+/).map(e=>{var n;return(n=e[0])==null?void 0:n.toUpperCase()}).slice(0,2).join("")}function qv(t){return t?new Date(t).toLocaleDateString("es-CL",{day:"numeric",month:"short",year:"numeric"}):"—"}function rL({stamps:t,premios:e}){const n=e.length?Math.max(...e.map(i=>i.costoSellos)):10,r=Math.max(n,t,10),s=r<=10?10:r<=15?15:20;return d.jsx("div",{className:"grid gap-1",style:{gridTemplateColumns:`repeat(${s}, minmax(0, 1fr))`},children:Array.from({length:r},(i,o)=>{const l=o+1,u=l<=t,c=e.some(f=>f.costoSellos===l);return d.jsxs("div",{className:`relative aspect-square rounded-md border flex items-center justify-center text-[9px] font-bold ${u?"bg-emerald-500/15 border-emerald-500/40 text-emerald-400":"bg-white/3 border-white/8 text-slate-600"}`,children:[u?d.jsx("i",{className:"ph-fill ph-scissors text-[9px]"}):l,c&&d.jsx("span",{className:"absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-400 border border-slate-950"})]},l)})})}function sL({cliente:t,premios:e,onClose:n}){var T;const[r,s]=O.useState(t),[i,o]=O.useState([]),[l,u]=O.useState(null),[c,f]=O.useState(!1),[p,g]=O.useState(""),[w,S]=O.useState(!1);O.useEffect(()=>{const A=ze(Ee("users"),t.uid);return Mc(A,se=>{se.exists()&&(s({uid:se.id,...se.data()}),u(null))})},[t.uid]),O.useEffect(()=>{t.email&&zu(dm(Ee("citas"),fm("clienteEmail","==",t.email),dx(10))).then(A=>{const k=A.docs.map(se=>({id:se.id,...se.data()}));k.sort((se,Ze)=>(Ze.fecha||"").localeCompare(se.fecha||"")||(Ze.hora||"").localeCompare(se.hora||"")),o(k)}).catch(()=>{})},[t.uid,t.email]);const b=r.stamps||0,P=[...e].sort((A,k)=>A.costoSellos-k.costoSellos),I=P.find(A=>b<A.costoSellos),v=P.length?P[P.length-1].costoSellos:10,C=I?I.costoSellos:v,D=Math.min(b/Math.max(C,1)*100,100),j=(r.telefono||"").replace(/\D/g,""),L=j.length>=8?`https://wa.me/${j.startsWith("56")?j:"56"+j}`:null,E=async A=>{f(!0);try{await Un(ze(Ee("users"),r.uid),{stamps:Jl(A),...A>0?{ultimoSello:new Date().toISOString()}:{},historialSellos:Yl({fecha:new Date().toISOString(),tipo:A>0?"suma":"resta",cantidad:A,nota:A>0?"Sello añadido manualmente":"Sello quitado manualmente"})})}finally{f(!1)}},_=async()=>{if(!l){g("Selecciona un premio primero.");return}if(b<l.costoSellos){g("Sellos insuficientes.");return}f(!0);try{await Un(ze(Ee("users"),r.uid),{stamps:Jl(-l.costoSellos),historialSellos:Yl({fecha:new Date().toISOString(),tipo:"canje",cantidad:-l.costoSellos,nota:l.nombre})}),g(`✓ ${l.nombre} canjeado`)}catch(A){g(A.message)}finally{f(!1)}},x=async()=>{if(!b){S(!1);return}f(!0);try{await Un(ze(Ee("users"),r.uid),{stamps:Jl(-b),historialSellos:Yl({fecha:new Date().toISOString(),tipo:"resta",cantidad:-b,nota:"Reset manual por admin"})})}finally{f(!1),S(!1)}},R=[...r.historialSellos||[]].sort((A,k)=>new Date(k.fecha)-new Date(A.fecha)).slice(0,20);return d.jsxs("div",{className:"space-y-6",children:[d.jsxs("div",{className:"flex items-start gap-4",children:[d.jsx("div",{className:"w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0",children:r.photoURL?d.jsx("img",{src:r.photoURL,alt:"",className:"w-full h-full object-cover"}):d.jsx("span",{className:"text-sm font-bold text-slate-400",children:NI(r.nombre||r.email||"?")})}),d.jsxs("div",{className:"flex-1 min-w-0",children:[d.jsx("p",{className:"font-semibold text-white",children:r.nombre||"—"}),d.jsx("p",{className:"text-xs text-slate-500 truncate",children:r.email}),r.telefono&&d.jsxs("div",{className:"flex items-center gap-2 mt-1",children:[d.jsx("p",{className:"text-xs text-slate-400",children:r.telefono}),L&&d.jsx("a",{href:L,target:"_blank",rel:"noreferrer",className:"text-[10px] font-bold text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md hover:bg-emerald-500/10 transition-colors",children:"WhatsApp ↗"})]}),d.jsxs("p",{className:"text-[10px] text-slate-600 mt-1",children:["Miembro desde ",qv((T=r.creadoEn)!=null&&T.toDate?r.creadoEn.toDate().toISOString():r.creadoEn)]})]})]}),d.jsxs("div",{className:"bg-slate-950 border border-slate-800 rounded-xl p-4",children:[d.jsxs("div",{className:"flex items-end gap-1 mb-1",children:[d.jsx("span",{className:"text-4xl font-black text-emerald-400 leading-none",children:b}),d.jsxs("span",{className:"text-lg font-bold text-slate-600 mb-0.5",children:["/",C]})]}),d.jsx("p",{className:"text-[10px] text-slate-500 mb-2",children:I?`${C-b} sello${C-b!==1?"s":""} para: ${I.nombre}`:b>0?"¡Premios disponibles!":"Sin sellos aún"}),d.jsx("div",{className:"w-full bg-white/5 rounded-full h-1.5 overflow-hidden mb-4",children:d.jsx("div",{className:"h-1.5 rounded-full bg-emerald-500 transition-all",style:{width:`${D}%`}})}),d.jsx(rL,{stamps:b,premios:e}),d.jsxs("div",{className:"flex gap-2 mt-4",children:[d.jsxs("button",{onClick:()=>E(-1),disabled:c||b<=0,className:"flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all",children:[d.jsx(bV,{size:13})," Quitar sello"]}),d.jsxs("button",{onClick:()=>E(1),disabled:c,className:"flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all",children:[d.jsx(Ki,{size:13})," Añadir sello"]})]})]}),e.length>0&&d.jsxs("div",{children:[d.jsx("p",{className:"text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2",children:"Canjear premio"}),d.jsx("div",{className:"space-y-1.5 mb-3",children:e.map(A=>{const k=b>=A.costoSellos,se=(l==null?void 0:l.id)===A.id;return d.jsxs("button",{disabled:!k,onClick:()=>u(se?null:A),className:`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left ${se?"border-yellow-400/60 bg-yellow-400/10 text-white":k?"border-slate-700 hover:border-slate-500 bg-slate-800/40 text-white":"border-slate-800/40 bg-transparent text-slate-600 cursor-not-allowed opacity-50"}`,children:[d.jsx(Ia,{size:14,className:k?"text-yellow-400":"text-slate-600"}),d.jsx("span",{className:"flex-1",children:A.nombre}),d.jsxs("span",{className:`text-xs font-bold ${k?"text-yellow-400":"text-slate-600"}`,children:[A.costoSellos," ✂"]})]},A.id)})}),p&&d.jsx("p",{className:`text-xs text-center font-bold mb-2 ${p.startsWith("✓")?"text-emerald-400":"text-red-400"}`,children:p}),d.jsxs("button",{onClick:_,disabled:c||!l,className:"w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 disabled:opacity-40 border border-yellow-500/30 text-yellow-400 text-sm font-semibold rounded-lg transition-all",children:[d.jsx(CV,{size:15})," Canjear premio"]})]}),R.length>0&&d.jsxs("div",{children:[d.jsx("p",{className:"text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2",children:"Historial de sellos"}),d.jsx("div",{className:"space-y-px max-h-44 overflow-y-auto",children:R.map((A,k)=>{const se=A.tipo==="suma"?"ph-plus-circle":A.tipo==="canje"?"ph-gift":"ph-minus-circle",Ze=A.tipo==="suma"?"text-emerald-400":A.tipo==="canje"?"text-yellow-400":"text-red-400",ln=A.tipo==="suma"?`+${A.cantidad} sello`:A.tipo==="canje"?`Canje: ${A.nota}`:`${A.cantidad} sello`;return d.jsxs("div",{className:"flex items-start gap-2 py-1.5 border-b border-white/4 last:border-0",children:[d.jsx("i",{className:`ph-fill ${se} ${Ze} text-sm shrink-0 mt-0.5`}),d.jsxs("div",{className:"flex-1 min-w-0",children:[d.jsx("p",{className:"text-xs font-semibold text-white truncate",children:ln}),d.jsx("p",{className:"text-[10px] text-slate-600",children:qv(A.fecha)})]})]},k)})})]}),i.length>0&&d.jsxs("div",{children:[d.jsx("p",{className:"text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2",children:"Citas recientes"}),d.jsx("div",{className:"space-y-1.5",children:i.map(A=>{const k=A.estado==="Completada"?"text-emerald-400":A.estado==="Cancelada"?"text-red-400":"text-yellow-400";return d.jsxs("div",{className:"flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5",children:[d.jsxs("div",{className:"flex-1 min-w-0",children:[d.jsx("p",{className:"text-xs font-semibold text-white truncate",children:A.servicioNombre||"—"}),d.jsxs("p",{className:"text-[10px] text-slate-500 mt-0.5",children:[A.fecha," · ",A.hora," · ",A.barbero||"—"]})]}),d.jsx("span",{className:`text-[10px] font-bold ${k} shrink-0`,children:A.estado})]},A.id)})})]}),d.jsx("div",{className:"pt-2 border-t border-slate-800",children:w?d.jsxs("div",{className:"flex items-center gap-2",children:[d.jsxs("p",{className:"text-xs text-red-400 flex-1",children:["¿Resetear ",b," sellos a 0?"]}),d.jsx("button",{onClick:()=>S(!1),className:"px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),d.jsx("button",{onClick:x,disabled:c,className:"px-3 py-1.5 text-xs font-bold text-red-400 hover:text-white rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all",children:"Confirmar"})]}):d.jsxs("button",{onClick:()=>S(!0),disabled:!b,className:"flex items-center gap-2 text-xs text-slate-600 hover:text-red-400 disabled:opacity-30 transition-colors",children:[d.jsx(DV,{size:13})," Resetear todos los sellos"]})})]})}function iL(){const{data:t,loading:e}=In("users"),{data:n}=In("premios",[Ba("costoSellos")]),[r,s]=O.useState(""),[i,o]=O.useState(null),l=O.useMemo(()=>[...t].sort((g,w)=>(w.stamps||0)-(g.stamps||0)||(g.nombre||"").localeCompare(w.nombre||"")),[t]),u=O.useMemo(()=>{const g=r.toLowerCase();return g?l.filter(w=>{var S,b,P;return((S=w.nombre)==null?void 0:S.toLowerCase().includes(g))||((b=w.email)==null?void 0:b.toLowerCase().includes(g))||((P=w.telefono)==null?void 0:P.includes(g))}):l},[l,r]),c=t.length,f=c?(t.reduce((g,w)=>g+(w.stamps||0),0)/c).toFixed(1):0,p=n.length?t.filter(g=>{var w;return(g.stamps||0)>=((w=n[0])==null?void 0:w.costoSellos)}).length:t.filter(g=>(g.stamps||0)>=5).length;return d.jsxs("div",{className:"max-w-4xl mx-auto",children:[d.jsxs("div",{className:"mb-6",children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Clientes y Fidelización"}),d.jsx("p",{className:"text-sm text-slate-500 mt-0.5",children:"Gestiona sellos y premios de cada cliente."})]}),d.jsx("div",{className:"grid grid-cols-3 gap-3 mb-5",children:[{label:"Clientes",value:c,color:"text-white"},{label:"Avg Sellos",value:f,color:"text-emerald-400"},{label:"Con premios",value:p,color:"text-yellow-400"}].map(({label:g,value:w,color:S})=>d.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center",children:[d.jsx("p",{className:`text-2xl font-black ${S}`,children:w}),d.jsx("p",{className:"text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5",children:g})]},g))}),d.jsxs("div",{className:"relative mb-4",children:[d.jsx(OV,{size:15,className:"absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"}),d.jsx("input",{placeholder:"Buscar por nombre, correo o teléfono…",value:r,onChange:g=>s(g.target.value),className:"w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-600 transition-colors"}),r&&d.jsx("button",{onClick:()=>s(""),className:"absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white",children:d.jsx(Om,{size:14})})]}),d.jsx("div",{className:"bg-slate-900 border border-slate-800 rounded-xl overflow-hidden",children:e?d.jsx("div",{className:"flex justify-center py-16",children:d.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):u.length===0?d.jsxs("div",{className:"flex flex-col items-center py-16 text-slate-600",children:[d.jsx(bI,{size:28,className:"mb-3"}),d.jsx("p",{className:"text-sm",children:"Sin clientes"})]}):d.jsx("div",{className:"divide-y divide-slate-800/60",children:u.map(g=>{var v;const w=g.stamps||0,S=n.length?(v=n[n.length-1])==null?void 0:v.costoSellos:10,b=Math.min(w/Math.max(S,1)*100,100),P=w>=(S||10)?"text-yellow-400 border-yellow-400/40 bg-yellow-400/10":w>=5?"text-emerald-400 border-emerald-500/40 bg-emerald-500/10":"text-slate-500 border-slate-700",I=n.some(C=>w>=C.costoSellos);return d.jsxs("div",{onClick:()=>o(g),className:"grid grid-cols-12 items-center px-5 py-4 hover:bg-white/2 transition-colors cursor-pointer group",children:[d.jsxs("div",{className:"col-span-5 flex items-center gap-3 min-w-0",children:[d.jsx("div",{className:"w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0",children:g.photoURL?d.jsx("img",{src:g.photoURL,alt:"",className:"w-full h-full object-cover"}):d.jsx("span",{className:"text-xs font-bold text-slate-400",children:NI(g.nombre||g.email||"?")})}),d.jsxs("div",{className:"min-w-0",children:[d.jsx("p",{className:"font-semibold text-white text-sm truncate group-hover:text-emerald-400 transition-colors",children:g.nombre||"—"}),d.jsx("p",{className:"text-xs text-slate-500 truncate",children:g.email})]})]}),d.jsx("div",{className:"col-span-3 hidden sm:block",children:d.jsxs("p",{className:"text-xs text-slate-500 truncate flex items-center gap-1",children:[d.jsx(PV,{size:10})," ",g.telefono||"—"]})}),d.jsxs("div",{className:"col-span-5 sm:col-span-3",children:[d.jsxs("div",{className:"flex items-center gap-1.5 mb-1",children:[d.jsxs("span",{className:`text-xs font-bold px-2 py-0.5 rounded-full border ${P}`,children:[w," sellos"]}),I&&d.jsx(Ia,{size:11,className:"text-yellow-400"})]}),d.jsx("div",{className:"w-full bg-white/5 rounded-full h-1",children:d.jsx("div",{className:"h-1 rounded-full bg-emerald-500 transition-all",style:{width:`${b}%`}})})]}),d.jsx("div",{className:"col-span-2 sm:col-span-1 flex justify-end",children:d.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",className:"text-slate-600 group-hover:text-emerald-400 transition-colors",children:d.jsx("polyline",{points:"9 18 15 12 9 6"})})})]},g.uid||g.id)})})}),d.jsx(Hc,{isOpen:!!i,onClose:()=>o(null),title:(i==null?void 0:i.nombre)||"Cliente",subtitle:i==null?void 0:i.email,maxWidth:"max-w-lg",children:i&&d.jsx(sL,{cliente:{uid:i.uid||i.id,...i},premios:n,onClose:()=>o(null)},i.uid||i.id)})]})}function Nl({title:t,subtitle:e}){return d.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3",children:[d.jsxs("div",{children:[d.jsx("p",{className:"text-sm font-semibold text-white",children:t}),e&&d.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:e})]}),d.jsxs("div",{className:"flex-1 min-h-[160px] flex flex-col items-center justify-center gap-2 border border-dashed border-slate-700 rounded-lg",children:[d.jsx(xI,{size:28,className:"text-slate-700"}),d.jsx("p",{className:"text-xs text-slate-600 font-medium",children:"Integra Recharts aquí"})]})]})}function Dl({Icon:t,label:e,value:n,sub:r,color:s="emerald"}){const i={emerald:"bg-emerald-500/10 text-emerald-400",blue:"bg-blue-500/10    text-blue-400",red:"bg-red-500/10     text-red-400",amber:"bg-amber-500/10   text-amber-400"};return d.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4",children:[d.jsx("div",{className:`p-2.5 rounded-lg ${i[s]}`,children:d.jsx(t,{size:20})}),d.jsxs("div",{children:[d.jsx("p",{className:"text-xs font-semibold text-slate-500 uppercase tracking-wide",children:e}),d.jsx("p",{className:"text-2xl font-bold text-white mt-0.5",children:n}),r&&d.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:r})]})]})}function oL(){const{data:t}=In("citas"),e=O.useMemo(()=>{const n=new Date().toISOString().slice(0,7),r=t.filter(u=>{var c;return(c=u.fecha)==null?void 0:c.startsWith(n)}),s=r.filter(u=>u.estado==="Completada"),i=r.filter(u=>u.estado==="Cancelada"),o=s.reduce((u,c)=>u+(c.precio||0),0),l=s.length?o/s.length:0;return{total:r.length,completadas:s.length,canceladas:i.length,ingresos:o,ticket:l}},[t]);return d.jsxs("div",{className:"max-w-5xl mx-auto",children:[d.jsxs("div",{className:"mb-6",children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Métricas"}),d.jsx("p",{className:"text-sm text-slate-500 mt-0.5",children:new Date().toLocaleDateString("es-CL",{month:"long",year:"numeric"})})]}),d.jsxs("div",{className:"grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6",children:[d.jsx(Dl,{Icon:SV,label:"Ingresos",value:`$${e.ingresos.toLocaleString("es-CL")}`,sub:"Citas completadas",color:"emerald"}),d.jsx(Dl,{Icon:vV,label:"Citas",value:e.completadas,sub:`${e.total} agendadas`,color:"blue"}),d.jsx(Dl,{Icon:MV,label:"Ticket prom.",value:`$${Math.round(e.ticket).toLocaleString("es-CL")}`,sub:"Por servicio",color:"amber"}),d.jsx(Dl,{Icon:xV,label:"Cancelaciones",value:e.canceladas,sub:e.total?`${Math.round(e.canceladas/e.total*100)}% del total`:"—",color:"red"})]}),d.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-4",children:[d.jsx(Nl,{title:"Ingresos mensuales",subtitle:"Últimos 6 meses · LineChart (Recharts)"}),d.jsx(Nl,{title:"Horas pico",subtitle:"Distribución de citas por hora · BarChart (Recharts)"}),d.jsx(Nl,{title:"Servicios más vendidos",subtitle:"Top 5 servicios del mes · PieChart (Recharts)"}),d.jsx(Nl,{title:"Rendimiento por barbero",subtitle:"Citas completadas por profesional · BarChart (Recharts)"})]})]})}const rd={nombre:"",costoSellos:""},Hv=["text-yellow-400","text-emerald-400","text-blue-400","text-purple-400","text-rose-400","text-amber-400"];function aL(){const{data:t,loading:e}=In("premios",[Ba("costoSellos")]),[n,r]=O.useState(rd),[s,i]=O.useState(null),[o,l]=O.useState(!1),u=S=>{i(S.id),r({nombre:S.nombre,costoSellos:S.costoSellos})},c=()=>{i(null),r(rd)},f=async()=>{const S=n.nombre.trim(),b=parseInt(n.costoSellos);if(!(!S||!b||b<1)){l(!0);try{s?(await Un(ze(Ee("premios"),s),{nombre:S,costoSellos:b,updatedAt:qr()}),c()):(await qa(Ee("premios"),{nombre:S,costoSellos:b,creadoEn:qr()}),r(rd))}finally{l(!1)}}},p=async S=>{confirm("¿Eliminar este premio?")&&await $a(ze(Ee("premios"),S))},g="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",w="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5";return d.jsxs("div",{className:"max-w-2xl mx-auto",children:[d.jsxs("div",{className:"mb-6",children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Premios del Club"}),d.jsx("p",{className:"text-sm text-slate-500 mt-0.5",children:"Define los premios globales que obtienen los clientes por acumular sellos."})]}),d.jsx("div",{className:"bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6",children:e?d.jsx("div",{className:"flex justify-center py-10",children:d.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):t.length===0?d.jsxs("div",{className:"flex flex-col items-center py-10 text-slate-600",children:[d.jsx(Ia,{size:28,className:"mb-2"}),d.jsx("p",{className:"text-sm",children:"Sin premios configurados."}),d.jsx("p",{className:"text-xs mt-0.5 text-slate-700",children:"Crea el primero con el formulario de abajo."})]}):d.jsx("div",{className:"divide-y divide-slate-800/60",children:t.map((S,b)=>d.jsxs("div",{className:"flex items-center gap-3 px-5 py-3.5 hover:bg-slate-800/30 transition-colors",children:[d.jsx(Ia,{size:16,className:`shrink-0 ${Hv[b%Hv.length]}`}),d.jsxs("div",{className:"flex-1 min-w-0",children:[d.jsx("p",{className:"text-sm font-semibold text-white truncate",children:S.nombre}),d.jsxs("p",{className:"text-xs text-slate-500 mt-0.5",children:[S.costoSellos," sello",S.costoSellos!==1?"s":""]})]}),d.jsxs("div",{className:"flex items-center gap-2 shrink-0",children:[d.jsx("button",{onClick:()=>u(S),className:"p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors",children:d.jsx(Dm,{size:13})}),d.jsx("button",{onClick:()=>p(S.id),className:"p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors",children:d.jsx(qc,{size:13})})]})]},S.id))})}),d.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-5",children:[d.jsxs("div",{className:"flex items-center justify-between mb-4",children:[d.jsx("h2",{className:"text-sm font-semibold text-white",children:s?"Editar premio":"Nuevo premio"}),s&&d.jsx("button",{onClick:c,className:"p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all",children:d.jsx(Om,{size:15})})]}),d.jsxs("div",{className:"grid grid-cols-2 gap-3 mb-4",children:[d.jsxs("div",{children:[d.jsx("label",{className:w,children:"Nombre"}),d.jsx("input",{className:g,placeholder:"Ej. Corte gratis",value:n.nombre,onChange:S=>r(b=>({...b,nombre:S.target.value})),onKeyDown:S=>S.key==="Enter"&&f()})]}),d.jsxs("div",{children:[d.jsx("label",{className:w,children:"Sellos requeridos"}),d.jsx("input",{className:g,type:"number",min:"1",max:"99",placeholder:"10",value:n.costoSellos,onChange:S=>r(b=>({...b,costoSellos:S.target.value})),onKeyDown:S=>S.key==="Enter"&&f()})]})]}),d.jsxs("div",{className:"flex gap-3 justify-end",children:[s&&d.jsx("button",{onClick:c,className:"px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),d.jsxs("button",{onClick:f,disabled:o||!n.nombre||!n.costoSellos,className:"flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all",children:[o&&d.jsx("span",{className:"w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"}),s?"Guardar":d.jsxs(d.Fragment,{children:[d.jsx(Ki,{size:15})," Agregar"]})]})]})]})]})}const Wv={nombre:"",descripcion:"",precio:"",stock:"",imagen:""};function lL({producto:t,onEdit:e,onDelete:n}){return d.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all group",children:[d.jsx("div",{className:"h-40 bg-slate-800 flex items-center justify-center overflow-hidden",children:t.imagen?d.jsx("img",{src:t.imagen,alt:t.nombre,className:"w-full h-full object-cover"}):d.jsx(SI,{size:28,className:"text-slate-600"})}),d.jsxs("div",{className:"p-4",children:[d.jsx("h3",{className:"font-semibold text-white text-sm",children:t.nombre}),t.descripcion&&d.jsx("p",{className:"text-xs text-slate-500 mt-0.5 line-clamp-2",children:t.descripcion}),d.jsxs("div",{className:"flex items-center justify-between mt-3",children:[d.jsxs("span",{className:"text-emerald-400 font-bold text-sm",children:["$",Number(t.precio||0).toLocaleString("es-CL")]}),d.jsxs("span",{className:`text-xs font-semibold px-2 py-0.5 rounded-full border ${(t.stock||0)>0?"text-slate-400 border-slate-700":"text-red-400 border-red-500/30 bg-red-500/5"}`,children:["Stock: ",t.stock??"—"]})]}),d.jsxs("div",{className:"flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity",children:[d.jsxs("button",{onClick:()=>e(t),className:"flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-semibold transition-colors",children:[d.jsx(Dm,{size:12})," Editar"]}),d.jsxs("button",{onClick:()=>n(t.id),className:"flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-semibold transition-colors",children:[d.jsx(qc,{size:12})," Eliminar"]})]})]})]})}function uL(){const{data:t,loading:e}=In("productos"),[n,r]=O.useState(!1),[s,i]=O.useState(null),[o,l]=O.useState(Wv),[u,c]=O.useState(!1),[f,p]=O.useState(""),[g,w]=O.useState(!1),S=O.useRef(null),b=()=>{i(null),l(Wv),p(""),r(!0)},P=L=>{i(L.id),l({nombre:L.nombre||"",descripcion:L.descripcion||"",precio:L.precio||"",stock:L.stock??"",imagen:L.imagen||""}),p(L.imagen||""),r(!0)},I=async L=>{var _;const E=(_=L.target.files)==null?void 0:_[0];if(E){p(URL.createObjectURL(E)),w(!0);try{const x=$c(),R=`${x==="elegance"?"":`tenants/${x}/`}productos/${Date.now()}_${E.name}`,T=await sV(Af(Rf,R),E),A=await _I(T.ref);l(k=>({...k,imagen:A})),p(A)}catch(x){console.error("Upload error:",x)}finally{w(!1)}}},v=async()=>{if(o.nombre){c(!0);try{const L={nombre:o.nombre,descripcion:o.descripcion,precio:Number(o.precio)||0,stock:o.stock!==""?Number(o.stock):null,imagen:o.imagen,updatedAt:qr()};s?await Un(ze(Ee("productos"),s),L):await qa(Ee("productos"),{...L,createdAt:qr()}),r(!1)}finally{c(!1)}}},C=async L=>{confirm("¿Eliminar este producto?")&&await $a(ze(Ee("productos"),L))},D="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",j="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5";return d.jsxs("div",{className:"max-w-5xl mx-auto",children:[d.jsxs("div",{className:"flex items-center justify-between mb-6",children:[d.jsxs("div",{children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Productos"}),d.jsx("p",{className:"text-sm text-slate-500 mt-0.5",children:"Productos disponibles en el local · visibles en el dashboard de clientes."})]}),d.jsxs("button",{onClick:b,className:"flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors",children:[d.jsx(Ki,{size:16})," Agregar producto"]})]}),e?d.jsx("div",{className:"flex justify-center py-20",children:d.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):t.length===0?d.jsxs("div",{className:"flex flex-col items-center py-20 text-slate-600",children:[d.jsx(AI,{size:40,className:"mb-3"}),d.jsx("p",{className:"text-sm font-medium",children:"Sin productos aún"}),d.jsx("p",{className:"text-xs mt-0.5",children:"Agrega el primero con el botón de arriba."})]}):d.jsx("div",{className:"grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4",children:t.map(L=>d.jsx(lL,{producto:L,onEdit:P,onDelete:C},L.id))}),d.jsx(Hc,{isOpen:n,onClose:()=>r(!1),title:s?"Editar producto":"Nuevo producto",footer:d.jsxs("div",{className:"flex gap-3 justify-end",children:[d.jsx("button",{onClick:()=>r(!1),className:"px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),d.jsxs("button",{onClick:v,disabled:u||!o.nombre||g,className:"px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2",children:[u&&d.jsx("span",{className:"w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"}),s?"Guardar":"Crear producto"]})]}),children:d.jsxs("div",{className:"space-y-4",children:[d.jsxs("div",{children:[d.jsx("label",{className:j,children:"Imagen"}),d.jsxs("div",{className:"flex gap-3 items-start",children:[d.jsx("div",{className:"w-20 h-20 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0",children:f?d.jsx("img",{src:f,alt:"preview",className:"w-full h-full object-cover"}):d.jsx(SI,{size:20,className:"text-slate-600"})}),d.jsxs("div",{className:"flex-1 space-y-2",children:[d.jsx("input",{className:D,placeholder:"https://... o sube una imagen",value:o.imagen,onChange:L=>{l(E=>({...E,imagen:L.target.value})),p(L.target.value)}}),d.jsxs("button",{type:"button",onClick:()=>{var L;return(L=S.current)==null?void 0:L.click()},disabled:g,className:"flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50",children:[g?d.jsx("span",{className:"w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"}):d.jsx(RI,{size:12}),g?"Subiendo...":"Subir imagen"]}),d.jsx("input",{ref:S,type:"file",accept:"image/*",className:"hidden",onChange:I})]})]})]}),d.jsxs("div",{children:[d.jsx("label",{className:j,children:"Nombre"}),d.jsx("input",{className:D,placeholder:"Pomada para el cabello",value:o.nombre,onChange:L=>l(E=>({...E,nombre:L.target.value}))})]}),d.jsxs("div",{children:[d.jsx("label",{className:j,children:"Descripción"}),d.jsx("textarea",{className:`${D} resize-none`,rows:2,placeholder:"Descripción breve del producto...",value:o.descripcion,onChange:L=>l(E=>({...E,descripcion:L.target.value}))})]}),d.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[d.jsxs("div",{children:[d.jsx("label",{className:j,children:"Precio ($)"}),d.jsx("input",{className:D,type:"number",placeholder:"9900",value:o.precio,onChange:L=>l(E=>({...E,precio:L.target.value}))})]}),d.jsxs("div",{children:[d.jsx("label",{className:j,children:"Stock"}),d.jsx("input",{className:D,type:"number",placeholder:"0",min:"0",value:o.stock,onChange:L=>l(E=>({...E,stock:L.target.value}))})]})]})]})})]})}const is=8,cL=5*1024*1024;function hL(){const{data:t,loading:e}=In("lookbook",[Ba("order","asc")]),[n,r]=O.useState(!1),[s,i]=O.useState(0),[o,l]=O.useState(""),u=O.useRef(null),c=async p=>{let g=Array.from(p.target.files||[]).filter(v=>v.size<=cL);if(p.target.value="",!g.length)return;const w=await zu(Ee("lookbook")),S=is-w.size;if(S<=0){alert("Límite de 8 fotos alcanzado. Elimina una para subir más.");return}g=g.slice(0,S);const P=(await zu(Ee("lookbook"))).docs.map(v=>v.data().order??0);let I=P.length?Math.max(...P)+1:0;r(!0),i(0);try{for(let v=0;v<g.length;v++){const C=g[v];l(`Subiendo ${v+1} de ${g.length}…`);const D=$c(),j=`${Date.now()}_${C.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`,L=D==="elegance"?`lookbook/${j}`:`tenants/${D}/lookbook/${j}`,E=await new Promise((_,x)=>{const R=iV(Af(Rf,L),C);R.on("state_changed",T=>i(Math.round(T.bytesTransferred/T.totalBytes*100)),x,async()=>_(await _I(R.snapshot.ref)))});await qa(Ee("lookbook"),{url:E,filename:j,order:I++,createdAt:qr()})}}catch(v){console.error("[Lookbook upload]",v),alert("Error al subir la foto. Revisa los permisos de Storage.")}finally{r(!1),i(0),l("")}},f=async p=>{if(confirm("¿Eliminar esta foto del lookbook?"))try{await $a(ze(Ee("lookbook"),p.id));try{await oV(Af(Rf,p.url))}catch{}}catch(g){console.error("[Lookbook delete]",g)}};return d.jsxs("div",{className:"max-w-4xl mx-auto",children:[d.jsxs("div",{className:"flex items-center justify-between mb-6",children:[d.jsxs("div",{children:[d.jsx("h1",{className:"text-xl font-bold text-white",children:"Lookbook"}),d.jsxs("p",{className:"text-sm text-slate-500 mt-0.5",children:["Fotos de cortes reales · se muestran en el portal de clientes · máx. ",is," fotos."]})]}),d.jsxs("button",{onClick:()=>{var p;return(p=u.current)==null?void 0:p.click()},disabled:n||t.length>=is,className:"flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors",children:[d.jsx(Ki,{size:16})," Subir fotos"]})]}),d.jsx("input",{ref:u,type:"file",accept:"image/*",multiple:!0,className:"hidden",onChange:c}),n&&d.jsxs("div",{className:"mb-5 bg-slate-800 border border-slate-700 rounded-xl p-4",children:[d.jsxs("div",{className:"flex justify-between text-xs text-slate-400 mb-2",children:[d.jsx("span",{children:o}),d.jsxs("span",{children:[s,"%"]})]}),d.jsx("div",{className:"w-full bg-slate-700 rounded-full h-1.5",children:d.jsx("div",{className:"bg-emerald-500 h-1.5 rounded-full transition-all duration-300",style:{width:`${s}%`}})})]}),e?d.jsx("div",{className:"columns-2 sm:columns-3 gap-3 space-y-3",children:[1,2,3,4].map(p=>d.jsx("div",{className:"break-inside-avoid rounded-xl aspect-[3/4] bg-slate-800 animate-pulse mb-3"},p))}):t.length===0?d.jsxs("div",{onClick:()=>{var p;return(p=u.current)==null?void 0:p.click()},className:"flex flex-col items-center justify-center h-60 border-2 border-dashed border-slate-700 rounded-2xl text-slate-600 cursor-pointer hover:border-emerald-500/40 hover:text-slate-500 transition-all",children:[d.jsx(kI,{size:40,className:"mb-3"}),d.jsx("p",{className:"text-sm font-medium",children:"Sin fotos aún"}),d.jsx("p",{className:"text-xs mt-1",children:"Toca para subir las primeras"})]}):d.jsxs(d.Fragment,{children:[d.jsx("div",{className:"columns-2 sm:columns-3 gap-3 space-y-3",children:t.map(p=>d.jsxs("div",{className:"break-inside-avoid mb-3 relative group rounded-xl overflow-hidden",children:[d.jsx("img",{src:p.url,alt:"",className:"w-full object-cover rounded-xl"}),d.jsx("div",{className:"absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center",children:d.jsxs("button",{onClick:()=>f(p),className:"flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors",children:[d.jsx(qc,{size:13})," Eliminar"]})})]},p.id))}),d.jsxs("p",{className:"text-xs text-slate-600 text-right mt-3",children:[t.length," / ",is," fotos"]})]}),!e&&t.length>0&&t.length<is&&d.jsxs("div",{onClick:()=>{var p;return(p=u.current)==null?void 0:p.click()},className:"mt-4 flex items-center justify-center gap-2 h-16 border border-dashed border-slate-700 rounded-xl text-slate-600 text-sm cursor-pointer hover:border-emerald-500/40 hover:text-slate-400 transition-all",children:[d.jsx(RI,{size:16})," Subir más fotos (",is-t.length," disponible",is-t.length!==1?"s":"",")"]})]})}function dL(){const t=wI(),[e,n]=O.useState(""),[r,s]=O.useState(""),[i,o]=O.useState(""),[l,u]=O.useState(!1),c="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",f=w=>async S=>{S==null||S.preventDefault(),o(""),u(!0);try{await w()}catch(b){o(b.message)}finally{u(!1)}},p=f(()=>P2(xa,e,r)),g=f(()=>tD(xa,new Rn));return d.jsx("div",{className:"min-h-screen bg-slate-950 flex items-center justify-center px-4",children:d.jsxs("div",{className:"w-full max-w-sm",children:[d.jsxs("div",{className:"flex flex-col items-center mb-8",children:[d.jsx("div",{className:"w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4",children:d.jsx(CI,{size:22,className:"text-emerald-400"})}),d.jsx("h1",{className:"text-lg font-bold text-white",children:"Panel Admin"}),d.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:t.name})]}),d.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-2xl p-6",children:[d.jsxs("form",{onSubmit:p,className:"space-y-3",children:[d.jsx("input",{type:"email",className:c,placeholder:"Correo electrónico",value:e,onChange:w=>n(w.target.value)}),d.jsx("input",{type:"password",className:c,placeholder:"Contraseña",value:r,onChange:w=>s(w.target.value)}),i&&d.jsx("p",{className:"text-xs text-red-400",children:i}),d.jsxs("button",{type:"submit",disabled:l,className:"w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2",children:[l&&d.jsx("span",{className:"w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"}),"Ingresar"]})]}),d.jsxs("div",{className:"flex items-center gap-3 my-4",children:[d.jsx("div",{className:"flex-1 h-px bg-slate-800"}),d.jsx("span",{className:"text-xs text-slate-600 uppercase tracking-widest",children:"o"}),d.jsx("div",{className:"flex-1 h-px bg-slate-800"})]}),d.jsxs("button",{onClick:g,className:"w-full flex items-center justify-center gap-2.5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-all",children:[d.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 48 48",children:[d.jsx("path",{fill:"#EA4335",d:"M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.3 30.2 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.8 6C12.3 13.2 17.7 9.5 24 9.5z"}),d.jsx("path",{fill:"#4285F4",d:"M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"}),d.jsx("path",{fill:"#FBBC05",d:"M10.5 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.8-6z"}),d.jsx("path",{fill:"#34A853",d:"M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.3 0-11.6-4.3-13.5-10l-7.8 6C6.7 42.6 14.7 48 24 48z"})]}),"Continuar con Google"]})]})]})})}function fL(){const{user:t,loading:e}=mV();return e?d.jsx("div",{className:"min-h-screen bg-slate-900 flex items-center justify-center",children:d.jsx("div",{className:"w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):t?d.jsx(FV,{children:d.jsxs(gE,{children:[d.jsx(jt,{index:!0,element:d.jsx(Qy,{to:"agenda",replace:!0})}),d.jsx(jt,{path:"agenda",element:d.jsx(XV,{})}),d.jsx(jt,{path:"servicios",element:d.jsx(qV,{})}),d.jsx(jt,{path:"equipo",element:d.jsx(nL,{})}),d.jsx(jt,{path:"clientes",element:d.jsx(iL,{})}),d.jsx(jt,{path:"premios",element:d.jsx(aL,{})}),d.jsx(jt,{path:"productos",element:d.jsx(uL,{})}),d.jsx(jt,{path:"lookbook",element:d.jsx(hL,{})}),d.jsx(jt,{path:"metricas",element:d.jsx(oL,{})}),d.jsx(jt,{path:"*",element:d.jsx(Qy,{to:"agenda",replace:!0})})]})}):d.jsx(dL,{})}function pL(){return d.jsx(fV,{children:d.jsx(pV,{children:d.jsx(OC,{basename:"/gestion-interna",children:d.jsx(gE,{children:d.jsx(jt,{path:"/*",element:d.jsx(fL,{})})})})})})}iE(document.getElementById("root")).render(d.jsx(O.StrictMode,{children:d.jsx(pL,{})}));

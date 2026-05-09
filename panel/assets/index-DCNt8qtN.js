function zx(t,e){for(var n=0;n<e.length;n++){const r=e[n];if(typeof r!="string"&&!Array.isArray(r)){for(const s in r)if(s!=="default"&&!(s in t)){const i=Object.getOwnPropertyDescriptor(r,s);i&&Object.defineProperty(t,s,i.get?i:{enumerable:!0,get:()=>r[s]})}}}return Object.freeze(Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}))}(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&r(o)}).observe(document,{childList:!0,subtree:!0});function n(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function r(s){if(s.ep)return;s.ep=!0;const i=n(s);fetch(s.href,i)}})();function Bx(t){return t&&t.__esModule&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t}var Pv={exports:{}},Lu={},Nv={exports:{}},ne={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var _a=Symbol.for("react.element"),$x=Symbol.for("react.portal"),Wx=Symbol.for("react.fragment"),Hx=Symbol.for("react.strict_mode"),qx=Symbol.for("react.profiler"),Kx=Symbol.for("react.provider"),Gx=Symbol.for("react.context"),Qx=Symbol.for("react.forward_ref"),Yx=Symbol.for("react.suspense"),Xx=Symbol.for("react.memo"),Jx=Symbol.for("react.lazy"),_g=Symbol.iterator;function Zx(t){return t===null||typeof t!="object"?null:(t=_g&&t[_g]||t["@@iterator"],typeof t=="function"?t:null)}var bv={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},Dv=Object.assign,Ov={};function Ai(t,e,n){this.props=t,this.context=e,this.refs=Ov,this.updater=n||bv}Ai.prototype.isReactComponent={};Ai.prototype.setState=function(t,e){if(typeof t!="object"&&typeof t!="function"&&t!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,t,e,"setState")};Ai.prototype.forceUpdate=function(t){this.updater.enqueueForceUpdate(this,t,"forceUpdate")};function Vv(){}Vv.prototype=Ai.prototype;function pf(t,e,n){this.props=t,this.context=e,this.refs=Ov,this.updater=n||bv}var mf=pf.prototype=new Vv;mf.constructor=pf;Dv(mf,Ai.prototype);mf.isPureReactComponent=!0;var vg=Array.isArray,Lv=Object.prototype.hasOwnProperty,gf={current:null},Mv={key:!0,ref:!0,__self:!0,__source:!0};function jv(t,e,n){var r,s={},i=null,o=null;if(e!=null)for(r in e.ref!==void 0&&(o=e.ref),e.key!==void 0&&(i=""+e.key),e)Lv.call(e,r)&&!Mv.hasOwnProperty(r)&&(s[r]=e[r]);var l=arguments.length-2;if(l===1)s.children=n;else if(1<l){for(var u=Array(l),c=0;c<l;c++)u[c]=arguments[c+2];s.children=u}if(t&&t.defaultProps)for(r in l=t.defaultProps,l)s[r]===void 0&&(s[r]=l[r]);return{$$typeof:_a,type:t,key:i,ref:o,props:s,_owner:gf.current}}function e1(t,e){return{$$typeof:_a,type:t.type,key:e,ref:t.ref,props:t.props,_owner:t._owner}}function yf(t){return typeof t=="object"&&t!==null&&t.$$typeof===_a}function t1(t){var e={"=":"=0",":":"=2"};return"$"+t.replace(/[=:]/g,function(n){return e[n]})}var wg=/\/+/g;function eh(t,e){return typeof t=="object"&&t!==null&&t.key!=null?t1(""+t.key):e.toString(36)}function Il(t,e,n,r,s){var i=typeof t;(i==="undefined"||i==="boolean")&&(t=null);var o=!1;if(t===null)o=!0;else switch(i){case"string":case"number":o=!0;break;case"object":switch(t.$$typeof){case _a:case $x:o=!0}}if(o)return o=t,s=s(o),t=r===""?"."+eh(o,0):r,vg(s)?(n="",t!=null&&(n=t.replace(wg,"$&/")+"/"),Il(s,e,n,"",function(c){return c})):s!=null&&(yf(s)&&(s=e1(s,n+(!s.key||o&&o.key===s.key?"":(""+s.key).replace(wg,"$&/")+"/")+t)),e.push(s)),1;if(o=0,r=r===""?".":r+":",vg(t))for(var l=0;l<t.length;l++){i=t[l];var u=r+eh(i,l);o+=Il(i,e,n,u,s)}else if(u=Zx(t),typeof u=="function")for(t=u.call(t),l=0;!(i=t.next()).done;)i=i.value,u=r+eh(i,l++),o+=Il(i,e,n,u,s);else if(i==="object")throw e=String(t),Error("Objects are not valid as a React child (found: "+(e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e)+"). If you meant to render a collection of children, use an array instead.");return o}function Ya(t,e,n){if(t==null)return t;var r=[],s=0;return Il(t,r,"","",function(i){return e.call(n,i,s++)}),r}function n1(t){if(t._status===-1){var e=t._result;e=e(),e.then(function(n){(t._status===0||t._status===-1)&&(t._status=1,t._result=n)},function(n){(t._status===0||t._status===-1)&&(t._status=2,t._result=n)}),t._status===-1&&(t._status=0,t._result=e)}if(t._status===1)return t._result.default;throw t._result}var gt={current:null},xl={transition:null},r1={ReactCurrentDispatcher:gt,ReactCurrentBatchConfig:xl,ReactCurrentOwner:gf};function Uv(){throw Error("act(...) is not supported in production builds of React.")}ne.Children={map:Ya,forEach:function(t,e,n){Ya(t,function(){e.apply(this,arguments)},n)},count:function(t){var e=0;return Ya(t,function(){e++}),e},toArray:function(t){return Ya(t,function(e){return e})||[]},only:function(t){if(!yf(t))throw Error("React.Children.only expected to receive a single React element child.");return t}};ne.Component=Ai;ne.Fragment=Wx;ne.Profiler=qx;ne.PureComponent=pf;ne.StrictMode=Hx;ne.Suspense=Yx;ne.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=r1;ne.act=Uv;ne.cloneElement=function(t,e,n){if(t==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+t+".");var r=Dv({},t.props),s=t.key,i=t.ref,o=t._owner;if(e!=null){if(e.ref!==void 0&&(i=e.ref,o=gf.current),e.key!==void 0&&(s=""+e.key),t.type&&t.type.defaultProps)var l=t.type.defaultProps;for(u in e)Lv.call(e,u)&&!Mv.hasOwnProperty(u)&&(r[u]=e[u]===void 0&&l!==void 0?l[u]:e[u])}var u=arguments.length-2;if(u===1)r.children=n;else if(1<u){l=Array(u);for(var c=0;c<u;c++)l[c]=arguments[c+2];r.children=l}return{$$typeof:_a,type:t.type,key:s,ref:i,props:r,_owner:o}};ne.createContext=function(t){return t={$$typeof:Gx,_currentValue:t,_currentValue2:t,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},t.Provider={$$typeof:Kx,_context:t},t.Consumer=t};ne.createElement=jv;ne.createFactory=function(t){var e=jv.bind(null,t);return e.type=t,e};ne.createRef=function(){return{current:null}};ne.forwardRef=function(t){return{$$typeof:Qx,render:t}};ne.isValidElement=yf;ne.lazy=function(t){return{$$typeof:Jx,_payload:{_status:-1,_result:t},_init:n1}};ne.memo=function(t,e){return{$$typeof:Xx,type:t,compare:e===void 0?null:e}};ne.startTransition=function(t){var e=xl.transition;xl.transition={};try{t()}finally{xl.transition=e}};ne.unstable_act=Uv;ne.useCallback=function(t,e){return gt.current.useCallback(t,e)};ne.useContext=function(t){return gt.current.useContext(t)};ne.useDebugValue=function(){};ne.useDeferredValue=function(t){return gt.current.useDeferredValue(t)};ne.useEffect=function(t,e){return gt.current.useEffect(t,e)};ne.useId=function(){return gt.current.useId()};ne.useImperativeHandle=function(t,e,n){return gt.current.useImperativeHandle(t,e,n)};ne.useInsertionEffect=function(t,e){return gt.current.useInsertionEffect(t,e)};ne.useLayoutEffect=function(t,e){return gt.current.useLayoutEffect(t,e)};ne.useMemo=function(t,e){return gt.current.useMemo(t,e)};ne.useReducer=function(t,e,n){return gt.current.useReducer(t,e,n)};ne.useRef=function(t){return gt.current.useRef(t)};ne.useState=function(t){return gt.current.useState(t)};ne.useSyncExternalStore=function(t,e,n){return gt.current.useSyncExternalStore(t,e,n)};ne.useTransition=function(){return gt.current.useTransition()};ne.version="18.3.1";Nv.exports=ne;var V=Nv.exports;const s1=Bx(V),i1=zx({__proto__:null,default:s1},[V]);/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var o1=V,a1=Symbol.for("react.element"),l1=Symbol.for("react.fragment"),u1=Object.prototype.hasOwnProperty,c1=o1.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,h1={key:!0,ref:!0,__self:!0,__source:!0};function Fv(t,e,n){var r,s={},i=null,o=null;n!==void 0&&(i=""+n),e.key!==void 0&&(i=""+e.key),e.ref!==void 0&&(o=e.ref);for(r in e)u1.call(e,r)&&!h1.hasOwnProperty(r)&&(s[r]=e[r]);if(t&&t.defaultProps)for(r in e=t.defaultProps,e)s[r]===void 0&&(s[r]=e[r]);return{$$typeof:a1,type:t,key:i,ref:o,props:s,_owner:c1.current}}Lu.Fragment=l1;Lu.jsx=Fv;Lu.jsxs=Fv;Pv.exports=Lu;var f=Pv.exports,zv={exports:{}},Ot={},Bv={exports:{}},$v={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */(function(t){function e($,Q){var J=$.length;$.push(Q);e:for(;0<J;){var _e=J-1>>>1,Pe=$[_e];if(0<s(Pe,Q))$[_e]=Q,$[J]=Pe,J=_e;else break e}}function n($){return $.length===0?null:$[0]}function r($){if($.length===0)return null;var Q=$[0],J=$.pop();if(J!==Q){$[0]=J;e:for(var _e=0,Pe=$.length,Gr=Pe>>>1;_e<Gr;){var Lt=2*(_e+1)-1,Qr=$[Lt],qt=Lt+1,Gn=$[qt];if(0>s(Qr,J))qt<Pe&&0>s(Gn,Qr)?($[_e]=Gn,$[qt]=J,_e=qt):($[_e]=Qr,$[Lt]=J,_e=Lt);else if(qt<Pe&&0>s(Gn,J))$[_e]=Gn,$[qt]=J,_e=qt;else break e}}return Q}function s($,Q){var J=$.sortIndex-Q.sortIndex;return J!==0?J:$.id-Q.id}if(typeof performance=="object"&&typeof performance.now=="function"){var i=performance;t.unstable_now=function(){return i.now()}}else{var o=Date,l=o.now();t.unstable_now=function(){return o.now()-l}}var u=[],c=[],d=1,m=null,g=3,w=!1,A=!1,P=!1,N=typeof setTimeout=="function"?setTimeout:null,x=typeof clearTimeout=="function"?clearTimeout:null,v=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function k($){for(var Q=n(c);Q!==null;){if(Q.callback===null)r(c);else if(Q.startTime<=$)r(c),Q.sortIndex=Q.expirationTime,e(u,Q);else break;Q=n(c)}}function D($){if(P=!1,k($),!A)if(n(u)!==null)A=!0,an(U);else{var Q=n(c);Q!==null&&Ht(D,Q.startTime-$)}}function U($,Q){A=!1,P&&(P=!1,x(_),_=-1),w=!0;var J=g;try{for(k(Q),m=n(u);m!==null&&(!(m.expirationTime>Q)||$&&!T());){var _e=m.callback;if(typeof _e=="function"){m.callback=null,g=m.priorityLevel;var Pe=_e(m.expirationTime<=Q);Q=t.unstable_now(),typeof Pe=="function"?m.callback=Pe:m===n(u)&&r(u),k(Q)}else r(u);m=n(u)}if(m!==null)var Gr=!0;else{var Lt=n(c);Lt!==null&&Ht(D,Lt.startTime-Q),Gr=!1}return Gr}finally{m=null,g=J,w=!1}}var L=!1,E=null,_=-1,S=5,R=-1;function T(){return!(t.unstable_now()-R<S)}function C(){if(E!==null){var $=t.unstable_now();R=$;var Q=!0;try{Q=E(!0,$)}finally{Q?I():(L=!1,E=null)}}else L=!1}var I;if(typeof v=="function")I=function(){v(C)};else if(typeof MessageChannel<"u"){var se=new MessageChannel,Ze=se.port2;se.port1.onmessage=C,I=function(){Ze.postMessage(null)}}else I=function(){N(C,0)};function an($){E=$,L||(L=!0,I())}function Ht($,Q){_=N(function(){$(t.unstable_now())},Q)}t.unstable_IdlePriority=5,t.unstable_ImmediatePriority=1,t.unstable_LowPriority=4,t.unstable_NormalPriority=3,t.unstable_Profiling=null,t.unstable_UserBlockingPriority=2,t.unstable_cancelCallback=function($){$.callback=null},t.unstable_continueExecution=function(){A||w||(A=!0,an(U))},t.unstable_forceFrameRate=function($){0>$||125<$?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):S=0<$?Math.floor(1e3/$):5},t.unstable_getCurrentPriorityLevel=function(){return g},t.unstable_getFirstCallbackNode=function(){return n(u)},t.unstable_next=function($){switch(g){case 1:case 2:case 3:var Q=3;break;default:Q=g}var J=g;g=Q;try{return $()}finally{g=J}},t.unstable_pauseExecution=function(){},t.unstable_requestPaint=function(){},t.unstable_runWithPriority=function($,Q){switch($){case 1:case 2:case 3:case 4:case 5:break;default:$=3}var J=g;g=$;try{return Q()}finally{g=J}},t.unstable_scheduleCallback=function($,Q,J){var _e=t.unstable_now();switch(typeof J=="object"&&J!==null?(J=J.delay,J=typeof J=="number"&&0<J?_e+J:_e):J=_e,$){case 1:var Pe=-1;break;case 2:Pe=250;break;case 5:Pe=1073741823;break;case 4:Pe=1e4;break;default:Pe=5e3}return Pe=J+Pe,$={id:d++,callback:Q,priorityLevel:$,startTime:J,expirationTime:Pe,sortIndex:-1},J>_e?($.sortIndex=J,e(c,$),n(u)===null&&$===n(c)&&(P?(x(_),_=-1):P=!0,Ht(D,J-_e))):($.sortIndex=Pe,e(u,$),A||w||(A=!0,an(U))),$},t.unstable_shouldYield=T,t.unstable_wrapCallback=function($){var Q=g;return function(){var J=g;g=Q;try{return $.apply(this,arguments)}finally{g=J}}}})($v);Bv.exports=$v;var d1=Bv.exports;/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var f1=V,Dt=d1;function F(t){for(var e="https://reactjs.org/docs/error-decoder.html?invariant="+t,n=1;n<arguments.length;n++)e+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+t+"; visit "+e+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var Wv=new Set,Uo={};function xs(t,e){hi(t,e),hi(t+"Capture",e)}function hi(t,e){for(Uo[t]=e,t=0;t<e.length;t++)Wv.add(e[t])}var Mn=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),Wh=Object.prototype.hasOwnProperty,p1=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,Eg={},Tg={};function m1(t){return Wh.call(Tg,t)?!0:Wh.call(Eg,t)?!1:p1.test(t)?Tg[t]=!0:(Eg[t]=!0,!1)}function g1(t,e,n,r){if(n!==null&&n.type===0)return!1;switch(typeof e){case"function":case"symbol":return!0;case"boolean":return r?!1:n!==null?!n.acceptsBooleans:(t=t.toLowerCase().slice(0,5),t!=="data-"&&t!=="aria-");default:return!1}}function y1(t,e,n,r){if(e===null||typeof e>"u"||g1(t,e,n,r))return!0;if(r)return!1;if(n!==null)switch(n.type){case 3:return!e;case 4:return e===!1;case 5:return isNaN(e);case 6:return isNaN(e)||1>e}return!1}function yt(t,e,n,r,s,i,o){this.acceptsBooleans=e===2||e===3||e===4,this.attributeName=r,this.attributeNamespace=s,this.mustUseProperty=n,this.propertyName=t,this.type=e,this.sanitizeURL=i,this.removeEmptyString=o}var Je={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(t){Je[t]=new yt(t,0,!1,t,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(t){var e=t[0];Je[e]=new yt(e,1,!1,t[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(t){Je[t]=new yt(t,2,!1,t.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(t){Je[t]=new yt(t,2,!1,t,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(t){Je[t]=new yt(t,3,!1,t.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(t){Je[t]=new yt(t,3,!0,t,null,!1,!1)});["capture","download"].forEach(function(t){Je[t]=new yt(t,4,!1,t,null,!1,!1)});["cols","rows","size","span"].forEach(function(t){Je[t]=new yt(t,6,!1,t,null,!1,!1)});["rowSpan","start"].forEach(function(t){Je[t]=new yt(t,5,!1,t.toLowerCase(),null,!1,!1)});var _f=/[\-:]([a-z])/g;function vf(t){return t[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(t){var e=t.replace(_f,vf);Je[e]=new yt(e,1,!1,t,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t){var e=t.replace(_f,vf);Je[e]=new yt(e,1,!1,t,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(t){var e=t.replace(_f,vf);Je[e]=new yt(e,1,!1,t,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(t){Je[t]=new yt(t,1,!1,t.toLowerCase(),null,!1,!1)});Je.xlinkHref=new yt("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(t){Je[t]=new yt(t,1,!1,t.toLowerCase(),null,!0,!0)});function wf(t,e,n,r){var s=Je.hasOwnProperty(e)?Je[e]:null;(s!==null?s.type!==0:r||!(2<e.length)||e[0]!=="o"&&e[0]!=="O"||e[1]!=="n"&&e[1]!=="N")&&(y1(e,n,s,r)&&(n=null),r||s===null?m1(e)&&(n===null?t.removeAttribute(e):t.setAttribute(e,""+n)):s.mustUseProperty?t[s.propertyName]=n===null?s.type===3?!1:"":n:(e=s.attributeName,r=s.attributeNamespace,n===null?t.removeAttribute(e):(s=s.type,n=s===3||s===4&&n===!0?"":""+n,r?t.setAttributeNS(r,e,n):t.setAttribute(e,n))))}var qn=f1.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,Xa=Symbol.for("react.element"),zs=Symbol.for("react.portal"),Bs=Symbol.for("react.fragment"),Ef=Symbol.for("react.strict_mode"),Hh=Symbol.for("react.profiler"),Hv=Symbol.for("react.provider"),qv=Symbol.for("react.context"),Tf=Symbol.for("react.forward_ref"),qh=Symbol.for("react.suspense"),Kh=Symbol.for("react.suspense_list"),If=Symbol.for("react.memo"),rr=Symbol.for("react.lazy"),Kv=Symbol.for("react.offscreen"),Ig=Symbol.iterator;function ro(t){return t===null||typeof t!="object"?null:(t=Ig&&t[Ig]||t["@@iterator"],typeof t=="function"?t:null)}var Se=Object.assign,th;function po(t){if(th===void 0)try{throw Error()}catch(n){var e=n.stack.trim().match(/\n( *(at )?)/);th=e&&e[1]||""}return`
`+th+t}var nh=!1;function rh(t,e){if(!t||nh)return"";nh=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(e)if(e=function(){throw Error()},Object.defineProperty(e.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(e,[])}catch(c){var r=c}Reflect.construct(t,[],e)}else{try{e.call()}catch(c){r=c}t.call(e.prototype)}else{try{throw Error()}catch(c){r=c}t()}}catch(c){if(c&&r&&typeof c.stack=="string"){for(var s=c.stack.split(`
`),i=r.stack.split(`
`),o=s.length-1,l=i.length-1;1<=o&&0<=l&&s[o]!==i[l];)l--;for(;1<=o&&0<=l;o--,l--)if(s[o]!==i[l]){if(o!==1||l!==1)do if(o--,l--,0>l||s[o]!==i[l]){var u=`
`+s[o].replace(" at new "," at ");return t.displayName&&u.includes("<anonymous>")&&(u=u.replace("<anonymous>",t.displayName)),u}while(1<=o&&0<=l);break}}}finally{nh=!1,Error.prepareStackTrace=n}return(t=t?t.displayName||t.name:"")?po(t):""}function _1(t){switch(t.tag){case 5:return po(t.type);case 16:return po("Lazy");case 13:return po("Suspense");case 19:return po("SuspenseList");case 0:case 2:case 15:return t=rh(t.type,!1),t;case 11:return t=rh(t.type.render,!1),t;case 1:return t=rh(t.type,!0),t;default:return""}}function Gh(t){if(t==null)return null;if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t;switch(t){case Bs:return"Fragment";case zs:return"Portal";case Hh:return"Profiler";case Ef:return"StrictMode";case qh:return"Suspense";case Kh:return"SuspenseList"}if(typeof t=="object")switch(t.$$typeof){case qv:return(t.displayName||"Context")+".Consumer";case Hv:return(t._context.displayName||"Context")+".Provider";case Tf:var e=t.render;return t=t.displayName,t||(t=e.displayName||e.name||"",t=t!==""?"ForwardRef("+t+")":"ForwardRef"),t;case If:return e=t.displayName||null,e!==null?e:Gh(t.type)||"Memo";case rr:e=t._payload,t=t._init;try{return Gh(t(e))}catch{}}return null}function v1(t){var e=t.type;switch(t.tag){case 24:return"Cache";case 9:return(e.displayName||"Context")+".Consumer";case 10:return(e._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return t=e.render,t=t.displayName||t.name||"",e.displayName||(t!==""?"ForwardRef("+t+")":"ForwardRef");case 7:return"Fragment";case 5:return e;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return Gh(e);case 8:return e===Ef?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e}return null}function Rr(t){switch(typeof t){case"boolean":case"number":case"string":case"undefined":return t;case"object":return t;default:return""}}function Gv(t){var e=t.type;return(t=t.nodeName)&&t.toLowerCase()==="input"&&(e==="checkbox"||e==="radio")}function w1(t){var e=Gv(t)?"checked":"value",n=Object.getOwnPropertyDescriptor(t.constructor.prototype,e),r=""+t[e];if(!t.hasOwnProperty(e)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var s=n.get,i=n.set;return Object.defineProperty(t,e,{configurable:!0,get:function(){return s.call(this)},set:function(o){r=""+o,i.call(this,o)}}),Object.defineProperty(t,e,{enumerable:n.enumerable}),{getValue:function(){return r},setValue:function(o){r=""+o},stopTracking:function(){t._valueTracker=null,delete t[e]}}}}function Ja(t){t._valueTracker||(t._valueTracker=w1(t))}function Qv(t){if(!t)return!1;var e=t._valueTracker;if(!e)return!0;var n=e.getValue(),r="";return t&&(r=Gv(t)?t.checked?"true":"false":t.value),t=r,t!==n?(e.setValue(t),!0):!1}function ql(t){if(t=t||(typeof document<"u"?document:void 0),typeof t>"u")return null;try{return t.activeElement||t.body}catch{return t.body}}function Qh(t,e){var n=e.checked;return Se({},e,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??t._wrapperState.initialChecked})}function xg(t,e){var n=e.defaultValue==null?"":e.defaultValue,r=e.checked!=null?e.checked:e.defaultChecked;n=Rr(e.value!=null?e.value:n),t._wrapperState={initialChecked:r,initialValue:n,controlled:e.type==="checkbox"||e.type==="radio"?e.checked!=null:e.value!=null}}function Yv(t,e){e=e.checked,e!=null&&wf(t,"checked",e,!1)}function Yh(t,e){Yv(t,e);var n=Rr(e.value),r=e.type;if(n!=null)r==="number"?(n===0&&t.value===""||t.value!=n)&&(t.value=""+n):t.value!==""+n&&(t.value=""+n);else if(r==="submit"||r==="reset"){t.removeAttribute("value");return}e.hasOwnProperty("value")?Xh(t,e.type,n):e.hasOwnProperty("defaultValue")&&Xh(t,e.type,Rr(e.defaultValue)),e.checked==null&&e.defaultChecked!=null&&(t.defaultChecked=!!e.defaultChecked)}function Sg(t,e,n){if(e.hasOwnProperty("value")||e.hasOwnProperty("defaultValue")){var r=e.type;if(!(r!=="submit"&&r!=="reset"||e.value!==void 0&&e.value!==null))return;e=""+t._wrapperState.initialValue,n||e===t.value||(t.value=e),t.defaultValue=e}n=t.name,n!==""&&(t.name=""),t.defaultChecked=!!t._wrapperState.initialChecked,n!==""&&(t.name=n)}function Xh(t,e,n){(e!=="number"||ql(t.ownerDocument)!==t)&&(n==null?t.defaultValue=""+t._wrapperState.initialValue:t.defaultValue!==""+n&&(t.defaultValue=""+n))}var mo=Array.isArray;function ei(t,e,n,r){if(t=t.options,e){e={};for(var s=0;s<n.length;s++)e["$"+n[s]]=!0;for(n=0;n<t.length;n++)s=e.hasOwnProperty("$"+t[n].value),t[n].selected!==s&&(t[n].selected=s),s&&r&&(t[n].defaultSelected=!0)}else{for(n=""+Rr(n),e=null,s=0;s<t.length;s++){if(t[s].value===n){t[s].selected=!0,r&&(t[s].defaultSelected=!0);return}e!==null||t[s].disabled||(e=t[s])}e!==null&&(e.selected=!0)}}function Jh(t,e){if(e.dangerouslySetInnerHTML!=null)throw Error(F(91));return Se({},e,{value:void 0,defaultValue:void 0,children:""+t._wrapperState.initialValue})}function Ag(t,e){var n=e.value;if(n==null){if(n=e.children,e=e.defaultValue,n!=null){if(e!=null)throw Error(F(92));if(mo(n)){if(1<n.length)throw Error(F(93));n=n[0]}e=n}e==null&&(e=""),n=e}t._wrapperState={initialValue:Rr(n)}}function Xv(t,e){var n=Rr(e.value),r=Rr(e.defaultValue);n!=null&&(n=""+n,n!==t.value&&(t.value=n),e.defaultValue==null&&t.defaultValue!==n&&(t.defaultValue=n)),r!=null&&(t.defaultValue=""+r)}function Cg(t){var e=t.textContent;e===t._wrapperState.initialValue&&e!==""&&e!==null&&(t.value=e)}function Jv(t){switch(t){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function Zh(t,e){return t==null||t==="http://www.w3.org/1999/xhtml"?Jv(e):t==="http://www.w3.org/2000/svg"&&e==="foreignObject"?"http://www.w3.org/1999/xhtml":t}var Za,Zv=function(t){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(e,n,r,s){MSApp.execUnsafeLocalFunction(function(){return t(e,n,r,s)})}:t}(function(t,e){if(t.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in t)t.innerHTML=e;else{for(Za=Za||document.createElement("div"),Za.innerHTML="<svg>"+e.valueOf().toString()+"</svg>",e=Za.firstChild;t.firstChild;)t.removeChild(t.firstChild);for(;e.firstChild;)t.appendChild(e.firstChild)}});function Fo(t,e){if(e){var n=t.firstChild;if(n&&n===t.lastChild&&n.nodeType===3){n.nodeValue=e;return}}t.textContent=e}var Io={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},E1=["Webkit","ms","Moz","O"];Object.keys(Io).forEach(function(t){E1.forEach(function(e){e=e+t.charAt(0).toUpperCase()+t.substring(1),Io[e]=Io[t]})});function e0(t,e,n){return e==null||typeof e=="boolean"||e===""?"":n||typeof e!="number"||e===0||Io.hasOwnProperty(t)&&Io[t]?(""+e).trim():e+"px"}function t0(t,e){t=t.style;for(var n in e)if(e.hasOwnProperty(n)){var r=n.indexOf("--")===0,s=e0(n,e[n],r);n==="float"&&(n="cssFloat"),r?t.setProperty(n,s):t[n]=s}}var T1=Se({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function ed(t,e){if(e){if(T1[t]&&(e.children!=null||e.dangerouslySetInnerHTML!=null))throw Error(F(137,t));if(e.dangerouslySetInnerHTML!=null){if(e.children!=null)throw Error(F(60));if(typeof e.dangerouslySetInnerHTML!="object"||!("__html"in e.dangerouslySetInnerHTML))throw Error(F(61))}if(e.style!=null&&typeof e.style!="object")throw Error(F(62))}}function td(t,e){if(t.indexOf("-")===-1)return typeof e.is=="string";switch(t){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var nd=null;function xf(t){return t=t.target||t.srcElement||window,t.correspondingUseElement&&(t=t.correspondingUseElement),t.nodeType===3?t.parentNode:t}var rd=null,ti=null,ni=null;function kg(t){if(t=Ea(t)){if(typeof rd!="function")throw Error(F(280));var e=t.stateNode;e&&(e=zu(e),rd(t.stateNode,t.type,e))}}function n0(t){ti?ni?ni.push(t):ni=[t]:ti=t}function r0(){if(ti){var t=ti,e=ni;if(ni=ti=null,kg(t),e)for(t=0;t<e.length;t++)kg(e[t])}}function s0(t,e){return t(e)}function i0(){}var sh=!1;function o0(t,e,n){if(sh)return t(e,n);sh=!0;try{return s0(t,e,n)}finally{sh=!1,(ti!==null||ni!==null)&&(i0(),r0())}}function zo(t,e){var n=t.stateNode;if(n===null)return null;var r=zu(n);if(r===null)return null;n=r[e];e:switch(e){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(r=!r.disabled)||(t=t.type,r=!(t==="button"||t==="input"||t==="select"||t==="textarea")),t=!r;break e;default:t=!1}if(t)return null;if(n&&typeof n!="function")throw Error(F(231,e,typeof n));return n}var sd=!1;if(Mn)try{var so={};Object.defineProperty(so,"passive",{get:function(){sd=!0}}),window.addEventListener("test",so,so),window.removeEventListener("test",so,so)}catch{sd=!1}function I1(t,e,n,r,s,i,o,l,u){var c=Array.prototype.slice.call(arguments,3);try{e.apply(n,c)}catch(d){this.onError(d)}}var xo=!1,Kl=null,Gl=!1,id=null,x1={onError:function(t){xo=!0,Kl=t}};function S1(t,e,n,r,s,i,o,l,u){xo=!1,Kl=null,I1.apply(x1,arguments)}function A1(t,e,n,r,s,i,o,l,u){if(S1.apply(this,arguments),xo){if(xo){var c=Kl;xo=!1,Kl=null}else throw Error(F(198));Gl||(Gl=!0,id=c)}}function Ss(t){var e=t,n=t;if(t.alternate)for(;e.return;)e=e.return;else{t=e;do e=t,e.flags&4098&&(n=e.return),t=e.return;while(t)}return e.tag===3?n:null}function a0(t){if(t.tag===13){var e=t.memoizedState;if(e===null&&(t=t.alternate,t!==null&&(e=t.memoizedState)),e!==null)return e.dehydrated}return null}function Rg(t){if(Ss(t)!==t)throw Error(F(188))}function C1(t){var e=t.alternate;if(!e){if(e=Ss(t),e===null)throw Error(F(188));return e!==t?null:t}for(var n=t,r=e;;){var s=n.return;if(s===null)break;var i=s.alternate;if(i===null){if(r=s.return,r!==null){n=r;continue}break}if(s.child===i.child){for(i=s.child;i;){if(i===n)return Rg(s),t;if(i===r)return Rg(s),e;i=i.sibling}throw Error(F(188))}if(n.return!==r.return)n=s,r=i;else{for(var o=!1,l=s.child;l;){if(l===n){o=!0,n=s,r=i;break}if(l===r){o=!0,r=s,n=i;break}l=l.sibling}if(!o){for(l=i.child;l;){if(l===n){o=!0,n=i,r=s;break}if(l===r){o=!0,r=i,n=s;break}l=l.sibling}if(!o)throw Error(F(189))}}if(n.alternate!==r)throw Error(F(190))}if(n.tag!==3)throw Error(F(188));return n.stateNode.current===n?t:e}function l0(t){return t=C1(t),t!==null?u0(t):null}function u0(t){if(t.tag===5||t.tag===6)return t;for(t=t.child;t!==null;){var e=u0(t);if(e!==null)return e;t=t.sibling}return null}var c0=Dt.unstable_scheduleCallback,Pg=Dt.unstable_cancelCallback,k1=Dt.unstable_shouldYield,R1=Dt.unstable_requestPaint,be=Dt.unstable_now,P1=Dt.unstable_getCurrentPriorityLevel,Sf=Dt.unstable_ImmediatePriority,h0=Dt.unstable_UserBlockingPriority,Ql=Dt.unstable_NormalPriority,N1=Dt.unstable_LowPriority,d0=Dt.unstable_IdlePriority,Mu=null,mn=null;function b1(t){if(mn&&typeof mn.onCommitFiberRoot=="function")try{mn.onCommitFiberRoot(Mu,t,void 0,(t.current.flags&128)===128)}catch{}}var Zt=Math.clz32?Math.clz32:V1,D1=Math.log,O1=Math.LN2;function V1(t){return t>>>=0,t===0?32:31-(D1(t)/O1|0)|0}var el=64,tl=4194304;function go(t){switch(t&-t){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return t&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return t}}function Yl(t,e){var n=t.pendingLanes;if(n===0)return 0;var r=0,s=t.suspendedLanes,i=t.pingedLanes,o=n&268435455;if(o!==0){var l=o&~s;l!==0?r=go(l):(i&=o,i!==0&&(r=go(i)))}else o=n&~s,o!==0?r=go(o):i!==0&&(r=go(i));if(r===0)return 0;if(e!==0&&e!==r&&!(e&s)&&(s=r&-r,i=e&-e,s>=i||s===16&&(i&4194240)!==0))return e;if(r&4&&(r|=n&16),e=t.entangledLanes,e!==0)for(t=t.entanglements,e&=r;0<e;)n=31-Zt(e),s=1<<n,r|=t[n],e&=~s;return r}function L1(t,e){switch(t){case 1:case 2:case 4:return e+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function M1(t,e){for(var n=t.suspendedLanes,r=t.pingedLanes,s=t.expirationTimes,i=t.pendingLanes;0<i;){var o=31-Zt(i),l=1<<o,u=s[o];u===-1?(!(l&n)||l&r)&&(s[o]=L1(l,e)):u<=e&&(t.expiredLanes|=l),i&=~l}}function od(t){return t=t.pendingLanes&-1073741825,t!==0?t:t&1073741824?1073741824:0}function f0(){var t=el;return el<<=1,!(el&4194240)&&(el=64),t}function ih(t){for(var e=[],n=0;31>n;n++)e.push(t);return e}function va(t,e,n){t.pendingLanes|=e,e!==536870912&&(t.suspendedLanes=0,t.pingedLanes=0),t=t.eventTimes,e=31-Zt(e),t[e]=n}function j1(t,e){var n=t.pendingLanes&~e;t.pendingLanes=e,t.suspendedLanes=0,t.pingedLanes=0,t.expiredLanes&=e,t.mutableReadLanes&=e,t.entangledLanes&=e,e=t.entanglements;var r=t.eventTimes;for(t=t.expirationTimes;0<n;){var s=31-Zt(n),i=1<<s;e[s]=0,r[s]=-1,t[s]=-1,n&=~i}}function Af(t,e){var n=t.entangledLanes|=e;for(t=t.entanglements;n;){var r=31-Zt(n),s=1<<r;s&e|t[r]&e&&(t[r]|=e),n&=~s}}var ue=0;function p0(t){return t&=-t,1<t?4<t?t&268435455?16:536870912:4:1}var m0,Cf,g0,y0,_0,ad=!1,nl=[],pr=null,mr=null,gr=null,Bo=new Map,$o=new Map,ir=[],U1="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function Ng(t,e){switch(t){case"focusin":case"focusout":pr=null;break;case"dragenter":case"dragleave":mr=null;break;case"mouseover":case"mouseout":gr=null;break;case"pointerover":case"pointerout":Bo.delete(e.pointerId);break;case"gotpointercapture":case"lostpointercapture":$o.delete(e.pointerId)}}function io(t,e,n,r,s,i){return t===null||t.nativeEvent!==i?(t={blockedOn:e,domEventName:n,eventSystemFlags:r,nativeEvent:i,targetContainers:[s]},e!==null&&(e=Ea(e),e!==null&&Cf(e)),t):(t.eventSystemFlags|=r,e=t.targetContainers,s!==null&&e.indexOf(s)===-1&&e.push(s),t)}function F1(t,e,n,r,s){switch(e){case"focusin":return pr=io(pr,t,e,n,r,s),!0;case"dragenter":return mr=io(mr,t,e,n,r,s),!0;case"mouseover":return gr=io(gr,t,e,n,r,s),!0;case"pointerover":var i=s.pointerId;return Bo.set(i,io(Bo.get(i)||null,t,e,n,r,s)),!0;case"gotpointercapture":return i=s.pointerId,$o.set(i,io($o.get(i)||null,t,e,n,r,s)),!0}return!1}function v0(t){var e=ss(t.target);if(e!==null){var n=Ss(e);if(n!==null){if(e=n.tag,e===13){if(e=a0(n),e!==null){t.blockedOn=e,_0(t.priority,function(){g0(n)});return}}else if(e===3&&n.stateNode.current.memoizedState.isDehydrated){t.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}t.blockedOn=null}function Sl(t){if(t.blockedOn!==null)return!1;for(var e=t.targetContainers;0<e.length;){var n=ld(t.domEventName,t.eventSystemFlags,e[0],t.nativeEvent);if(n===null){n=t.nativeEvent;var r=new n.constructor(n.type,n);nd=r,n.target.dispatchEvent(r),nd=null}else return e=Ea(n),e!==null&&Cf(e),t.blockedOn=n,!1;e.shift()}return!0}function bg(t,e,n){Sl(t)&&n.delete(e)}function z1(){ad=!1,pr!==null&&Sl(pr)&&(pr=null),mr!==null&&Sl(mr)&&(mr=null),gr!==null&&Sl(gr)&&(gr=null),Bo.forEach(bg),$o.forEach(bg)}function oo(t,e){t.blockedOn===e&&(t.blockedOn=null,ad||(ad=!0,Dt.unstable_scheduleCallback(Dt.unstable_NormalPriority,z1)))}function Wo(t){function e(s){return oo(s,t)}if(0<nl.length){oo(nl[0],t);for(var n=1;n<nl.length;n++){var r=nl[n];r.blockedOn===t&&(r.blockedOn=null)}}for(pr!==null&&oo(pr,t),mr!==null&&oo(mr,t),gr!==null&&oo(gr,t),Bo.forEach(e),$o.forEach(e),n=0;n<ir.length;n++)r=ir[n],r.blockedOn===t&&(r.blockedOn=null);for(;0<ir.length&&(n=ir[0],n.blockedOn===null);)v0(n),n.blockedOn===null&&ir.shift()}var ri=qn.ReactCurrentBatchConfig,Xl=!0;function B1(t,e,n,r){var s=ue,i=ri.transition;ri.transition=null;try{ue=1,kf(t,e,n,r)}finally{ue=s,ri.transition=i}}function $1(t,e,n,r){var s=ue,i=ri.transition;ri.transition=null;try{ue=4,kf(t,e,n,r)}finally{ue=s,ri.transition=i}}function kf(t,e,n,r){if(Xl){var s=ld(t,e,n,r);if(s===null)mh(t,e,r,Jl,n),Ng(t,r);else if(F1(s,t,e,n,r))r.stopPropagation();else if(Ng(t,r),e&4&&-1<U1.indexOf(t)){for(;s!==null;){var i=Ea(s);if(i!==null&&m0(i),i=ld(t,e,n,r),i===null&&mh(t,e,r,Jl,n),i===s)break;s=i}s!==null&&r.stopPropagation()}else mh(t,e,r,null,n)}}var Jl=null;function ld(t,e,n,r){if(Jl=null,t=xf(r),t=ss(t),t!==null)if(e=Ss(t),e===null)t=null;else if(n=e.tag,n===13){if(t=a0(e),t!==null)return t;t=null}else if(n===3){if(e.stateNode.current.memoizedState.isDehydrated)return e.tag===3?e.stateNode.containerInfo:null;t=null}else e!==t&&(t=null);return Jl=t,null}function w0(t){switch(t){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(P1()){case Sf:return 1;case h0:return 4;case Ql:case N1:return 16;case d0:return 536870912;default:return 16}default:return 16}}var hr=null,Rf=null,Al=null;function E0(){if(Al)return Al;var t,e=Rf,n=e.length,r,s="value"in hr?hr.value:hr.textContent,i=s.length;for(t=0;t<n&&e[t]===s[t];t++);var o=n-t;for(r=1;r<=o&&e[n-r]===s[i-r];r++);return Al=s.slice(t,1<r?1-r:void 0)}function Cl(t){var e=t.keyCode;return"charCode"in t?(t=t.charCode,t===0&&e===13&&(t=13)):t=e,t===10&&(t=13),32<=t||t===13?t:0}function rl(){return!0}function Dg(){return!1}function Vt(t){function e(n,r,s,i,o){this._reactName=n,this._targetInst=s,this.type=r,this.nativeEvent=i,this.target=o,this.currentTarget=null;for(var l in t)t.hasOwnProperty(l)&&(n=t[l],this[l]=n?n(i):i[l]);return this.isDefaultPrevented=(i.defaultPrevented!=null?i.defaultPrevented:i.returnValue===!1)?rl:Dg,this.isPropagationStopped=Dg,this}return Se(e.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=rl)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=rl)},persist:function(){},isPersistent:rl}),e}var Ci={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(t){return t.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Pf=Vt(Ci),wa=Se({},Ci,{view:0,detail:0}),W1=Vt(wa),oh,ah,ao,ju=Se({},wa,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Nf,button:0,buttons:0,relatedTarget:function(t){return t.relatedTarget===void 0?t.fromElement===t.srcElement?t.toElement:t.fromElement:t.relatedTarget},movementX:function(t){return"movementX"in t?t.movementX:(t!==ao&&(ao&&t.type==="mousemove"?(oh=t.screenX-ao.screenX,ah=t.screenY-ao.screenY):ah=oh=0,ao=t),oh)},movementY:function(t){return"movementY"in t?t.movementY:ah}}),Og=Vt(ju),H1=Se({},ju,{dataTransfer:0}),q1=Vt(H1),K1=Se({},wa,{relatedTarget:0}),lh=Vt(K1),G1=Se({},Ci,{animationName:0,elapsedTime:0,pseudoElement:0}),Q1=Vt(G1),Y1=Se({},Ci,{clipboardData:function(t){return"clipboardData"in t?t.clipboardData:window.clipboardData}}),X1=Vt(Y1),J1=Se({},Ci,{data:0}),Vg=Vt(J1),Z1={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},eS={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},tS={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function nS(t){var e=this.nativeEvent;return e.getModifierState?e.getModifierState(t):(t=tS[t])?!!e[t]:!1}function Nf(){return nS}var rS=Se({},wa,{key:function(t){if(t.key){var e=Z1[t.key]||t.key;if(e!=="Unidentified")return e}return t.type==="keypress"?(t=Cl(t),t===13?"Enter":String.fromCharCode(t)):t.type==="keydown"||t.type==="keyup"?eS[t.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Nf,charCode:function(t){return t.type==="keypress"?Cl(t):0},keyCode:function(t){return t.type==="keydown"||t.type==="keyup"?t.keyCode:0},which:function(t){return t.type==="keypress"?Cl(t):t.type==="keydown"||t.type==="keyup"?t.keyCode:0}}),sS=Vt(rS),iS=Se({},ju,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Lg=Vt(iS),oS=Se({},wa,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Nf}),aS=Vt(oS),lS=Se({},Ci,{propertyName:0,elapsedTime:0,pseudoElement:0}),uS=Vt(lS),cS=Se({},ju,{deltaX:function(t){return"deltaX"in t?t.deltaX:"wheelDeltaX"in t?-t.wheelDeltaX:0},deltaY:function(t){return"deltaY"in t?t.deltaY:"wheelDeltaY"in t?-t.wheelDeltaY:"wheelDelta"in t?-t.wheelDelta:0},deltaZ:0,deltaMode:0}),hS=Vt(cS),dS=[9,13,27,32],bf=Mn&&"CompositionEvent"in window,So=null;Mn&&"documentMode"in document&&(So=document.documentMode);var fS=Mn&&"TextEvent"in window&&!So,T0=Mn&&(!bf||So&&8<So&&11>=So),Mg=" ",jg=!1;function I0(t,e){switch(t){case"keyup":return dS.indexOf(e.keyCode)!==-1;case"keydown":return e.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function x0(t){return t=t.detail,typeof t=="object"&&"data"in t?t.data:null}var $s=!1;function pS(t,e){switch(t){case"compositionend":return x0(e);case"keypress":return e.which!==32?null:(jg=!0,Mg);case"textInput":return t=e.data,t===Mg&&jg?null:t;default:return null}}function mS(t,e){if($s)return t==="compositionend"||!bf&&I0(t,e)?(t=E0(),Al=Rf=hr=null,$s=!1,t):null;switch(t){case"paste":return null;case"keypress":if(!(e.ctrlKey||e.altKey||e.metaKey)||e.ctrlKey&&e.altKey){if(e.char&&1<e.char.length)return e.char;if(e.which)return String.fromCharCode(e.which)}return null;case"compositionend":return T0&&e.locale!=="ko"?null:e.data;default:return null}}var gS={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function Ug(t){var e=t&&t.nodeName&&t.nodeName.toLowerCase();return e==="input"?!!gS[t.type]:e==="textarea"}function S0(t,e,n,r){n0(r),e=Zl(e,"onChange"),0<e.length&&(n=new Pf("onChange","change",null,n,r),t.push({event:n,listeners:e}))}var Ao=null,Ho=null;function yS(t){L0(t,0)}function Uu(t){var e=qs(t);if(Qv(e))return t}function _S(t,e){if(t==="change")return e}var A0=!1;if(Mn){var uh;if(Mn){var ch="oninput"in document;if(!ch){var Fg=document.createElement("div");Fg.setAttribute("oninput","return;"),ch=typeof Fg.oninput=="function"}uh=ch}else uh=!1;A0=uh&&(!document.documentMode||9<document.documentMode)}function zg(){Ao&&(Ao.detachEvent("onpropertychange",C0),Ho=Ao=null)}function C0(t){if(t.propertyName==="value"&&Uu(Ho)){var e=[];S0(e,Ho,t,xf(t)),o0(yS,e)}}function vS(t,e,n){t==="focusin"?(zg(),Ao=e,Ho=n,Ao.attachEvent("onpropertychange",C0)):t==="focusout"&&zg()}function wS(t){if(t==="selectionchange"||t==="keyup"||t==="keydown")return Uu(Ho)}function ES(t,e){if(t==="click")return Uu(e)}function TS(t,e){if(t==="input"||t==="change")return Uu(e)}function IS(t,e){return t===e&&(t!==0||1/t===1/e)||t!==t&&e!==e}var rn=typeof Object.is=="function"?Object.is:IS;function qo(t,e){if(rn(t,e))return!0;if(typeof t!="object"||t===null||typeof e!="object"||e===null)return!1;var n=Object.keys(t),r=Object.keys(e);if(n.length!==r.length)return!1;for(r=0;r<n.length;r++){var s=n[r];if(!Wh.call(e,s)||!rn(t[s],e[s]))return!1}return!0}function Bg(t){for(;t&&t.firstChild;)t=t.firstChild;return t}function $g(t,e){var n=Bg(t);t=0;for(var r;n;){if(n.nodeType===3){if(r=t+n.textContent.length,t<=e&&r>=e)return{node:n,offset:e-t};t=r}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=Bg(n)}}function k0(t,e){return t&&e?t===e?!0:t&&t.nodeType===3?!1:e&&e.nodeType===3?k0(t,e.parentNode):"contains"in t?t.contains(e):t.compareDocumentPosition?!!(t.compareDocumentPosition(e)&16):!1:!1}function R0(){for(var t=window,e=ql();e instanceof t.HTMLIFrameElement;){try{var n=typeof e.contentWindow.location.href=="string"}catch{n=!1}if(n)t=e.contentWindow;else break;e=ql(t.document)}return e}function Df(t){var e=t&&t.nodeName&&t.nodeName.toLowerCase();return e&&(e==="input"&&(t.type==="text"||t.type==="search"||t.type==="tel"||t.type==="url"||t.type==="password")||e==="textarea"||t.contentEditable==="true")}function xS(t){var e=R0(),n=t.focusedElem,r=t.selectionRange;if(e!==n&&n&&n.ownerDocument&&k0(n.ownerDocument.documentElement,n)){if(r!==null&&Df(n)){if(e=r.start,t=r.end,t===void 0&&(t=e),"selectionStart"in n)n.selectionStart=e,n.selectionEnd=Math.min(t,n.value.length);else if(t=(e=n.ownerDocument||document)&&e.defaultView||window,t.getSelection){t=t.getSelection();var s=n.textContent.length,i=Math.min(r.start,s);r=r.end===void 0?i:Math.min(r.end,s),!t.extend&&i>r&&(s=r,r=i,i=s),s=$g(n,i);var o=$g(n,r);s&&o&&(t.rangeCount!==1||t.anchorNode!==s.node||t.anchorOffset!==s.offset||t.focusNode!==o.node||t.focusOffset!==o.offset)&&(e=e.createRange(),e.setStart(s.node,s.offset),t.removeAllRanges(),i>r?(t.addRange(e),t.extend(o.node,o.offset)):(e.setEnd(o.node,o.offset),t.addRange(e)))}}for(e=[],t=n;t=t.parentNode;)t.nodeType===1&&e.push({element:t,left:t.scrollLeft,top:t.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<e.length;n++)t=e[n],t.element.scrollLeft=t.left,t.element.scrollTop=t.top}}var SS=Mn&&"documentMode"in document&&11>=document.documentMode,Ws=null,ud=null,Co=null,cd=!1;function Wg(t,e,n){var r=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;cd||Ws==null||Ws!==ql(r)||(r=Ws,"selectionStart"in r&&Df(r)?r={start:r.selectionStart,end:r.selectionEnd}:(r=(r.ownerDocument&&r.ownerDocument.defaultView||window).getSelection(),r={anchorNode:r.anchorNode,anchorOffset:r.anchorOffset,focusNode:r.focusNode,focusOffset:r.focusOffset}),Co&&qo(Co,r)||(Co=r,r=Zl(ud,"onSelect"),0<r.length&&(e=new Pf("onSelect","select",null,e,n),t.push({event:e,listeners:r}),e.target=Ws)))}function sl(t,e){var n={};return n[t.toLowerCase()]=e.toLowerCase(),n["Webkit"+t]="webkit"+e,n["Moz"+t]="moz"+e,n}var Hs={animationend:sl("Animation","AnimationEnd"),animationiteration:sl("Animation","AnimationIteration"),animationstart:sl("Animation","AnimationStart"),transitionend:sl("Transition","TransitionEnd")},hh={},P0={};Mn&&(P0=document.createElement("div").style,"AnimationEvent"in window||(delete Hs.animationend.animation,delete Hs.animationiteration.animation,delete Hs.animationstart.animation),"TransitionEvent"in window||delete Hs.transitionend.transition);function Fu(t){if(hh[t])return hh[t];if(!Hs[t])return t;var e=Hs[t],n;for(n in e)if(e.hasOwnProperty(n)&&n in P0)return hh[t]=e[n];return t}var N0=Fu("animationend"),b0=Fu("animationiteration"),D0=Fu("animationstart"),O0=Fu("transitionend"),V0=new Map,Hg="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function zr(t,e){V0.set(t,e),xs(e,[t])}for(var dh=0;dh<Hg.length;dh++){var fh=Hg[dh],AS=fh.toLowerCase(),CS=fh[0].toUpperCase()+fh.slice(1);zr(AS,"on"+CS)}zr(N0,"onAnimationEnd");zr(b0,"onAnimationIteration");zr(D0,"onAnimationStart");zr("dblclick","onDoubleClick");zr("focusin","onFocus");zr("focusout","onBlur");zr(O0,"onTransitionEnd");hi("onMouseEnter",["mouseout","mouseover"]);hi("onMouseLeave",["mouseout","mouseover"]);hi("onPointerEnter",["pointerout","pointerover"]);hi("onPointerLeave",["pointerout","pointerover"]);xs("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));xs("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));xs("onBeforeInput",["compositionend","keypress","textInput","paste"]);xs("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));xs("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));xs("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var yo="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),kS=new Set("cancel close invalid load scroll toggle".split(" ").concat(yo));function qg(t,e,n){var r=t.type||"unknown-event";t.currentTarget=n,A1(r,e,void 0,t),t.currentTarget=null}function L0(t,e){e=(e&4)!==0;for(var n=0;n<t.length;n++){var r=t[n],s=r.event;r=r.listeners;e:{var i=void 0;if(e)for(var o=r.length-1;0<=o;o--){var l=r[o],u=l.instance,c=l.currentTarget;if(l=l.listener,u!==i&&s.isPropagationStopped())break e;qg(s,l,c),i=u}else for(o=0;o<r.length;o++){if(l=r[o],u=l.instance,c=l.currentTarget,l=l.listener,u!==i&&s.isPropagationStopped())break e;qg(s,l,c),i=u}}}if(Gl)throw t=id,Gl=!1,id=null,t}function ge(t,e){var n=e[md];n===void 0&&(n=e[md]=new Set);var r=t+"__bubble";n.has(r)||(M0(e,t,2,!1),n.add(r))}function ph(t,e,n){var r=0;e&&(r|=4),M0(n,t,r,e)}var il="_reactListening"+Math.random().toString(36).slice(2);function Ko(t){if(!t[il]){t[il]=!0,Wv.forEach(function(n){n!=="selectionchange"&&(kS.has(n)||ph(n,!1,t),ph(n,!0,t))});var e=t.nodeType===9?t:t.ownerDocument;e===null||e[il]||(e[il]=!0,ph("selectionchange",!1,e))}}function M0(t,e,n,r){switch(w0(e)){case 1:var s=B1;break;case 4:s=$1;break;default:s=kf}n=s.bind(null,e,n,t),s=void 0,!sd||e!=="touchstart"&&e!=="touchmove"&&e!=="wheel"||(s=!0),r?s!==void 0?t.addEventListener(e,n,{capture:!0,passive:s}):t.addEventListener(e,n,!0):s!==void 0?t.addEventListener(e,n,{passive:s}):t.addEventListener(e,n,!1)}function mh(t,e,n,r,s){var i=r;if(!(e&1)&&!(e&2)&&r!==null)e:for(;;){if(r===null)return;var o=r.tag;if(o===3||o===4){var l=r.stateNode.containerInfo;if(l===s||l.nodeType===8&&l.parentNode===s)break;if(o===4)for(o=r.return;o!==null;){var u=o.tag;if((u===3||u===4)&&(u=o.stateNode.containerInfo,u===s||u.nodeType===8&&u.parentNode===s))return;o=o.return}for(;l!==null;){if(o=ss(l),o===null)return;if(u=o.tag,u===5||u===6){r=i=o;continue e}l=l.parentNode}}r=r.return}o0(function(){var c=i,d=xf(n),m=[];e:{var g=V0.get(t);if(g!==void 0){var w=Pf,A=t;switch(t){case"keypress":if(Cl(n)===0)break e;case"keydown":case"keyup":w=sS;break;case"focusin":A="focus",w=lh;break;case"focusout":A="blur",w=lh;break;case"beforeblur":case"afterblur":w=lh;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":w=Og;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":w=q1;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":w=aS;break;case N0:case b0:case D0:w=Q1;break;case O0:w=uS;break;case"scroll":w=W1;break;case"wheel":w=hS;break;case"copy":case"cut":case"paste":w=X1;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":w=Lg}var P=(e&4)!==0,N=!P&&t==="scroll",x=P?g!==null?g+"Capture":null:g;P=[];for(var v=c,k;v!==null;){k=v;var D=k.stateNode;if(k.tag===5&&D!==null&&(k=D,x!==null&&(D=zo(v,x),D!=null&&P.push(Go(v,D,k)))),N)break;v=v.return}0<P.length&&(g=new w(g,A,null,n,d),m.push({event:g,listeners:P}))}}if(!(e&7)){e:{if(g=t==="mouseover"||t==="pointerover",w=t==="mouseout"||t==="pointerout",g&&n!==nd&&(A=n.relatedTarget||n.fromElement)&&(ss(A)||A[jn]))break e;if((w||g)&&(g=d.window===d?d:(g=d.ownerDocument)?g.defaultView||g.parentWindow:window,w?(A=n.relatedTarget||n.toElement,w=c,A=A?ss(A):null,A!==null&&(N=Ss(A),A!==N||A.tag!==5&&A.tag!==6)&&(A=null)):(w=null,A=c),w!==A)){if(P=Og,D="onMouseLeave",x="onMouseEnter",v="mouse",(t==="pointerout"||t==="pointerover")&&(P=Lg,D="onPointerLeave",x="onPointerEnter",v="pointer"),N=w==null?g:qs(w),k=A==null?g:qs(A),g=new P(D,v+"leave",w,n,d),g.target=N,g.relatedTarget=k,D=null,ss(d)===c&&(P=new P(x,v+"enter",A,n,d),P.target=k,P.relatedTarget=N,D=P),N=D,w&&A)t:{for(P=w,x=A,v=0,k=P;k;k=Ls(k))v++;for(k=0,D=x;D;D=Ls(D))k++;for(;0<v-k;)P=Ls(P),v--;for(;0<k-v;)x=Ls(x),k--;for(;v--;){if(P===x||x!==null&&P===x.alternate)break t;P=Ls(P),x=Ls(x)}P=null}else P=null;w!==null&&Kg(m,g,w,P,!1),A!==null&&N!==null&&Kg(m,N,A,P,!0)}}e:{if(g=c?qs(c):window,w=g.nodeName&&g.nodeName.toLowerCase(),w==="select"||w==="input"&&g.type==="file")var U=_S;else if(Ug(g))if(A0)U=TS;else{U=wS;var L=vS}else(w=g.nodeName)&&w.toLowerCase()==="input"&&(g.type==="checkbox"||g.type==="radio")&&(U=ES);if(U&&(U=U(t,c))){S0(m,U,n,d);break e}L&&L(t,g,c),t==="focusout"&&(L=g._wrapperState)&&L.controlled&&g.type==="number"&&Xh(g,"number",g.value)}switch(L=c?qs(c):window,t){case"focusin":(Ug(L)||L.contentEditable==="true")&&(Ws=L,ud=c,Co=null);break;case"focusout":Co=ud=Ws=null;break;case"mousedown":cd=!0;break;case"contextmenu":case"mouseup":case"dragend":cd=!1,Wg(m,n,d);break;case"selectionchange":if(SS)break;case"keydown":case"keyup":Wg(m,n,d)}var E;if(bf)e:{switch(t){case"compositionstart":var _="onCompositionStart";break e;case"compositionend":_="onCompositionEnd";break e;case"compositionupdate":_="onCompositionUpdate";break e}_=void 0}else $s?I0(t,n)&&(_="onCompositionEnd"):t==="keydown"&&n.keyCode===229&&(_="onCompositionStart");_&&(T0&&n.locale!=="ko"&&($s||_!=="onCompositionStart"?_==="onCompositionEnd"&&$s&&(E=E0()):(hr=d,Rf="value"in hr?hr.value:hr.textContent,$s=!0)),L=Zl(c,_),0<L.length&&(_=new Vg(_,t,null,n,d),m.push({event:_,listeners:L}),E?_.data=E:(E=x0(n),E!==null&&(_.data=E)))),(E=fS?pS(t,n):mS(t,n))&&(c=Zl(c,"onBeforeInput"),0<c.length&&(d=new Vg("onBeforeInput","beforeinput",null,n,d),m.push({event:d,listeners:c}),d.data=E))}L0(m,e)})}function Go(t,e,n){return{instance:t,listener:e,currentTarget:n}}function Zl(t,e){for(var n=e+"Capture",r=[];t!==null;){var s=t,i=s.stateNode;s.tag===5&&i!==null&&(s=i,i=zo(t,n),i!=null&&r.unshift(Go(t,i,s)),i=zo(t,e),i!=null&&r.push(Go(t,i,s))),t=t.return}return r}function Ls(t){if(t===null)return null;do t=t.return;while(t&&t.tag!==5);return t||null}function Kg(t,e,n,r,s){for(var i=e._reactName,o=[];n!==null&&n!==r;){var l=n,u=l.alternate,c=l.stateNode;if(u!==null&&u===r)break;l.tag===5&&c!==null&&(l=c,s?(u=zo(n,i),u!=null&&o.unshift(Go(n,u,l))):s||(u=zo(n,i),u!=null&&o.push(Go(n,u,l)))),n=n.return}o.length!==0&&t.push({event:e,listeners:o})}var RS=/\r\n?/g,PS=/\u0000|\uFFFD/g;function Gg(t){return(typeof t=="string"?t:""+t).replace(RS,`
`).replace(PS,"")}function ol(t,e,n){if(e=Gg(e),Gg(t)!==e&&n)throw Error(F(425))}function eu(){}var hd=null,dd=null;function fd(t,e){return t==="textarea"||t==="noscript"||typeof e.children=="string"||typeof e.children=="number"||typeof e.dangerouslySetInnerHTML=="object"&&e.dangerouslySetInnerHTML!==null&&e.dangerouslySetInnerHTML.__html!=null}var pd=typeof setTimeout=="function"?setTimeout:void 0,NS=typeof clearTimeout=="function"?clearTimeout:void 0,Qg=typeof Promise=="function"?Promise:void 0,bS=typeof queueMicrotask=="function"?queueMicrotask:typeof Qg<"u"?function(t){return Qg.resolve(null).then(t).catch(DS)}:pd;function DS(t){setTimeout(function(){throw t})}function gh(t,e){var n=e,r=0;do{var s=n.nextSibling;if(t.removeChild(n),s&&s.nodeType===8)if(n=s.data,n==="/$"){if(r===0){t.removeChild(s),Wo(e);return}r--}else n!=="$"&&n!=="$?"&&n!=="$!"||r++;n=s}while(n);Wo(e)}function yr(t){for(;t!=null;t=t.nextSibling){var e=t.nodeType;if(e===1||e===3)break;if(e===8){if(e=t.data,e==="$"||e==="$!"||e==="$?")break;if(e==="/$")return null}}return t}function Yg(t){t=t.previousSibling;for(var e=0;t;){if(t.nodeType===8){var n=t.data;if(n==="$"||n==="$!"||n==="$?"){if(e===0)return t;e--}else n==="/$"&&e++}t=t.previousSibling}return null}var ki=Math.random().toString(36).slice(2),fn="__reactFiber$"+ki,Qo="__reactProps$"+ki,jn="__reactContainer$"+ki,md="__reactEvents$"+ki,OS="__reactListeners$"+ki,VS="__reactHandles$"+ki;function ss(t){var e=t[fn];if(e)return e;for(var n=t.parentNode;n;){if(e=n[jn]||n[fn]){if(n=e.alternate,e.child!==null||n!==null&&n.child!==null)for(t=Yg(t);t!==null;){if(n=t[fn])return n;t=Yg(t)}return e}t=n,n=t.parentNode}return null}function Ea(t){return t=t[fn]||t[jn],!t||t.tag!==5&&t.tag!==6&&t.tag!==13&&t.tag!==3?null:t}function qs(t){if(t.tag===5||t.tag===6)return t.stateNode;throw Error(F(33))}function zu(t){return t[Qo]||null}var gd=[],Ks=-1;function Br(t){return{current:t}}function ye(t){0>Ks||(t.current=gd[Ks],gd[Ks]=null,Ks--)}function fe(t,e){Ks++,gd[Ks]=t.current,t.current=e}var Pr={},lt=Br(Pr),Tt=Br(!1),ds=Pr;function di(t,e){var n=t.type.contextTypes;if(!n)return Pr;var r=t.stateNode;if(r&&r.__reactInternalMemoizedUnmaskedChildContext===e)return r.__reactInternalMemoizedMaskedChildContext;var s={},i;for(i in n)s[i]=e[i];return r&&(t=t.stateNode,t.__reactInternalMemoizedUnmaskedChildContext=e,t.__reactInternalMemoizedMaskedChildContext=s),s}function It(t){return t=t.childContextTypes,t!=null}function tu(){ye(Tt),ye(lt)}function Xg(t,e,n){if(lt.current!==Pr)throw Error(F(168));fe(lt,e),fe(Tt,n)}function j0(t,e,n){var r=t.stateNode;if(e=e.childContextTypes,typeof r.getChildContext!="function")return n;r=r.getChildContext();for(var s in r)if(!(s in e))throw Error(F(108,v1(t)||"Unknown",s));return Se({},n,r)}function nu(t){return t=(t=t.stateNode)&&t.__reactInternalMemoizedMergedChildContext||Pr,ds=lt.current,fe(lt,t),fe(Tt,Tt.current),!0}function Jg(t,e,n){var r=t.stateNode;if(!r)throw Error(F(169));n?(t=j0(t,e,ds),r.__reactInternalMemoizedMergedChildContext=t,ye(Tt),ye(lt),fe(lt,t)):ye(Tt),fe(Tt,n)}var An=null,Bu=!1,yh=!1;function U0(t){An===null?An=[t]:An.push(t)}function LS(t){Bu=!0,U0(t)}function $r(){if(!yh&&An!==null){yh=!0;var t=0,e=ue;try{var n=An;for(ue=1;t<n.length;t++){var r=n[t];do r=r(!0);while(r!==null)}An=null,Bu=!1}catch(s){throw An!==null&&(An=An.slice(t+1)),c0(Sf,$r),s}finally{ue=e,yh=!1}}return null}var Gs=[],Qs=0,ru=null,su=0,Mt=[],jt=0,fs=null,kn=1,Rn="";function ts(t,e){Gs[Qs++]=su,Gs[Qs++]=ru,ru=t,su=e}function F0(t,e,n){Mt[jt++]=kn,Mt[jt++]=Rn,Mt[jt++]=fs,fs=t;var r=kn;t=Rn;var s=32-Zt(r)-1;r&=~(1<<s),n+=1;var i=32-Zt(e)+s;if(30<i){var o=s-s%5;i=(r&(1<<o)-1).toString(32),r>>=o,s-=o,kn=1<<32-Zt(e)+s|n<<s|r,Rn=i+t}else kn=1<<i|n<<s|r,Rn=t}function Of(t){t.return!==null&&(ts(t,1),F0(t,1,0))}function Vf(t){for(;t===ru;)ru=Gs[--Qs],Gs[Qs]=null,su=Gs[--Qs],Gs[Qs]=null;for(;t===fs;)fs=Mt[--jt],Mt[jt]=null,Rn=Mt[--jt],Mt[jt]=null,kn=Mt[--jt],Mt[jt]=null}var bt=null,Rt=null,ve=!1,Xt=null;function z0(t,e){var n=Ut(5,null,null,0);n.elementType="DELETED",n.stateNode=e,n.return=t,e=t.deletions,e===null?(t.deletions=[n],t.flags|=16):e.push(n)}function Zg(t,e){switch(t.tag){case 5:var n=t.type;return e=e.nodeType!==1||n.toLowerCase()!==e.nodeName.toLowerCase()?null:e,e!==null?(t.stateNode=e,bt=t,Rt=yr(e.firstChild),!0):!1;case 6:return e=t.pendingProps===""||e.nodeType!==3?null:e,e!==null?(t.stateNode=e,bt=t,Rt=null,!0):!1;case 13:return e=e.nodeType!==8?null:e,e!==null?(n=fs!==null?{id:kn,overflow:Rn}:null,t.memoizedState={dehydrated:e,treeContext:n,retryLane:1073741824},n=Ut(18,null,null,0),n.stateNode=e,n.return=t,t.child=n,bt=t,Rt=null,!0):!1;default:return!1}}function yd(t){return(t.mode&1)!==0&&(t.flags&128)===0}function _d(t){if(ve){var e=Rt;if(e){var n=e;if(!Zg(t,e)){if(yd(t))throw Error(F(418));e=yr(n.nextSibling);var r=bt;e&&Zg(t,e)?z0(r,n):(t.flags=t.flags&-4097|2,ve=!1,bt=t)}}else{if(yd(t))throw Error(F(418));t.flags=t.flags&-4097|2,ve=!1,bt=t}}}function ey(t){for(t=t.return;t!==null&&t.tag!==5&&t.tag!==3&&t.tag!==13;)t=t.return;bt=t}function al(t){if(t!==bt)return!1;if(!ve)return ey(t),ve=!0,!1;var e;if((e=t.tag!==3)&&!(e=t.tag!==5)&&(e=t.type,e=e!=="head"&&e!=="body"&&!fd(t.type,t.memoizedProps)),e&&(e=Rt)){if(yd(t))throw B0(),Error(F(418));for(;e;)z0(t,e),e=yr(e.nextSibling)}if(ey(t),t.tag===13){if(t=t.memoizedState,t=t!==null?t.dehydrated:null,!t)throw Error(F(317));e:{for(t=t.nextSibling,e=0;t;){if(t.nodeType===8){var n=t.data;if(n==="/$"){if(e===0){Rt=yr(t.nextSibling);break e}e--}else n!=="$"&&n!=="$!"&&n!=="$?"||e++}t=t.nextSibling}Rt=null}}else Rt=bt?yr(t.stateNode.nextSibling):null;return!0}function B0(){for(var t=Rt;t;)t=yr(t.nextSibling)}function fi(){Rt=bt=null,ve=!1}function Lf(t){Xt===null?Xt=[t]:Xt.push(t)}var MS=qn.ReactCurrentBatchConfig;function lo(t,e,n){if(t=n.ref,t!==null&&typeof t!="function"&&typeof t!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(F(309));var r=n.stateNode}if(!r)throw Error(F(147,t));var s=r,i=""+t;return e!==null&&e.ref!==null&&typeof e.ref=="function"&&e.ref._stringRef===i?e.ref:(e=function(o){var l=s.refs;o===null?delete l[i]:l[i]=o},e._stringRef=i,e)}if(typeof t!="string")throw Error(F(284));if(!n._owner)throw Error(F(290,t))}return t}function ll(t,e){throw t=Object.prototype.toString.call(e),Error(F(31,t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t))}function ty(t){var e=t._init;return e(t._payload)}function $0(t){function e(x,v){if(t){var k=x.deletions;k===null?(x.deletions=[v],x.flags|=16):k.push(v)}}function n(x,v){if(!t)return null;for(;v!==null;)e(x,v),v=v.sibling;return null}function r(x,v){for(x=new Map;v!==null;)v.key!==null?x.set(v.key,v):x.set(v.index,v),v=v.sibling;return x}function s(x,v){return x=Er(x,v),x.index=0,x.sibling=null,x}function i(x,v,k){return x.index=k,t?(k=x.alternate,k!==null?(k=k.index,k<v?(x.flags|=2,v):k):(x.flags|=2,v)):(x.flags|=1048576,v)}function o(x){return t&&x.alternate===null&&(x.flags|=2),x}function l(x,v,k,D){return v===null||v.tag!==6?(v=xh(k,x.mode,D),v.return=x,v):(v=s(v,k),v.return=x,v)}function u(x,v,k,D){var U=k.type;return U===Bs?d(x,v,k.props.children,D,k.key):v!==null&&(v.elementType===U||typeof U=="object"&&U!==null&&U.$$typeof===rr&&ty(U)===v.type)?(D=s(v,k.props),D.ref=lo(x,v,k),D.return=x,D):(D=Ol(k.type,k.key,k.props,null,x.mode,D),D.ref=lo(x,v,k),D.return=x,D)}function c(x,v,k,D){return v===null||v.tag!==4||v.stateNode.containerInfo!==k.containerInfo||v.stateNode.implementation!==k.implementation?(v=Sh(k,x.mode,D),v.return=x,v):(v=s(v,k.children||[]),v.return=x,v)}function d(x,v,k,D,U){return v===null||v.tag!==7?(v=cs(k,x.mode,D,U),v.return=x,v):(v=s(v,k),v.return=x,v)}function m(x,v,k){if(typeof v=="string"&&v!==""||typeof v=="number")return v=xh(""+v,x.mode,k),v.return=x,v;if(typeof v=="object"&&v!==null){switch(v.$$typeof){case Xa:return k=Ol(v.type,v.key,v.props,null,x.mode,k),k.ref=lo(x,null,v),k.return=x,k;case zs:return v=Sh(v,x.mode,k),v.return=x,v;case rr:var D=v._init;return m(x,D(v._payload),k)}if(mo(v)||ro(v))return v=cs(v,x.mode,k,null),v.return=x,v;ll(x,v)}return null}function g(x,v,k,D){var U=v!==null?v.key:null;if(typeof k=="string"&&k!==""||typeof k=="number")return U!==null?null:l(x,v,""+k,D);if(typeof k=="object"&&k!==null){switch(k.$$typeof){case Xa:return k.key===U?u(x,v,k,D):null;case zs:return k.key===U?c(x,v,k,D):null;case rr:return U=k._init,g(x,v,U(k._payload),D)}if(mo(k)||ro(k))return U!==null?null:d(x,v,k,D,null);ll(x,k)}return null}function w(x,v,k,D,U){if(typeof D=="string"&&D!==""||typeof D=="number")return x=x.get(k)||null,l(v,x,""+D,U);if(typeof D=="object"&&D!==null){switch(D.$$typeof){case Xa:return x=x.get(D.key===null?k:D.key)||null,u(v,x,D,U);case zs:return x=x.get(D.key===null?k:D.key)||null,c(v,x,D,U);case rr:var L=D._init;return w(x,v,k,L(D._payload),U)}if(mo(D)||ro(D))return x=x.get(k)||null,d(v,x,D,U,null);ll(v,D)}return null}function A(x,v,k,D){for(var U=null,L=null,E=v,_=v=0,S=null;E!==null&&_<k.length;_++){E.index>_?(S=E,E=null):S=E.sibling;var R=g(x,E,k[_],D);if(R===null){E===null&&(E=S);break}t&&E&&R.alternate===null&&e(x,E),v=i(R,v,_),L===null?U=R:L.sibling=R,L=R,E=S}if(_===k.length)return n(x,E),ve&&ts(x,_),U;if(E===null){for(;_<k.length;_++)E=m(x,k[_],D),E!==null&&(v=i(E,v,_),L===null?U=E:L.sibling=E,L=E);return ve&&ts(x,_),U}for(E=r(x,E);_<k.length;_++)S=w(E,x,_,k[_],D),S!==null&&(t&&S.alternate!==null&&E.delete(S.key===null?_:S.key),v=i(S,v,_),L===null?U=S:L.sibling=S,L=S);return t&&E.forEach(function(T){return e(x,T)}),ve&&ts(x,_),U}function P(x,v,k,D){var U=ro(k);if(typeof U!="function")throw Error(F(150));if(k=U.call(k),k==null)throw Error(F(151));for(var L=U=null,E=v,_=v=0,S=null,R=k.next();E!==null&&!R.done;_++,R=k.next()){E.index>_?(S=E,E=null):S=E.sibling;var T=g(x,E,R.value,D);if(T===null){E===null&&(E=S);break}t&&E&&T.alternate===null&&e(x,E),v=i(T,v,_),L===null?U=T:L.sibling=T,L=T,E=S}if(R.done)return n(x,E),ve&&ts(x,_),U;if(E===null){for(;!R.done;_++,R=k.next())R=m(x,R.value,D),R!==null&&(v=i(R,v,_),L===null?U=R:L.sibling=R,L=R);return ve&&ts(x,_),U}for(E=r(x,E);!R.done;_++,R=k.next())R=w(E,x,_,R.value,D),R!==null&&(t&&R.alternate!==null&&E.delete(R.key===null?_:R.key),v=i(R,v,_),L===null?U=R:L.sibling=R,L=R);return t&&E.forEach(function(C){return e(x,C)}),ve&&ts(x,_),U}function N(x,v,k,D){if(typeof k=="object"&&k!==null&&k.type===Bs&&k.key===null&&(k=k.props.children),typeof k=="object"&&k!==null){switch(k.$$typeof){case Xa:e:{for(var U=k.key,L=v;L!==null;){if(L.key===U){if(U=k.type,U===Bs){if(L.tag===7){n(x,L.sibling),v=s(L,k.props.children),v.return=x,x=v;break e}}else if(L.elementType===U||typeof U=="object"&&U!==null&&U.$$typeof===rr&&ty(U)===L.type){n(x,L.sibling),v=s(L,k.props),v.ref=lo(x,L,k),v.return=x,x=v;break e}n(x,L);break}else e(x,L);L=L.sibling}k.type===Bs?(v=cs(k.props.children,x.mode,D,k.key),v.return=x,x=v):(D=Ol(k.type,k.key,k.props,null,x.mode,D),D.ref=lo(x,v,k),D.return=x,x=D)}return o(x);case zs:e:{for(L=k.key;v!==null;){if(v.key===L)if(v.tag===4&&v.stateNode.containerInfo===k.containerInfo&&v.stateNode.implementation===k.implementation){n(x,v.sibling),v=s(v,k.children||[]),v.return=x,x=v;break e}else{n(x,v);break}else e(x,v);v=v.sibling}v=Sh(k,x.mode,D),v.return=x,x=v}return o(x);case rr:return L=k._init,N(x,v,L(k._payload),D)}if(mo(k))return A(x,v,k,D);if(ro(k))return P(x,v,k,D);ll(x,k)}return typeof k=="string"&&k!==""||typeof k=="number"?(k=""+k,v!==null&&v.tag===6?(n(x,v.sibling),v=s(v,k),v.return=x,x=v):(n(x,v),v=xh(k,x.mode,D),v.return=x,x=v),o(x)):n(x,v)}return N}var pi=$0(!0),W0=$0(!1),iu=Br(null),ou=null,Ys=null,Mf=null;function jf(){Mf=Ys=ou=null}function Uf(t){var e=iu.current;ye(iu),t._currentValue=e}function vd(t,e,n){for(;t!==null;){var r=t.alternate;if((t.childLanes&e)!==e?(t.childLanes|=e,r!==null&&(r.childLanes|=e)):r!==null&&(r.childLanes&e)!==e&&(r.childLanes|=e),t===n)break;t=t.return}}function si(t,e){ou=t,Mf=Ys=null,t=t.dependencies,t!==null&&t.firstContext!==null&&(t.lanes&e&&(Et=!0),t.firstContext=null)}function Bt(t){var e=t._currentValue;if(Mf!==t)if(t={context:t,memoizedValue:e,next:null},Ys===null){if(ou===null)throw Error(F(308));Ys=t,ou.dependencies={lanes:0,firstContext:t}}else Ys=Ys.next=t;return e}var is=null;function Ff(t){is===null?is=[t]:is.push(t)}function H0(t,e,n,r){var s=e.interleaved;return s===null?(n.next=n,Ff(e)):(n.next=s.next,s.next=n),e.interleaved=n,Un(t,r)}function Un(t,e){t.lanes|=e;var n=t.alternate;for(n!==null&&(n.lanes|=e),n=t,t=t.return;t!==null;)t.childLanes|=e,n=t.alternate,n!==null&&(n.childLanes|=e),n=t,t=t.return;return n.tag===3?n.stateNode:null}var sr=!1;function zf(t){t.updateQueue={baseState:t.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function q0(t,e){t=t.updateQueue,e.updateQueue===t&&(e.updateQueue={baseState:t.baseState,firstBaseUpdate:t.firstBaseUpdate,lastBaseUpdate:t.lastBaseUpdate,shared:t.shared,effects:t.effects})}function Dn(t,e){return{eventTime:t,lane:e,tag:0,payload:null,callback:null,next:null}}function _r(t,e,n){var r=t.updateQueue;if(r===null)return null;if(r=r.shared,oe&2){var s=r.pending;return s===null?e.next=e:(e.next=s.next,s.next=e),r.pending=e,Un(t,n)}return s=r.interleaved,s===null?(e.next=e,Ff(r)):(e.next=s.next,s.next=e),r.interleaved=e,Un(t,n)}function kl(t,e,n){if(e=e.updateQueue,e!==null&&(e=e.shared,(n&4194240)!==0)){var r=e.lanes;r&=t.pendingLanes,n|=r,e.lanes=n,Af(t,n)}}function ny(t,e){var n=t.updateQueue,r=t.alternate;if(r!==null&&(r=r.updateQueue,n===r)){var s=null,i=null;if(n=n.firstBaseUpdate,n!==null){do{var o={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};i===null?s=i=o:i=i.next=o,n=n.next}while(n!==null);i===null?s=i=e:i=i.next=e}else s=i=e;n={baseState:r.baseState,firstBaseUpdate:s,lastBaseUpdate:i,shared:r.shared,effects:r.effects},t.updateQueue=n;return}t=n.lastBaseUpdate,t===null?n.firstBaseUpdate=e:t.next=e,n.lastBaseUpdate=e}function au(t,e,n,r){var s=t.updateQueue;sr=!1;var i=s.firstBaseUpdate,o=s.lastBaseUpdate,l=s.shared.pending;if(l!==null){s.shared.pending=null;var u=l,c=u.next;u.next=null,o===null?i=c:o.next=c,o=u;var d=t.alternate;d!==null&&(d=d.updateQueue,l=d.lastBaseUpdate,l!==o&&(l===null?d.firstBaseUpdate=c:l.next=c,d.lastBaseUpdate=u))}if(i!==null){var m=s.baseState;o=0,d=c=u=null,l=i;do{var g=l.lane,w=l.eventTime;if((r&g)===g){d!==null&&(d=d.next={eventTime:w,lane:0,tag:l.tag,payload:l.payload,callback:l.callback,next:null});e:{var A=t,P=l;switch(g=e,w=n,P.tag){case 1:if(A=P.payload,typeof A=="function"){m=A.call(w,m,g);break e}m=A;break e;case 3:A.flags=A.flags&-65537|128;case 0:if(A=P.payload,g=typeof A=="function"?A.call(w,m,g):A,g==null)break e;m=Se({},m,g);break e;case 2:sr=!0}}l.callback!==null&&l.lane!==0&&(t.flags|=64,g=s.effects,g===null?s.effects=[l]:g.push(l))}else w={eventTime:w,lane:g,tag:l.tag,payload:l.payload,callback:l.callback,next:null},d===null?(c=d=w,u=m):d=d.next=w,o|=g;if(l=l.next,l===null){if(l=s.shared.pending,l===null)break;g=l,l=g.next,g.next=null,s.lastBaseUpdate=g,s.shared.pending=null}}while(!0);if(d===null&&(u=m),s.baseState=u,s.firstBaseUpdate=c,s.lastBaseUpdate=d,e=s.shared.interleaved,e!==null){s=e;do o|=s.lane,s=s.next;while(s!==e)}else i===null&&(s.shared.lanes=0);ms|=o,t.lanes=o,t.memoizedState=m}}function ry(t,e,n){if(t=e.effects,e.effects=null,t!==null)for(e=0;e<t.length;e++){var r=t[e],s=r.callback;if(s!==null){if(r.callback=null,r=n,typeof s!="function")throw Error(F(191,s));s.call(r)}}}var Ta={},gn=Br(Ta),Yo=Br(Ta),Xo=Br(Ta);function os(t){if(t===Ta)throw Error(F(174));return t}function Bf(t,e){switch(fe(Xo,e),fe(Yo,t),fe(gn,Ta),t=e.nodeType,t){case 9:case 11:e=(e=e.documentElement)?e.namespaceURI:Zh(null,"");break;default:t=t===8?e.parentNode:e,e=t.namespaceURI||null,t=t.tagName,e=Zh(e,t)}ye(gn),fe(gn,e)}function mi(){ye(gn),ye(Yo),ye(Xo)}function K0(t){os(Xo.current);var e=os(gn.current),n=Zh(e,t.type);e!==n&&(fe(Yo,t),fe(gn,n))}function $f(t){Yo.current===t&&(ye(gn),ye(Yo))}var Ee=Br(0);function lu(t){for(var e=t;e!==null;){if(e.tag===13){var n=e.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return e}else if(e.tag===19&&e.memoizedProps.revealOrder!==void 0){if(e.flags&128)return e}else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break;for(;e.sibling===null;){if(e.return===null||e.return===t)return null;e=e.return}e.sibling.return=e.return,e=e.sibling}return null}var _h=[];function Wf(){for(var t=0;t<_h.length;t++)_h[t]._workInProgressVersionPrimary=null;_h.length=0}var Rl=qn.ReactCurrentDispatcher,vh=qn.ReactCurrentBatchConfig,ps=0,Ie=null,Ue=null,We=null,uu=!1,ko=!1,Jo=0,jS=0;function tt(){throw Error(F(321))}function Hf(t,e){if(e===null)return!1;for(var n=0;n<e.length&&n<t.length;n++)if(!rn(t[n],e[n]))return!1;return!0}function qf(t,e,n,r,s,i){if(ps=i,Ie=e,e.memoizedState=null,e.updateQueue=null,e.lanes=0,Rl.current=t===null||t.memoizedState===null?BS:$S,t=n(r,s),ko){i=0;do{if(ko=!1,Jo=0,25<=i)throw Error(F(301));i+=1,We=Ue=null,e.updateQueue=null,Rl.current=WS,t=n(r,s)}while(ko)}if(Rl.current=cu,e=Ue!==null&&Ue.next!==null,ps=0,We=Ue=Ie=null,uu=!1,e)throw Error(F(300));return t}function Kf(){var t=Jo!==0;return Jo=0,t}function hn(){var t={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return We===null?Ie.memoizedState=We=t:We=We.next=t,We}function $t(){if(Ue===null){var t=Ie.alternate;t=t!==null?t.memoizedState:null}else t=Ue.next;var e=We===null?Ie.memoizedState:We.next;if(e!==null)We=e,Ue=t;else{if(t===null)throw Error(F(310));Ue=t,t={memoizedState:Ue.memoizedState,baseState:Ue.baseState,baseQueue:Ue.baseQueue,queue:Ue.queue,next:null},We===null?Ie.memoizedState=We=t:We=We.next=t}return We}function Zo(t,e){return typeof e=="function"?e(t):e}function wh(t){var e=$t(),n=e.queue;if(n===null)throw Error(F(311));n.lastRenderedReducer=t;var r=Ue,s=r.baseQueue,i=n.pending;if(i!==null){if(s!==null){var o=s.next;s.next=i.next,i.next=o}r.baseQueue=s=i,n.pending=null}if(s!==null){i=s.next,r=r.baseState;var l=o=null,u=null,c=i;do{var d=c.lane;if((ps&d)===d)u!==null&&(u=u.next={lane:0,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null}),r=c.hasEagerState?c.eagerState:t(r,c.action);else{var m={lane:d,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null};u===null?(l=u=m,o=r):u=u.next=m,Ie.lanes|=d,ms|=d}c=c.next}while(c!==null&&c!==i);u===null?o=r:u.next=l,rn(r,e.memoizedState)||(Et=!0),e.memoizedState=r,e.baseState=o,e.baseQueue=u,n.lastRenderedState=r}if(t=n.interleaved,t!==null){s=t;do i=s.lane,Ie.lanes|=i,ms|=i,s=s.next;while(s!==t)}else s===null&&(n.lanes=0);return[e.memoizedState,n.dispatch]}function Eh(t){var e=$t(),n=e.queue;if(n===null)throw Error(F(311));n.lastRenderedReducer=t;var r=n.dispatch,s=n.pending,i=e.memoizedState;if(s!==null){n.pending=null;var o=s=s.next;do i=t(i,o.action),o=o.next;while(o!==s);rn(i,e.memoizedState)||(Et=!0),e.memoizedState=i,e.baseQueue===null&&(e.baseState=i),n.lastRenderedState=i}return[i,r]}function G0(){}function Q0(t,e){var n=Ie,r=$t(),s=e(),i=!rn(r.memoizedState,s);if(i&&(r.memoizedState=s,Et=!0),r=r.queue,Gf(J0.bind(null,n,r,t),[t]),r.getSnapshot!==e||i||We!==null&&We.memoizedState.tag&1){if(n.flags|=2048,ea(9,X0.bind(null,n,r,s,e),void 0,null),Ke===null)throw Error(F(349));ps&30||Y0(n,e,s)}return s}function Y0(t,e,n){t.flags|=16384,t={getSnapshot:e,value:n},e=Ie.updateQueue,e===null?(e={lastEffect:null,stores:null},Ie.updateQueue=e,e.stores=[t]):(n=e.stores,n===null?e.stores=[t]:n.push(t))}function X0(t,e,n,r){e.value=n,e.getSnapshot=r,Z0(e)&&ew(t)}function J0(t,e,n){return n(function(){Z0(e)&&ew(t)})}function Z0(t){var e=t.getSnapshot;t=t.value;try{var n=e();return!rn(t,n)}catch{return!0}}function ew(t){var e=Un(t,1);e!==null&&en(e,t,1,-1)}function sy(t){var e=hn();return typeof t=="function"&&(t=t()),e.memoizedState=e.baseState=t,t={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:Zo,lastRenderedState:t},e.queue=t,t=t.dispatch=zS.bind(null,Ie,t),[e.memoizedState,t]}function ea(t,e,n,r){return t={tag:t,create:e,destroy:n,deps:r,next:null},e=Ie.updateQueue,e===null?(e={lastEffect:null,stores:null},Ie.updateQueue=e,e.lastEffect=t.next=t):(n=e.lastEffect,n===null?e.lastEffect=t.next=t:(r=n.next,n.next=t,t.next=r,e.lastEffect=t)),t}function tw(){return $t().memoizedState}function Pl(t,e,n,r){var s=hn();Ie.flags|=t,s.memoizedState=ea(1|e,n,void 0,r===void 0?null:r)}function $u(t,e,n,r){var s=$t();r=r===void 0?null:r;var i=void 0;if(Ue!==null){var o=Ue.memoizedState;if(i=o.destroy,r!==null&&Hf(r,o.deps)){s.memoizedState=ea(e,n,i,r);return}}Ie.flags|=t,s.memoizedState=ea(1|e,n,i,r)}function iy(t,e){return Pl(8390656,8,t,e)}function Gf(t,e){return $u(2048,8,t,e)}function nw(t,e){return $u(4,2,t,e)}function rw(t,e){return $u(4,4,t,e)}function sw(t,e){if(typeof e=="function")return t=t(),e(t),function(){e(null)};if(e!=null)return t=t(),e.current=t,function(){e.current=null}}function iw(t,e,n){return n=n!=null?n.concat([t]):null,$u(4,4,sw.bind(null,e,t),n)}function Qf(){}function ow(t,e){var n=$t();e=e===void 0?null:e;var r=n.memoizedState;return r!==null&&e!==null&&Hf(e,r[1])?r[0]:(n.memoizedState=[t,e],t)}function aw(t,e){var n=$t();e=e===void 0?null:e;var r=n.memoizedState;return r!==null&&e!==null&&Hf(e,r[1])?r[0]:(t=t(),n.memoizedState=[t,e],t)}function lw(t,e,n){return ps&21?(rn(n,e)||(n=f0(),Ie.lanes|=n,ms|=n,t.baseState=!0),e):(t.baseState&&(t.baseState=!1,Et=!0),t.memoizedState=n)}function US(t,e){var n=ue;ue=n!==0&&4>n?n:4,t(!0);var r=vh.transition;vh.transition={};try{t(!1),e()}finally{ue=n,vh.transition=r}}function uw(){return $t().memoizedState}function FS(t,e,n){var r=wr(t);if(n={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null},cw(t))hw(e,n);else if(n=H0(t,e,n,r),n!==null){var s=pt();en(n,t,r,s),dw(n,e,r)}}function zS(t,e,n){var r=wr(t),s={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null};if(cw(t))hw(e,s);else{var i=t.alternate;if(t.lanes===0&&(i===null||i.lanes===0)&&(i=e.lastRenderedReducer,i!==null))try{var o=e.lastRenderedState,l=i(o,n);if(s.hasEagerState=!0,s.eagerState=l,rn(l,o)){var u=e.interleaved;u===null?(s.next=s,Ff(e)):(s.next=u.next,u.next=s),e.interleaved=s;return}}catch{}finally{}n=H0(t,e,s,r),n!==null&&(s=pt(),en(n,t,r,s),dw(n,e,r))}}function cw(t){var e=t.alternate;return t===Ie||e!==null&&e===Ie}function hw(t,e){ko=uu=!0;var n=t.pending;n===null?e.next=e:(e.next=n.next,n.next=e),t.pending=e}function dw(t,e,n){if(n&4194240){var r=e.lanes;r&=t.pendingLanes,n|=r,e.lanes=n,Af(t,n)}}var cu={readContext:Bt,useCallback:tt,useContext:tt,useEffect:tt,useImperativeHandle:tt,useInsertionEffect:tt,useLayoutEffect:tt,useMemo:tt,useReducer:tt,useRef:tt,useState:tt,useDebugValue:tt,useDeferredValue:tt,useTransition:tt,useMutableSource:tt,useSyncExternalStore:tt,useId:tt,unstable_isNewReconciler:!1},BS={readContext:Bt,useCallback:function(t,e){return hn().memoizedState=[t,e===void 0?null:e],t},useContext:Bt,useEffect:iy,useImperativeHandle:function(t,e,n){return n=n!=null?n.concat([t]):null,Pl(4194308,4,sw.bind(null,e,t),n)},useLayoutEffect:function(t,e){return Pl(4194308,4,t,e)},useInsertionEffect:function(t,e){return Pl(4,2,t,e)},useMemo:function(t,e){var n=hn();return e=e===void 0?null:e,t=t(),n.memoizedState=[t,e],t},useReducer:function(t,e,n){var r=hn();return e=n!==void 0?n(e):e,r.memoizedState=r.baseState=e,t={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:t,lastRenderedState:e},r.queue=t,t=t.dispatch=FS.bind(null,Ie,t),[r.memoizedState,t]},useRef:function(t){var e=hn();return t={current:t},e.memoizedState=t},useState:sy,useDebugValue:Qf,useDeferredValue:function(t){return hn().memoizedState=t},useTransition:function(){var t=sy(!1),e=t[0];return t=US.bind(null,t[1]),hn().memoizedState=t,[e,t]},useMutableSource:function(){},useSyncExternalStore:function(t,e,n){var r=Ie,s=hn();if(ve){if(n===void 0)throw Error(F(407));n=n()}else{if(n=e(),Ke===null)throw Error(F(349));ps&30||Y0(r,e,n)}s.memoizedState=n;var i={value:n,getSnapshot:e};return s.queue=i,iy(J0.bind(null,r,i,t),[t]),r.flags|=2048,ea(9,X0.bind(null,r,i,n,e),void 0,null),n},useId:function(){var t=hn(),e=Ke.identifierPrefix;if(ve){var n=Rn,r=kn;n=(r&~(1<<32-Zt(r)-1)).toString(32)+n,e=":"+e+"R"+n,n=Jo++,0<n&&(e+="H"+n.toString(32)),e+=":"}else n=jS++,e=":"+e+"r"+n.toString(32)+":";return t.memoizedState=e},unstable_isNewReconciler:!1},$S={readContext:Bt,useCallback:ow,useContext:Bt,useEffect:Gf,useImperativeHandle:iw,useInsertionEffect:nw,useLayoutEffect:rw,useMemo:aw,useReducer:wh,useRef:tw,useState:function(){return wh(Zo)},useDebugValue:Qf,useDeferredValue:function(t){var e=$t();return lw(e,Ue.memoizedState,t)},useTransition:function(){var t=wh(Zo)[0],e=$t().memoizedState;return[t,e]},useMutableSource:G0,useSyncExternalStore:Q0,useId:uw,unstable_isNewReconciler:!1},WS={readContext:Bt,useCallback:ow,useContext:Bt,useEffect:Gf,useImperativeHandle:iw,useInsertionEffect:nw,useLayoutEffect:rw,useMemo:aw,useReducer:Eh,useRef:tw,useState:function(){return Eh(Zo)},useDebugValue:Qf,useDeferredValue:function(t){var e=$t();return Ue===null?e.memoizedState=t:lw(e,Ue.memoizedState,t)},useTransition:function(){var t=Eh(Zo)[0],e=$t().memoizedState;return[t,e]},useMutableSource:G0,useSyncExternalStore:Q0,useId:uw,unstable_isNewReconciler:!1};function Qt(t,e){if(t&&t.defaultProps){e=Se({},e),t=t.defaultProps;for(var n in t)e[n]===void 0&&(e[n]=t[n]);return e}return e}function wd(t,e,n,r){e=t.memoizedState,n=n(r,e),n=n==null?e:Se({},e,n),t.memoizedState=n,t.lanes===0&&(t.updateQueue.baseState=n)}var Wu={isMounted:function(t){return(t=t._reactInternals)?Ss(t)===t:!1},enqueueSetState:function(t,e,n){t=t._reactInternals;var r=pt(),s=wr(t),i=Dn(r,s);i.payload=e,n!=null&&(i.callback=n),e=_r(t,i,s),e!==null&&(en(e,t,s,r),kl(e,t,s))},enqueueReplaceState:function(t,e,n){t=t._reactInternals;var r=pt(),s=wr(t),i=Dn(r,s);i.tag=1,i.payload=e,n!=null&&(i.callback=n),e=_r(t,i,s),e!==null&&(en(e,t,s,r),kl(e,t,s))},enqueueForceUpdate:function(t,e){t=t._reactInternals;var n=pt(),r=wr(t),s=Dn(n,r);s.tag=2,e!=null&&(s.callback=e),e=_r(t,s,r),e!==null&&(en(e,t,r,n),kl(e,t,r))}};function oy(t,e,n,r,s,i,o){return t=t.stateNode,typeof t.shouldComponentUpdate=="function"?t.shouldComponentUpdate(r,i,o):e.prototype&&e.prototype.isPureReactComponent?!qo(n,r)||!qo(s,i):!0}function fw(t,e,n){var r=!1,s=Pr,i=e.contextType;return typeof i=="object"&&i!==null?i=Bt(i):(s=It(e)?ds:lt.current,r=e.contextTypes,i=(r=r!=null)?di(t,s):Pr),e=new e(n,i),t.memoizedState=e.state!==null&&e.state!==void 0?e.state:null,e.updater=Wu,t.stateNode=e,e._reactInternals=t,r&&(t=t.stateNode,t.__reactInternalMemoizedUnmaskedChildContext=s,t.__reactInternalMemoizedMaskedChildContext=i),e}function ay(t,e,n,r){t=e.state,typeof e.componentWillReceiveProps=="function"&&e.componentWillReceiveProps(n,r),typeof e.UNSAFE_componentWillReceiveProps=="function"&&e.UNSAFE_componentWillReceiveProps(n,r),e.state!==t&&Wu.enqueueReplaceState(e,e.state,null)}function Ed(t,e,n,r){var s=t.stateNode;s.props=n,s.state=t.memoizedState,s.refs={},zf(t);var i=e.contextType;typeof i=="object"&&i!==null?s.context=Bt(i):(i=It(e)?ds:lt.current,s.context=di(t,i)),s.state=t.memoizedState,i=e.getDerivedStateFromProps,typeof i=="function"&&(wd(t,e,i,n),s.state=t.memoizedState),typeof e.getDerivedStateFromProps=="function"||typeof s.getSnapshotBeforeUpdate=="function"||typeof s.UNSAFE_componentWillMount!="function"&&typeof s.componentWillMount!="function"||(e=s.state,typeof s.componentWillMount=="function"&&s.componentWillMount(),typeof s.UNSAFE_componentWillMount=="function"&&s.UNSAFE_componentWillMount(),e!==s.state&&Wu.enqueueReplaceState(s,s.state,null),au(t,n,s,r),s.state=t.memoizedState),typeof s.componentDidMount=="function"&&(t.flags|=4194308)}function gi(t,e){try{var n="",r=e;do n+=_1(r),r=r.return;while(r);var s=n}catch(i){s=`
Error generating stack: `+i.message+`
`+i.stack}return{value:t,source:e,stack:s,digest:null}}function Th(t,e,n){return{value:t,source:null,stack:n??null,digest:e??null}}function Td(t,e){try{console.error(e.value)}catch(n){setTimeout(function(){throw n})}}var HS=typeof WeakMap=="function"?WeakMap:Map;function pw(t,e,n){n=Dn(-1,n),n.tag=3,n.payload={element:null};var r=e.value;return n.callback=function(){du||(du=!0,bd=r),Td(t,e)},n}function mw(t,e,n){n=Dn(-1,n),n.tag=3;var r=t.type.getDerivedStateFromError;if(typeof r=="function"){var s=e.value;n.payload=function(){return r(s)},n.callback=function(){Td(t,e)}}var i=t.stateNode;return i!==null&&typeof i.componentDidCatch=="function"&&(n.callback=function(){Td(t,e),typeof r!="function"&&(vr===null?vr=new Set([this]):vr.add(this));var o=e.stack;this.componentDidCatch(e.value,{componentStack:o!==null?o:""})}),n}function ly(t,e,n){var r=t.pingCache;if(r===null){r=t.pingCache=new HS;var s=new Set;r.set(e,s)}else s=r.get(e),s===void 0&&(s=new Set,r.set(e,s));s.has(n)||(s.add(n),t=iA.bind(null,t,e,n),e.then(t,t))}function uy(t){do{var e;if((e=t.tag===13)&&(e=t.memoizedState,e=e!==null?e.dehydrated!==null:!0),e)return t;t=t.return}while(t!==null);return null}function cy(t,e,n,r,s){return t.mode&1?(t.flags|=65536,t.lanes=s,t):(t===e?t.flags|=65536:(t.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(e=Dn(-1,1),e.tag=2,_r(n,e,1))),n.lanes|=1),t)}var qS=qn.ReactCurrentOwner,Et=!1;function ft(t,e,n,r){e.child=t===null?W0(e,null,n,r):pi(e,t.child,n,r)}function hy(t,e,n,r,s){n=n.render;var i=e.ref;return si(e,s),r=qf(t,e,n,r,i,s),n=Kf(),t!==null&&!Et?(e.updateQueue=t.updateQueue,e.flags&=-2053,t.lanes&=~s,Fn(t,e,s)):(ve&&n&&Of(e),e.flags|=1,ft(t,e,r,s),e.child)}function dy(t,e,n,r,s){if(t===null){var i=n.type;return typeof i=="function"&&!rp(i)&&i.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(e.tag=15,e.type=i,gw(t,e,i,r,s)):(t=Ol(n.type,null,r,e,e.mode,s),t.ref=e.ref,t.return=e,e.child=t)}if(i=t.child,!(t.lanes&s)){var o=i.memoizedProps;if(n=n.compare,n=n!==null?n:qo,n(o,r)&&t.ref===e.ref)return Fn(t,e,s)}return e.flags|=1,t=Er(i,r),t.ref=e.ref,t.return=e,e.child=t}function gw(t,e,n,r,s){if(t!==null){var i=t.memoizedProps;if(qo(i,r)&&t.ref===e.ref)if(Et=!1,e.pendingProps=r=i,(t.lanes&s)!==0)t.flags&131072&&(Et=!0);else return e.lanes=t.lanes,Fn(t,e,s)}return Id(t,e,n,r,s)}function yw(t,e,n){var r=e.pendingProps,s=r.children,i=t!==null?t.memoizedState:null;if(r.mode==="hidden")if(!(e.mode&1))e.memoizedState={baseLanes:0,cachePool:null,transitions:null},fe(Js,At),At|=n;else{if(!(n&1073741824))return t=i!==null?i.baseLanes|n:n,e.lanes=e.childLanes=1073741824,e.memoizedState={baseLanes:t,cachePool:null,transitions:null},e.updateQueue=null,fe(Js,At),At|=t,null;e.memoizedState={baseLanes:0,cachePool:null,transitions:null},r=i!==null?i.baseLanes:n,fe(Js,At),At|=r}else i!==null?(r=i.baseLanes|n,e.memoizedState=null):r=n,fe(Js,At),At|=r;return ft(t,e,s,n),e.child}function _w(t,e){var n=e.ref;(t===null&&n!==null||t!==null&&t.ref!==n)&&(e.flags|=512,e.flags|=2097152)}function Id(t,e,n,r,s){var i=It(n)?ds:lt.current;return i=di(e,i),si(e,s),n=qf(t,e,n,r,i,s),r=Kf(),t!==null&&!Et?(e.updateQueue=t.updateQueue,e.flags&=-2053,t.lanes&=~s,Fn(t,e,s)):(ve&&r&&Of(e),e.flags|=1,ft(t,e,n,s),e.child)}function fy(t,e,n,r,s){if(It(n)){var i=!0;nu(e)}else i=!1;if(si(e,s),e.stateNode===null)Nl(t,e),fw(e,n,r),Ed(e,n,r,s),r=!0;else if(t===null){var o=e.stateNode,l=e.memoizedProps;o.props=l;var u=o.context,c=n.contextType;typeof c=="object"&&c!==null?c=Bt(c):(c=It(n)?ds:lt.current,c=di(e,c));var d=n.getDerivedStateFromProps,m=typeof d=="function"||typeof o.getSnapshotBeforeUpdate=="function";m||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(l!==r||u!==c)&&ay(e,o,r,c),sr=!1;var g=e.memoizedState;o.state=g,au(e,r,o,s),u=e.memoizedState,l!==r||g!==u||Tt.current||sr?(typeof d=="function"&&(wd(e,n,d,r),u=e.memoizedState),(l=sr||oy(e,n,l,r,g,u,c))?(m||typeof o.UNSAFE_componentWillMount!="function"&&typeof o.componentWillMount!="function"||(typeof o.componentWillMount=="function"&&o.componentWillMount(),typeof o.UNSAFE_componentWillMount=="function"&&o.UNSAFE_componentWillMount()),typeof o.componentDidMount=="function"&&(e.flags|=4194308)):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),e.memoizedProps=r,e.memoizedState=u),o.props=r,o.state=u,o.context=c,r=l):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),r=!1)}else{o=e.stateNode,q0(t,e),l=e.memoizedProps,c=e.type===e.elementType?l:Qt(e.type,l),o.props=c,m=e.pendingProps,g=o.context,u=n.contextType,typeof u=="object"&&u!==null?u=Bt(u):(u=It(n)?ds:lt.current,u=di(e,u));var w=n.getDerivedStateFromProps;(d=typeof w=="function"||typeof o.getSnapshotBeforeUpdate=="function")||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(l!==m||g!==u)&&ay(e,o,r,u),sr=!1,g=e.memoizedState,o.state=g,au(e,r,o,s);var A=e.memoizedState;l!==m||g!==A||Tt.current||sr?(typeof w=="function"&&(wd(e,n,w,r),A=e.memoizedState),(c=sr||oy(e,n,c,r,g,A,u)||!1)?(d||typeof o.UNSAFE_componentWillUpdate!="function"&&typeof o.componentWillUpdate!="function"||(typeof o.componentWillUpdate=="function"&&o.componentWillUpdate(r,A,u),typeof o.UNSAFE_componentWillUpdate=="function"&&o.UNSAFE_componentWillUpdate(r,A,u)),typeof o.componentDidUpdate=="function"&&(e.flags|=4),typeof o.getSnapshotBeforeUpdate=="function"&&(e.flags|=1024)):(typeof o.componentDidUpdate!="function"||l===t.memoizedProps&&g===t.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||l===t.memoizedProps&&g===t.memoizedState||(e.flags|=1024),e.memoizedProps=r,e.memoizedState=A),o.props=r,o.state=A,o.context=u,r=c):(typeof o.componentDidUpdate!="function"||l===t.memoizedProps&&g===t.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||l===t.memoizedProps&&g===t.memoizedState||(e.flags|=1024),r=!1)}return xd(t,e,n,r,i,s)}function xd(t,e,n,r,s,i){_w(t,e);var o=(e.flags&128)!==0;if(!r&&!o)return s&&Jg(e,n,!1),Fn(t,e,i);r=e.stateNode,qS.current=e;var l=o&&typeof n.getDerivedStateFromError!="function"?null:r.render();return e.flags|=1,t!==null&&o?(e.child=pi(e,t.child,null,i),e.child=pi(e,null,l,i)):ft(t,e,l,i),e.memoizedState=r.state,s&&Jg(e,n,!0),e.child}function vw(t){var e=t.stateNode;e.pendingContext?Xg(t,e.pendingContext,e.pendingContext!==e.context):e.context&&Xg(t,e.context,!1),Bf(t,e.containerInfo)}function py(t,e,n,r,s){return fi(),Lf(s),e.flags|=256,ft(t,e,n,r),e.child}var Sd={dehydrated:null,treeContext:null,retryLane:0};function Ad(t){return{baseLanes:t,cachePool:null,transitions:null}}function ww(t,e,n){var r=e.pendingProps,s=Ee.current,i=!1,o=(e.flags&128)!==0,l;if((l=o)||(l=t!==null&&t.memoizedState===null?!1:(s&2)!==0),l?(i=!0,e.flags&=-129):(t===null||t.memoizedState!==null)&&(s|=1),fe(Ee,s&1),t===null)return _d(e),t=e.memoizedState,t!==null&&(t=t.dehydrated,t!==null)?(e.mode&1?t.data==="$!"?e.lanes=8:e.lanes=1073741824:e.lanes=1,null):(o=r.children,t=r.fallback,i?(r=e.mode,i=e.child,o={mode:"hidden",children:o},!(r&1)&&i!==null?(i.childLanes=0,i.pendingProps=o):i=Ku(o,r,0,null),t=cs(t,r,n,null),i.return=e,t.return=e,i.sibling=t,e.child=i,e.child.memoizedState=Ad(n),e.memoizedState=Sd,t):Yf(e,o));if(s=t.memoizedState,s!==null&&(l=s.dehydrated,l!==null))return KS(t,e,o,r,l,s,n);if(i){i=r.fallback,o=e.mode,s=t.child,l=s.sibling;var u={mode:"hidden",children:r.children};return!(o&1)&&e.child!==s?(r=e.child,r.childLanes=0,r.pendingProps=u,e.deletions=null):(r=Er(s,u),r.subtreeFlags=s.subtreeFlags&14680064),l!==null?i=Er(l,i):(i=cs(i,o,n,null),i.flags|=2),i.return=e,r.return=e,r.sibling=i,e.child=r,r=i,i=e.child,o=t.child.memoizedState,o=o===null?Ad(n):{baseLanes:o.baseLanes|n,cachePool:null,transitions:o.transitions},i.memoizedState=o,i.childLanes=t.childLanes&~n,e.memoizedState=Sd,r}return i=t.child,t=i.sibling,r=Er(i,{mode:"visible",children:r.children}),!(e.mode&1)&&(r.lanes=n),r.return=e,r.sibling=null,t!==null&&(n=e.deletions,n===null?(e.deletions=[t],e.flags|=16):n.push(t)),e.child=r,e.memoizedState=null,r}function Yf(t,e){return e=Ku({mode:"visible",children:e},t.mode,0,null),e.return=t,t.child=e}function ul(t,e,n,r){return r!==null&&Lf(r),pi(e,t.child,null,n),t=Yf(e,e.pendingProps.children),t.flags|=2,e.memoizedState=null,t}function KS(t,e,n,r,s,i,o){if(n)return e.flags&256?(e.flags&=-257,r=Th(Error(F(422))),ul(t,e,o,r)):e.memoizedState!==null?(e.child=t.child,e.flags|=128,null):(i=r.fallback,s=e.mode,r=Ku({mode:"visible",children:r.children},s,0,null),i=cs(i,s,o,null),i.flags|=2,r.return=e,i.return=e,r.sibling=i,e.child=r,e.mode&1&&pi(e,t.child,null,o),e.child.memoizedState=Ad(o),e.memoizedState=Sd,i);if(!(e.mode&1))return ul(t,e,o,null);if(s.data==="$!"){if(r=s.nextSibling&&s.nextSibling.dataset,r)var l=r.dgst;return r=l,i=Error(F(419)),r=Th(i,r,void 0),ul(t,e,o,r)}if(l=(o&t.childLanes)!==0,Et||l){if(r=Ke,r!==null){switch(o&-o){case 4:s=2;break;case 16:s=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:s=32;break;case 536870912:s=268435456;break;default:s=0}s=s&(r.suspendedLanes|o)?0:s,s!==0&&s!==i.retryLane&&(i.retryLane=s,Un(t,s),en(r,t,s,-1))}return np(),r=Th(Error(F(421))),ul(t,e,o,r)}return s.data==="$?"?(e.flags|=128,e.child=t.child,e=oA.bind(null,t),s._reactRetry=e,null):(t=i.treeContext,Rt=yr(s.nextSibling),bt=e,ve=!0,Xt=null,t!==null&&(Mt[jt++]=kn,Mt[jt++]=Rn,Mt[jt++]=fs,kn=t.id,Rn=t.overflow,fs=e),e=Yf(e,r.children),e.flags|=4096,e)}function my(t,e,n){t.lanes|=e;var r=t.alternate;r!==null&&(r.lanes|=e),vd(t.return,e,n)}function Ih(t,e,n,r,s){var i=t.memoizedState;i===null?t.memoizedState={isBackwards:e,rendering:null,renderingStartTime:0,last:r,tail:n,tailMode:s}:(i.isBackwards=e,i.rendering=null,i.renderingStartTime=0,i.last=r,i.tail=n,i.tailMode=s)}function Ew(t,e,n){var r=e.pendingProps,s=r.revealOrder,i=r.tail;if(ft(t,e,r.children,n),r=Ee.current,r&2)r=r&1|2,e.flags|=128;else{if(t!==null&&t.flags&128)e:for(t=e.child;t!==null;){if(t.tag===13)t.memoizedState!==null&&my(t,n,e);else if(t.tag===19)my(t,n,e);else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break e;for(;t.sibling===null;){if(t.return===null||t.return===e)break e;t=t.return}t.sibling.return=t.return,t=t.sibling}r&=1}if(fe(Ee,r),!(e.mode&1))e.memoizedState=null;else switch(s){case"forwards":for(n=e.child,s=null;n!==null;)t=n.alternate,t!==null&&lu(t)===null&&(s=n),n=n.sibling;n=s,n===null?(s=e.child,e.child=null):(s=n.sibling,n.sibling=null),Ih(e,!1,s,n,i);break;case"backwards":for(n=null,s=e.child,e.child=null;s!==null;){if(t=s.alternate,t!==null&&lu(t)===null){e.child=s;break}t=s.sibling,s.sibling=n,n=s,s=t}Ih(e,!0,n,null,i);break;case"together":Ih(e,!1,null,null,void 0);break;default:e.memoizedState=null}return e.child}function Nl(t,e){!(e.mode&1)&&t!==null&&(t.alternate=null,e.alternate=null,e.flags|=2)}function Fn(t,e,n){if(t!==null&&(e.dependencies=t.dependencies),ms|=e.lanes,!(n&e.childLanes))return null;if(t!==null&&e.child!==t.child)throw Error(F(153));if(e.child!==null){for(t=e.child,n=Er(t,t.pendingProps),e.child=n,n.return=e;t.sibling!==null;)t=t.sibling,n=n.sibling=Er(t,t.pendingProps),n.return=e;n.sibling=null}return e.child}function GS(t,e,n){switch(e.tag){case 3:vw(e),fi();break;case 5:K0(e);break;case 1:It(e.type)&&nu(e);break;case 4:Bf(e,e.stateNode.containerInfo);break;case 10:var r=e.type._context,s=e.memoizedProps.value;fe(iu,r._currentValue),r._currentValue=s;break;case 13:if(r=e.memoizedState,r!==null)return r.dehydrated!==null?(fe(Ee,Ee.current&1),e.flags|=128,null):n&e.child.childLanes?ww(t,e,n):(fe(Ee,Ee.current&1),t=Fn(t,e,n),t!==null?t.sibling:null);fe(Ee,Ee.current&1);break;case 19:if(r=(n&e.childLanes)!==0,t.flags&128){if(r)return Ew(t,e,n);e.flags|=128}if(s=e.memoizedState,s!==null&&(s.rendering=null,s.tail=null,s.lastEffect=null),fe(Ee,Ee.current),r)break;return null;case 22:case 23:return e.lanes=0,yw(t,e,n)}return Fn(t,e,n)}var Tw,Cd,Iw,xw;Tw=function(t,e){for(var n=e.child;n!==null;){if(n.tag===5||n.tag===6)t.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===e)break;for(;n.sibling===null;){if(n.return===null||n.return===e)return;n=n.return}n.sibling.return=n.return,n=n.sibling}};Cd=function(){};Iw=function(t,e,n,r){var s=t.memoizedProps;if(s!==r){t=e.stateNode,os(gn.current);var i=null;switch(n){case"input":s=Qh(t,s),r=Qh(t,r),i=[];break;case"select":s=Se({},s,{value:void 0}),r=Se({},r,{value:void 0}),i=[];break;case"textarea":s=Jh(t,s),r=Jh(t,r),i=[];break;default:typeof s.onClick!="function"&&typeof r.onClick=="function"&&(t.onclick=eu)}ed(n,r);var o;n=null;for(c in s)if(!r.hasOwnProperty(c)&&s.hasOwnProperty(c)&&s[c]!=null)if(c==="style"){var l=s[c];for(o in l)l.hasOwnProperty(o)&&(n||(n={}),n[o]="")}else c!=="dangerouslySetInnerHTML"&&c!=="children"&&c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&c!=="autoFocus"&&(Uo.hasOwnProperty(c)?i||(i=[]):(i=i||[]).push(c,null));for(c in r){var u=r[c];if(l=s!=null?s[c]:void 0,r.hasOwnProperty(c)&&u!==l&&(u!=null||l!=null))if(c==="style")if(l){for(o in l)!l.hasOwnProperty(o)||u&&u.hasOwnProperty(o)||(n||(n={}),n[o]="");for(o in u)u.hasOwnProperty(o)&&l[o]!==u[o]&&(n||(n={}),n[o]=u[o])}else n||(i||(i=[]),i.push(c,n)),n=u;else c==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,l=l?l.__html:void 0,u!=null&&l!==u&&(i=i||[]).push(c,u)):c==="children"?typeof u!="string"&&typeof u!="number"||(i=i||[]).push(c,""+u):c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&(Uo.hasOwnProperty(c)?(u!=null&&c==="onScroll"&&ge("scroll",t),i||l===u||(i=[])):(i=i||[]).push(c,u))}n&&(i=i||[]).push("style",n);var c=i;(e.updateQueue=c)&&(e.flags|=4)}};xw=function(t,e,n,r){n!==r&&(e.flags|=4)};function uo(t,e){if(!ve)switch(t.tailMode){case"hidden":e=t.tail;for(var n=null;e!==null;)e.alternate!==null&&(n=e),e=e.sibling;n===null?t.tail=null:n.sibling=null;break;case"collapsed":n=t.tail;for(var r=null;n!==null;)n.alternate!==null&&(r=n),n=n.sibling;r===null?e||t.tail===null?t.tail=null:t.tail.sibling=null:r.sibling=null}}function nt(t){var e=t.alternate!==null&&t.alternate.child===t.child,n=0,r=0;if(e)for(var s=t.child;s!==null;)n|=s.lanes|s.childLanes,r|=s.subtreeFlags&14680064,r|=s.flags&14680064,s.return=t,s=s.sibling;else for(s=t.child;s!==null;)n|=s.lanes|s.childLanes,r|=s.subtreeFlags,r|=s.flags,s.return=t,s=s.sibling;return t.subtreeFlags|=r,t.childLanes=n,e}function QS(t,e,n){var r=e.pendingProps;switch(Vf(e),e.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return nt(e),null;case 1:return It(e.type)&&tu(),nt(e),null;case 3:return r=e.stateNode,mi(),ye(Tt),ye(lt),Wf(),r.pendingContext&&(r.context=r.pendingContext,r.pendingContext=null),(t===null||t.child===null)&&(al(e)?e.flags|=4:t===null||t.memoizedState.isDehydrated&&!(e.flags&256)||(e.flags|=1024,Xt!==null&&(Vd(Xt),Xt=null))),Cd(t,e),nt(e),null;case 5:$f(e);var s=os(Xo.current);if(n=e.type,t!==null&&e.stateNode!=null)Iw(t,e,n,r,s),t.ref!==e.ref&&(e.flags|=512,e.flags|=2097152);else{if(!r){if(e.stateNode===null)throw Error(F(166));return nt(e),null}if(t=os(gn.current),al(e)){r=e.stateNode,n=e.type;var i=e.memoizedProps;switch(r[fn]=e,r[Qo]=i,t=(e.mode&1)!==0,n){case"dialog":ge("cancel",r),ge("close",r);break;case"iframe":case"object":case"embed":ge("load",r);break;case"video":case"audio":for(s=0;s<yo.length;s++)ge(yo[s],r);break;case"source":ge("error",r);break;case"img":case"image":case"link":ge("error",r),ge("load",r);break;case"details":ge("toggle",r);break;case"input":xg(r,i),ge("invalid",r);break;case"select":r._wrapperState={wasMultiple:!!i.multiple},ge("invalid",r);break;case"textarea":Ag(r,i),ge("invalid",r)}ed(n,i),s=null;for(var o in i)if(i.hasOwnProperty(o)){var l=i[o];o==="children"?typeof l=="string"?r.textContent!==l&&(i.suppressHydrationWarning!==!0&&ol(r.textContent,l,t),s=["children",l]):typeof l=="number"&&r.textContent!==""+l&&(i.suppressHydrationWarning!==!0&&ol(r.textContent,l,t),s=["children",""+l]):Uo.hasOwnProperty(o)&&l!=null&&o==="onScroll"&&ge("scroll",r)}switch(n){case"input":Ja(r),Sg(r,i,!0);break;case"textarea":Ja(r),Cg(r);break;case"select":case"option":break;default:typeof i.onClick=="function"&&(r.onclick=eu)}r=s,e.updateQueue=r,r!==null&&(e.flags|=4)}else{o=s.nodeType===9?s:s.ownerDocument,t==="http://www.w3.org/1999/xhtml"&&(t=Jv(n)),t==="http://www.w3.org/1999/xhtml"?n==="script"?(t=o.createElement("div"),t.innerHTML="<script><\/script>",t=t.removeChild(t.firstChild)):typeof r.is=="string"?t=o.createElement(n,{is:r.is}):(t=o.createElement(n),n==="select"&&(o=t,r.multiple?o.multiple=!0:r.size&&(o.size=r.size))):t=o.createElementNS(t,n),t[fn]=e,t[Qo]=r,Tw(t,e,!1,!1),e.stateNode=t;e:{switch(o=td(n,r),n){case"dialog":ge("cancel",t),ge("close",t),s=r;break;case"iframe":case"object":case"embed":ge("load",t),s=r;break;case"video":case"audio":for(s=0;s<yo.length;s++)ge(yo[s],t);s=r;break;case"source":ge("error",t),s=r;break;case"img":case"image":case"link":ge("error",t),ge("load",t),s=r;break;case"details":ge("toggle",t),s=r;break;case"input":xg(t,r),s=Qh(t,r),ge("invalid",t);break;case"option":s=r;break;case"select":t._wrapperState={wasMultiple:!!r.multiple},s=Se({},r,{value:void 0}),ge("invalid",t);break;case"textarea":Ag(t,r),s=Jh(t,r),ge("invalid",t);break;default:s=r}ed(n,s),l=s;for(i in l)if(l.hasOwnProperty(i)){var u=l[i];i==="style"?t0(t,u):i==="dangerouslySetInnerHTML"?(u=u?u.__html:void 0,u!=null&&Zv(t,u)):i==="children"?typeof u=="string"?(n!=="textarea"||u!=="")&&Fo(t,u):typeof u=="number"&&Fo(t,""+u):i!=="suppressContentEditableWarning"&&i!=="suppressHydrationWarning"&&i!=="autoFocus"&&(Uo.hasOwnProperty(i)?u!=null&&i==="onScroll"&&ge("scroll",t):u!=null&&wf(t,i,u,o))}switch(n){case"input":Ja(t),Sg(t,r,!1);break;case"textarea":Ja(t),Cg(t);break;case"option":r.value!=null&&t.setAttribute("value",""+Rr(r.value));break;case"select":t.multiple=!!r.multiple,i=r.value,i!=null?ei(t,!!r.multiple,i,!1):r.defaultValue!=null&&ei(t,!!r.multiple,r.defaultValue,!0);break;default:typeof s.onClick=="function"&&(t.onclick=eu)}switch(n){case"button":case"input":case"select":case"textarea":r=!!r.autoFocus;break e;case"img":r=!0;break e;default:r=!1}}r&&(e.flags|=4)}e.ref!==null&&(e.flags|=512,e.flags|=2097152)}return nt(e),null;case 6:if(t&&e.stateNode!=null)xw(t,e,t.memoizedProps,r);else{if(typeof r!="string"&&e.stateNode===null)throw Error(F(166));if(n=os(Xo.current),os(gn.current),al(e)){if(r=e.stateNode,n=e.memoizedProps,r[fn]=e,(i=r.nodeValue!==n)&&(t=bt,t!==null))switch(t.tag){case 3:ol(r.nodeValue,n,(t.mode&1)!==0);break;case 5:t.memoizedProps.suppressHydrationWarning!==!0&&ol(r.nodeValue,n,(t.mode&1)!==0)}i&&(e.flags|=4)}else r=(n.nodeType===9?n:n.ownerDocument).createTextNode(r),r[fn]=e,e.stateNode=r}return nt(e),null;case 13:if(ye(Ee),r=e.memoizedState,t===null||t.memoizedState!==null&&t.memoizedState.dehydrated!==null){if(ve&&Rt!==null&&e.mode&1&&!(e.flags&128))B0(),fi(),e.flags|=98560,i=!1;else if(i=al(e),r!==null&&r.dehydrated!==null){if(t===null){if(!i)throw Error(F(318));if(i=e.memoizedState,i=i!==null?i.dehydrated:null,!i)throw Error(F(317));i[fn]=e}else fi(),!(e.flags&128)&&(e.memoizedState=null),e.flags|=4;nt(e),i=!1}else Xt!==null&&(Vd(Xt),Xt=null),i=!0;if(!i)return e.flags&65536?e:null}return e.flags&128?(e.lanes=n,e):(r=r!==null,r!==(t!==null&&t.memoizedState!==null)&&r&&(e.child.flags|=8192,e.mode&1&&(t===null||Ee.current&1?Fe===0&&(Fe=3):np())),e.updateQueue!==null&&(e.flags|=4),nt(e),null);case 4:return mi(),Cd(t,e),t===null&&Ko(e.stateNode.containerInfo),nt(e),null;case 10:return Uf(e.type._context),nt(e),null;case 17:return It(e.type)&&tu(),nt(e),null;case 19:if(ye(Ee),i=e.memoizedState,i===null)return nt(e),null;if(r=(e.flags&128)!==0,o=i.rendering,o===null)if(r)uo(i,!1);else{if(Fe!==0||t!==null&&t.flags&128)for(t=e.child;t!==null;){if(o=lu(t),o!==null){for(e.flags|=128,uo(i,!1),r=o.updateQueue,r!==null&&(e.updateQueue=r,e.flags|=4),e.subtreeFlags=0,r=n,n=e.child;n!==null;)i=n,t=r,i.flags&=14680066,o=i.alternate,o===null?(i.childLanes=0,i.lanes=t,i.child=null,i.subtreeFlags=0,i.memoizedProps=null,i.memoizedState=null,i.updateQueue=null,i.dependencies=null,i.stateNode=null):(i.childLanes=o.childLanes,i.lanes=o.lanes,i.child=o.child,i.subtreeFlags=0,i.deletions=null,i.memoizedProps=o.memoizedProps,i.memoizedState=o.memoizedState,i.updateQueue=o.updateQueue,i.type=o.type,t=o.dependencies,i.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext}),n=n.sibling;return fe(Ee,Ee.current&1|2),e.child}t=t.sibling}i.tail!==null&&be()>yi&&(e.flags|=128,r=!0,uo(i,!1),e.lanes=4194304)}else{if(!r)if(t=lu(o),t!==null){if(e.flags|=128,r=!0,n=t.updateQueue,n!==null&&(e.updateQueue=n,e.flags|=4),uo(i,!0),i.tail===null&&i.tailMode==="hidden"&&!o.alternate&&!ve)return nt(e),null}else 2*be()-i.renderingStartTime>yi&&n!==1073741824&&(e.flags|=128,r=!0,uo(i,!1),e.lanes=4194304);i.isBackwards?(o.sibling=e.child,e.child=o):(n=i.last,n!==null?n.sibling=o:e.child=o,i.last=o)}return i.tail!==null?(e=i.tail,i.rendering=e,i.tail=e.sibling,i.renderingStartTime=be(),e.sibling=null,n=Ee.current,fe(Ee,r?n&1|2:n&1),e):(nt(e),null);case 22:case 23:return tp(),r=e.memoizedState!==null,t!==null&&t.memoizedState!==null!==r&&(e.flags|=8192),r&&e.mode&1?At&1073741824&&(nt(e),e.subtreeFlags&6&&(e.flags|=8192)):nt(e),null;case 24:return null;case 25:return null}throw Error(F(156,e.tag))}function YS(t,e){switch(Vf(e),e.tag){case 1:return It(e.type)&&tu(),t=e.flags,t&65536?(e.flags=t&-65537|128,e):null;case 3:return mi(),ye(Tt),ye(lt),Wf(),t=e.flags,t&65536&&!(t&128)?(e.flags=t&-65537|128,e):null;case 5:return $f(e),null;case 13:if(ye(Ee),t=e.memoizedState,t!==null&&t.dehydrated!==null){if(e.alternate===null)throw Error(F(340));fi()}return t=e.flags,t&65536?(e.flags=t&-65537|128,e):null;case 19:return ye(Ee),null;case 4:return mi(),null;case 10:return Uf(e.type._context),null;case 22:case 23:return tp(),null;case 24:return null;default:return null}}var cl=!1,it=!1,XS=typeof WeakSet=="function"?WeakSet:Set,H=null;function Xs(t,e){var n=t.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(r){Ce(t,e,r)}else n.current=null}function kd(t,e,n){try{n()}catch(r){Ce(t,e,r)}}var gy=!1;function JS(t,e){if(hd=Xl,t=R0(),Df(t)){if("selectionStart"in t)var n={start:t.selectionStart,end:t.selectionEnd};else e:{n=(n=t.ownerDocument)&&n.defaultView||window;var r=n.getSelection&&n.getSelection();if(r&&r.rangeCount!==0){n=r.anchorNode;var s=r.anchorOffset,i=r.focusNode;r=r.focusOffset;try{n.nodeType,i.nodeType}catch{n=null;break e}var o=0,l=-1,u=-1,c=0,d=0,m=t,g=null;t:for(;;){for(var w;m!==n||s!==0&&m.nodeType!==3||(l=o+s),m!==i||r!==0&&m.nodeType!==3||(u=o+r),m.nodeType===3&&(o+=m.nodeValue.length),(w=m.firstChild)!==null;)g=m,m=w;for(;;){if(m===t)break t;if(g===n&&++c===s&&(l=o),g===i&&++d===r&&(u=o),(w=m.nextSibling)!==null)break;m=g,g=m.parentNode}m=w}n=l===-1||u===-1?null:{start:l,end:u}}else n=null}n=n||{start:0,end:0}}else n=null;for(dd={focusedElem:t,selectionRange:n},Xl=!1,H=e;H!==null;)if(e=H,t=e.child,(e.subtreeFlags&1028)!==0&&t!==null)t.return=e,H=t;else for(;H!==null;){e=H;try{var A=e.alternate;if(e.flags&1024)switch(e.tag){case 0:case 11:case 15:break;case 1:if(A!==null){var P=A.memoizedProps,N=A.memoizedState,x=e.stateNode,v=x.getSnapshotBeforeUpdate(e.elementType===e.type?P:Qt(e.type,P),N);x.__reactInternalSnapshotBeforeUpdate=v}break;case 3:var k=e.stateNode.containerInfo;k.nodeType===1?k.textContent="":k.nodeType===9&&k.documentElement&&k.removeChild(k.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(F(163))}}catch(D){Ce(e,e.return,D)}if(t=e.sibling,t!==null){t.return=e.return,H=t;break}H=e.return}return A=gy,gy=!1,A}function Ro(t,e,n){var r=e.updateQueue;if(r=r!==null?r.lastEffect:null,r!==null){var s=r=r.next;do{if((s.tag&t)===t){var i=s.destroy;s.destroy=void 0,i!==void 0&&kd(e,n,i)}s=s.next}while(s!==r)}}function Hu(t,e){if(e=e.updateQueue,e=e!==null?e.lastEffect:null,e!==null){var n=e=e.next;do{if((n.tag&t)===t){var r=n.create;n.destroy=r()}n=n.next}while(n!==e)}}function Rd(t){var e=t.ref;if(e!==null){var n=t.stateNode;switch(t.tag){case 5:t=n;break;default:t=n}typeof e=="function"?e(t):e.current=t}}function Sw(t){var e=t.alternate;e!==null&&(t.alternate=null,Sw(e)),t.child=null,t.deletions=null,t.sibling=null,t.tag===5&&(e=t.stateNode,e!==null&&(delete e[fn],delete e[Qo],delete e[md],delete e[OS],delete e[VS])),t.stateNode=null,t.return=null,t.dependencies=null,t.memoizedProps=null,t.memoizedState=null,t.pendingProps=null,t.stateNode=null,t.updateQueue=null}function Aw(t){return t.tag===5||t.tag===3||t.tag===4}function yy(t){e:for(;;){for(;t.sibling===null;){if(t.return===null||Aw(t.return))return null;t=t.return}for(t.sibling.return=t.return,t=t.sibling;t.tag!==5&&t.tag!==6&&t.tag!==18;){if(t.flags&2||t.child===null||t.tag===4)continue e;t.child.return=t,t=t.child}if(!(t.flags&2))return t.stateNode}}function Pd(t,e,n){var r=t.tag;if(r===5||r===6)t=t.stateNode,e?n.nodeType===8?n.parentNode.insertBefore(t,e):n.insertBefore(t,e):(n.nodeType===8?(e=n.parentNode,e.insertBefore(t,n)):(e=n,e.appendChild(t)),n=n._reactRootContainer,n!=null||e.onclick!==null||(e.onclick=eu));else if(r!==4&&(t=t.child,t!==null))for(Pd(t,e,n),t=t.sibling;t!==null;)Pd(t,e,n),t=t.sibling}function Nd(t,e,n){var r=t.tag;if(r===5||r===6)t=t.stateNode,e?n.insertBefore(t,e):n.appendChild(t);else if(r!==4&&(t=t.child,t!==null))for(Nd(t,e,n),t=t.sibling;t!==null;)Nd(t,e,n),t=t.sibling}var Qe=null,Yt=!1;function tr(t,e,n){for(n=n.child;n!==null;)Cw(t,e,n),n=n.sibling}function Cw(t,e,n){if(mn&&typeof mn.onCommitFiberUnmount=="function")try{mn.onCommitFiberUnmount(Mu,n)}catch{}switch(n.tag){case 5:it||Xs(n,e);case 6:var r=Qe,s=Yt;Qe=null,tr(t,e,n),Qe=r,Yt=s,Qe!==null&&(Yt?(t=Qe,n=n.stateNode,t.nodeType===8?t.parentNode.removeChild(n):t.removeChild(n)):Qe.removeChild(n.stateNode));break;case 18:Qe!==null&&(Yt?(t=Qe,n=n.stateNode,t.nodeType===8?gh(t.parentNode,n):t.nodeType===1&&gh(t,n),Wo(t)):gh(Qe,n.stateNode));break;case 4:r=Qe,s=Yt,Qe=n.stateNode.containerInfo,Yt=!0,tr(t,e,n),Qe=r,Yt=s;break;case 0:case 11:case 14:case 15:if(!it&&(r=n.updateQueue,r!==null&&(r=r.lastEffect,r!==null))){s=r=r.next;do{var i=s,o=i.destroy;i=i.tag,o!==void 0&&(i&2||i&4)&&kd(n,e,o),s=s.next}while(s!==r)}tr(t,e,n);break;case 1:if(!it&&(Xs(n,e),r=n.stateNode,typeof r.componentWillUnmount=="function"))try{r.props=n.memoizedProps,r.state=n.memoizedState,r.componentWillUnmount()}catch(l){Ce(n,e,l)}tr(t,e,n);break;case 21:tr(t,e,n);break;case 22:n.mode&1?(it=(r=it)||n.memoizedState!==null,tr(t,e,n),it=r):tr(t,e,n);break;default:tr(t,e,n)}}function _y(t){var e=t.updateQueue;if(e!==null){t.updateQueue=null;var n=t.stateNode;n===null&&(n=t.stateNode=new XS),e.forEach(function(r){var s=aA.bind(null,t,r);n.has(r)||(n.add(r),r.then(s,s))})}}function Kt(t,e){var n=e.deletions;if(n!==null)for(var r=0;r<n.length;r++){var s=n[r];try{var i=t,o=e,l=o;e:for(;l!==null;){switch(l.tag){case 5:Qe=l.stateNode,Yt=!1;break e;case 3:Qe=l.stateNode.containerInfo,Yt=!0;break e;case 4:Qe=l.stateNode.containerInfo,Yt=!0;break e}l=l.return}if(Qe===null)throw Error(F(160));Cw(i,o,s),Qe=null,Yt=!1;var u=s.alternate;u!==null&&(u.return=null),s.return=null}catch(c){Ce(s,e,c)}}if(e.subtreeFlags&12854)for(e=e.child;e!==null;)kw(e,t),e=e.sibling}function kw(t,e){var n=t.alternate,r=t.flags;switch(t.tag){case 0:case 11:case 14:case 15:if(Kt(e,t),cn(t),r&4){try{Ro(3,t,t.return),Hu(3,t)}catch(P){Ce(t,t.return,P)}try{Ro(5,t,t.return)}catch(P){Ce(t,t.return,P)}}break;case 1:Kt(e,t),cn(t),r&512&&n!==null&&Xs(n,n.return);break;case 5:if(Kt(e,t),cn(t),r&512&&n!==null&&Xs(n,n.return),t.flags&32){var s=t.stateNode;try{Fo(s,"")}catch(P){Ce(t,t.return,P)}}if(r&4&&(s=t.stateNode,s!=null)){var i=t.memoizedProps,o=n!==null?n.memoizedProps:i,l=t.type,u=t.updateQueue;if(t.updateQueue=null,u!==null)try{l==="input"&&i.type==="radio"&&i.name!=null&&Yv(s,i),td(l,o);var c=td(l,i);for(o=0;o<u.length;o+=2){var d=u[o],m=u[o+1];d==="style"?t0(s,m):d==="dangerouslySetInnerHTML"?Zv(s,m):d==="children"?Fo(s,m):wf(s,d,m,c)}switch(l){case"input":Yh(s,i);break;case"textarea":Xv(s,i);break;case"select":var g=s._wrapperState.wasMultiple;s._wrapperState.wasMultiple=!!i.multiple;var w=i.value;w!=null?ei(s,!!i.multiple,w,!1):g!==!!i.multiple&&(i.defaultValue!=null?ei(s,!!i.multiple,i.defaultValue,!0):ei(s,!!i.multiple,i.multiple?[]:"",!1))}s[Qo]=i}catch(P){Ce(t,t.return,P)}}break;case 6:if(Kt(e,t),cn(t),r&4){if(t.stateNode===null)throw Error(F(162));s=t.stateNode,i=t.memoizedProps;try{s.nodeValue=i}catch(P){Ce(t,t.return,P)}}break;case 3:if(Kt(e,t),cn(t),r&4&&n!==null&&n.memoizedState.isDehydrated)try{Wo(e.containerInfo)}catch(P){Ce(t,t.return,P)}break;case 4:Kt(e,t),cn(t);break;case 13:Kt(e,t),cn(t),s=t.child,s.flags&8192&&(i=s.memoizedState!==null,s.stateNode.isHidden=i,!i||s.alternate!==null&&s.alternate.memoizedState!==null||(Zf=be())),r&4&&_y(t);break;case 22:if(d=n!==null&&n.memoizedState!==null,t.mode&1?(it=(c=it)||d,Kt(e,t),it=c):Kt(e,t),cn(t),r&8192){if(c=t.memoizedState!==null,(t.stateNode.isHidden=c)&&!d&&t.mode&1)for(H=t,d=t.child;d!==null;){for(m=H=d;H!==null;){switch(g=H,w=g.child,g.tag){case 0:case 11:case 14:case 15:Ro(4,g,g.return);break;case 1:Xs(g,g.return);var A=g.stateNode;if(typeof A.componentWillUnmount=="function"){r=g,n=g.return;try{e=r,A.props=e.memoizedProps,A.state=e.memoizedState,A.componentWillUnmount()}catch(P){Ce(r,n,P)}}break;case 5:Xs(g,g.return);break;case 22:if(g.memoizedState!==null){wy(m);continue}}w!==null?(w.return=g,H=w):wy(m)}d=d.sibling}e:for(d=null,m=t;;){if(m.tag===5){if(d===null){d=m;try{s=m.stateNode,c?(i=s.style,typeof i.setProperty=="function"?i.setProperty("display","none","important"):i.display="none"):(l=m.stateNode,u=m.memoizedProps.style,o=u!=null&&u.hasOwnProperty("display")?u.display:null,l.style.display=e0("display",o))}catch(P){Ce(t,t.return,P)}}}else if(m.tag===6){if(d===null)try{m.stateNode.nodeValue=c?"":m.memoizedProps}catch(P){Ce(t,t.return,P)}}else if((m.tag!==22&&m.tag!==23||m.memoizedState===null||m===t)&&m.child!==null){m.child.return=m,m=m.child;continue}if(m===t)break e;for(;m.sibling===null;){if(m.return===null||m.return===t)break e;d===m&&(d=null),m=m.return}d===m&&(d=null),m.sibling.return=m.return,m=m.sibling}}break;case 19:Kt(e,t),cn(t),r&4&&_y(t);break;case 21:break;default:Kt(e,t),cn(t)}}function cn(t){var e=t.flags;if(e&2){try{e:{for(var n=t.return;n!==null;){if(Aw(n)){var r=n;break e}n=n.return}throw Error(F(160))}switch(r.tag){case 5:var s=r.stateNode;r.flags&32&&(Fo(s,""),r.flags&=-33);var i=yy(t);Nd(t,i,s);break;case 3:case 4:var o=r.stateNode.containerInfo,l=yy(t);Pd(t,l,o);break;default:throw Error(F(161))}}catch(u){Ce(t,t.return,u)}t.flags&=-3}e&4096&&(t.flags&=-4097)}function ZS(t,e,n){H=t,Rw(t)}function Rw(t,e,n){for(var r=(t.mode&1)!==0;H!==null;){var s=H,i=s.child;if(s.tag===22&&r){var o=s.memoizedState!==null||cl;if(!o){var l=s.alternate,u=l!==null&&l.memoizedState!==null||it;l=cl;var c=it;if(cl=o,(it=u)&&!c)for(H=s;H!==null;)o=H,u=o.child,o.tag===22&&o.memoizedState!==null?Ey(s):u!==null?(u.return=o,H=u):Ey(s);for(;i!==null;)H=i,Rw(i),i=i.sibling;H=s,cl=l,it=c}vy(t)}else s.subtreeFlags&8772&&i!==null?(i.return=s,H=i):vy(t)}}function vy(t){for(;H!==null;){var e=H;if(e.flags&8772){var n=e.alternate;try{if(e.flags&8772)switch(e.tag){case 0:case 11:case 15:it||Hu(5,e);break;case 1:var r=e.stateNode;if(e.flags&4&&!it)if(n===null)r.componentDidMount();else{var s=e.elementType===e.type?n.memoizedProps:Qt(e.type,n.memoizedProps);r.componentDidUpdate(s,n.memoizedState,r.__reactInternalSnapshotBeforeUpdate)}var i=e.updateQueue;i!==null&&ry(e,i,r);break;case 3:var o=e.updateQueue;if(o!==null){if(n=null,e.child!==null)switch(e.child.tag){case 5:n=e.child.stateNode;break;case 1:n=e.child.stateNode}ry(e,o,n)}break;case 5:var l=e.stateNode;if(n===null&&e.flags&4){n=l;var u=e.memoizedProps;switch(e.type){case"button":case"input":case"select":case"textarea":u.autoFocus&&n.focus();break;case"img":u.src&&(n.src=u.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(e.memoizedState===null){var c=e.alternate;if(c!==null){var d=c.memoizedState;if(d!==null){var m=d.dehydrated;m!==null&&Wo(m)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(F(163))}it||e.flags&512&&Rd(e)}catch(g){Ce(e,e.return,g)}}if(e===t){H=null;break}if(n=e.sibling,n!==null){n.return=e.return,H=n;break}H=e.return}}function wy(t){for(;H!==null;){var e=H;if(e===t){H=null;break}var n=e.sibling;if(n!==null){n.return=e.return,H=n;break}H=e.return}}function Ey(t){for(;H!==null;){var e=H;try{switch(e.tag){case 0:case 11:case 15:var n=e.return;try{Hu(4,e)}catch(u){Ce(e,n,u)}break;case 1:var r=e.stateNode;if(typeof r.componentDidMount=="function"){var s=e.return;try{r.componentDidMount()}catch(u){Ce(e,s,u)}}var i=e.return;try{Rd(e)}catch(u){Ce(e,i,u)}break;case 5:var o=e.return;try{Rd(e)}catch(u){Ce(e,o,u)}}}catch(u){Ce(e,e.return,u)}if(e===t){H=null;break}var l=e.sibling;if(l!==null){l.return=e.return,H=l;break}H=e.return}}var eA=Math.ceil,hu=qn.ReactCurrentDispatcher,Xf=qn.ReactCurrentOwner,Ft=qn.ReactCurrentBatchConfig,oe=0,Ke=null,Oe=null,Xe=0,At=0,Js=Br(0),Fe=0,ta=null,ms=0,qu=0,Jf=0,Po=null,vt=null,Zf=0,yi=1/0,Sn=null,du=!1,bd=null,vr=null,hl=!1,dr=null,fu=0,No=0,Dd=null,bl=-1,Dl=0;function pt(){return oe&6?be():bl!==-1?bl:bl=be()}function wr(t){return t.mode&1?oe&2&&Xe!==0?Xe&-Xe:MS.transition!==null?(Dl===0&&(Dl=f0()),Dl):(t=ue,t!==0||(t=window.event,t=t===void 0?16:w0(t.type)),t):1}function en(t,e,n,r){if(50<No)throw No=0,Dd=null,Error(F(185));va(t,n,r),(!(oe&2)||t!==Ke)&&(t===Ke&&(!(oe&2)&&(qu|=n),Fe===4&&or(t,Xe)),xt(t,r),n===1&&oe===0&&!(e.mode&1)&&(yi=be()+500,Bu&&$r()))}function xt(t,e){var n=t.callbackNode;M1(t,e);var r=Yl(t,t===Ke?Xe:0);if(r===0)n!==null&&Pg(n),t.callbackNode=null,t.callbackPriority=0;else if(e=r&-r,t.callbackPriority!==e){if(n!=null&&Pg(n),e===1)t.tag===0?LS(Ty.bind(null,t)):U0(Ty.bind(null,t)),bS(function(){!(oe&6)&&$r()}),n=null;else{switch(p0(r)){case 1:n=Sf;break;case 4:n=h0;break;case 16:n=Ql;break;case 536870912:n=d0;break;default:n=Ql}n=Mw(n,Pw.bind(null,t))}t.callbackPriority=e,t.callbackNode=n}}function Pw(t,e){if(bl=-1,Dl=0,oe&6)throw Error(F(327));var n=t.callbackNode;if(ii()&&t.callbackNode!==n)return null;var r=Yl(t,t===Ke?Xe:0);if(r===0)return null;if(r&30||r&t.expiredLanes||e)e=pu(t,r);else{e=r;var s=oe;oe|=2;var i=bw();(Ke!==t||Xe!==e)&&(Sn=null,yi=be()+500,us(t,e));do try{rA();break}catch(l){Nw(t,l)}while(!0);jf(),hu.current=i,oe=s,Oe!==null?e=0:(Ke=null,Xe=0,e=Fe)}if(e!==0){if(e===2&&(s=od(t),s!==0&&(r=s,e=Od(t,s))),e===1)throw n=ta,us(t,0),or(t,r),xt(t,be()),n;if(e===6)or(t,r);else{if(s=t.current.alternate,!(r&30)&&!tA(s)&&(e=pu(t,r),e===2&&(i=od(t),i!==0&&(r=i,e=Od(t,i))),e===1))throw n=ta,us(t,0),or(t,r),xt(t,be()),n;switch(t.finishedWork=s,t.finishedLanes=r,e){case 0:case 1:throw Error(F(345));case 2:ns(t,vt,Sn);break;case 3:if(or(t,r),(r&130023424)===r&&(e=Zf+500-be(),10<e)){if(Yl(t,0)!==0)break;if(s=t.suspendedLanes,(s&r)!==r){pt(),t.pingedLanes|=t.suspendedLanes&s;break}t.timeoutHandle=pd(ns.bind(null,t,vt,Sn),e);break}ns(t,vt,Sn);break;case 4:if(or(t,r),(r&4194240)===r)break;for(e=t.eventTimes,s=-1;0<r;){var o=31-Zt(r);i=1<<o,o=e[o],o>s&&(s=o),r&=~i}if(r=s,r=be()-r,r=(120>r?120:480>r?480:1080>r?1080:1920>r?1920:3e3>r?3e3:4320>r?4320:1960*eA(r/1960))-r,10<r){t.timeoutHandle=pd(ns.bind(null,t,vt,Sn),r);break}ns(t,vt,Sn);break;case 5:ns(t,vt,Sn);break;default:throw Error(F(329))}}}return xt(t,be()),t.callbackNode===n?Pw.bind(null,t):null}function Od(t,e){var n=Po;return t.current.memoizedState.isDehydrated&&(us(t,e).flags|=256),t=pu(t,e),t!==2&&(e=vt,vt=n,e!==null&&Vd(e)),t}function Vd(t){vt===null?vt=t:vt.push.apply(vt,t)}function tA(t){for(var e=t;;){if(e.flags&16384){var n=e.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var r=0;r<n.length;r++){var s=n[r],i=s.getSnapshot;s=s.value;try{if(!rn(i(),s))return!1}catch{return!1}}}if(n=e.child,e.subtreeFlags&16384&&n!==null)n.return=e,e=n;else{if(e===t)break;for(;e.sibling===null;){if(e.return===null||e.return===t)return!0;e=e.return}e.sibling.return=e.return,e=e.sibling}}return!0}function or(t,e){for(e&=~Jf,e&=~qu,t.suspendedLanes|=e,t.pingedLanes&=~e,t=t.expirationTimes;0<e;){var n=31-Zt(e),r=1<<n;t[n]=-1,e&=~r}}function Ty(t){if(oe&6)throw Error(F(327));ii();var e=Yl(t,0);if(!(e&1))return xt(t,be()),null;var n=pu(t,e);if(t.tag!==0&&n===2){var r=od(t);r!==0&&(e=r,n=Od(t,r))}if(n===1)throw n=ta,us(t,0),or(t,e),xt(t,be()),n;if(n===6)throw Error(F(345));return t.finishedWork=t.current.alternate,t.finishedLanes=e,ns(t,vt,Sn),xt(t,be()),null}function ep(t,e){var n=oe;oe|=1;try{return t(e)}finally{oe=n,oe===0&&(yi=be()+500,Bu&&$r())}}function gs(t){dr!==null&&dr.tag===0&&!(oe&6)&&ii();var e=oe;oe|=1;var n=Ft.transition,r=ue;try{if(Ft.transition=null,ue=1,t)return t()}finally{ue=r,Ft.transition=n,oe=e,!(oe&6)&&$r()}}function tp(){At=Js.current,ye(Js)}function us(t,e){t.finishedWork=null,t.finishedLanes=0;var n=t.timeoutHandle;if(n!==-1&&(t.timeoutHandle=-1,NS(n)),Oe!==null)for(n=Oe.return;n!==null;){var r=n;switch(Vf(r),r.tag){case 1:r=r.type.childContextTypes,r!=null&&tu();break;case 3:mi(),ye(Tt),ye(lt),Wf();break;case 5:$f(r);break;case 4:mi();break;case 13:ye(Ee);break;case 19:ye(Ee);break;case 10:Uf(r.type._context);break;case 22:case 23:tp()}n=n.return}if(Ke=t,Oe=t=Er(t.current,null),Xe=At=e,Fe=0,ta=null,Jf=qu=ms=0,vt=Po=null,is!==null){for(e=0;e<is.length;e++)if(n=is[e],r=n.interleaved,r!==null){n.interleaved=null;var s=r.next,i=n.pending;if(i!==null){var o=i.next;i.next=s,r.next=o}n.pending=r}is=null}return t}function Nw(t,e){do{var n=Oe;try{if(jf(),Rl.current=cu,uu){for(var r=Ie.memoizedState;r!==null;){var s=r.queue;s!==null&&(s.pending=null),r=r.next}uu=!1}if(ps=0,We=Ue=Ie=null,ko=!1,Jo=0,Xf.current=null,n===null||n.return===null){Fe=1,ta=e,Oe=null;break}e:{var i=t,o=n.return,l=n,u=e;if(e=Xe,l.flags|=32768,u!==null&&typeof u=="object"&&typeof u.then=="function"){var c=u,d=l,m=d.tag;if(!(d.mode&1)&&(m===0||m===11||m===15)){var g=d.alternate;g?(d.updateQueue=g.updateQueue,d.memoizedState=g.memoizedState,d.lanes=g.lanes):(d.updateQueue=null,d.memoizedState=null)}var w=uy(o);if(w!==null){w.flags&=-257,cy(w,o,l,i,e),w.mode&1&&ly(i,c,e),e=w,u=c;var A=e.updateQueue;if(A===null){var P=new Set;P.add(u),e.updateQueue=P}else A.add(u);break e}else{if(!(e&1)){ly(i,c,e),np();break e}u=Error(F(426))}}else if(ve&&l.mode&1){var N=uy(o);if(N!==null){!(N.flags&65536)&&(N.flags|=256),cy(N,o,l,i,e),Lf(gi(u,l));break e}}i=u=gi(u,l),Fe!==4&&(Fe=2),Po===null?Po=[i]:Po.push(i),i=o;do{switch(i.tag){case 3:i.flags|=65536,e&=-e,i.lanes|=e;var x=pw(i,u,e);ny(i,x);break e;case 1:l=u;var v=i.type,k=i.stateNode;if(!(i.flags&128)&&(typeof v.getDerivedStateFromError=="function"||k!==null&&typeof k.componentDidCatch=="function"&&(vr===null||!vr.has(k)))){i.flags|=65536,e&=-e,i.lanes|=e;var D=mw(i,l,e);ny(i,D);break e}}i=i.return}while(i!==null)}Ow(n)}catch(U){e=U,Oe===n&&n!==null&&(Oe=n=n.return);continue}break}while(!0)}function bw(){var t=hu.current;return hu.current=cu,t===null?cu:t}function np(){(Fe===0||Fe===3||Fe===2)&&(Fe=4),Ke===null||!(ms&268435455)&&!(qu&268435455)||or(Ke,Xe)}function pu(t,e){var n=oe;oe|=2;var r=bw();(Ke!==t||Xe!==e)&&(Sn=null,us(t,e));do try{nA();break}catch(s){Nw(t,s)}while(!0);if(jf(),oe=n,hu.current=r,Oe!==null)throw Error(F(261));return Ke=null,Xe=0,Fe}function nA(){for(;Oe!==null;)Dw(Oe)}function rA(){for(;Oe!==null&&!k1();)Dw(Oe)}function Dw(t){var e=Lw(t.alternate,t,At);t.memoizedProps=t.pendingProps,e===null?Ow(t):Oe=e,Xf.current=null}function Ow(t){var e=t;do{var n=e.alternate;if(t=e.return,e.flags&32768){if(n=YS(n,e),n!==null){n.flags&=32767,Oe=n;return}if(t!==null)t.flags|=32768,t.subtreeFlags=0,t.deletions=null;else{Fe=6,Oe=null;return}}else if(n=QS(n,e,At),n!==null){Oe=n;return}if(e=e.sibling,e!==null){Oe=e;return}Oe=e=t}while(e!==null);Fe===0&&(Fe=5)}function ns(t,e,n){var r=ue,s=Ft.transition;try{Ft.transition=null,ue=1,sA(t,e,n,r)}finally{Ft.transition=s,ue=r}return null}function sA(t,e,n,r){do ii();while(dr!==null);if(oe&6)throw Error(F(327));n=t.finishedWork;var s=t.finishedLanes;if(n===null)return null;if(t.finishedWork=null,t.finishedLanes=0,n===t.current)throw Error(F(177));t.callbackNode=null,t.callbackPriority=0;var i=n.lanes|n.childLanes;if(j1(t,i),t===Ke&&(Oe=Ke=null,Xe=0),!(n.subtreeFlags&2064)&&!(n.flags&2064)||hl||(hl=!0,Mw(Ql,function(){return ii(),null})),i=(n.flags&15990)!==0,n.subtreeFlags&15990||i){i=Ft.transition,Ft.transition=null;var o=ue;ue=1;var l=oe;oe|=4,Xf.current=null,JS(t,n),kw(n,t),xS(dd),Xl=!!hd,dd=hd=null,t.current=n,ZS(n),R1(),oe=l,ue=o,Ft.transition=i}else t.current=n;if(hl&&(hl=!1,dr=t,fu=s),i=t.pendingLanes,i===0&&(vr=null),b1(n.stateNode),xt(t,be()),e!==null)for(r=t.onRecoverableError,n=0;n<e.length;n++)s=e[n],r(s.value,{componentStack:s.stack,digest:s.digest});if(du)throw du=!1,t=bd,bd=null,t;return fu&1&&t.tag!==0&&ii(),i=t.pendingLanes,i&1?t===Dd?No++:(No=0,Dd=t):No=0,$r(),null}function ii(){if(dr!==null){var t=p0(fu),e=Ft.transition,n=ue;try{if(Ft.transition=null,ue=16>t?16:t,dr===null)var r=!1;else{if(t=dr,dr=null,fu=0,oe&6)throw Error(F(331));var s=oe;for(oe|=4,H=t.current;H!==null;){var i=H,o=i.child;if(H.flags&16){var l=i.deletions;if(l!==null){for(var u=0;u<l.length;u++){var c=l[u];for(H=c;H!==null;){var d=H;switch(d.tag){case 0:case 11:case 15:Ro(8,d,i)}var m=d.child;if(m!==null)m.return=d,H=m;else for(;H!==null;){d=H;var g=d.sibling,w=d.return;if(Sw(d),d===c){H=null;break}if(g!==null){g.return=w,H=g;break}H=w}}}var A=i.alternate;if(A!==null){var P=A.child;if(P!==null){A.child=null;do{var N=P.sibling;P.sibling=null,P=N}while(P!==null)}}H=i}}if(i.subtreeFlags&2064&&o!==null)o.return=i,H=o;else e:for(;H!==null;){if(i=H,i.flags&2048)switch(i.tag){case 0:case 11:case 15:Ro(9,i,i.return)}var x=i.sibling;if(x!==null){x.return=i.return,H=x;break e}H=i.return}}var v=t.current;for(H=v;H!==null;){o=H;var k=o.child;if(o.subtreeFlags&2064&&k!==null)k.return=o,H=k;else e:for(o=v;H!==null;){if(l=H,l.flags&2048)try{switch(l.tag){case 0:case 11:case 15:Hu(9,l)}}catch(U){Ce(l,l.return,U)}if(l===o){H=null;break e}var D=l.sibling;if(D!==null){D.return=l.return,H=D;break e}H=l.return}}if(oe=s,$r(),mn&&typeof mn.onPostCommitFiberRoot=="function")try{mn.onPostCommitFiberRoot(Mu,t)}catch{}r=!0}return r}finally{ue=n,Ft.transition=e}}return!1}function Iy(t,e,n){e=gi(n,e),e=pw(t,e,1),t=_r(t,e,1),e=pt(),t!==null&&(va(t,1,e),xt(t,e))}function Ce(t,e,n){if(t.tag===3)Iy(t,t,n);else for(;e!==null;){if(e.tag===3){Iy(e,t,n);break}else if(e.tag===1){var r=e.stateNode;if(typeof e.type.getDerivedStateFromError=="function"||typeof r.componentDidCatch=="function"&&(vr===null||!vr.has(r))){t=gi(n,t),t=mw(e,t,1),e=_r(e,t,1),t=pt(),e!==null&&(va(e,1,t),xt(e,t));break}}e=e.return}}function iA(t,e,n){var r=t.pingCache;r!==null&&r.delete(e),e=pt(),t.pingedLanes|=t.suspendedLanes&n,Ke===t&&(Xe&n)===n&&(Fe===4||Fe===3&&(Xe&130023424)===Xe&&500>be()-Zf?us(t,0):Jf|=n),xt(t,e)}function Vw(t,e){e===0&&(t.mode&1?(e=tl,tl<<=1,!(tl&130023424)&&(tl=4194304)):e=1);var n=pt();t=Un(t,e),t!==null&&(va(t,e,n),xt(t,n))}function oA(t){var e=t.memoizedState,n=0;e!==null&&(n=e.retryLane),Vw(t,n)}function aA(t,e){var n=0;switch(t.tag){case 13:var r=t.stateNode,s=t.memoizedState;s!==null&&(n=s.retryLane);break;case 19:r=t.stateNode;break;default:throw Error(F(314))}r!==null&&r.delete(e),Vw(t,n)}var Lw;Lw=function(t,e,n){if(t!==null)if(t.memoizedProps!==e.pendingProps||Tt.current)Et=!0;else{if(!(t.lanes&n)&&!(e.flags&128))return Et=!1,GS(t,e,n);Et=!!(t.flags&131072)}else Et=!1,ve&&e.flags&1048576&&F0(e,su,e.index);switch(e.lanes=0,e.tag){case 2:var r=e.type;Nl(t,e),t=e.pendingProps;var s=di(e,lt.current);si(e,n),s=qf(null,e,r,t,s,n);var i=Kf();return e.flags|=1,typeof s=="object"&&s!==null&&typeof s.render=="function"&&s.$$typeof===void 0?(e.tag=1,e.memoizedState=null,e.updateQueue=null,It(r)?(i=!0,nu(e)):i=!1,e.memoizedState=s.state!==null&&s.state!==void 0?s.state:null,zf(e),s.updater=Wu,e.stateNode=s,s._reactInternals=e,Ed(e,r,t,n),e=xd(null,e,r,!0,i,n)):(e.tag=0,ve&&i&&Of(e),ft(null,e,s,n),e=e.child),e;case 16:r=e.elementType;e:{switch(Nl(t,e),t=e.pendingProps,s=r._init,r=s(r._payload),e.type=r,s=e.tag=uA(r),t=Qt(r,t),s){case 0:e=Id(null,e,r,t,n);break e;case 1:e=fy(null,e,r,t,n);break e;case 11:e=hy(null,e,r,t,n);break e;case 14:e=dy(null,e,r,Qt(r.type,t),n);break e}throw Error(F(306,r,""))}return e;case 0:return r=e.type,s=e.pendingProps,s=e.elementType===r?s:Qt(r,s),Id(t,e,r,s,n);case 1:return r=e.type,s=e.pendingProps,s=e.elementType===r?s:Qt(r,s),fy(t,e,r,s,n);case 3:e:{if(vw(e),t===null)throw Error(F(387));r=e.pendingProps,i=e.memoizedState,s=i.element,q0(t,e),au(e,r,null,n);var o=e.memoizedState;if(r=o.element,i.isDehydrated)if(i={element:r,isDehydrated:!1,cache:o.cache,pendingSuspenseBoundaries:o.pendingSuspenseBoundaries,transitions:o.transitions},e.updateQueue.baseState=i,e.memoizedState=i,e.flags&256){s=gi(Error(F(423)),e),e=py(t,e,r,n,s);break e}else if(r!==s){s=gi(Error(F(424)),e),e=py(t,e,r,n,s);break e}else for(Rt=yr(e.stateNode.containerInfo.firstChild),bt=e,ve=!0,Xt=null,n=W0(e,null,r,n),e.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(fi(),r===s){e=Fn(t,e,n);break e}ft(t,e,r,n)}e=e.child}return e;case 5:return K0(e),t===null&&_d(e),r=e.type,s=e.pendingProps,i=t!==null?t.memoizedProps:null,o=s.children,fd(r,s)?o=null:i!==null&&fd(r,i)&&(e.flags|=32),_w(t,e),ft(t,e,o,n),e.child;case 6:return t===null&&_d(e),null;case 13:return ww(t,e,n);case 4:return Bf(e,e.stateNode.containerInfo),r=e.pendingProps,t===null?e.child=pi(e,null,r,n):ft(t,e,r,n),e.child;case 11:return r=e.type,s=e.pendingProps,s=e.elementType===r?s:Qt(r,s),hy(t,e,r,s,n);case 7:return ft(t,e,e.pendingProps,n),e.child;case 8:return ft(t,e,e.pendingProps.children,n),e.child;case 12:return ft(t,e,e.pendingProps.children,n),e.child;case 10:e:{if(r=e.type._context,s=e.pendingProps,i=e.memoizedProps,o=s.value,fe(iu,r._currentValue),r._currentValue=o,i!==null)if(rn(i.value,o)){if(i.children===s.children&&!Tt.current){e=Fn(t,e,n);break e}}else for(i=e.child,i!==null&&(i.return=e);i!==null;){var l=i.dependencies;if(l!==null){o=i.child;for(var u=l.firstContext;u!==null;){if(u.context===r){if(i.tag===1){u=Dn(-1,n&-n),u.tag=2;var c=i.updateQueue;if(c!==null){c=c.shared;var d=c.pending;d===null?u.next=u:(u.next=d.next,d.next=u),c.pending=u}}i.lanes|=n,u=i.alternate,u!==null&&(u.lanes|=n),vd(i.return,n,e),l.lanes|=n;break}u=u.next}}else if(i.tag===10)o=i.type===e.type?null:i.child;else if(i.tag===18){if(o=i.return,o===null)throw Error(F(341));o.lanes|=n,l=o.alternate,l!==null&&(l.lanes|=n),vd(o,n,e),o=i.sibling}else o=i.child;if(o!==null)o.return=i;else for(o=i;o!==null;){if(o===e){o=null;break}if(i=o.sibling,i!==null){i.return=o.return,o=i;break}o=o.return}i=o}ft(t,e,s.children,n),e=e.child}return e;case 9:return s=e.type,r=e.pendingProps.children,si(e,n),s=Bt(s),r=r(s),e.flags|=1,ft(t,e,r,n),e.child;case 14:return r=e.type,s=Qt(r,e.pendingProps),s=Qt(r.type,s),dy(t,e,r,s,n);case 15:return gw(t,e,e.type,e.pendingProps,n);case 17:return r=e.type,s=e.pendingProps,s=e.elementType===r?s:Qt(r,s),Nl(t,e),e.tag=1,It(r)?(t=!0,nu(e)):t=!1,si(e,n),fw(e,r,s),Ed(e,r,s,n),xd(null,e,r,!0,t,n);case 19:return Ew(t,e,n);case 22:return yw(t,e,n)}throw Error(F(156,e.tag))};function Mw(t,e){return c0(t,e)}function lA(t,e,n,r){this.tag=t,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=e,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=r,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Ut(t,e,n,r){return new lA(t,e,n,r)}function rp(t){return t=t.prototype,!(!t||!t.isReactComponent)}function uA(t){if(typeof t=="function")return rp(t)?1:0;if(t!=null){if(t=t.$$typeof,t===Tf)return 11;if(t===If)return 14}return 2}function Er(t,e){var n=t.alternate;return n===null?(n=Ut(t.tag,e,t.key,t.mode),n.elementType=t.elementType,n.type=t.type,n.stateNode=t.stateNode,n.alternate=t,t.alternate=n):(n.pendingProps=e,n.type=t.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=t.flags&14680064,n.childLanes=t.childLanes,n.lanes=t.lanes,n.child=t.child,n.memoizedProps=t.memoizedProps,n.memoizedState=t.memoizedState,n.updateQueue=t.updateQueue,e=t.dependencies,n.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext},n.sibling=t.sibling,n.index=t.index,n.ref=t.ref,n}function Ol(t,e,n,r,s,i){var o=2;if(r=t,typeof t=="function")rp(t)&&(o=1);else if(typeof t=="string")o=5;else e:switch(t){case Bs:return cs(n.children,s,i,e);case Ef:o=8,s|=8;break;case Hh:return t=Ut(12,n,e,s|2),t.elementType=Hh,t.lanes=i,t;case qh:return t=Ut(13,n,e,s),t.elementType=qh,t.lanes=i,t;case Kh:return t=Ut(19,n,e,s),t.elementType=Kh,t.lanes=i,t;case Kv:return Ku(n,s,i,e);default:if(typeof t=="object"&&t!==null)switch(t.$$typeof){case Hv:o=10;break e;case qv:o=9;break e;case Tf:o=11;break e;case If:o=14;break e;case rr:o=16,r=null;break e}throw Error(F(130,t==null?t:typeof t,""))}return e=Ut(o,n,e,s),e.elementType=t,e.type=r,e.lanes=i,e}function cs(t,e,n,r){return t=Ut(7,t,r,e),t.lanes=n,t}function Ku(t,e,n,r){return t=Ut(22,t,r,e),t.elementType=Kv,t.lanes=n,t.stateNode={isHidden:!1},t}function xh(t,e,n){return t=Ut(6,t,null,e),t.lanes=n,t}function Sh(t,e,n){return e=Ut(4,t.children!==null?t.children:[],t.key,e),e.lanes=n,e.stateNode={containerInfo:t.containerInfo,pendingChildren:null,implementation:t.implementation},e}function cA(t,e,n,r,s){this.tag=e,this.containerInfo=t,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=ih(0),this.expirationTimes=ih(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=ih(0),this.identifierPrefix=r,this.onRecoverableError=s,this.mutableSourceEagerHydrationData=null}function sp(t,e,n,r,s,i,o,l,u){return t=new cA(t,e,n,l,u),e===1?(e=1,i===!0&&(e|=8)):e=0,i=Ut(3,null,null,e),t.current=i,i.stateNode=t,i.memoizedState={element:r,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},zf(i),t}function hA(t,e,n){var r=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:zs,key:r==null?null:""+r,children:t,containerInfo:e,implementation:n}}function jw(t){if(!t)return Pr;t=t._reactInternals;e:{if(Ss(t)!==t||t.tag!==1)throw Error(F(170));var e=t;do{switch(e.tag){case 3:e=e.stateNode.context;break e;case 1:if(It(e.type)){e=e.stateNode.__reactInternalMemoizedMergedChildContext;break e}}e=e.return}while(e!==null);throw Error(F(171))}if(t.tag===1){var n=t.type;if(It(n))return j0(t,n,e)}return e}function Uw(t,e,n,r,s,i,o,l,u){return t=sp(n,r,!0,t,s,i,o,l,u),t.context=jw(null),n=t.current,r=pt(),s=wr(n),i=Dn(r,s),i.callback=e??null,_r(n,i,s),t.current.lanes=s,va(t,s,r),xt(t,r),t}function Gu(t,e,n,r){var s=e.current,i=pt(),o=wr(s);return n=jw(n),e.context===null?e.context=n:e.pendingContext=n,e=Dn(i,o),e.payload={element:t},r=r===void 0?null:r,r!==null&&(e.callback=r),t=_r(s,e,o),t!==null&&(en(t,s,o,i),kl(t,s,o)),o}function mu(t){if(t=t.current,!t.child)return null;switch(t.child.tag){case 5:return t.child.stateNode;default:return t.child.stateNode}}function xy(t,e){if(t=t.memoizedState,t!==null&&t.dehydrated!==null){var n=t.retryLane;t.retryLane=n!==0&&n<e?n:e}}function ip(t,e){xy(t,e),(t=t.alternate)&&xy(t,e)}function dA(){return null}var Fw=typeof reportError=="function"?reportError:function(t){console.error(t)};function op(t){this._internalRoot=t}Qu.prototype.render=op.prototype.render=function(t){var e=this._internalRoot;if(e===null)throw Error(F(409));Gu(t,e,null,null)};Qu.prototype.unmount=op.prototype.unmount=function(){var t=this._internalRoot;if(t!==null){this._internalRoot=null;var e=t.containerInfo;gs(function(){Gu(null,t,null,null)}),e[jn]=null}};function Qu(t){this._internalRoot=t}Qu.prototype.unstable_scheduleHydration=function(t){if(t){var e=y0();t={blockedOn:null,target:t,priority:e};for(var n=0;n<ir.length&&e!==0&&e<ir[n].priority;n++);ir.splice(n,0,t),n===0&&v0(t)}};function ap(t){return!(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11)}function Yu(t){return!(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11&&(t.nodeType!==8||t.nodeValue!==" react-mount-point-unstable "))}function Sy(){}function fA(t,e,n,r,s){if(s){if(typeof r=="function"){var i=r;r=function(){var c=mu(o);i.call(c)}}var o=Uw(e,r,t,0,null,!1,!1,"",Sy);return t._reactRootContainer=o,t[jn]=o.current,Ko(t.nodeType===8?t.parentNode:t),gs(),o}for(;s=t.lastChild;)t.removeChild(s);if(typeof r=="function"){var l=r;r=function(){var c=mu(u);l.call(c)}}var u=sp(t,0,!1,null,null,!1,!1,"",Sy);return t._reactRootContainer=u,t[jn]=u.current,Ko(t.nodeType===8?t.parentNode:t),gs(function(){Gu(e,u,n,r)}),u}function Xu(t,e,n,r,s){var i=n._reactRootContainer;if(i){var o=i;if(typeof s=="function"){var l=s;s=function(){var u=mu(o);l.call(u)}}Gu(e,o,t,s)}else o=fA(n,e,t,s,r);return mu(o)}m0=function(t){switch(t.tag){case 3:var e=t.stateNode;if(e.current.memoizedState.isDehydrated){var n=go(e.pendingLanes);n!==0&&(Af(e,n|1),xt(e,be()),!(oe&6)&&(yi=be()+500,$r()))}break;case 13:gs(function(){var r=Un(t,1);if(r!==null){var s=pt();en(r,t,1,s)}}),ip(t,1)}};Cf=function(t){if(t.tag===13){var e=Un(t,134217728);if(e!==null){var n=pt();en(e,t,134217728,n)}ip(t,134217728)}};g0=function(t){if(t.tag===13){var e=wr(t),n=Un(t,e);if(n!==null){var r=pt();en(n,t,e,r)}ip(t,e)}};y0=function(){return ue};_0=function(t,e){var n=ue;try{return ue=t,e()}finally{ue=n}};rd=function(t,e,n){switch(e){case"input":if(Yh(t,n),e=n.name,n.type==="radio"&&e!=null){for(n=t;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+e)+'][type="radio"]'),e=0;e<n.length;e++){var r=n[e];if(r!==t&&r.form===t.form){var s=zu(r);if(!s)throw Error(F(90));Qv(r),Yh(r,s)}}}break;case"textarea":Xv(t,n);break;case"select":e=n.value,e!=null&&ei(t,!!n.multiple,e,!1)}};s0=ep;i0=gs;var pA={usingClientEntryPoint:!1,Events:[Ea,qs,zu,n0,r0,ep]},co={findFiberByHostInstance:ss,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},mA={bundleType:co.bundleType,version:co.version,rendererPackageName:co.rendererPackageName,rendererConfig:co.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:qn.ReactCurrentDispatcher,findHostInstanceByFiber:function(t){return t=l0(t),t===null?null:t.stateNode},findFiberByHostInstance:co.findFiberByHostInstance||dA,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var dl=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!dl.isDisabled&&dl.supportsFiber)try{Mu=dl.inject(mA),mn=dl}catch{}}Ot.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=pA;Ot.createPortal=function(t,e){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!ap(e))throw Error(F(200));return hA(t,e,null,n)};Ot.createRoot=function(t,e){if(!ap(t))throw Error(F(299));var n=!1,r="",s=Fw;return e!=null&&(e.unstable_strictMode===!0&&(n=!0),e.identifierPrefix!==void 0&&(r=e.identifierPrefix),e.onRecoverableError!==void 0&&(s=e.onRecoverableError)),e=sp(t,1,!1,null,null,n,!1,r,s),t[jn]=e.current,Ko(t.nodeType===8?t.parentNode:t),new op(e)};Ot.findDOMNode=function(t){if(t==null)return null;if(t.nodeType===1)return t;var e=t._reactInternals;if(e===void 0)throw typeof t.render=="function"?Error(F(188)):(t=Object.keys(t).join(","),Error(F(268,t)));return t=l0(e),t=t===null?null:t.stateNode,t};Ot.flushSync=function(t){return gs(t)};Ot.hydrate=function(t,e,n){if(!Yu(e))throw Error(F(200));return Xu(null,t,e,!0,n)};Ot.hydrateRoot=function(t,e,n){if(!ap(t))throw Error(F(405));var r=n!=null&&n.hydratedSources||null,s=!1,i="",o=Fw;if(n!=null&&(n.unstable_strictMode===!0&&(s=!0),n.identifierPrefix!==void 0&&(i=n.identifierPrefix),n.onRecoverableError!==void 0&&(o=n.onRecoverableError)),e=Uw(e,null,t,1,n??null,s,!1,i,o),t[jn]=e.current,Ko(t),r)for(t=0;t<r.length;t++)n=r[t],s=n._getVersion,s=s(n._source),e.mutableSourceEagerHydrationData==null?e.mutableSourceEagerHydrationData=[n,s]:e.mutableSourceEagerHydrationData.push(n,s);return new Qu(e)};Ot.render=function(t,e,n){if(!Yu(e))throw Error(F(200));return Xu(null,t,e,!1,n)};Ot.unmountComponentAtNode=function(t){if(!Yu(t))throw Error(F(40));return t._reactRootContainer?(gs(function(){Xu(null,null,t,!1,function(){t._reactRootContainer=null,t[jn]=null})}),!0):!1};Ot.unstable_batchedUpdates=ep;Ot.unstable_renderSubtreeIntoContainer=function(t,e,n,r){if(!Yu(n))throw Error(F(200));if(t==null||t._reactInternals===void 0)throw Error(F(38));return Xu(t,e,n,!1,r)};Ot.version="18.3.1-next-f1338f8080-20240426";function zw(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(zw)}catch(t){console.error(t)}}zw(),zv.exports=Ot;var gA=zv.exports,Bw,Ay=gA;Bw=Ay.createRoot,Ay.hydrateRoot;/**
 * @remix-run/router v1.23.2
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function na(){return na=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},na.apply(this,arguments)}var fr;(function(t){t.Pop="POP",t.Push="PUSH",t.Replace="REPLACE"})(fr||(fr={}));const Cy="popstate";function yA(t){t===void 0&&(t={});function e(r,s){let{pathname:i,search:o,hash:l}=r.location;return Ld("",{pathname:i,search:o,hash:l},s.state&&s.state.usr||null,s.state&&s.state.key||"default")}function n(r,s){return typeof s=="string"?s:gu(s)}return vA(e,n,null,t)}function xe(t,e){if(t===!1||t===null||typeof t>"u")throw new Error(e)}function lp(t,e){if(!t){typeof console<"u"&&console.warn(e);try{throw new Error(e)}catch{}}}function _A(){return Math.random().toString(36).substr(2,8)}function ky(t,e){return{usr:t.state,key:t.key,idx:e}}function Ld(t,e,n,r){return n===void 0&&(n=null),na({pathname:typeof t=="string"?t:t.pathname,search:"",hash:""},typeof e=="string"?Ri(e):e,{state:n,key:e&&e.key||r||_A()})}function gu(t){let{pathname:e="/",search:n="",hash:r=""}=t;return n&&n!=="?"&&(e+=n.charAt(0)==="?"?n:"?"+n),r&&r!=="#"&&(e+=r.charAt(0)==="#"?r:"#"+r),e}function Ri(t){let e={};if(t){let n=t.indexOf("#");n>=0&&(e.hash=t.substr(n),t=t.substr(0,n));let r=t.indexOf("?");r>=0&&(e.search=t.substr(r),t=t.substr(0,r)),t&&(e.pathname=t)}return e}function vA(t,e,n,r){r===void 0&&(r={});let{window:s=document.defaultView,v5Compat:i=!1}=r,o=s.history,l=fr.Pop,u=null,c=d();c==null&&(c=0,o.replaceState(na({},o.state,{idx:c}),""));function d(){return(o.state||{idx:null}).idx}function m(){l=fr.Pop;let N=d(),x=N==null?null:N-c;c=N,u&&u({action:l,location:P.location,delta:x})}function g(N,x){l=fr.Push;let v=Ld(P.location,N,x);c=d()+1;let k=ky(v,c),D=P.createHref(v);try{o.pushState(k,"",D)}catch(U){if(U instanceof DOMException&&U.name==="DataCloneError")throw U;s.location.assign(D)}i&&u&&u({action:l,location:P.location,delta:1})}function w(N,x){l=fr.Replace;let v=Ld(P.location,N,x);c=d();let k=ky(v,c),D=P.createHref(v);o.replaceState(k,"",D),i&&u&&u({action:l,location:P.location,delta:0})}function A(N){let x=s.location.origin!=="null"?s.location.origin:s.location.href,v=typeof N=="string"?N:gu(N);return v=v.replace(/ $/,"%20"),xe(x,"No window.location.(origin|href) available to create URL for href: "+v),new URL(v,x)}let P={get action(){return l},get location(){return t(s,o)},listen(N){if(u)throw new Error("A history only accepts one active listener");return s.addEventListener(Cy,m),u=N,()=>{s.removeEventListener(Cy,m),u=null}},createHref(N){return e(s,N)},createURL:A,encodeLocation(N){let x=A(N);return{pathname:x.pathname,search:x.search,hash:x.hash}},push:g,replace:w,go(N){return o.go(N)}};return P}var Ry;(function(t){t.data="data",t.deferred="deferred",t.redirect="redirect",t.error="error"})(Ry||(Ry={}));function wA(t,e,n){return n===void 0&&(n="/"),EA(t,e,n)}function EA(t,e,n,r){let s=typeof e=="string"?Ri(e):e,i=_i(s.pathname||"/",n);if(i==null)return null;let o=$w(t);TA(o);let l=null;for(let u=0;l==null&&u<o.length;++u){let c=DA(i);l=NA(o[u],c)}return l}function $w(t,e,n,r){e===void 0&&(e=[]),n===void 0&&(n=[]),r===void 0&&(r="");let s=(i,o,l)=>{let u={relativePath:l===void 0?i.path||"":l,caseSensitive:i.caseSensitive===!0,childrenIndex:o,route:i};u.relativePath.startsWith("/")&&(xe(u.relativePath.startsWith(r),'Absolute route path "'+u.relativePath+'" nested under path '+('"'+r+'" is not valid. An absolute child route path ')+"must start with the combined path of all its parent routes."),u.relativePath=u.relativePath.slice(r.length));let c=Tr([r,u.relativePath]),d=n.concat(u);i.children&&i.children.length>0&&(xe(i.index!==!0,"Index routes must not have child routes. Please remove "+('all child routes from route path "'+c+'".')),$w(i.children,e,d,c)),!(i.path==null&&!i.index)&&e.push({path:c,score:RA(c,i.index),routesMeta:d})};return t.forEach((i,o)=>{var l;if(i.path===""||!((l=i.path)!=null&&l.includes("?")))s(i,o);else for(let u of Ww(i.path))s(i,o,u)}),e}function Ww(t){let e=t.split("/");if(e.length===0)return[];let[n,...r]=e,s=n.endsWith("?"),i=n.replace(/\?$/,"");if(r.length===0)return s?[i,""]:[i];let o=Ww(r.join("/")),l=[];return l.push(...o.map(u=>u===""?i:[i,u].join("/"))),s&&l.push(...o),l.map(u=>t.startsWith("/")&&u===""?"/":u)}function TA(t){t.sort((e,n)=>e.score!==n.score?n.score-e.score:PA(e.routesMeta.map(r=>r.childrenIndex),n.routesMeta.map(r=>r.childrenIndex)))}const IA=/^:[\w-]+$/,xA=3,SA=2,AA=1,CA=10,kA=-2,Py=t=>t==="*";function RA(t,e){let n=t.split("/"),r=n.length;return n.some(Py)&&(r+=kA),e&&(r+=SA),n.filter(s=>!Py(s)).reduce((s,i)=>s+(IA.test(i)?xA:i===""?AA:CA),r)}function PA(t,e){return t.length===e.length&&t.slice(0,-1).every((r,s)=>r===e[s])?t[t.length-1]-e[e.length-1]:0}function NA(t,e,n){let{routesMeta:r}=t,s={},i="/",o=[];for(let l=0;l<r.length;++l){let u=r[l],c=l===r.length-1,d=i==="/"?e:e.slice(i.length)||"/",m=Md({path:u.relativePath,caseSensitive:u.caseSensitive,end:c},d),g=u.route;if(!m)return null;Object.assign(s,m.params),o.push({params:s,pathname:Tr([i,m.pathname]),pathnameBase:jA(Tr([i,m.pathnameBase])),route:g}),m.pathnameBase!=="/"&&(i=Tr([i,m.pathnameBase]))}return o}function Md(t,e){typeof t=="string"&&(t={path:t,caseSensitive:!1,end:!0});let[n,r]=bA(t.path,t.caseSensitive,t.end),s=e.match(n);if(!s)return null;let i=s[0],o=i.replace(/(.)\/+$/,"$1"),l=s.slice(1);return{params:r.reduce((c,d,m)=>{let{paramName:g,isOptional:w}=d;if(g==="*"){let P=l[m]||"";o=i.slice(0,i.length-P.length).replace(/(.)\/+$/,"$1")}const A=l[m];return w&&!A?c[g]=void 0:c[g]=(A||"").replace(/%2F/g,"/"),c},{}),pathname:i,pathnameBase:o,pattern:t}}function bA(t,e,n){e===void 0&&(e=!1),n===void 0&&(n=!0),lp(t==="*"||!t.endsWith("*")||t.endsWith("/*"),'Route path "'+t+'" will be treated as if it were '+('"'+t.replace(/\*$/,"/*")+'" because the `*` character must ')+"always follow a `/` in the pattern. To get rid of this warning, "+('please change the route path to "'+t.replace(/\*$/,"/*")+'".'));let r=[],s="^"+t.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(o,l,u)=>(r.push({paramName:l,isOptional:u!=null}),u?"/?([^\\/]+)?":"/([^\\/]+)"));return t.endsWith("*")?(r.push({paramName:"*"}),s+=t==="*"||t==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):n?s+="\\/*$":t!==""&&t!=="/"&&(s+="(?:(?=\\/|$))"),[new RegExp(s,e?void 0:"i"),r]}function DA(t){try{return t.split("/").map(e=>decodeURIComponent(e).replace(/\//g,"%2F")).join("/")}catch(e){return lp(!1,'The URL path "'+t+'" could not be decoded because it is is a malformed URL segment. This is probably due to a bad percent '+("encoding ("+e+").")),t}}function _i(t,e){if(e==="/")return t;if(!t.toLowerCase().startsWith(e.toLowerCase()))return null;let n=e.endsWith("/")?e.length-1:e.length,r=t.charAt(n);return r&&r!=="/"?null:t.slice(n)||"/"}const OA=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,VA=t=>OA.test(t);function LA(t,e){e===void 0&&(e="/");let{pathname:n,search:r="",hash:s=""}=typeof t=="string"?Ri(t):t,i;if(n)if(VA(n))i=n;else{if(n.includes("//")){let o=n;n=n.replace(/\/\/+/g,"/"),lp(!1,"Pathnames cannot have embedded double slashes - normalizing "+(o+" -> "+n))}n.startsWith("/")?i=Ny(n.substring(1),"/"):i=Ny(n,e)}else i=e;return{pathname:i,search:UA(r),hash:FA(s)}}function Ny(t,e){let n=e.replace(/\/+$/,"").split("/");return t.split("/").forEach(s=>{s===".."?n.length>1&&n.pop():s!=="."&&n.push(s)}),n.length>1?n.join("/"):"/"}function Ah(t,e,n,r){return"Cannot include a '"+t+"' character in a manually specified "+("`to."+e+"` field ["+JSON.stringify(r)+"].  Please separate it out to the ")+("`to."+n+"` field. Alternatively you may provide the full path as ")+'a string in <Link to="..."> and the router will parse it for you.'}function MA(t){return t.filter((e,n)=>n===0||e.route.path&&e.route.path.length>0)}function up(t,e){let n=MA(t);return e?n.map((r,s)=>s===n.length-1?r.pathname:r.pathnameBase):n.map(r=>r.pathnameBase)}function cp(t,e,n,r){r===void 0&&(r=!1);let s;typeof t=="string"?s=Ri(t):(s=na({},t),xe(!s.pathname||!s.pathname.includes("?"),Ah("?","pathname","search",s)),xe(!s.pathname||!s.pathname.includes("#"),Ah("#","pathname","hash",s)),xe(!s.search||!s.search.includes("#"),Ah("#","search","hash",s)));let i=t===""||s.pathname==="",o=i?"/":s.pathname,l;if(o==null)l=n;else{let m=e.length-1;if(!r&&o.startsWith("..")){let g=o.split("/");for(;g[0]==="..";)g.shift(),m-=1;s.pathname=g.join("/")}l=m>=0?e[m]:"/"}let u=LA(s,l),c=o&&o!=="/"&&o.endsWith("/"),d=(i||o===".")&&n.endsWith("/");return!u.pathname.endsWith("/")&&(c||d)&&(u.pathname+="/"),u}const Tr=t=>t.join("/").replace(/\/\/+/g,"/"),jA=t=>t.replace(/\/+$/,"").replace(/^\/*/,"/"),UA=t=>!t||t==="?"?"":t.startsWith("?")?t:"?"+t,FA=t=>!t||t==="#"?"":t.startsWith("#")?t:"#"+t;function zA(t){return t!=null&&typeof t.status=="number"&&typeof t.statusText=="string"&&typeof t.internal=="boolean"&&"data"in t}const Hw=["post","put","patch","delete"];new Set(Hw);const BA=["get",...Hw];new Set(BA);/**
 * React Router v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function ra(){return ra=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},ra.apply(this,arguments)}const Ju=V.createContext(null),qw=V.createContext(null),Kn=V.createContext(null),Zu=V.createContext(null),Wr=V.createContext({outlet:null,matches:[],isDataRoute:!1}),Kw=V.createContext(null);function $A(t,e){let{relative:n}=e===void 0?{}:e;Pi()||xe(!1);let{basename:r,navigator:s}=V.useContext(Kn),{hash:i,pathname:o,search:l}=ec(t,{relative:n}),u=o;return r!=="/"&&(u=o==="/"?r:Tr([r,o])),s.createHref({pathname:u,search:l,hash:i})}function Pi(){return V.useContext(Zu)!=null}function Ni(){return Pi()||xe(!1),V.useContext(Zu).location}function Gw(t){V.useContext(Kn).static||V.useLayoutEffect(t)}function Qw(){let{isDataRoute:t}=V.useContext(Wr);return t?nC():WA()}function WA(){Pi()||xe(!1);let t=V.useContext(Ju),{basename:e,future:n,navigator:r}=V.useContext(Kn),{matches:s}=V.useContext(Wr),{pathname:i}=Ni(),o=JSON.stringify(up(s,n.v7_relativeSplatPath)),l=V.useRef(!1);return Gw(()=>{l.current=!0}),V.useCallback(function(c,d){if(d===void 0&&(d={}),!l.current)return;if(typeof c=="number"){r.go(c);return}let m=cp(c,JSON.parse(o),i,d.relative==="path");t==null&&e!=="/"&&(m.pathname=m.pathname==="/"?e:Tr([e,m.pathname])),(d.replace?r.replace:r.push)(m,d.state,d)},[e,r,o,i,t])}function ec(t,e){let{relative:n}=e===void 0?{}:e,{future:r}=V.useContext(Kn),{matches:s}=V.useContext(Wr),{pathname:i}=Ni(),o=JSON.stringify(up(s,r.v7_relativeSplatPath));return V.useMemo(()=>cp(t,JSON.parse(o),i,n==="path"),[t,o,i,n])}function HA(t,e){return qA(t,e)}function qA(t,e,n,r){Pi()||xe(!1);let{navigator:s}=V.useContext(Kn),{matches:i}=V.useContext(Wr),o=i[i.length-1],l=o?o.params:{};o&&o.pathname;let u=o?o.pathnameBase:"/";o&&o.route;let c=Ni(),d;if(e){var m;let N=typeof e=="string"?Ri(e):e;u==="/"||(m=N.pathname)!=null&&m.startsWith(u)||xe(!1),d=N}else d=c;let g=d.pathname||"/",w=g;if(u!=="/"){let N=u.replace(/^\//,"").split("/");w="/"+g.replace(/^\//,"").split("/").slice(N.length).join("/")}let A=wA(t,{pathname:w}),P=XA(A&&A.map(N=>Object.assign({},N,{params:Object.assign({},l,N.params),pathname:Tr([u,s.encodeLocation?s.encodeLocation(N.pathname).pathname:N.pathname]),pathnameBase:N.pathnameBase==="/"?u:Tr([u,s.encodeLocation?s.encodeLocation(N.pathnameBase).pathname:N.pathnameBase])})),i,n,r);return e&&P?V.createElement(Zu.Provider,{value:{location:ra({pathname:"/",search:"",hash:"",state:null,key:"default"},d),navigationType:fr.Pop}},P):P}function KA(){let t=tC(),e=zA(t)?t.status+" "+t.statusText:t instanceof Error?t.message:JSON.stringify(t),n=t instanceof Error?t.stack:null,s={padding:"0.5rem",backgroundColor:"rgba(200,200,200, 0.5)"};return V.createElement(V.Fragment,null,V.createElement("h2",null,"Unexpected Application Error!"),V.createElement("h3",{style:{fontStyle:"italic"}},e),n?V.createElement("pre",{style:s},n):null,null)}const GA=V.createElement(KA,null);class QA extends V.Component{constructor(e){super(e),this.state={location:e.location,revalidation:e.revalidation,error:e.error}}static getDerivedStateFromError(e){return{error:e}}static getDerivedStateFromProps(e,n){return n.location!==e.location||n.revalidation!=="idle"&&e.revalidation==="idle"?{error:e.error,location:e.location,revalidation:e.revalidation}:{error:e.error!==void 0?e.error:n.error,location:n.location,revalidation:e.revalidation||n.revalidation}}componentDidCatch(e,n){console.error("React Router caught the following error during render",e,n)}render(){return this.state.error!==void 0?V.createElement(Wr.Provider,{value:this.props.routeContext},V.createElement(Kw.Provider,{value:this.state.error,children:this.props.component})):this.props.children}}function YA(t){let{routeContext:e,match:n,children:r}=t,s=V.useContext(Ju);return s&&s.static&&s.staticContext&&(n.route.errorElement||n.route.ErrorBoundary)&&(s.staticContext._deepestRenderedBoundaryId=n.route.id),V.createElement(Wr.Provider,{value:e},r)}function XA(t,e,n,r){var s;if(e===void 0&&(e=[]),n===void 0&&(n=null),r===void 0&&(r=null),t==null){var i;if(!n)return null;if(n.errors)t=n.matches;else if((i=r)!=null&&i.v7_partialHydration&&e.length===0&&!n.initialized&&n.matches.length>0)t=n.matches;else return null}let o=t,l=(s=n)==null?void 0:s.errors;if(l!=null){let d=o.findIndex(m=>m.route.id&&(l==null?void 0:l[m.route.id])!==void 0);d>=0||xe(!1),o=o.slice(0,Math.min(o.length,d+1))}let u=!1,c=-1;if(n&&r&&r.v7_partialHydration)for(let d=0;d<o.length;d++){let m=o[d];if((m.route.HydrateFallback||m.route.hydrateFallbackElement)&&(c=d),m.route.id){let{loaderData:g,errors:w}=n,A=m.route.loader&&g[m.route.id]===void 0&&(!w||w[m.route.id]===void 0);if(m.route.lazy||A){u=!0,c>=0?o=o.slice(0,c+1):o=[o[0]];break}}}return o.reduceRight((d,m,g)=>{let w,A=!1,P=null,N=null;n&&(w=l&&m.route.id?l[m.route.id]:void 0,P=m.route.errorElement||GA,u&&(c<0&&g===0?(rC("route-fallback"),A=!0,N=null):c===g&&(A=!0,N=m.route.hydrateFallbackElement||null)));let x=e.concat(o.slice(0,g+1)),v=()=>{let k;return w?k=P:A?k=N:m.route.Component?k=V.createElement(m.route.Component,null):m.route.element?k=m.route.element:k=d,V.createElement(YA,{match:m,routeContext:{outlet:d,matches:x,isDataRoute:n!=null},children:k})};return n&&(m.route.ErrorBoundary||m.route.errorElement||g===0)?V.createElement(QA,{location:n.location,revalidation:n.revalidation,component:P,error:w,children:v(),routeContext:{outlet:null,matches:x,isDataRoute:!0}}):v()},null)}var Yw=function(t){return t.UseBlocker="useBlocker",t.UseRevalidator="useRevalidator",t.UseNavigateStable="useNavigate",t}(Yw||{}),Xw=function(t){return t.UseBlocker="useBlocker",t.UseLoaderData="useLoaderData",t.UseActionData="useActionData",t.UseRouteError="useRouteError",t.UseNavigation="useNavigation",t.UseRouteLoaderData="useRouteLoaderData",t.UseMatches="useMatches",t.UseRevalidator="useRevalidator",t.UseNavigateStable="useNavigate",t.UseRouteId="useRouteId",t}(Xw||{});function JA(t){let e=V.useContext(Ju);return e||xe(!1),e}function ZA(t){let e=V.useContext(qw);return e||xe(!1),e}function eC(t){let e=V.useContext(Wr);return e||xe(!1),e}function Jw(t){let e=eC(),n=e.matches[e.matches.length-1];return n.route.id||xe(!1),n.route.id}function tC(){var t;let e=V.useContext(Kw),n=ZA(),r=Jw();return e!==void 0?e:(t=n.errors)==null?void 0:t[r]}function nC(){let{router:t}=JA(Yw.UseNavigateStable),e=Jw(Xw.UseNavigateStable),n=V.useRef(!1);return Gw(()=>{n.current=!0}),V.useCallback(function(s,i){i===void 0&&(i={}),n.current&&(typeof s=="number"?t.navigate(s):t.navigate(s,ra({fromRouteId:e},i)))},[t,e])}const by={};function rC(t,e,n){by[t]||(by[t]=!0)}function sC(t,e){t==null||t.v7_startTransition,t==null||t.v7_relativeSplatPath}function Dy(t){let{to:e,replace:n,state:r,relative:s}=t;Pi()||xe(!1);let{future:i,static:o}=V.useContext(Kn),{matches:l}=V.useContext(Wr),{pathname:u}=Ni(),c=Qw(),d=cp(e,up(l,i.v7_relativeSplatPath),u,s==="path"),m=JSON.stringify(d);return V.useEffect(()=>c(JSON.parse(m),{replace:n,state:r,relative:s}),[c,m,s,n,r]),null}function Gt(t){xe(!1)}function iC(t){let{basename:e="/",children:n=null,location:r,navigationType:s=fr.Pop,navigator:i,static:o=!1,future:l}=t;Pi()&&xe(!1);let u=e.replace(/^\/*/,"/"),c=V.useMemo(()=>({basename:u,navigator:i,static:o,future:ra({v7_relativeSplatPath:!1},l)}),[u,l,i,o]);typeof r=="string"&&(r=Ri(r));let{pathname:d="/",search:m="",hash:g="",state:w=null,key:A="default"}=r,P=V.useMemo(()=>{let N=_i(d,u);return N==null?null:{location:{pathname:N,search:m,hash:g,state:w,key:A},navigationType:s}},[u,d,m,g,w,A,s]);return P==null?null:V.createElement(Kn.Provider,{value:c},V.createElement(Zu.Provider,{children:n,value:P}))}function Zw(t){let{children:e,location:n}=t;return HA(jd(e),n)}new Promise(()=>{});function jd(t,e){e===void 0&&(e=[]);let n=[];return V.Children.forEach(t,(r,s)=>{if(!V.isValidElement(r))return;let i=[...e,s];if(r.type===V.Fragment){n.push.apply(n,jd(r.props.children,i));return}r.type!==Gt&&xe(!1),!r.props.index||!r.props.children||xe(!1);let o={id:r.props.id||i.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,loader:r.props.loader,action:r.props.action,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(o.children=jd(r.props.children,i)),n.push(o)}),n}/**
 * React Router DOM v6.30.3
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */function yu(){return yu=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},yu.apply(this,arguments)}function eE(t,e){if(t==null)return{};var n={},r=Object.keys(t),s,i;for(i=0;i<r.length;i++)s=r[i],!(e.indexOf(s)>=0)&&(n[s]=t[s]);return n}function oC(t){return!!(t.metaKey||t.altKey||t.ctrlKey||t.shiftKey)}function aC(t,e){return t.button===0&&(!e||e==="_self")&&!oC(t)}const lC=["onClick","relative","reloadDocument","replace","state","target","to","preventScrollReset","viewTransition"],uC=["aria-current","caseSensitive","className","end","style","to","viewTransition","children"],cC="6";try{window.__reactRouterVersion=cC}catch{}const hC=V.createContext({isTransitioning:!1}),dC="startTransition",Oy=i1[dC];function fC(t){let{basename:e,children:n,future:r,window:s}=t,i=V.useRef();i.current==null&&(i.current=yA({window:s,v5Compat:!0}));let o=i.current,[l,u]=V.useState({action:o.action,location:o.location}),{v7_startTransition:c}=r||{},d=V.useCallback(m=>{c&&Oy?Oy(()=>u(m)):u(m)},[u,c]);return V.useLayoutEffect(()=>o.listen(d),[o,d]),V.useEffect(()=>sC(r),[r]),V.createElement(iC,{basename:e,children:n,location:l.location,navigationType:l.action,navigator:o,future:r})}const pC=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u",mC=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,gC=V.forwardRef(function(e,n){let{onClick:r,relative:s,reloadDocument:i,replace:o,state:l,target:u,to:c,preventScrollReset:d,viewTransition:m}=e,g=eE(e,lC),{basename:w}=V.useContext(Kn),A,P=!1;if(typeof c=="string"&&mC.test(c)&&(A=c,pC))try{let k=new URL(window.location.href),D=c.startsWith("//")?new URL(k.protocol+c):new URL(c),U=_i(D.pathname,w);D.origin===k.origin&&U!=null?c=U+D.search+D.hash:P=!0}catch{}let N=$A(c,{relative:s}),x=vC(c,{replace:o,state:l,target:u,preventScrollReset:d,relative:s,viewTransition:m});function v(k){r&&r(k),k.defaultPrevented||x(k)}return V.createElement("a",yu({},g,{href:A||N,onClick:P||i?r:v,ref:n,target:u}))}),yC=V.forwardRef(function(e,n){let{"aria-current":r="page",caseSensitive:s=!1,className:i="",end:o=!1,style:l,to:u,viewTransition:c,children:d}=e,m=eE(e,uC),g=ec(u,{relative:m.relative}),w=Ni(),A=V.useContext(qw),{navigator:P,basename:N}=V.useContext(Kn),x=A!=null&&wC(g)&&c===!0,v=P.encodeLocation?P.encodeLocation(g).pathname:g.pathname,k=w.pathname,D=A&&A.navigation&&A.navigation.location?A.navigation.location.pathname:null;s||(k=k.toLowerCase(),D=D?D.toLowerCase():null,v=v.toLowerCase()),D&&N&&(D=_i(D,N)||D);const U=v!=="/"&&v.endsWith("/")?v.length-1:v.length;let L=k===v||!o&&k.startsWith(v)&&k.charAt(U)==="/",E=D!=null&&(D===v||!o&&D.startsWith(v)&&D.charAt(v.length)==="/"),_={isActive:L,isPending:E,isTransitioning:x},S=L?r:void 0,R;typeof i=="function"?R=i(_):R=[i,L?"active":null,E?"pending":null,x?"transitioning":null].filter(Boolean).join(" ");let T=typeof l=="function"?l(_):l;return V.createElement(gC,yu({},m,{"aria-current":S,className:R,ref:n,style:T,to:u,viewTransition:c}),typeof d=="function"?d(_):d)});var Ud;(function(t){t.UseScrollRestoration="useScrollRestoration",t.UseSubmit="useSubmit",t.UseSubmitFetcher="useSubmitFetcher",t.UseFetcher="useFetcher",t.useViewTransitionState="useViewTransitionState"})(Ud||(Ud={}));var Vy;(function(t){t.UseFetcher="useFetcher",t.UseFetchers="useFetchers",t.UseScrollRestoration="useScrollRestoration"})(Vy||(Vy={}));function _C(t){let e=V.useContext(Ju);return e||xe(!1),e}function vC(t,e){let{target:n,replace:r,state:s,preventScrollReset:i,relative:o,viewTransition:l}=e===void 0?{}:e,u=Qw(),c=Ni(),d=ec(t,{relative:o});return V.useCallback(m=>{if(aC(m,n)){m.preventDefault();let g=r!==void 0?r:gu(c)===gu(d);u(t,{replace:g,state:s,preventScrollReset:i,relative:o,viewTransition:l})}},[c,u,d,r,s,n,t,i,o,l])}function wC(t,e){e===void 0&&(e={});let n=V.useContext(hC);n==null&&xe(!1);let{basename:r}=_C(Ud.useViewTransitionState),s=ec(t,{relative:e.relative});if(!n.isTransitioning)return!1;let i=_i(n.currentLocation.pathname,r)||n.currentLocation.pathname,o=_i(n.nextLocation.pathname,r)||n.nextLocation.pathname;return Md(s.pathname,o)!=null||Md(s.pathname,i)!=null}const EC=()=>{};var Ly={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tE=function(t){const e=[];let n=0;for(let r=0;r<t.length;r++){let s=t.charCodeAt(r);s<128?e[n++]=s:s<2048?(e[n++]=s>>6|192,e[n++]=s&63|128):(s&64512)===55296&&r+1<t.length&&(t.charCodeAt(r+1)&64512)===56320?(s=65536+((s&1023)<<10)+(t.charCodeAt(++r)&1023),e[n++]=s>>18|240,e[n++]=s>>12&63|128,e[n++]=s>>6&63|128,e[n++]=s&63|128):(e[n++]=s>>12|224,e[n++]=s>>6&63|128,e[n++]=s&63|128)}return e},TC=function(t){const e=[];let n=0,r=0;for(;n<t.length;){const s=t[n++];if(s<128)e[r++]=String.fromCharCode(s);else if(s>191&&s<224){const i=t[n++];e[r++]=String.fromCharCode((s&31)<<6|i&63)}else if(s>239&&s<365){const i=t[n++],o=t[n++],l=t[n++],u=((s&7)<<18|(i&63)<<12|(o&63)<<6|l&63)-65536;e[r++]=String.fromCharCode(55296+(u>>10)),e[r++]=String.fromCharCode(56320+(u&1023))}else{const i=t[n++],o=t[n++];e[r++]=String.fromCharCode((s&15)<<12|(i&63)<<6|o&63)}}return e.join("")},nE={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(t,e){if(!Array.isArray(t))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let s=0;s<t.length;s+=3){const i=t[s],o=s+1<t.length,l=o?t[s+1]:0,u=s+2<t.length,c=u?t[s+2]:0,d=i>>2,m=(i&3)<<4|l>>4;let g=(l&15)<<2|c>>6,w=c&63;u||(w=64,o||(g=64)),r.push(n[d],n[m],n[g],n[w])}return r.join("")},encodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(t):this.encodeByteArray(tE(t),e)},decodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(t):TC(this.decodeStringToByteArray(t,e))},decodeStringToByteArray(t,e){this.init_();const n=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let s=0;s<t.length;){const i=n[t.charAt(s++)],l=s<t.length?n[t.charAt(s)]:0;++s;const c=s<t.length?n[t.charAt(s)]:64;++s;const m=s<t.length?n[t.charAt(s)]:64;if(++s,i==null||l==null||c==null||m==null)throw new IC;const g=i<<2|l>>4;if(r.push(g),c!==64){const w=l<<4&240|c>>2;if(r.push(w),m!==64){const A=c<<6&192|m;r.push(A)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let t=0;t<this.ENCODED_VALS.length;t++)this.byteToCharMap_[t]=this.ENCODED_VALS.charAt(t),this.charToByteMap_[this.byteToCharMap_[t]]=t,this.byteToCharMapWebSafe_[t]=this.ENCODED_VALS_WEBSAFE.charAt(t),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[t]]=t,t>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(t)]=t,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(t)]=t)}}};class IC extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const xC=function(t){const e=tE(t);return nE.encodeByteArray(e,!0)},_u=function(t){return xC(t).replace(/\./g,"")},rE=function(t){try{return nE.decodeString(t,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
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
 */function SC(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const AC=()=>SC().__FIREBASE_DEFAULTS__,CC=()=>{if(typeof process>"u"||typeof Ly>"u")return;const t=Ly.__FIREBASE_DEFAULTS__;if(t)return JSON.parse(t)},kC=()=>{if(typeof document>"u")return;let t;try{t=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=t&&rE(t[1]);return e&&JSON.parse(e)},tc=()=>{try{return EC()||AC()||CC()||kC()}catch(t){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${t}`);return}},sE=t=>{var e,n;return(n=(e=tc())==null?void 0:e.emulatorHosts)==null?void 0:n[t]},iE=t=>{const e=sE(t);if(!e)return;const n=e.lastIndexOf(":");if(n<=0||n+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const r=parseInt(e.substring(n+1),10);return e[0]==="["?[e.substring(1,n-1),r]:[e.substring(0,n),r]},oE=()=>{var t;return(t=tc())==null?void 0:t.config},aE=t=>{var e;return(e=tc())==null?void 0:e[`_${t}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class RC{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,n)=>{this.resolve=e,this.reject=n})}wrapCallback(e){return(n,r)=>{n?this.reject(n):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(n):e(n,r))}}}/**
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
 */function lE(t,e){if(t.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const n={alg:"none",type:"JWT"},r=e||"demo-project",s=t.iat||0,i=t.sub||t.user_id;if(!i)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o={iss:`https://securetoken.google.com/${r}`,aud:r,iat:s,exp:s+3600,auth_time:s,sub:i,user_id:i,firebase:{sign_in_provider:"custom",identities:{}},...t};return[_u(JSON.stringify(n)),_u(JSON.stringify(o)),""].join(".")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ut(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function PC(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(ut())}function NC(){var e;const t=(e=tc())==null?void 0:e.forceEnvironment;if(t==="node")return!0;if(t==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function bC(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function DC(){const t=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof t=="object"&&t.id!==void 0}function OC(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function VC(){const t=ut();return t.indexOf("MSIE ")>=0||t.indexOf("Trident/")>=0}function LC(){return!NC()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function MC(){try{return typeof indexedDB=="object"}catch{return!1}}function jC(){return new Promise((t,e)=>{try{let n=!0;const r="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(r);s.onsuccess=()=>{s.result.close(),n||self.indexedDB.deleteDatabase(r),t(!0)},s.onupgradeneeded=()=>{n=!1},s.onerror=()=>{var i;e(((i=s.error)==null?void 0:i.message)||"")}}catch(n){e(n)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const UC="FirebaseError";class In extends Error{constructor(e,n,r){super(n),this.code=e,this.customData=r,this.name=UC,Object.setPrototypeOf(this,In.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Ia.prototype.create)}}class Ia{constructor(e,n,r){this.service=e,this.serviceName=n,this.errors=r}create(e,...n){const r=n[0]||{},s=`${this.service}/${e}`,i=this.errors[e],o=i?FC(i,r):"Error",l=`${this.serviceName}: ${o} (${s}).`;return new In(s,l,r)}}function FC(t,e){return t.replace(zC,(n,r)=>{const s=e[r];return s!=null?String(s):`<${r}?>`})}const zC=/\{\$([^}]+)}/g;function BC(t){for(const e in t)if(Object.prototype.hasOwnProperty.call(t,e))return!1;return!0}function Nr(t,e){if(t===e)return!0;const n=Object.keys(t),r=Object.keys(e);for(const s of n){if(!r.includes(s))return!1;const i=t[s],o=e[s];if(My(i)&&My(o)){if(!Nr(i,o))return!1}else if(i!==o)return!1}for(const s of r)if(!n.includes(s))return!1;return!0}function My(t){return t!==null&&typeof t=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xa(t){const e=[];for(const[n,r]of Object.entries(t))Array.isArray(r)?r.forEach(s=>{e.push(encodeURIComponent(n)+"="+encodeURIComponent(s))}):e.push(encodeURIComponent(n)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function _o(t){const e={};return t.replace(/^\?/,"").split("&").forEach(r=>{if(r){const[s,i]=r.split("=");e[decodeURIComponent(s)]=decodeURIComponent(i)}}),e}function vo(t){const e=t.indexOf("?");if(!e)return"";const n=t.indexOf("#",e);return t.substring(e,n>0?n:void 0)}function $C(t,e){const n=new WC(t,e);return n.subscribe.bind(n)}class WC{constructor(e,n){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=n,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(n=>{n.next(e)})}error(e){this.forEachObserver(n=>{n.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,n,r){let s;if(e===void 0&&n===void 0&&r===void 0)throw new Error("Missing Observer.");HC(e,["next","error","complete"])?s=e:s={next:e,error:n,complete:r},s.next===void 0&&(s.next=Ch),s.error===void 0&&(s.error=Ch),s.complete===void 0&&(s.complete=Ch);const i=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?s.error(this.finalError):s.complete()}catch{}}),this.observers.push(s),i}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let n=0;n<this.observers.length;n++)this.sendOne(n,e)}sendOne(e,n){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{n(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function HC(t,e){if(typeof t!="object"||t===null)return!1;for(const n of e)if(n in t&&typeof t[n]=="function")return!0;return!1}function Ch(){}/**
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
 */function pe(t){return t&&t._delegate?t._delegate:t}/**
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
 */function As(t){try{return(t.startsWith("http://")||t.startsWith("https://")?new URL(t).hostname:t).endsWith(".cloudworkstations.dev")}catch{return!1}}async function hp(t){return(await fetch(t,{credentials:"include"})).ok}class br{constructor(e,n,r){this.name=e,this.instanceFactory=n,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
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
 */const rs="[DEFAULT]";/**
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
 */class qC{constructor(e,n){this.name=e,this.container=n,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const n=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(n)){const r=new RC;if(this.instancesDeferred.set(n,r),this.isInitialized(n)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:n});s&&r.resolve(s)}catch{}}return this.instancesDeferred.get(n).promise}getImmediate(e){const n=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),r=(e==null?void 0:e.optional)??!1;if(this.isInitialized(n)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:n})}catch(s){if(r)return null;throw s}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(GC(e))try{this.getOrInitializeService({instanceIdentifier:rs})}catch{}for(const[n,r]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(n);try{const i=this.getOrInitializeService({instanceIdentifier:s});r.resolve(i)}catch{}}}}clearInstance(e=rs){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(n=>"INTERNAL"in n).map(n=>n.INTERNAL.delete()),...e.filter(n=>"_delete"in n).map(n=>n._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=rs){return this.instances.has(e)}getOptions(e=rs){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:n={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:r,options:n});for(const[i,o]of this.instancesDeferred.entries()){const l=this.normalizeInstanceIdentifier(i);r===l&&o.resolve(s)}return s}onInit(e,n){const r=this.normalizeInstanceIdentifier(n),s=this.onInitCallbacks.get(r)??new Set;s.add(e),this.onInitCallbacks.set(r,s);const i=this.instances.get(r);return i&&e(i,r),()=>{s.delete(e)}}invokeOnInitCallbacks(e,n){const r=this.onInitCallbacks.get(n);if(r)for(const s of r)try{s(e,n)}catch{}}getOrInitializeService({instanceIdentifier:e,options:n={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:KC(e),options:n}),this.instances.set(e,r),this.instancesOptions.set(e,n),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=rs){return this.component?this.component.multipleInstances?e:rs:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function KC(t){return t===rs?void 0:t}function GC(t){return t.instantiationMode==="EAGER"}/**
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
 */class QC{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const n=this.getProvider(e.name);if(n.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);n.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const n=new qC(e,this);return this.providers.set(e,n),n}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var re;(function(t){t[t.DEBUG=0]="DEBUG",t[t.VERBOSE=1]="VERBOSE",t[t.INFO=2]="INFO",t[t.WARN=3]="WARN",t[t.ERROR=4]="ERROR",t[t.SILENT=5]="SILENT"})(re||(re={}));const YC={debug:re.DEBUG,verbose:re.VERBOSE,info:re.INFO,warn:re.WARN,error:re.ERROR,silent:re.SILENT},XC=re.INFO,JC={[re.DEBUG]:"log",[re.VERBOSE]:"log",[re.INFO]:"info",[re.WARN]:"warn",[re.ERROR]:"error"},ZC=(t,e,...n)=>{if(e<t.logLevel)return;const r=new Date().toISOString(),s=JC[e];if(s)console[s](`[${r}]  ${t.name}:`,...n);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class dp{constructor(e){this.name=e,this._logLevel=XC,this._logHandler=ZC,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in re))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?YC[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,re.DEBUG,...e),this._logHandler(this,re.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,re.VERBOSE,...e),this._logHandler(this,re.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,re.INFO,...e),this._logHandler(this,re.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,re.WARN,...e),this._logHandler(this,re.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,re.ERROR,...e),this._logHandler(this,re.ERROR,...e)}}const ek=(t,e)=>e.some(n=>t instanceof n);let jy,Uy;function tk(){return jy||(jy=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function nk(){return Uy||(Uy=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const uE=new WeakMap,Fd=new WeakMap,cE=new WeakMap,kh=new WeakMap,fp=new WeakMap;function rk(t){const e=new Promise((n,r)=>{const s=()=>{t.removeEventListener("success",i),t.removeEventListener("error",o)},i=()=>{n(Ir(t.result)),s()},o=()=>{r(t.error),s()};t.addEventListener("success",i),t.addEventListener("error",o)});return e.then(n=>{n instanceof IDBCursor&&uE.set(n,t)}).catch(()=>{}),fp.set(e,t),e}function sk(t){if(Fd.has(t))return;const e=new Promise((n,r)=>{const s=()=>{t.removeEventListener("complete",i),t.removeEventListener("error",o),t.removeEventListener("abort",o)},i=()=>{n(),s()},o=()=>{r(t.error||new DOMException("AbortError","AbortError")),s()};t.addEventListener("complete",i),t.addEventListener("error",o),t.addEventListener("abort",o)});Fd.set(t,e)}let zd={get(t,e,n){if(t instanceof IDBTransaction){if(e==="done")return Fd.get(t);if(e==="objectStoreNames")return t.objectStoreNames||cE.get(t);if(e==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return Ir(t[e])},set(t,e,n){return t[e]=n,!0},has(t,e){return t instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in t}};function ik(t){zd=t(zd)}function ok(t){return t===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...n){const r=t.call(Rh(this),e,...n);return cE.set(r,e.sort?e.sort():[e]),Ir(r)}:nk().includes(t)?function(...e){return t.apply(Rh(this),e),Ir(uE.get(this))}:function(...e){return Ir(t.apply(Rh(this),e))}}function ak(t){return typeof t=="function"?ok(t):(t instanceof IDBTransaction&&sk(t),ek(t,tk())?new Proxy(t,zd):t)}function Ir(t){if(t instanceof IDBRequest)return rk(t);if(kh.has(t))return kh.get(t);const e=ak(t);return e!==t&&(kh.set(t,e),fp.set(e,t)),e}const Rh=t=>fp.get(t);function lk(t,e,{blocked:n,upgrade:r,blocking:s,terminated:i}={}){const o=indexedDB.open(t,e),l=Ir(o);return r&&o.addEventListener("upgradeneeded",u=>{r(Ir(o.result),u.oldVersion,u.newVersion,Ir(o.transaction),u)}),n&&o.addEventListener("blocked",u=>n(u.oldVersion,u.newVersion,u)),l.then(u=>{i&&u.addEventListener("close",()=>i()),s&&u.addEventListener("versionchange",c=>s(c.oldVersion,c.newVersion,c))}).catch(()=>{}),l}const uk=["get","getKey","getAll","getAllKeys","count"],ck=["put","add","delete","clear"],Ph=new Map;function Fy(t,e){if(!(t instanceof IDBDatabase&&!(e in t)&&typeof e=="string"))return;if(Ph.get(e))return Ph.get(e);const n=e.replace(/FromIndex$/,""),r=e!==n,s=ck.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(s||uk.includes(n)))return;const i=async function(o,...l){const u=this.transaction(o,s?"readwrite":"readonly");let c=u.store;return r&&(c=c.index(l.shift())),(await Promise.all([c[n](...l),s&&u.done]))[0]};return Ph.set(e,i),i}ik(t=>({...t,get:(e,n,r)=>Fy(e,n)||t.get(e,n,r),has:(e,n)=>!!Fy(e,n)||t.has(e,n)}));/**
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
 */class hk{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(n=>{if(dk(n)){const r=n.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(n=>n).join(" ")}}function dk(t){const e=t.getComponent();return(e==null?void 0:e.type)==="VERSION"}const Bd="@firebase/app",zy="0.14.12";/**
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
 */const zn=new dp("@firebase/app"),fk="@firebase/app-compat",pk="@firebase/analytics-compat",mk="@firebase/analytics",gk="@firebase/app-check-compat",yk="@firebase/app-check",_k="@firebase/auth",vk="@firebase/auth-compat",wk="@firebase/database",Ek="@firebase/data-connect",Tk="@firebase/database-compat",Ik="@firebase/functions",xk="@firebase/functions-compat",Sk="@firebase/installations",Ak="@firebase/installations-compat",Ck="@firebase/messaging",kk="@firebase/messaging-compat",Rk="@firebase/performance",Pk="@firebase/performance-compat",Nk="@firebase/remote-config",bk="@firebase/remote-config-compat",Dk="@firebase/storage",Ok="@firebase/storage-compat",Vk="@firebase/firestore",Lk="@firebase/ai",Mk="@firebase/firestore-compat",jk="firebase",Uk="12.13.0";/**
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
 */const $d="[DEFAULT]",Fk={[Bd]:"fire-core",[fk]:"fire-core-compat",[mk]:"fire-analytics",[pk]:"fire-analytics-compat",[yk]:"fire-app-check",[gk]:"fire-app-check-compat",[_k]:"fire-auth",[vk]:"fire-auth-compat",[wk]:"fire-rtdb",[Ek]:"fire-data-connect",[Tk]:"fire-rtdb-compat",[Ik]:"fire-fn",[xk]:"fire-fn-compat",[Sk]:"fire-iid",[Ak]:"fire-iid-compat",[Ck]:"fire-fcm",[kk]:"fire-fcm-compat",[Rk]:"fire-perf",[Pk]:"fire-perf-compat",[Nk]:"fire-rc",[bk]:"fire-rc-compat",[Dk]:"fire-gcs",[Ok]:"fire-gcs-compat",[Vk]:"fire-fst",[Mk]:"fire-fst-compat",[Lk]:"fire-vertex","fire-js":"fire-js",[jk]:"fire-js-all"};/**
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
 */const sa=new Map,zk=new Map,Wd=new Map;function By(t,e){try{t.container.addComponent(e)}catch(n){zn.debug(`Component ${e.name} failed to register with FirebaseApp ${t.name}`,n)}}function ys(t){const e=t.name;if(Wd.has(e))return zn.debug(`There were multiple attempts to register component ${e}.`),!1;Wd.set(e,t);for(const n of sa.values())By(n,t);for(const n of zk.values())By(n,t);return!0}function nc(t,e){const n=t.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),t.container.getProvider(e)}function Ct(t){return t==null?!1:t.settings!==void 0}/**
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
 */const Bk={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},xr=new Ia("app","Firebase",Bk);/**
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
 */class $k{constructor(e,n,r){this._isDeleted=!1,this._options={...e},this._config={...n},this._name=n.name,this._automaticDataCollectionEnabled=n.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new br("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw xr.create("app-deleted",{appName:this._name})}}/**
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
 */const Cs=Uk;function hE(t,e={}){let n=t;typeof e!="object"&&(e={name:e});const r={name:$d,automaticDataCollectionEnabled:!0,...e},s=r.name;if(typeof s!="string"||!s)throw xr.create("bad-app-name",{appName:String(s)});if(n||(n=oE()),!n)throw xr.create("no-options");const i=sa.get(s);if(i){if(Nr(n,i.options)&&Nr(r,i.config))return i;throw xr.create("duplicate-app",{appName:s})}const o=new QC(s);for(const u of Wd.values())o.addComponent(u);const l=new $k(n,r,o);return sa.set(s,l),l}function pp(t=$d){const e=sa.get(t);if(!e&&t===$d&&oE())return hE();if(!e)throw xr.create("no-app",{appName:t});return e}function $y(){return Array.from(sa.values())}function yn(t,e,n){let r=Fk[t]??t;n&&(r+=`-${n}`);const s=r.match(/\s|\//),i=e.match(/\s|\//);if(s||i){const o=[`Unable to register library "${r}" with version "${e}":`];s&&o.push(`library name "${r}" contains illegal characters (whitespace or "/")`),s&&i&&o.push("and"),i&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),zn.warn(o.join(" "));return}ys(new br(`${r}-version`,()=>({library:r,version:e}),"VERSION"))}/**
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
 */const Wk="firebase-heartbeat-database",Hk=1,ia="firebase-heartbeat-store";let Nh=null;function dE(){return Nh||(Nh=lk(Wk,Hk,{upgrade:(t,e)=>{switch(e){case 0:try{t.createObjectStore(ia)}catch(n){console.warn(n)}}}}).catch(t=>{throw xr.create("idb-open",{originalErrorMessage:t.message})})),Nh}async function qk(t){try{const n=(await dE()).transaction(ia),r=await n.objectStore(ia).get(fE(t));return await n.done,r}catch(e){if(e instanceof In)zn.warn(e.message);else{const n=xr.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});zn.warn(n.message)}}}async function Wy(t,e){try{const r=(await dE()).transaction(ia,"readwrite");await r.objectStore(ia).put(e,fE(t)),await r.done}catch(n){if(n instanceof In)zn.warn(n.message);else{const r=xr.create("idb-set",{originalErrorMessage:n==null?void 0:n.message});zn.warn(r.message)}}}function fE(t){return`${t.name}!${t.options.appId}`}/**
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
 */const Kk=1024,Gk=30;class Qk{constructor(e){this.container=e,this._heartbeatsCache=null;const n=this.container.getProvider("app").getImmediate();this._storage=new Xk(n),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,n;try{const s=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),i=Hy();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((n=this._heartbeatsCache)==null?void 0:n.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===i||this._heartbeatsCache.heartbeats.some(o=>o.date===i))return;if(this._heartbeatsCache.heartbeats.push({date:i,agent:s}),this._heartbeatsCache.heartbeats.length>Gk){const o=Jk(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(r){zn.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const n=Hy(),{heartbeatsToSend:r,unsentEntries:s}=Yk(this._heartbeatsCache.heartbeats),i=_u(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=n,s.length>0?(this._heartbeatsCache.heartbeats=s,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),i}catch(n){return zn.warn(n),""}}}function Hy(){return new Date().toISOString().substring(0,10)}function Yk(t,e=Kk){const n=[];let r=t.slice();for(const s of t){const i=n.find(o=>o.agent===s.agent);if(i){if(i.dates.push(s.date),qy(n)>e){i.dates.pop();break}}else if(n.push({agent:s.agent,dates:[s.date]}),qy(n)>e){n.pop();break}r=r.slice(1)}return{heartbeatsToSend:n,unsentEntries:r}}class Xk{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return MC()?jC().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const n=await qk(this.app);return n!=null&&n.heartbeats?n:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return Wy(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return Wy(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...e.heartbeats]})}else return}}function qy(t){return _u(JSON.stringify({version:2,heartbeats:t})).length}function Jk(t){if(t.length===0)return-1;let e=0,n=t[0].date;for(let r=1;r<t.length;r++)t[r].date<n&&(n=t[r].date,e=r);return e}/**
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
 */function Zk(t){ys(new br("platform-logger",e=>new hk(e),"PRIVATE")),ys(new br("heartbeat",e=>new Qk(e),"PRIVATE")),yn(Bd,zy,t),yn(Bd,zy,"esm2020"),yn("fire-js","")}Zk("");var Ky=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Sr,pE;(function(){var t;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(E,_){function S(){}S.prototype=_.prototype,E.F=_.prototype,E.prototype=new S,E.prototype.constructor=E,E.D=function(R,T,C){for(var I=Array(arguments.length-2),se=2;se<arguments.length;se++)I[se-2]=arguments[se];return _.prototype[T].apply(R,I)}}function n(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(r,n),r.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function s(E,_,S){S||(S=0);const R=Array(16);if(typeof _=="string")for(var T=0;T<16;++T)R[T]=_.charCodeAt(S++)|_.charCodeAt(S++)<<8|_.charCodeAt(S++)<<16|_.charCodeAt(S++)<<24;else for(T=0;T<16;++T)R[T]=_[S++]|_[S++]<<8|_[S++]<<16|_[S++]<<24;_=E.g[0],S=E.g[1],T=E.g[2];let C=E.g[3],I;I=_+(C^S&(T^C))+R[0]+3614090360&4294967295,_=S+(I<<7&4294967295|I>>>25),I=C+(T^_&(S^T))+R[1]+3905402710&4294967295,C=_+(I<<12&4294967295|I>>>20),I=T+(S^C&(_^S))+R[2]+606105819&4294967295,T=C+(I<<17&4294967295|I>>>15),I=S+(_^T&(C^_))+R[3]+3250441966&4294967295,S=T+(I<<22&4294967295|I>>>10),I=_+(C^S&(T^C))+R[4]+4118548399&4294967295,_=S+(I<<7&4294967295|I>>>25),I=C+(T^_&(S^T))+R[5]+1200080426&4294967295,C=_+(I<<12&4294967295|I>>>20),I=T+(S^C&(_^S))+R[6]+2821735955&4294967295,T=C+(I<<17&4294967295|I>>>15),I=S+(_^T&(C^_))+R[7]+4249261313&4294967295,S=T+(I<<22&4294967295|I>>>10),I=_+(C^S&(T^C))+R[8]+1770035416&4294967295,_=S+(I<<7&4294967295|I>>>25),I=C+(T^_&(S^T))+R[9]+2336552879&4294967295,C=_+(I<<12&4294967295|I>>>20),I=T+(S^C&(_^S))+R[10]+4294925233&4294967295,T=C+(I<<17&4294967295|I>>>15),I=S+(_^T&(C^_))+R[11]+2304563134&4294967295,S=T+(I<<22&4294967295|I>>>10),I=_+(C^S&(T^C))+R[12]+1804603682&4294967295,_=S+(I<<7&4294967295|I>>>25),I=C+(T^_&(S^T))+R[13]+4254626195&4294967295,C=_+(I<<12&4294967295|I>>>20),I=T+(S^C&(_^S))+R[14]+2792965006&4294967295,T=C+(I<<17&4294967295|I>>>15),I=S+(_^T&(C^_))+R[15]+1236535329&4294967295,S=T+(I<<22&4294967295|I>>>10),I=_+(T^C&(S^T))+R[1]+4129170786&4294967295,_=S+(I<<5&4294967295|I>>>27),I=C+(S^T&(_^S))+R[6]+3225465664&4294967295,C=_+(I<<9&4294967295|I>>>23),I=T+(_^S&(C^_))+R[11]+643717713&4294967295,T=C+(I<<14&4294967295|I>>>18),I=S+(C^_&(T^C))+R[0]+3921069994&4294967295,S=T+(I<<20&4294967295|I>>>12),I=_+(T^C&(S^T))+R[5]+3593408605&4294967295,_=S+(I<<5&4294967295|I>>>27),I=C+(S^T&(_^S))+R[10]+38016083&4294967295,C=_+(I<<9&4294967295|I>>>23),I=T+(_^S&(C^_))+R[15]+3634488961&4294967295,T=C+(I<<14&4294967295|I>>>18),I=S+(C^_&(T^C))+R[4]+3889429448&4294967295,S=T+(I<<20&4294967295|I>>>12),I=_+(T^C&(S^T))+R[9]+568446438&4294967295,_=S+(I<<5&4294967295|I>>>27),I=C+(S^T&(_^S))+R[14]+3275163606&4294967295,C=_+(I<<9&4294967295|I>>>23),I=T+(_^S&(C^_))+R[3]+4107603335&4294967295,T=C+(I<<14&4294967295|I>>>18),I=S+(C^_&(T^C))+R[8]+1163531501&4294967295,S=T+(I<<20&4294967295|I>>>12),I=_+(T^C&(S^T))+R[13]+2850285829&4294967295,_=S+(I<<5&4294967295|I>>>27),I=C+(S^T&(_^S))+R[2]+4243563512&4294967295,C=_+(I<<9&4294967295|I>>>23),I=T+(_^S&(C^_))+R[7]+1735328473&4294967295,T=C+(I<<14&4294967295|I>>>18),I=S+(C^_&(T^C))+R[12]+2368359562&4294967295,S=T+(I<<20&4294967295|I>>>12),I=_+(S^T^C)+R[5]+4294588738&4294967295,_=S+(I<<4&4294967295|I>>>28),I=C+(_^S^T)+R[8]+2272392833&4294967295,C=_+(I<<11&4294967295|I>>>21),I=T+(C^_^S)+R[11]+1839030562&4294967295,T=C+(I<<16&4294967295|I>>>16),I=S+(T^C^_)+R[14]+4259657740&4294967295,S=T+(I<<23&4294967295|I>>>9),I=_+(S^T^C)+R[1]+2763975236&4294967295,_=S+(I<<4&4294967295|I>>>28),I=C+(_^S^T)+R[4]+1272893353&4294967295,C=_+(I<<11&4294967295|I>>>21),I=T+(C^_^S)+R[7]+4139469664&4294967295,T=C+(I<<16&4294967295|I>>>16),I=S+(T^C^_)+R[10]+3200236656&4294967295,S=T+(I<<23&4294967295|I>>>9),I=_+(S^T^C)+R[13]+681279174&4294967295,_=S+(I<<4&4294967295|I>>>28),I=C+(_^S^T)+R[0]+3936430074&4294967295,C=_+(I<<11&4294967295|I>>>21),I=T+(C^_^S)+R[3]+3572445317&4294967295,T=C+(I<<16&4294967295|I>>>16),I=S+(T^C^_)+R[6]+76029189&4294967295,S=T+(I<<23&4294967295|I>>>9),I=_+(S^T^C)+R[9]+3654602809&4294967295,_=S+(I<<4&4294967295|I>>>28),I=C+(_^S^T)+R[12]+3873151461&4294967295,C=_+(I<<11&4294967295|I>>>21),I=T+(C^_^S)+R[15]+530742520&4294967295,T=C+(I<<16&4294967295|I>>>16),I=S+(T^C^_)+R[2]+3299628645&4294967295,S=T+(I<<23&4294967295|I>>>9),I=_+(T^(S|~C))+R[0]+4096336452&4294967295,_=S+(I<<6&4294967295|I>>>26),I=C+(S^(_|~T))+R[7]+1126891415&4294967295,C=_+(I<<10&4294967295|I>>>22),I=T+(_^(C|~S))+R[14]+2878612391&4294967295,T=C+(I<<15&4294967295|I>>>17),I=S+(C^(T|~_))+R[5]+4237533241&4294967295,S=T+(I<<21&4294967295|I>>>11),I=_+(T^(S|~C))+R[12]+1700485571&4294967295,_=S+(I<<6&4294967295|I>>>26),I=C+(S^(_|~T))+R[3]+2399980690&4294967295,C=_+(I<<10&4294967295|I>>>22),I=T+(_^(C|~S))+R[10]+4293915773&4294967295,T=C+(I<<15&4294967295|I>>>17),I=S+(C^(T|~_))+R[1]+2240044497&4294967295,S=T+(I<<21&4294967295|I>>>11),I=_+(T^(S|~C))+R[8]+1873313359&4294967295,_=S+(I<<6&4294967295|I>>>26),I=C+(S^(_|~T))+R[15]+4264355552&4294967295,C=_+(I<<10&4294967295|I>>>22),I=T+(_^(C|~S))+R[6]+2734768916&4294967295,T=C+(I<<15&4294967295|I>>>17),I=S+(C^(T|~_))+R[13]+1309151649&4294967295,S=T+(I<<21&4294967295|I>>>11),I=_+(T^(S|~C))+R[4]+4149444226&4294967295,_=S+(I<<6&4294967295|I>>>26),I=C+(S^(_|~T))+R[11]+3174756917&4294967295,C=_+(I<<10&4294967295|I>>>22),I=T+(_^(C|~S))+R[2]+718787259&4294967295,T=C+(I<<15&4294967295|I>>>17),I=S+(C^(T|~_))+R[9]+3951481745&4294967295,E.g[0]=E.g[0]+_&4294967295,E.g[1]=E.g[1]+(T+(I<<21&4294967295|I>>>11))&4294967295,E.g[2]=E.g[2]+T&4294967295,E.g[3]=E.g[3]+C&4294967295}r.prototype.v=function(E,_){_===void 0&&(_=E.length);const S=_-this.blockSize,R=this.C;let T=this.h,C=0;for(;C<_;){if(T==0)for(;C<=S;)s(this,E,C),C+=this.blockSize;if(typeof E=="string"){for(;C<_;)if(R[T++]=E.charCodeAt(C++),T==this.blockSize){s(this,R),T=0;break}}else for(;C<_;)if(R[T++]=E[C++],T==this.blockSize){s(this,R),T=0;break}}this.h=T,this.o+=_},r.prototype.A=function(){var E=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);E[0]=128;for(var _=1;_<E.length-8;++_)E[_]=0;_=this.o*8;for(var S=E.length-8;S<E.length;++S)E[S]=_&255,_/=256;for(this.v(E),E=Array(16),_=0,S=0;S<4;++S)for(let R=0;R<32;R+=8)E[_++]=this.g[S]>>>R&255;return E};function i(E,_){var S=l;return Object.prototype.hasOwnProperty.call(S,E)?S[E]:S[E]=_(E)}function o(E,_){this.h=_;const S=[];let R=!0;for(let T=E.length-1;T>=0;T--){const C=E[T]|0;R&&C==_||(S[T]=C,R=!1)}this.g=S}var l={};function u(E){return-128<=E&&E<128?i(E,function(_){return new o([_|0],_<0?-1:0)}):new o([E|0],E<0?-1:0)}function c(E){if(isNaN(E)||!isFinite(E))return m;if(E<0)return N(c(-E));const _=[];let S=1;for(let R=0;E>=S;R++)_[R]=E/S|0,S*=4294967296;return new o(_,0)}function d(E,_){if(E.length==0)throw Error("number format error: empty string");if(_=_||10,_<2||36<_)throw Error("radix out of range: "+_);if(E.charAt(0)=="-")return N(d(E.substring(1),_));if(E.indexOf("-")>=0)throw Error('number format error: interior "-" character');const S=c(Math.pow(_,8));let R=m;for(let C=0;C<E.length;C+=8){var T=Math.min(8,E.length-C);const I=parseInt(E.substring(C,C+T),_);T<8?(T=c(Math.pow(_,T)),R=R.j(T).add(c(I))):(R=R.j(S),R=R.add(c(I)))}return R}var m=u(0),g=u(1),w=u(16777216);t=o.prototype,t.m=function(){if(P(this))return-N(this).m();let E=0,_=1;for(let S=0;S<this.g.length;S++){const R=this.i(S);E+=(R>=0?R:4294967296+R)*_,_*=4294967296}return E},t.toString=function(E){if(E=E||10,E<2||36<E)throw Error("radix out of range: "+E);if(A(this))return"0";if(P(this))return"-"+N(this).toString(E);const _=c(Math.pow(E,6));var S=this;let R="";for(;;){const T=D(S,_).g;S=x(S,T.j(_));let C=((S.g.length>0?S.g[0]:S.h)>>>0).toString(E);if(S=T,A(S))return C+R;for(;C.length<6;)C="0"+C;R=C+R}},t.i=function(E){return E<0?0:E<this.g.length?this.g[E]:this.h};function A(E){if(E.h!=0)return!1;for(let _=0;_<E.g.length;_++)if(E.g[_]!=0)return!1;return!0}function P(E){return E.h==-1}t.l=function(E){return E=x(this,E),P(E)?-1:A(E)?0:1};function N(E){const _=E.g.length,S=[];for(let R=0;R<_;R++)S[R]=~E.g[R];return new o(S,~E.h).add(g)}t.abs=function(){return P(this)?N(this):this},t.add=function(E){const _=Math.max(this.g.length,E.g.length),S=[];let R=0;for(let T=0;T<=_;T++){let C=R+(this.i(T)&65535)+(E.i(T)&65535),I=(C>>>16)+(this.i(T)>>>16)+(E.i(T)>>>16);R=I>>>16,C&=65535,I&=65535,S[T]=I<<16|C}return new o(S,S[S.length-1]&-2147483648?-1:0)};function x(E,_){return E.add(N(_))}t.j=function(E){if(A(this)||A(E))return m;if(P(this))return P(E)?N(this).j(N(E)):N(N(this).j(E));if(P(E))return N(this.j(N(E)));if(this.l(w)<0&&E.l(w)<0)return c(this.m()*E.m());const _=this.g.length+E.g.length,S=[];for(var R=0;R<2*_;R++)S[R]=0;for(R=0;R<this.g.length;R++)for(let T=0;T<E.g.length;T++){const C=this.i(R)>>>16,I=this.i(R)&65535,se=E.i(T)>>>16,Ze=E.i(T)&65535;S[2*R+2*T]+=I*Ze,v(S,2*R+2*T),S[2*R+2*T+1]+=C*Ze,v(S,2*R+2*T+1),S[2*R+2*T+1]+=I*se,v(S,2*R+2*T+1),S[2*R+2*T+2]+=C*se,v(S,2*R+2*T+2)}for(E=0;E<_;E++)S[E]=S[2*E+1]<<16|S[2*E];for(E=_;E<2*_;E++)S[E]=0;return new o(S,0)};function v(E,_){for(;(E[_]&65535)!=E[_];)E[_+1]+=E[_]>>>16,E[_]&=65535,_++}function k(E,_){this.g=E,this.h=_}function D(E,_){if(A(_))throw Error("division by zero");if(A(E))return new k(m,m);if(P(E))return _=D(N(E),_),new k(N(_.g),N(_.h));if(P(_))return _=D(E,N(_)),new k(N(_.g),_.h);if(E.g.length>30){if(P(E)||P(_))throw Error("slowDivide_ only works with positive integers.");for(var S=g,R=_;R.l(E)<=0;)S=U(S),R=U(R);var T=L(S,1),C=L(R,1);for(R=L(R,2),S=L(S,2);!A(R);){var I=C.add(R);I.l(E)<=0&&(T=T.add(S),C=I),R=L(R,1),S=L(S,1)}return _=x(E,T.j(_)),new k(T,_)}for(T=m;E.l(_)>=0;){for(S=Math.max(1,Math.floor(E.m()/_.m())),R=Math.ceil(Math.log(S)/Math.LN2),R=R<=48?1:Math.pow(2,R-48),C=c(S),I=C.j(_);P(I)||I.l(E)>0;)S-=R,C=c(S),I=C.j(_);A(C)&&(C=g),T=T.add(C),E=x(E,I)}return new k(T,E)}t.B=function(E){return D(this,E).h},t.and=function(E){const _=Math.max(this.g.length,E.g.length),S=[];for(let R=0;R<_;R++)S[R]=this.i(R)&E.i(R);return new o(S,this.h&E.h)},t.or=function(E){const _=Math.max(this.g.length,E.g.length),S=[];for(let R=0;R<_;R++)S[R]=this.i(R)|E.i(R);return new o(S,this.h|E.h)},t.xor=function(E){const _=Math.max(this.g.length,E.g.length),S=[];for(let R=0;R<_;R++)S[R]=this.i(R)^E.i(R);return new o(S,this.h^E.h)};function U(E){const _=E.g.length+1,S=[];for(let R=0;R<_;R++)S[R]=E.i(R)<<1|E.i(R-1)>>>31;return new o(S,E.h)}function L(E,_){const S=_>>5;_%=32;const R=E.g.length-S,T=[];for(let C=0;C<R;C++)T[C]=_>0?E.i(C+S)>>>_|E.i(C+S+1)<<32-_:E.i(C+S);return new o(T,E.h)}r.prototype.digest=r.prototype.A,r.prototype.reset=r.prototype.u,r.prototype.update=r.prototype.v,pE=r,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=c,o.fromString=d,Sr=o}).apply(typeof Ky<"u"?Ky:typeof self<"u"?self:typeof window<"u"?window:{});var fl=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var mE,wo,gE,Vl,Hd,yE,_E,vE;(function(){var t,e=Object.defineProperty;function n(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof fl=="object"&&fl];for(var h=0;h<a.length;++h){var p=a[h];if(p&&p.Math==Math)return p}throw Error("Cannot find global object")}var r=n(this);function s(a,h){if(h)e:{var p=r;a=a.split(".");for(var y=0;y<a.length-1;y++){var b=a[y];if(!(b in p))break e;p=p[b]}a=a[a.length-1],y=p[a],h=h(y),h!=y&&h!=null&&e(p,a,{configurable:!0,writable:!0,value:h})}}s("Symbol.dispose",function(a){return a||Symbol("Symbol.dispose")}),s("Array.prototype.values",function(a){return a||function(){return this[Symbol.iterator]()}}),s("Object.entries",function(a){return a||function(h){var p=[],y;for(y in h)Object.prototype.hasOwnProperty.call(h,y)&&p.push([y,h[y]]);return p}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var i=i||{},o=this||self;function l(a){var h=typeof a;return h=="object"&&a!=null||h=="function"}function u(a,h,p){return a.call.apply(a.bind,arguments)}function c(a,h,p){return c=u,c.apply(null,arguments)}function d(a,h){var p=Array.prototype.slice.call(arguments,1);return function(){var y=p.slice();return y.push.apply(y,arguments),a.apply(this,y)}}function m(a,h){function p(){}p.prototype=h.prototype,a.Z=h.prototype,a.prototype=new p,a.prototype.constructor=a,a.Ob=function(y,b,O){for(var z=Array(arguments.length-2),Z=2;Z<arguments.length;Z++)z[Z-2]=arguments[Z];return h.prototype[b].apply(y,z)}}var g=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?a=>a&&AsyncContext.Snapshot.wrap(a):a=>a;function w(a){const h=a.length;if(h>0){const p=Array(h);for(let y=0;y<h;y++)p[y]=a[y];return p}return[]}function A(a,h){for(let y=1;y<arguments.length;y++){const b=arguments[y];var p=typeof b;if(p=p!="object"?p:b?Array.isArray(b)?"array":p:"null",p=="array"||p=="object"&&typeof b.length=="number"){p=a.length||0;const O=b.length||0;a.length=p+O;for(let z=0;z<O;z++)a[p+z]=b[z]}else a.push(b)}}class P{constructor(h,p){this.i=h,this.j=p,this.h=0,this.g=null}get(){let h;return this.h>0?(this.h--,h=this.g,this.g=h.next,h.next=null):h=this.i(),h}}function N(a){o.setTimeout(()=>{throw a},0)}function x(){var a=E;let h=null;return a.g&&(h=a.g,a.g=a.g.next,a.g||(a.h=null),h.next=null),h}class v{constructor(){this.h=this.g=null}add(h,p){const y=k.get();y.set(h,p),this.h?this.h.next=y:this.g=y,this.h=y}}var k=new P(()=>new D,a=>a.reset());class D{constructor(){this.next=this.g=this.h=null}set(h,p){this.h=h,this.g=p,this.next=null}reset(){this.next=this.g=this.h=null}}let U,L=!1,E=new v,_=()=>{const a=Promise.resolve(void 0);U=()=>{a.then(S)}};function S(){for(var a;a=x();){try{a.h.call(a.g)}catch(p){N(p)}var h=k;h.j(a),h.h<100&&(h.h++,a.next=h.g,h.g=a)}L=!1}function R(){this.u=this.u,this.C=this.C}R.prototype.u=!1,R.prototype.dispose=function(){this.u||(this.u=!0,this.N())},R.prototype[Symbol.dispose]=function(){this.dispose()},R.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function T(a,h){this.type=a,this.g=this.target=h,this.defaultPrevented=!1}T.prototype.h=function(){this.defaultPrevented=!0};var C=function(){if(!o.addEventListener||!Object.defineProperty)return!1;var a=!1,h=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const p=()=>{};o.addEventListener("test",p,h),o.removeEventListener("test",p,h)}catch{}return a}();function I(a){return/^[\s\xa0]*$/.test(a)}function se(a,h){T.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a&&this.init(a,h)}m(se,T),se.prototype.init=function(a,h){const p=this.type=a.type,y=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement,this.g=h,h=a.relatedTarget,h||(p=="mouseover"?h=a.fromElement:p=="mouseout"&&(h=a.toElement)),this.relatedTarget=h,y?(this.clientX=y.clientX!==void 0?y.clientX:y.pageX,this.clientY=y.clientY!==void 0?y.clientY:y.pageY,this.screenX=y.screenX||0,this.screenY=y.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=a.pointerType,this.state=a.state,this.i=a,a.defaultPrevented&&se.Z.h.call(this)},se.prototype.h=function(){se.Z.h.call(this);const a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var Ze="closure_listenable_"+(Math.random()*1e6|0),an=0;function Ht(a,h,p,y,b){this.listener=a,this.proxy=null,this.src=h,this.type=p,this.capture=!!y,this.ha=b,this.key=++an,this.da=this.fa=!1}function $(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function Q(a,h,p){for(const y in a)h.call(p,a[y],y,a)}function J(a,h){for(const p in a)h.call(void 0,a[p],p,a)}function _e(a){const h={};for(const p in a)h[p]=a[p];return h}const Pe="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function Gr(a,h){let p,y;for(let b=1;b<arguments.length;b++){y=arguments[b];for(p in y)a[p]=y[p];for(let O=0;O<Pe.length;O++)p=Pe[O],Object.prototype.hasOwnProperty.call(y,p)&&(a[p]=y[p])}}function Lt(a){this.src=a,this.g={},this.h=0}Lt.prototype.add=function(a,h,p,y,b){const O=a.toString();a=this.g[O],a||(a=this.g[O]=[],this.h++);const z=qt(a,h,y,b);return z>-1?(h=a[z],p||(h.fa=!1)):(h=new Ht(h,this.src,O,!!y,b),h.fa=p,a.push(h)),h};function Qr(a,h){const p=h.type;if(p in a.g){var y=a.g[p],b=Array.prototype.indexOf.call(y,h,void 0),O;(O=b>=0)&&Array.prototype.splice.call(y,b,1),O&&($(h),a.g[p].length==0&&(delete a.g[p],a.h--))}}function qt(a,h,p,y){for(let b=0;b<a.length;++b){const O=a[b];if(!O.da&&O.listener==h&&O.capture==!!p&&O.ha==y)return b}return-1}var Gn="closure_lm_"+(Math.random()*1e6|0),Dc={};function wm(a,h,p,y,b){if(Array.isArray(h)){for(let O=0;O<h.length;O++)wm(a,h[O],p,y,b);return null}return p=Im(p),a&&a[Ze]?a.J(h,p,l(y)?!!y.capture:!1,b):dx(a,h,p,!1,y,b)}function dx(a,h,p,y,b,O){if(!h)throw Error("Invalid event type");const z=l(b)?!!b.capture:!!b;let Z=Vc(a);if(Z||(a[Gn]=Z=new Lt(a)),p=Z.add(h,p,y,z,O),p.proxy)return p;if(y=fx(),p.proxy=y,y.src=a,y.listener=p,a.addEventListener)C||(b=z),b===void 0&&(b=!1),a.addEventListener(h.toString(),y,b);else if(a.attachEvent)a.attachEvent(Tm(h.toString()),y);else if(a.addListener&&a.removeListener)a.addListener(y);else throw Error("addEventListener and attachEvent are unavailable.");return p}function fx(){function a(p){return h.call(a.src,a.listener,p)}const h=px;return a}function Em(a,h,p,y,b){if(Array.isArray(h))for(var O=0;O<h.length;O++)Em(a,h[O],p,y,b);else y=l(y)?!!y.capture:!!y,p=Im(p),a&&a[Ze]?(a=a.i,O=String(h).toString(),O in a.g&&(h=a.g[O],p=qt(h,p,y,b),p>-1&&($(h[p]),Array.prototype.splice.call(h,p,1),h.length==0&&(delete a.g[O],a.h--)))):a&&(a=Vc(a))&&(h=a.g[h.toString()],a=-1,h&&(a=qt(h,p,y,b)),(p=a>-1?h[a]:null)&&Oc(p))}function Oc(a){if(typeof a!="number"&&a&&!a.da){var h=a.src;if(h&&h[Ze])Qr(h.i,a);else{var p=a.type,y=a.proxy;h.removeEventListener?h.removeEventListener(p,y,a.capture):h.detachEvent?h.detachEvent(Tm(p),y):h.addListener&&h.removeListener&&h.removeListener(y),(p=Vc(h))?(Qr(p,a),p.h==0&&(p.src=null,h[Gn]=null)):$(a)}}}function Tm(a){return a in Dc?Dc[a]:Dc[a]="on"+a}function px(a,h){if(a.da)a=!0;else{h=new se(h,this);const p=a.listener,y=a.ha||a.src;a.fa&&Oc(a),a=p.call(y,h)}return a}function Vc(a){return a=a[Gn],a instanceof Lt?a:null}var Lc="__closure_events_fn_"+(Math.random()*1e9>>>0);function Im(a){return typeof a=="function"?a:(a[Lc]||(a[Lc]=function(h){return a.handleEvent(h)}),a[Lc])}function et(){R.call(this),this.i=new Lt(this),this.M=this,this.G=null}m(et,R),et.prototype[Ze]=!0,et.prototype.removeEventListener=function(a,h,p,y){Em(this,a,h,p,y)};function ct(a,h){var p,y=a.G;if(y)for(p=[];y;y=y.G)p.push(y);if(a=a.M,y=h.type||h,typeof h=="string")h=new T(h,a);else if(h instanceof T)h.target=h.target||a;else{var b=h;h=new T(y,a),Gr(h,b)}b=!0;let O,z;if(p)for(z=p.length-1;z>=0;z--)O=h.g=p[z],b=ja(O,y,!0,h)&&b;if(O=h.g=a,b=ja(O,y,!0,h)&&b,b=ja(O,y,!1,h)&&b,p)for(z=0;z<p.length;z++)O=h.g=p[z],b=ja(O,y,!1,h)&&b}et.prototype.N=function(){if(et.Z.N.call(this),this.i){var a=this.i;for(const h in a.g){const p=a.g[h];for(let y=0;y<p.length;y++)$(p[y]);delete a.g[h],a.h--}}this.G=null},et.prototype.J=function(a,h,p,y){return this.i.add(String(a),h,!1,p,y)},et.prototype.K=function(a,h,p,y){return this.i.add(String(a),h,!0,p,y)};function ja(a,h,p,y){if(h=a.i.g[String(h)],!h)return!0;h=h.concat();let b=!0;for(let O=0;O<h.length;++O){const z=h[O];if(z&&!z.da&&z.capture==p){const Z=z.listener,je=z.ha||z.src;z.fa&&Qr(a.i,z),b=Z.call(je,y)!==!1&&b}}return b&&!y.defaultPrevented}function mx(a,h){if(typeof a!="function")if(a&&typeof a.handleEvent=="function")a=c(a.handleEvent,a);else throw Error("Invalid listener argument");return Number(h)>2147483647?-1:o.setTimeout(a,h||0)}function xm(a){a.g=mx(()=>{a.g=null,a.i&&(a.i=!1,xm(a))},a.l);const h=a.h;a.h=null,a.m.apply(null,h)}class gx extends R{constructor(h,p){super(),this.m=h,this.l=p,this.h=null,this.i=!1,this.g=null}j(h){this.h=arguments,this.g?this.i=!0:xm(this)}N(){super.N(),this.g&&(o.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function zi(a){R.call(this),this.h=a,this.g={}}m(zi,R);var Sm=[];function Am(a){Q(a.g,function(h,p){this.g.hasOwnProperty(p)&&Oc(h)},a),a.g={}}zi.prototype.N=function(){zi.Z.N.call(this),Am(this)},zi.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Mc=o.JSON.stringify,yx=o.JSON.parse,_x=class{stringify(a){return o.JSON.stringify(a,void 0)}parse(a){return o.JSON.parse(a,void 0)}};function Cm(){}function km(){}var Bi={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function jc(){T.call(this,"d")}m(jc,T);function Uc(){T.call(this,"c")}m(Uc,T);var Yr={},Rm=null;function Ua(){return Rm=Rm||new et}Yr.Ia="serverreachability";function Pm(a){T.call(this,Yr.Ia,a)}m(Pm,T);function $i(a){const h=Ua();ct(h,new Pm(h))}Yr.STAT_EVENT="statevent";function Nm(a,h){T.call(this,Yr.STAT_EVENT,a),this.stat=h}m(Nm,T);function ht(a){const h=Ua();ct(h,new Nm(h,a))}Yr.Ja="timingevent";function bm(a,h){T.call(this,Yr.Ja,a),this.size=h}m(bm,T);function Wi(a,h){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return o.setTimeout(function(){a()},h)}function Hi(){this.g=!0}Hi.prototype.ua=function(){this.g=!1};function vx(a,h,p,y,b,O){a.info(function(){if(a.g)if(O){var z="",Z=O.split("&");for(let ce=0;ce<Z.length;ce++){var je=Z[ce].split("=");if(je.length>1){const Be=je[0];je=je[1];const un=Be.split("_");z=un.length>=2&&un[1]=="type"?z+(Be+"="+je+"&"):z+(Be+"=redacted&")}}}else z=null;else z=O;return"XMLHTTP REQ ("+y+") [attempt "+b+"]: "+h+`
`+p+`
`+z})}function wx(a,h,p,y,b,O,z){a.info(function(){return"XMLHTTP RESP ("+y+") [ attempt "+b+"]: "+h+`
`+p+`
`+O+" "+z})}function Ds(a,h,p,y){a.info(function(){return"XMLHTTP TEXT ("+h+"): "+Tx(a,p)+(y?" "+y:"")})}function Ex(a,h){a.info(function(){return"TIMEOUT: "+h})}Hi.prototype.info=function(){};function Tx(a,h){if(!a.g)return h;if(!h)return null;try{const O=JSON.parse(h);if(O){for(a=0;a<O.length;a++)if(Array.isArray(O[a])){var p=O[a];if(!(p.length<2)){var y=p[1];if(Array.isArray(y)&&!(y.length<1)){var b=y[0];if(b!="noop"&&b!="stop"&&b!="close")for(let z=1;z<y.length;z++)y[z]=""}}}}return Mc(O)}catch{return h}}var Fa={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},Dm={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},Om;function Fc(){}m(Fc,Cm),Fc.prototype.g=function(){return new XMLHttpRequest},Om=new Fc;function qi(a){return encodeURIComponent(String(a))}function Ix(a){var h=1;a=a.split(":");const p=[];for(;h>0&&a.length;)p.push(a.shift()),h--;return a.length&&p.push(a.join(":")),p}function Qn(a,h,p,y){this.j=a,this.i=h,this.l=p,this.S=y||1,this.V=new zi(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new Vm}function Vm(){this.i=null,this.g="",this.h=!1}var Lm={},zc={};function Bc(a,h,p){a.M=1,a.A=Ba(ln(h)),a.u=p,a.R=!0,Mm(a,null)}function Mm(a,h){a.F=Date.now(),za(a),a.B=ln(a.A);var p=a.B,y=a.S;Array.isArray(y)||(y=[String(y)]),Ym(p.i,"t",y),a.C=0,p=a.j.L,a.h=new Vm,a.g=pg(a.j,p?h:null,!a.u),a.P>0&&(a.O=new gx(c(a.Y,a,a.g),a.P)),h=a.V,p=a.g,y=a.ba;var b="readystatechange";Array.isArray(b)||(b&&(Sm[0]=b.toString()),b=Sm);for(let O=0;O<b.length;O++){const z=wm(p,b[O],y||h.handleEvent,!1,h.h||h);if(!z)break;h.g[z.key]=z}h=a.J?_e(a.J):{},a.u?(a.v||(a.v="POST"),h["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.B,a.v,a.u,h)):(a.v="GET",a.g.ea(a.B,a.v,null,h)),$i(),vx(a.i,a.v,a.B,a.l,a.S,a.u)}Qn.prototype.ba=function(a){a=a.target;const h=this.O;h&&Jn(a)==3?h.j():this.Y(a)},Qn.prototype.Y=function(a){try{if(a==this.g)e:{const Z=Jn(this.g),je=this.g.ya(),ce=this.g.ca();if(!(Z<3)&&(Z!=3||this.g&&(this.h.h||this.g.la()||rg(this.g)))){this.K||Z!=4||je==7||(je==8||ce<=0?$i(3):$i(2)),$c(this);var h=this.g.ca();this.X=h;var p=xx(this);if(this.o=h==200,wx(this.i,this.v,this.B,this.l,this.S,Z,h),this.o){if(this.U&&!this.L){t:{if(this.g){var y,b=this.g;if((y=b.g?b.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!I(y)){var O=y;break t}}O=null}if(a=O)Ds(this.i,this.l,a,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,Wc(this,a);else{this.o=!1,this.m=3,ht(12),Xr(this),Ki(this);break e}}if(this.R){a=!0;let Be;for(;!this.K&&this.C<p.length;)if(Be=Sx(this,p),Be==zc){Z==4&&(this.m=4,ht(14),a=!1),Ds(this.i,this.l,null,"[Incomplete Response]");break}else if(Be==Lm){this.m=4,ht(15),Ds(this.i,this.l,p,"[Invalid Chunk]"),a=!1;break}else Ds(this.i,this.l,Be,null),Wc(this,Be);if(jm(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),Z!=4||p.length!=0||this.h.h||(this.m=1,ht(16),a=!1),this.o=this.o&&a,!a)Ds(this.i,this.l,p,"[Invalid Chunked Response]"),Xr(this),Ki(this);else if(p.length>0&&!this.W){this.W=!0;var z=this.j;z.g==this&&z.aa&&!z.P&&(z.j.info("Great, no buffering proxy detected. Bytes received: "+p.length),Jc(z),z.P=!0,ht(11))}}else Ds(this.i,this.l,p,null),Wc(this,p);Z==4&&Xr(this),this.o&&!this.K&&(Z==4?cg(this.j,this):(this.o=!1,za(this)))}else Ux(this.g),h==400&&p.indexOf("Unknown SID")>0?(this.m=3,ht(12)):(this.m=0,ht(13)),Xr(this),Ki(this)}}}catch{}finally{}};function xx(a){if(!jm(a))return a.g.la();const h=rg(a.g);if(h==="")return"";let p="";const y=h.length,b=Jn(a.g)==4;if(!a.h.i){if(typeof TextDecoder>"u")return Xr(a),Ki(a),"";a.h.i=new o.TextDecoder}for(let O=0;O<y;O++)a.h.h=!0,p+=a.h.i.decode(h[O],{stream:!(b&&O==y-1)});return h.length=0,a.h.g+=p,a.C=0,a.h.g}function jm(a){return a.g?a.v=="GET"&&a.M!=2&&a.j.Aa:!1}function Sx(a,h){var p=a.C,y=h.indexOf(`
`,p);return y==-1?zc:(p=Number(h.substring(p,y)),isNaN(p)?Lm:(y+=1,y+p>h.length?zc:(h=h.slice(y,y+p),a.C=y+p,h)))}Qn.prototype.cancel=function(){this.K=!0,Xr(this)};function za(a){a.T=Date.now()+a.H,Um(a,a.H)}function Um(a,h){if(a.D!=null)throw Error("WatchDog timer not null");a.D=Wi(c(a.aa,a),h)}function $c(a){a.D&&(o.clearTimeout(a.D),a.D=null)}Qn.prototype.aa=function(){this.D=null;const a=Date.now();a-this.T>=0?(Ex(this.i,this.B),this.M!=2&&($i(),ht(17)),Xr(this),this.m=2,Ki(this)):Um(this,this.T-a)};function Ki(a){a.j.I==0||a.K||cg(a.j,a)}function Xr(a){$c(a);var h=a.O;h&&typeof h.dispose=="function"&&h.dispose(),a.O=null,Am(a.V),a.g&&(h=a.g,a.g=null,h.abort(),h.dispose())}function Wc(a,h){try{var p=a.j;if(p.I!=0&&(p.g==a||Hc(p.h,a))){if(!a.L&&Hc(p.h,a)&&p.I==3){try{var y=p.Ba.g.parse(h)}catch{y=null}if(Array.isArray(y)&&y.length==3){var b=y;if(b[0]==0){e:if(!p.v){if(p.g)if(p.g.F+3e3<a.F)Ka(p),Ha(p);else break e;Xc(p),ht(18)}}else p.xa=b[1],0<p.xa-p.K&&b[2]<37500&&p.F&&p.A==0&&!p.C&&(p.C=Wi(c(p.Va,p),6e3));Bm(p.h)<=1&&p.ta&&(p.ta=void 0)}else Zr(p,11)}else if((a.L||p.g==a)&&Ka(p),!I(h))for(b=p.Ba.g.parse(h),h=0;h<b.length;h++){let ce=b[h];const Be=ce[0];if(!(Be<=p.K))if(p.K=Be,ce=ce[1],p.I==2)if(ce[0]=="c"){p.M=ce[1],p.ba=ce[2];const un=ce[3];un!=null&&(p.ka=un,p.j.info("VER="+p.ka));const es=ce[4];es!=null&&(p.za=es,p.j.info("SVER="+p.za));const Zn=ce[5];Zn!=null&&typeof Zn=="number"&&Zn>0&&(y=1.5*Zn,p.O=y,p.j.info("backChannelRequestTimeoutMs_="+y)),y=p;const er=a.g;if(er){const Qa=er.g?er.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(Qa){var O=y.h;O.g||Qa.indexOf("spdy")==-1&&Qa.indexOf("quic")==-1&&Qa.indexOf("h2")==-1||(O.j=O.l,O.g=new Set,O.h&&(qc(O,O.h),O.h=null))}if(y.G){const Zc=er.g?er.g.getResponseHeader("X-HTTP-Session-Id"):null;Zc&&(y.wa=Zc,me(y.J,y.G,Zc))}}p.I=3,p.l&&p.l.ra(),p.aa&&(p.T=Date.now()-a.F,p.j.info("Handshake RTT: "+p.T+"ms")),y=p;var z=a;if(y.na=fg(y,y.L?y.ba:null,y.W),z.L){$m(y.h,z);var Z=z,je=y.O;je&&(Z.H=je),Z.D&&($c(Z),za(Z)),y.g=z}else lg(y);p.i.length>0&&qa(p)}else ce[0]!="stop"&&ce[0]!="close"||Zr(p,7);else p.I==3&&(ce[0]=="stop"||ce[0]=="close"?ce[0]=="stop"?Zr(p,7):Yc(p):ce[0]!="noop"&&p.l&&p.l.qa(ce),p.A=0)}}$i(4)}catch{}}var Ax=class{constructor(a,h){this.g=a,this.map=h}};function Fm(a){this.l=a||10,o.PerformanceNavigationTiming?(a=o.performance.getEntriesByType("navigation"),a=a.length>0&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(o.chrome&&o.chrome.loadTimes&&o.chrome.loadTimes()&&o.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function zm(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function Bm(a){return a.h?1:a.g?a.g.size:0}function Hc(a,h){return a.h?a.h==h:a.g?a.g.has(h):!1}function qc(a,h){a.g?a.g.add(h):a.h=h}function $m(a,h){a.h&&a.h==h?a.h=null:a.g&&a.g.has(h)&&a.g.delete(h)}Fm.prototype.cancel=function(){if(this.i=Wm(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function Wm(a){if(a.h!=null)return a.i.concat(a.h.G);if(a.g!=null&&a.g.size!==0){let h=a.i;for(const p of a.g.values())h=h.concat(p.G);return h}return w(a.i)}var Hm=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function Cx(a,h){if(a){a=a.split("&");for(let p=0;p<a.length;p++){const y=a[p].indexOf("=");let b,O=null;y>=0?(b=a[p].substring(0,y),O=a[p].substring(y+1)):b=a[p],h(b,O?decodeURIComponent(O.replace(/\+/g," ")):"")}}}function Yn(a){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let h;a instanceof Yn?(this.l=a.l,Gi(this,a.j),this.o=a.o,this.g=a.g,Qi(this,a.u),this.h=a.h,Kc(this,Xm(a.i)),this.m=a.m):a&&(h=String(a).match(Hm))?(this.l=!1,Gi(this,h[1]||"",!0),this.o=Yi(h[2]||""),this.g=Yi(h[3]||"",!0),Qi(this,h[4]),this.h=Yi(h[5]||"",!0),Kc(this,h[6]||"",!0),this.m=Yi(h[7]||"")):(this.l=!1,this.i=new Ji(null,this.l))}Yn.prototype.toString=function(){const a=[];var h=this.j;h&&a.push(Xi(h,qm,!0),":");var p=this.g;return(p||h=="file")&&(a.push("//"),(h=this.o)&&a.push(Xi(h,qm,!0),"@"),a.push(qi(p).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),p=this.u,p!=null&&a.push(":",String(p))),(p=this.h)&&(this.g&&p.charAt(0)!="/"&&a.push("/"),a.push(Xi(p,p.charAt(0)=="/"?Px:Rx,!0))),(p=this.i.toString())&&a.push("?",p),(p=this.m)&&a.push("#",Xi(p,bx)),a.join("")},Yn.prototype.resolve=function(a){const h=ln(this);let p=!!a.j;p?Gi(h,a.j):p=!!a.o,p?h.o=a.o:p=!!a.g,p?h.g=a.g:p=a.u!=null;var y=a.h;if(p)Qi(h,a.u);else if(p=!!a.h){if(y.charAt(0)!="/")if(this.g&&!this.h)y="/"+y;else{var b=h.h.lastIndexOf("/");b!=-1&&(y=h.h.slice(0,b+1)+y)}if(b=y,b==".."||b==".")y="";else if(b.indexOf("./")!=-1||b.indexOf("/.")!=-1){y=b.lastIndexOf("/",0)==0,b=b.split("/");const O=[];for(let z=0;z<b.length;){const Z=b[z++];Z=="."?y&&z==b.length&&O.push(""):Z==".."?((O.length>1||O.length==1&&O[0]!="")&&O.pop(),y&&z==b.length&&O.push("")):(O.push(Z),y=!0)}y=O.join("/")}else y=b}return p?h.h=y:p=a.i.toString()!=="",p?Kc(h,Xm(a.i)):p=!!a.m,p&&(h.m=a.m),h};function ln(a){return new Yn(a)}function Gi(a,h,p){a.j=p?Yi(h,!0):h,a.j&&(a.j=a.j.replace(/:$/,""))}function Qi(a,h){if(h){if(h=Number(h),isNaN(h)||h<0)throw Error("Bad port number "+h);a.u=h}else a.u=null}function Kc(a,h,p){h instanceof Ji?(a.i=h,Dx(a.i,a.l)):(p||(h=Xi(h,Nx)),a.i=new Ji(h,a.l))}function me(a,h,p){a.i.set(h,p)}function Ba(a){return me(a,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),a}function Yi(a,h){return a?h?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function Xi(a,h,p){return typeof a=="string"?(a=encodeURI(a).replace(h,kx),p&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function kx(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var qm=/[#\/\?@]/g,Rx=/[#\?:]/g,Px=/[#\?]/g,Nx=/[#\?@]/g,bx=/#/g;function Ji(a,h){this.h=this.g=null,this.i=a||null,this.j=!!h}function Jr(a){a.g||(a.g=new Map,a.h=0,a.i&&Cx(a.i,function(h,p){a.add(decodeURIComponent(h.replace(/\+/g," ")),p)}))}t=Ji.prototype,t.add=function(a,h){Jr(this),this.i=null,a=Os(this,a);let p=this.g.get(a);return p||this.g.set(a,p=[]),p.push(h),this.h+=1,this};function Km(a,h){Jr(a),h=Os(a,h),a.g.has(h)&&(a.i=null,a.h-=a.g.get(h).length,a.g.delete(h))}function Gm(a,h){return Jr(a),h=Os(a,h),a.g.has(h)}t.forEach=function(a,h){Jr(this),this.g.forEach(function(p,y){p.forEach(function(b){a.call(h,b,y,this)},this)},this)};function Qm(a,h){Jr(a);let p=[];if(typeof h=="string")Gm(a,h)&&(p=p.concat(a.g.get(Os(a,h))));else for(a=Array.from(a.g.values()),h=0;h<a.length;h++)p=p.concat(a[h]);return p}t.set=function(a,h){return Jr(this),this.i=null,a=Os(this,a),Gm(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[h]),this.h+=1,this},t.get=function(a,h){return a?(a=Qm(this,a),a.length>0?String(a[0]):h):h};function Ym(a,h,p){Km(a,h),p.length>0&&(a.i=null,a.g.set(Os(a,h),w(p)),a.h+=p.length)}t.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],h=Array.from(this.g.keys());for(let y=0;y<h.length;y++){var p=h[y];const b=qi(p);p=Qm(this,p);for(let O=0;O<p.length;O++){let z=b;p[O]!==""&&(z+="="+qi(p[O])),a.push(z)}}return this.i=a.join("&")};function Xm(a){const h=new Ji;return h.i=a.i,a.g&&(h.g=new Map(a.g),h.h=a.h),h}function Os(a,h){return h=String(h),a.j&&(h=h.toLowerCase()),h}function Dx(a,h){h&&!a.j&&(Jr(a),a.i=null,a.g.forEach(function(p,y){const b=y.toLowerCase();y!=b&&(Km(this,y),Ym(this,b,p))},a)),a.j=h}function Ox(a,h){const p=new Hi;if(o.Image){const y=new Image;y.onload=d(Xn,p,"TestLoadImage: loaded",!0,h,y),y.onerror=d(Xn,p,"TestLoadImage: error",!1,h,y),y.onabort=d(Xn,p,"TestLoadImage: abort",!1,h,y),y.ontimeout=d(Xn,p,"TestLoadImage: timeout",!1,h,y),o.setTimeout(function(){y.ontimeout&&y.ontimeout()},1e4),y.src=a}else h(!1)}function Vx(a,h){const p=new Hi,y=new AbortController,b=setTimeout(()=>{y.abort(),Xn(p,"TestPingServer: timeout",!1,h)},1e4);fetch(a,{signal:y.signal}).then(O=>{clearTimeout(b),O.ok?Xn(p,"TestPingServer: ok",!0,h):Xn(p,"TestPingServer: server error",!1,h)}).catch(()=>{clearTimeout(b),Xn(p,"TestPingServer: error",!1,h)})}function Xn(a,h,p,y,b){try{b&&(b.onload=null,b.onerror=null,b.onabort=null,b.ontimeout=null),y(p)}catch{}}function Lx(){this.g=new _x}function Gc(a){this.i=a.Sb||null,this.h=a.ab||!1}m(Gc,Cm),Gc.prototype.g=function(){return new $a(this.i,this.h)};function $a(a,h){et.call(this),this.H=a,this.o=h,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}m($a,et),t=$a.prototype,t.open=function(a,h){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=a,this.D=h,this.readyState=1,eo(this)},t.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const h={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};a&&(h.body=a),(this.H||o).fetch(new Request(this.D,h)).then(this.Pa.bind(this),this.ga.bind(this))},t.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,Zi(this)),this.readyState=0},t.Pa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,eo(this)),this.g&&(this.readyState=3,eo(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof o.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;Jm(this)}else a.text().then(this.Oa.bind(this),this.ga.bind(this))};function Jm(a){a.j.read().then(a.Ma.bind(a)).catch(a.ga.bind(a))}t.Ma=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var h=a.value?a.value:new Uint8Array(0);(h=this.B.decode(h,{stream:!a.done}))&&(this.response=this.responseText+=h)}a.done?Zi(this):eo(this),this.readyState==3&&Jm(this)}},t.Oa=function(a){this.g&&(this.response=this.responseText=a,Zi(this))},t.Na=function(a){this.g&&(this.response=a,Zi(this))},t.ga=function(){this.g&&Zi(this)};function Zi(a){a.readyState=4,a.l=null,a.j=null,a.B=null,eo(a)}t.setRequestHeader=function(a,h){this.A.append(a,h)},t.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},t.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],h=this.h.entries();for(var p=h.next();!p.done;)p=p.value,a.push(p[0]+": "+p[1]),p=h.next();return a.join(`\r
`)};function eo(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty($a.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function Zm(a){let h="";return Q(a,function(p,y){h+=y,h+=":",h+=p,h+=`\r
`}),h}function Qc(a,h,p){e:{for(y in p){var y=!1;break e}y=!0}y||(p=Zm(p),typeof a=="string"?p!=null&&qi(p):me(a,h,p))}function Ae(a){et.call(this),this.headers=new Map,this.L=a||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}m(Ae,et);var Mx=/^https?$/i,jx=["POST","PUT"];t=Ae.prototype,t.Fa=function(a){this.H=a},t.ea=function(a,h,p,y){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);h=h?h.toUpperCase():"GET",this.D=a,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():Om.g(),this.g.onreadystatechange=g(c(this.Ca,this));try{this.B=!0,this.g.open(h,String(a),!0),this.B=!1}catch(O){eg(this,O);return}if(a=p||"",p=new Map(this.headers),y)if(Object.getPrototypeOf(y)===Object.prototype)for(var b in y)p.set(b,y[b]);else if(typeof y.keys=="function"&&typeof y.get=="function")for(const O of y.keys())p.set(O,y.get(O));else throw Error("Unknown input type for opt_headers: "+String(y));y=Array.from(p.keys()).find(O=>O.toLowerCase()=="content-type"),b=o.FormData&&a instanceof o.FormData,!(Array.prototype.indexOf.call(jx,h,void 0)>=0)||y||b||p.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[O,z]of p)this.g.setRequestHeader(O,z);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(a),this.v=!1}catch(O){eg(this,O)}};function eg(a,h){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=h,a.o=5,tg(a),Wa(a)}function tg(a){a.A||(a.A=!0,ct(a,"complete"),ct(a,"error"))}t.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=a||7,ct(this,"complete"),ct(this,"abort"),Wa(this))},t.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Wa(this,!0)),Ae.Z.N.call(this)},t.Ca=function(){this.u||(this.B||this.v||this.j?ng(this):this.Xa())},t.Xa=function(){ng(this)};function ng(a){if(a.h&&typeof i<"u"){if(a.v&&Jn(a)==4)setTimeout(a.Ca.bind(a),0);else if(ct(a,"readystatechange"),Jn(a)==4){a.h=!1;try{const O=a.ca();e:switch(O){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var h=!0;break e;default:h=!1}var p;if(!(p=h)){var y;if(y=O===0){let z=String(a.D).match(Hm)[1]||null;!z&&o.self&&o.self.location&&(z=o.self.location.protocol.slice(0,-1)),y=!Mx.test(z?z.toLowerCase():"")}p=y}if(p)ct(a,"complete"),ct(a,"success");else{a.o=6;try{var b=Jn(a)>2?a.g.statusText:""}catch{b=""}a.l=b+" ["+a.ca()+"]",tg(a)}}finally{Wa(a)}}}}function Wa(a,h){if(a.g){a.m&&(clearTimeout(a.m),a.m=null);const p=a.g;a.g=null,h||ct(a,"ready");try{p.onreadystatechange=null}catch{}}}t.isActive=function(){return!!this.g};function Jn(a){return a.g?a.g.readyState:0}t.ca=function(){try{return Jn(this)>2?this.g.status:-1}catch{return-1}},t.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},t.La=function(a){if(this.g){var h=this.g.responseText;return a&&h.indexOf(a)==0&&(h=h.substring(a.length)),yx(h)}};function rg(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.F){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function Ux(a){const h={};a=(a.g&&Jn(a)>=2&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let y=0;y<a.length;y++){if(I(a[y]))continue;var p=Ix(a[y]);const b=p[0];if(p=p[1],typeof p!="string")continue;p=p.trim();const O=h[b]||[];h[b]=O,O.push(p)}J(h,function(y){return y.join(", ")})}t.ya=function(){return this.o},t.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function to(a,h,p){return p&&p.internalChannelParams&&p.internalChannelParams[a]||h}function sg(a){this.za=0,this.i=[],this.j=new Hi,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=to("failFast",!1,a),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=to("baseRetryDelayMs",5e3,a),this.Za=to("retryDelaySeedMs",1e4,a),this.Ta=to("forwardChannelMaxRetries",2,a),this.va=to("forwardChannelRequestTimeoutMs",2e4,a),this.ma=a&&a.xmlHttpFactory||void 0,this.Ua=a&&a.Rb||void 0,this.Aa=a&&a.useFetchStreams||!1,this.O=void 0,this.L=a&&a.supportsCrossDomainXhr||!1,this.M="",this.h=new Fm(a&&a.concurrentRequestLimit),this.Ba=new Lx,this.S=a&&a.fastHandshake||!1,this.R=a&&a.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=a&&a.Pb||!1,a&&a.ua&&this.j.ua(),a&&a.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&a&&a.detectBufferingProxy||!1,this.ia=void 0,a&&a.longPollingTimeout&&a.longPollingTimeout>0&&(this.ia=a.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}t=sg.prototype,t.ka=8,t.I=1,t.connect=function(a,h,p,y){ht(0),this.W=a,this.H=h||{},p&&y!==void 0&&(this.H.OSID=p,this.H.OAID=y),this.F=this.X,this.J=fg(this,null,this.W),qa(this)};function Yc(a){if(ig(a),a.I==3){var h=a.V++,p=ln(a.J);if(me(p,"SID",a.M),me(p,"RID",h),me(p,"TYPE","terminate"),no(a,p),h=new Qn(a,a.j,h),h.M=2,h.A=Ba(ln(p)),p=!1,o.navigator&&o.navigator.sendBeacon)try{p=o.navigator.sendBeacon(h.A.toString(),"")}catch{}!p&&o.Image&&(new Image().src=h.A,p=!0),p||(h.g=pg(h.j,null),h.g.ea(h.A)),h.F=Date.now(),za(h)}dg(a)}function Ha(a){a.g&&(Jc(a),a.g.cancel(),a.g=null)}function ig(a){Ha(a),a.v&&(o.clearTimeout(a.v),a.v=null),Ka(a),a.h.cancel(),a.m&&(typeof a.m=="number"&&o.clearTimeout(a.m),a.m=null)}function qa(a){if(!zm(a.h)&&!a.m){a.m=!0;var h=a.Ea;U||_(),L||(U(),L=!0),E.add(h,a),a.D=0}}function Fx(a,h){return Bm(a.h)>=a.h.j-(a.m?1:0)?!1:a.m?(a.i=h.G.concat(a.i),!0):a.I==1||a.I==2||a.D>=(a.Sa?0:a.Ta)?!1:(a.m=Wi(c(a.Ea,a,h),hg(a,a.D)),a.D++,!0)}t.Ea=function(a){if(this.m)if(this.m=null,this.I==1){if(!a){this.V=Math.floor(Math.random()*1e5),a=this.V++;const b=new Qn(this,this.j,a);let O=this.o;if(this.U&&(O?(O=_e(O),Gr(O,this.U)):O=this.U),this.u!==null||this.R||(b.J=O,O=null),this.S)e:{for(var h=0,p=0;p<this.i.length;p++){t:{var y=this.i[p];if("__data__"in y.map&&(y=y.map.__data__,typeof y=="string")){y=y.length;break t}y=void 0}if(y===void 0)break;if(h+=y,h>4096){h=p;break e}if(h===4096||p===this.i.length-1){h=p+1;break e}}h=1e3}else h=1e3;h=ag(this,b,h),p=ln(this.J),me(p,"RID",a),me(p,"CVER",22),this.G&&me(p,"X-HTTP-Session-Id",this.G),no(this,p),O&&(this.R?h="headers="+qi(Zm(O))+"&"+h:this.u&&Qc(p,this.u,O)),qc(this.h,b),this.Ra&&me(p,"TYPE","init"),this.S?(me(p,"$req",h),me(p,"SID","null"),b.U=!0,Bc(b,p,null)):Bc(b,p,h),this.I=2}}else this.I==3&&(a?og(this,a):this.i.length==0||zm(this.h)||og(this))};function og(a,h){var p;h?p=h.l:p=a.V++;const y=ln(a.J);me(y,"SID",a.M),me(y,"RID",p),me(y,"AID",a.K),no(a,y),a.u&&a.o&&Qc(y,a.u,a.o),p=new Qn(a,a.j,p,a.D+1),a.u===null&&(p.J=a.o),h&&(a.i=h.G.concat(a.i)),h=ag(a,p,1e3),p.H=Math.round(a.va*.5)+Math.round(a.va*.5*Math.random()),qc(a.h,p),Bc(p,y,h)}function no(a,h){a.H&&Q(a.H,function(p,y){me(h,y,p)}),a.l&&Q({},function(p,y){me(h,y,p)})}function ag(a,h,p){p=Math.min(a.i.length,p);const y=a.l?c(a.l.Ka,a.l,a):null;e:{var b=a.i;let Z=-1;for(;;){const je=["count="+p];Z==-1?p>0?(Z=b[0].g,je.push("ofs="+Z)):Z=0:je.push("ofs="+Z);let ce=!0;for(let Be=0;Be<p;Be++){var O=b[Be].g;const un=b[Be].map;if(O-=Z,O<0)Z=Math.max(0,b[Be].g-100),ce=!1;else try{O="req"+O+"_"||"";try{var z=un instanceof Map?un:Object.entries(un);for(const[es,Zn]of z){let er=Zn;l(Zn)&&(er=Mc(Zn)),je.push(O+es+"="+encodeURIComponent(er))}}catch(es){throw je.push(O+"type="+encodeURIComponent("_badmap")),es}}catch{y&&y(un)}}if(ce){z=je.join("&");break e}}z=void 0}return a=a.i.splice(0,p),h.G=a,z}function lg(a){if(!a.g&&!a.v){a.Y=1;var h=a.Da;U||_(),L||(U(),L=!0),E.add(h,a),a.A=0}}function Xc(a){return a.g||a.v||a.A>=3?!1:(a.Y++,a.v=Wi(c(a.Da,a),hg(a,a.A)),a.A++,!0)}t.Da=function(){if(this.v=null,ug(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var a=4*this.T;this.j.info("BP detection timer enabled: "+a),this.B=Wi(c(this.Wa,this),a)}},t.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,ht(10),Ha(this),ug(this))};function Jc(a){a.B!=null&&(o.clearTimeout(a.B),a.B=null)}function ug(a){a.g=new Qn(a,a.j,"rpc",a.Y),a.u===null&&(a.g.J=a.o),a.g.P=0;var h=ln(a.na);me(h,"RID","rpc"),me(h,"SID",a.M),me(h,"AID",a.K),me(h,"CI",a.F?"0":"1"),!a.F&&a.ia&&me(h,"TO",a.ia),me(h,"TYPE","xmlhttp"),no(a,h),a.u&&a.o&&Qc(h,a.u,a.o),a.O&&(a.g.H=a.O);var p=a.g;a=a.ba,p.M=1,p.A=Ba(ln(h)),p.u=null,p.R=!0,Mm(p,a)}t.Va=function(){this.C!=null&&(this.C=null,Ha(this),Xc(this),ht(19))};function Ka(a){a.C!=null&&(o.clearTimeout(a.C),a.C=null)}function cg(a,h){var p=null;if(a.g==h){Ka(a),Jc(a),a.g=null;var y=2}else if(Hc(a.h,h))p=h.G,$m(a.h,h),y=1;else return;if(a.I!=0){if(h.o)if(y==1){p=h.u?h.u.length:0,h=Date.now()-h.F;var b=a.D;y=Ua(),ct(y,new bm(y,p)),qa(a)}else lg(a);else if(b=h.m,b==3||b==0&&h.X>0||!(y==1&&Fx(a,h)||y==2&&Xc(a)))switch(p&&p.length>0&&(h=a.h,h.i=h.i.concat(p)),b){case 1:Zr(a,5);break;case 4:Zr(a,10);break;case 3:Zr(a,6);break;default:Zr(a,2)}}}function hg(a,h){let p=a.Qa+Math.floor(Math.random()*a.Za);return a.isActive()||(p*=2),p*h}function Zr(a,h){if(a.j.info("Error code "+h),h==2){var p=c(a.bb,a),y=a.Ua;const b=!y;y=new Yn(y||"//www.google.com/images/cleardot.gif"),o.location&&o.location.protocol=="http"||Gi(y,"https"),Ba(y),b?Ox(y.toString(),p):Vx(y.toString(),p)}else ht(2);a.I=0,a.l&&a.l.pa(h),dg(a),ig(a)}t.bb=function(a){a?(this.j.info("Successfully pinged google.com"),ht(2)):(this.j.info("Failed to ping google.com"),ht(1))};function dg(a){if(a.I=0,a.ja=[],a.l){const h=Wm(a.h);(h.length!=0||a.i.length!=0)&&(A(a.ja,h),A(a.ja,a.i),a.h.i.length=0,w(a.i),a.i.length=0),a.l.oa()}}function fg(a,h,p){var y=p instanceof Yn?ln(p):new Yn(p);if(y.g!="")h&&(y.g=h+"."+y.g),Qi(y,y.u);else{var b=o.location;y=b.protocol,h=h?h+"."+b.hostname:b.hostname,b=+b.port;const O=new Yn(null);y&&Gi(O,y),h&&(O.g=h),b&&Qi(O,b),p&&(O.h=p),y=O}return p=a.G,h=a.wa,p&&h&&me(y,p,h),me(y,"VER",a.ka),no(a,y),y}function pg(a,h,p){if(h&&!a.L)throw Error("Can't create secondary domain capable XhrIo object.");return h=a.Aa&&!a.ma?new Ae(new Gc({ab:p})):new Ae(a.ma),h.Fa(a.L),h}t.isActive=function(){return!!this.l&&this.l.isActive(this)};function mg(){}t=mg.prototype,t.ra=function(){},t.qa=function(){},t.pa=function(){},t.oa=function(){},t.isActive=function(){return!0},t.Ka=function(){};function Ga(){}Ga.prototype.g=function(a,h){return new St(a,h)};function St(a,h){et.call(this),this.g=new sg(h),this.l=a,this.h=h&&h.messageUrlParams||null,a=h&&h.messageHeaders||null,h&&h.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=h&&h.initMessageHeaders||null,h&&h.messageContentType&&(a?a["X-WebChannel-Content-Type"]=h.messageContentType:a={"X-WebChannel-Content-Type":h.messageContentType}),h&&h.sa&&(a?a["X-WebChannel-Client-Profile"]=h.sa:a={"X-WebChannel-Client-Profile":h.sa}),this.g.U=a,(a=h&&h.Qb)&&!I(a)&&(this.g.u=a),this.A=h&&h.supportsCrossDomainXhr||!1,this.v=h&&h.sendRawJson||!1,(h=h&&h.httpSessionIdParam)&&!I(h)&&(this.g.G=h,a=this.h,a!==null&&h in a&&(a=this.h,h in a&&delete a[h])),this.j=new Vs(this)}m(St,et),St.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},St.prototype.close=function(){Yc(this.g)},St.prototype.o=function(a){var h=this.g;if(typeof a=="string"){var p={};p.__data__=a,a=p}else this.v&&(p={},p.__data__=Mc(a),a=p);h.i.push(new Ax(h.Ya++,a)),h.I==3&&qa(h)},St.prototype.N=function(){this.g.l=null,delete this.j,Yc(this.g),delete this.g,St.Z.N.call(this)};function gg(a){jc.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var h=a.__sm__;if(h){e:{for(const p in h){a=p;break e}a=void 0}(this.i=a)&&(a=this.i,h=h!==null&&a in h?h[a]:void 0),this.data=h}else this.data=a}m(gg,jc);function yg(){Uc.call(this),this.status=1}m(yg,Uc);function Vs(a){this.g=a}m(Vs,mg),Vs.prototype.ra=function(){ct(this.g,"a")},Vs.prototype.qa=function(a){ct(this.g,new gg(a))},Vs.prototype.pa=function(a){ct(this.g,new yg)},Vs.prototype.oa=function(){ct(this.g,"b")},Ga.prototype.createWebChannel=Ga.prototype.g,St.prototype.send=St.prototype.o,St.prototype.open=St.prototype.m,St.prototype.close=St.prototype.close,vE=function(){return new Ga},_E=function(){return Ua()},yE=Yr,Hd={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},Fa.NO_ERROR=0,Fa.TIMEOUT=8,Fa.HTTP_ERROR=6,Vl=Fa,Dm.COMPLETE="complete",gE=Dm,km.EventType=Bi,Bi.OPEN="a",Bi.CLOSE="b",Bi.ERROR="c",Bi.MESSAGE="d",et.prototype.listen=et.prototype.J,wo=km,Ae.prototype.listenOnce=Ae.prototype.K,Ae.prototype.getLastError=Ae.prototype.Ha,Ae.prototype.getLastErrorCode=Ae.prototype.ya,Ae.prototype.getStatus=Ae.prototype.ca,Ae.prototype.getResponseJson=Ae.prototype.La,Ae.prototype.getResponseText=Ae.prototype.la,Ae.prototype.send=Ae.prototype.ea,Ae.prototype.setWithCredentials=Ae.prototype.Fa,mE=Ae}).apply(typeof fl<"u"?fl:typeof self<"u"?self:typeof window<"u"?window:{});/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */let bi="12.13.0";function eR(t){bi=t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */const _s=new dp("@firebase/firestore");function Ms(){return _s.logLevel}function W(t,...e){if(_s.logLevel<=re.DEBUG){const n=e.map(mp);_s.debug(`Firestore (${bi}): ${t}`,...n)}}function Bn(t,...e){if(_s.logLevel<=re.ERROR){const n=e.map(mp);_s.error(`Firestore (${bi}): ${t}`,...n)}}function Dr(t,...e){if(_s.logLevel<=re.WARN){const n=e.map(mp);_s.warn(`Firestore (${bi}): ${t}`,...n)}}function mp(t){if(typeof t=="string")return t;try{return function(n){return JSON.stringify(n)}(t)}catch{return t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function G(t,e,n){let r="Unexpected state";typeof e=="string"?r=e:n=e,wE(t,r,n)}function wE(t,e,n){let r=`FIRESTORE (${bi}) INTERNAL ASSERTION FAILED: ${e} (ID: ${t.toString(16)})`;if(n!==void 0)try{r+=" CONTEXT: "+JSON.stringify(n)}catch{r+=" CONTEXT: "+n}throw Bn(r),new Error(r)}function le(t,e,n,r){let s="Unexpected state";typeof n=="string"?s=n:r=n,t||wE(e,s,r)}function X(t,e){return t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const M={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class B extends In{constructor(e,n){super(e,n),this.code=e,this.message=n,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class On{constructor(){this.promise=new Promise((e,n)=>{this.resolve=e,this.reject=n})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class EE{constructor(e,n){this.user=n,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class TE{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,n){e.enqueueRetryable(()=>n(st.UNAUTHENTICATED))}shutdown(){}}class tR{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,n){this.changeListener=n,e.enqueueRetryable(()=>n(this.token.user))}shutdown(){this.changeListener=null}}class nR{constructor(e){this.t=e,this.currentUser=st.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,n){le(this.o===void 0,42304);let r=this.i;const s=u=>this.i!==r?(r=this.i,n(u)):Promise.resolve();let i=new On;this.o=()=>{this.i++,this.currentUser=this.u(),i.resolve(),i=new On,e.enqueueRetryable(()=>s(this.currentUser))};const o=()=>{const u=i;e.enqueueRetryable(async()=>{await u.promise,await s(this.currentUser)})},l=u=>{W("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=u,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(u=>l(u)),setTimeout(()=>{if(!this.auth){const u=this.t.getImmediate({optional:!0});u?l(u):(W("FirebaseAuthCredentialsProvider","Auth not yet detected"),i.resolve(),i=new On)}},0),o()}getToken(){const e=this.i,n=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(n).then(r=>this.i!==e?(W("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(le(typeof r.accessToken=="string",31837,{l:r}),new EE(r.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return le(e===null||typeof e=="string",2055,{h:e}),new st(e)}}class rR{constructor(e,n,r){this.P=e,this.T=n,this.I=r,this.type="FirstParty",this.user=st.FIRST_PARTY,this.R=new Map}A(){return this.I?this.I():null}get headers(){this.R.set("X-Goog-AuthUser",this.P);const e=this.A();return e&&this.R.set("Authorization",e),this.T&&this.R.set("X-Goog-Iam-Authorization-Token",this.T),this.R}}class sR{constructor(e,n,r){this.P=e,this.T=n,this.I=r}getToken(){return Promise.resolve(new rR(this.P,this.T,this.I))}start(e,n){e.enqueueRetryable(()=>n(st.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class Gy{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class iR{constructor(e,n){this.V=n,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,Ct(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,n){le(this.o===void 0,3512);const r=i=>{i.error!=null&&W("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${i.error.message}`);const o=i.token!==this.m;return this.m=i.token,W("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?n(i.token):Promise.resolve()};this.o=i=>{e.enqueueRetryable(()=>r(i))};const s=i=>{W("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=i,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit(i=>s(i)),setTimeout(()=>{if(!this.appCheck){const i=this.V.getImmediate({optional:!0});i?s(i):W("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.p)return Promise.resolve(new Gy(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(n=>n?(le(typeof n.token=="string",44558,{tokenResult:n}),this.m=n.token,new Gy(n.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function oR(t){const e=typeof self<"u"&&(self.crypto||self.msCrypto),n=new Uint8Array(t);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(n);else for(let r=0;r<t;r++)n[r]=Math.floor(256*Math.random());return n}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rc{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",n=62*Math.floor(4.129032258064516);let r="";for(;r.length<20;){const s=oR(40);for(let i=0;i<s.length;++i)r.length<20&&s[i]<n&&(r+=e.charAt(s[i]%62))}return r}}function ee(t,e){return t<e?-1:t>e?1:0}function qd(t,e){const n=Math.min(t.length,e.length);for(let r=0;r<n;r++){const s=t.charAt(r),i=e.charAt(r);if(s!==i)return bh(s)===bh(i)?ee(s,i):bh(s)?1:-1}return ee(t.length,e.length)}const aR=55296,lR=57343;function bh(t){const e=t.charCodeAt(0);return e>=aR&&e<=lR}function vi(t,e,n){return t.length===e.length&&t.every((r,s)=>n(r,e[s]))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Qy="__name__";class dn{constructor(e,n,r){n===void 0?n=0:n>e.length&&G(637,{offset:n,range:e.length}),r===void 0?r=e.length-n:r>e.length-n&&G(1746,{length:r,range:e.length-n}),this.segments=e,this.offset=n,this.len=r}get length(){return this.len}isEqual(e){return dn.comparator(this,e)===0}child(e){const n=this.segments.slice(this.offset,this.limit());return e instanceof dn?e.forEach(r=>{n.push(r)}):n.push(e),this.construct(n)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let n=0;n<this.length;n++)if(this.get(n)!==e.get(n))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let n=0;n<this.length;n++)if(this.get(n)!==e.get(n))return!1;return!0}forEach(e){for(let n=this.offset,r=this.limit();n<r;n++)e(this.segments[n])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,n){const r=Math.min(e.length,n.length);for(let s=0;s<r;s++){const i=dn.compareSegments(e.get(s),n.get(s));if(i!==0)return i}return ee(e.length,n.length)}static compareSegments(e,n){const r=dn.isNumericId(e),s=dn.isNumericId(n);return r&&!s?-1:!r&&s?1:r&&s?dn.extractNumericId(e).compare(dn.extractNumericId(n)):qd(e,n)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return Sr.fromString(e.substring(4,e.length-2))}}class he extends dn{construct(e,n,r){return new he(e,n,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const n=[];for(const r of e){if(r.indexOf("//")>=0)throw new B(M.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);n.push(...r.split("/").filter(s=>s.length>0))}return new he(n)}static emptyPath(){return new he([])}}const uR=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class He extends dn{construct(e,n,r){return new He(e,n,r)}static isValidIdentifier(e){return uR.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),He.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===Qy}static keyField(){return new He([Qy])}static fromServerFormat(e){const n=[];let r="",s=0;const i=()=>{if(r.length===0)throw new B(M.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);n.push(r),r=""};let o=!1;for(;s<e.length;){const l=e[s];if(l==="\\"){if(s+1===e.length)throw new B(M.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const u=e[s+1];if(u!=="\\"&&u!=="."&&u!=="`")throw new B(M.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=u,s+=2}else l==="`"?(o=!o,s++):l!=="."||o?(r+=l,s++):(i(),s++)}if(i(),o)throw new B(M.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new He(n)}static emptyPath(){return new He([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class q{constructor(e){this.path=e}static fromPath(e){return new q(he.fromString(e))}static fromName(e){return new q(he.fromString(e).popFirst(5))}static empty(){return new q(he.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&he.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,n){return he.comparator(e.path,n.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new q(new he(e.slice()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function IE(t,e,n){if(!n)throw new B(M.INVALID_ARGUMENT,`Function ${t}() cannot be called with an empty ${e}.`)}function xE(t,e,n,r){if(e===!0&&r===!0)throw new B(M.INVALID_ARGUMENT,`${t} and ${n} cannot be used together.`)}function Yy(t){if(!q.isDocumentKey(t))throw new B(M.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${t} has ${t.length}.`)}function Xy(t){if(q.isDocumentKey(t))throw new B(M.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${t} has ${t.length}.`)}function SE(t){return typeof t=="object"&&t!==null&&(Object.getPrototypeOf(t)===Object.prototype||Object.getPrototypeOf(t)===null)}function sc(t){if(t===void 0)return"undefined";if(t===null)return"null";if(typeof t=="string")return t.length>20&&(t=`${t.substring(0,20)}...`),JSON.stringify(t);if(typeof t=="number"||typeof t=="boolean")return""+t;if(typeof t=="object"){if(t instanceof Array)return"an array";{const e=function(r){return r.constructor?r.constructor.name:null}(t);return e?`a custom ${e} object`:"an object"}}return typeof t=="function"?"a function":G(12329,{type:typeof t})}function at(t,e){if("_delegate"in t&&(t=t._delegate),!(t instanceof e)){if(e.name===t.constructor.name)throw new B(M.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const n=sc(t);throw new B(M.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${n}`)}}return t}/**
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
 */function Me(t,e){const n={typeString:t};return e&&(n.value=e),n}function Sa(t,e){if(!SE(t))throw new B(M.INVALID_ARGUMENT,"JSON must be an object");let n;for(const r in e)if(e[r]){const s=e[r].typeString,i="value"in e[r]?{value:e[r].value}:void 0;if(!(r in t)){n=`JSON missing required field: '${r}'`;break}const o=t[r];if(s&&typeof o!==s){n=`JSON field '${r}' must be a ${s}.`;break}if(i!==void 0&&o!==i.value){n=`Expected '${r}' field to equal '${i.value}'`;break}}if(n)throw new B(M.INVALID_ARGUMENT,n);return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jy=-62135596800,Zy=1e6;class de{static now(){return de.fromMillis(Date.now())}static fromDate(e){return de.fromMillis(e.getTime())}static fromMillis(e){const n=Math.floor(e/1e3),r=Math.floor((e-1e3*n)*Zy);return new de(n,r)}constructor(e,n){if(this.seconds=e,this.nanoseconds=n,n<0)throw new B(M.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+n);if(n>=1e9)throw new B(M.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+n);if(e<Jy)throw new B(M.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new B(M.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/Zy}_compareTo(e){return this.seconds===e.seconds?ee(this.nanoseconds,e.nanoseconds):ee(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:de._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(Sa(e,de._jsonSchema))return new de(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-Jy;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}de._jsonSchemaVersion="firestore/timestamp/1.0",de._jsonSchema={type:Me("string",de._jsonSchemaVersion),seconds:Me("number"),nanoseconds:Me("number")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Y{static fromTimestamp(e){return new Y(e)}static min(){return new Y(new de(0,0))}static max(){return new Y(new de(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
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
 */const oa=-1;function cR(t,e){const n=t.toTimestamp().seconds,r=t.toTimestamp().nanoseconds+1,s=Y.fromTimestamp(r===1e9?new de(n+1,0):new de(n,r));return new Or(s,q.empty(),e)}function hR(t){return new Or(t.readTime,t.key,oa)}class Or{constructor(e,n,r){this.readTime=e,this.documentKey=n,this.largestBatchId=r}static min(){return new Or(Y.min(),q.empty(),oa)}static max(){return new Or(Y.max(),q.empty(),oa)}}function dR(t,e){let n=t.readTime.compareTo(e.readTime);return n!==0?n:(n=q.comparator(t.documentKey,e.documentKey),n!==0?n:ee(t.largestBatchId,e.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fR="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class pR{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Di(t){if(t.code!==M.FAILED_PRECONDITION||t.message!==fR)throw t;W("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class j{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(n=>{this.isDone=!0,this.result=n,this.nextCallback&&this.nextCallback(n)},n=>{this.isDone=!0,this.error=n,this.catchCallback&&this.catchCallback(n)})}catch(e){return this.next(void 0,e)}next(e,n){return this.callbackAttached&&G(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(n,this.error):this.wrapSuccess(e,this.result):new j((r,s)=>{this.nextCallback=i=>{this.wrapSuccess(e,i).next(r,s)},this.catchCallback=i=>{this.wrapFailure(n,i).next(r,s)}})}toPromise(){return new Promise((e,n)=>{this.next(e,n)})}wrapUserFunction(e){try{const n=e();return n instanceof j?n:j.resolve(n)}catch(n){return j.reject(n)}}wrapSuccess(e,n){return e?this.wrapUserFunction(()=>e(n)):j.resolve(n)}wrapFailure(e,n){return e?this.wrapUserFunction(()=>e(n)):j.reject(n)}static resolve(e){return new j((n,r)=>{n(e)})}static reject(e){return new j((n,r)=>{r(e)})}static waitFor(e){return new j((n,r)=>{let s=0,i=0,o=!1;e.forEach(l=>{++s,l.next(()=>{++i,o&&i===s&&n()},u=>r(u))}),o=!0,i===s&&n()})}static or(e){let n=j.resolve(!1);for(const r of e)n=n.next(s=>s?j.resolve(s):r());return n}static forEach(e,n){const r=[];return e.forEach((s,i)=>{r.push(n.call(this,s,i))}),this.waitFor(r)}static mapArray(e,n){return new j((r,s)=>{const i=e.length,o=new Array(i);let l=0;for(let u=0;u<i;u++){const c=u;n(e[c]).next(d=>{o[c]=d,++l,l===i&&r(o)},d=>s(d))}})}static doWhile(e,n){return new j((r,s)=>{const i=()=>{e()===!0?n().next(()=>{i()},s):r()};i()})}}function mR(t){const e=t.match(/Android ([\d.]+)/i),n=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(n)}function Oi(t){return t.name==="IndexedDbTransactionError"}/**
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
 */class ic{constructor(e,n){this.previousValue=e,n&&(n.sequenceNumberHandler=r=>this.ae(r),this.ue=r=>n.writeSequenceNumber(r))}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ue&&this.ue(e),e}}ic.ce=-1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gp=-1;function oc(t){return t==null}function vu(t){return t===0&&1/t==-1/0}function gR(t){return typeof t=="number"&&Number.isInteger(t)&&!vu(t)&&t<=Number.MAX_SAFE_INTEGER&&t>=Number.MIN_SAFE_INTEGER}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const AE="";function yR(t){let e="";for(let n=0;n<t.length;n++)e.length>0&&(e=e_(e)),e=_R(t.get(n),e);return e_(e)}function _R(t,e){let n=e;const r=t.length;for(let s=0;s<r;s++){const i=t.charAt(s);switch(i){case"\0":n+="";break;case AE:n+="";break;default:n+=i}}return n}function e_(t){return t+AE+""}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function t_(t){let e=0;for(const n in t)Object.prototype.hasOwnProperty.call(t,n)&&e++;return e}function Hr(t,e){for(const n in t)Object.prototype.hasOwnProperty.call(t,n)&&e(n,t[n])}function CE(t){for(const e in t)if(Object.prototype.hasOwnProperty.call(t,e))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class we{constructor(e,n){this.comparator=e,this.root=n||Ye.EMPTY}insert(e,n){return new we(this.comparator,this.root.insert(e,n,this.comparator).copy(null,null,Ye.BLACK,null,null))}remove(e){return new we(this.comparator,this.root.remove(e,this.comparator).copy(null,null,Ye.BLACK,null,null))}get(e){let n=this.root;for(;!n.isEmpty();){const r=this.comparator(e,n.key);if(r===0)return n.value;r<0?n=n.left:r>0&&(n=n.right)}return null}indexOf(e){let n=0,r=this.root;for(;!r.isEmpty();){const s=this.comparator(e,r.key);if(s===0)return n+r.left.size;s<0?r=r.left:(n+=r.left.size+1,r=r.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((n,r)=>(e(n,r),!1))}toString(){const e=[];return this.inorderTraversal((n,r)=>(e.push(`${n}:${r}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new pl(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new pl(this.root,e,this.comparator,!1)}getReverseIterator(){return new pl(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new pl(this.root,e,this.comparator,!0)}}class pl{constructor(e,n,r,s){this.isReverse=s,this.nodeStack=[];let i=1;for(;!e.isEmpty();)if(i=n?r(e.key,n):1,n&&s&&(i*=-1),i<0)e=this.isReverse?e.left:e.right;else{if(i===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const n={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return n}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class Ye{constructor(e,n,r,s,i){this.key=e,this.value=n,this.color=r??Ye.RED,this.left=s??Ye.EMPTY,this.right=i??Ye.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,n,r,s,i){return new Ye(e??this.key,n??this.value,r??this.color,s??this.left,i??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,n,r){let s=this;const i=r(e,s.key);return s=i<0?s.copy(null,null,null,s.left.insert(e,n,r),null):i===0?s.copy(null,n,null,null,null):s.copy(null,null,null,null,s.right.insert(e,n,r)),s.fixUp()}removeMin(){if(this.left.isEmpty())return Ye.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,n){let r,s=this;if(n(e,s.key)<0)s.left.isEmpty()||s.left.isRed()||s.left.left.isRed()||(s=s.moveRedLeft()),s=s.copy(null,null,null,s.left.remove(e,n),null);else{if(s.left.isRed()&&(s=s.rotateRight()),s.right.isEmpty()||s.right.isRed()||s.right.left.isRed()||(s=s.moveRedRight()),n(e,s.key)===0){if(s.right.isEmpty())return Ye.EMPTY;r=s.right.min(),s=s.copy(r.key,r.value,null,null,s.right.removeMin())}s=s.copy(null,null,null,null,s.right.remove(e,n))}return s.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,Ye.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,Ye.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),n=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,n)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw G(43730,{key:this.key,value:this.value});if(this.right.isRed())throw G(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw G(27949);return e+(this.isRed()?0:1)}}Ye.EMPTY=null,Ye.RED=!0,Ye.BLACK=!1;Ye.EMPTY=new class{constructor(){this.size=0}get key(){throw G(57766)}get value(){throw G(16141)}get color(){throw G(16727)}get left(){throw G(29726)}get right(){throw G(36894)}copy(e,n,r,s,i){return this}insert(e,n,r){return new Ye(e,n)}remove(e,n){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ze{constructor(e){this.comparator=e,this.data=new we(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((n,r)=>(e(n),!1))}forEachInRange(e,n){const r=this.data.getIteratorFrom(e[0]);for(;r.hasNext();){const s=r.getNext();if(this.comparator(s.key,e[1])>=0)return;n(s.key)}}forEachWhile(e,n){let r;for(r=n!==void 0?this.data.getIteratorFrom(n):this.data.getIterator();r.hasNext();)if(!e(r.getNext().key))return}firstAfterOrEqual(e){const n=this.data.getIteratorFrom(e);return n.hasNext()?n.getNext().key:null}getIterator(){return new n_(this.data.getIterator())}getIteratorFrom(e){return new n_(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let n=this;return n.size<e.size&&(n=e,e=this),e.forEach(r=>{n=n.add(r)}),n}isEqual(e){if(!(e instanceof ze)||this.size!==e.size)return!1;const n=this.data.getIterator(),r=e.data.getIterator();for(;n.hasNext();){const s=n.getNext().key,i=r.getNext().key;if(this.comparator(s,i)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(n=>{e.push(n)}),e}toString(){const e=[];return this.forEach(n=>e.push(n)),"SortedSet("+e.toString()+")"}copy(e){const n=new ze(this.comparator);return n.data=e,n}}class n_{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pt{constructor(e){this.fields=e,e.sort(He.comparator)}static empty(){return new Pt([])}unionWith(e){let n=new ze(He.comparator);for(const r of this.fields)n=n.add(r);for(const r of e)n=n.add(r);return new Pt(n.toArray())}covers(e){for(const n of this.fields)if(n.isPrefixOf(e))return!0;return!1}isEqual(e){return vi(this.fields,e.fields,(n,r)=>n.isEqual(r))}}/**
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
 */class kE extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ge{constructor(e){this.binaryString=e}static fromBase64String(e){const n=function(s){try{return atob(s)}catch(i){throw typeof DOMException<"u"&&i instanceof DOMException?new kE("Invalid base64 string: "+i):i}}(e);return new Ge(n)}static fromUint8Array(e){const n=function(s){let i="";for(let o=0;o<s.length;++o)i+=String.fromCharCode(s[o]);return i}(e);return new Ge(n)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(n){return btoa(n)}(this.binaryString)}toUint8Array(){return function(n){const r=new Uint8Array(n.length);for(let s=0;s<n.length;s++)r[s]=n.charCodeAt(s);return r}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return ee(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}Ge.EMPTY_BYTE_STRING=new Ge("");const vR=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Vr(t){if(le(!!t,39018),typeof t=="string"){let e=0;const n=vR.exec(t);if(le(!!n,46558,{timestamp:t}),n[1]){let s=n[1];s=(s+"000000000").substr(0,9),e=Number(s)}const r=new Date(t);return{seconds:Math.floor(r.getTime()/1e3),nanos:e}}return{seconds:Ne(t.seconds),nanos:Ne(t.nanos)}}function Ne(t){return typeof t=="number"?t:typeof t=="string"?Number(t):0}function Lr(t){return typeof t=="string"?Ge.fromBase64String(t):Ge.fromUint8Array(t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const RE="server_timestamp",PE="__type__",NE="__previous_value__",bE="__local_write_time__";function yp(t){var n,r;return((r=(((n=t==null?void 0:t.mapValue)==null?void 0:n.fields)||{})[PE])==null?void 0:r.stringValue)===RE}function ac(t){const e=t.mapValue.fields[NE];return yp(e)?ac(e):e}function aa(t){const e=Vr(t.mapValue.fields[bE].timestampValue);return new de(e.seconds,e.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wR{constructor(e,n,r,s,i,o,l,u,c,d,m){this.databaseId=e,this.appId=n,this.persistenceKey=r,this.host=s,this.ssl=i,this.forceLongPolling=o,this.autoDetectLongPolling=l,this.longPollingOptions=u,this.useFetchStreams=c,this.isUsingEmulator=d,this.apiKey=m}}const wu="(default)";class wi{constructor(e,n){this.projectId=e,this.database=n||wu}static empty(){return new wi("","")}get isDefaultDatabase(){return this.database===wu}isEqual(e){return e instanceof wi&&e.projectId===this.projectId&&e.database===this.database}}function ER(t,e){if(!Object.prototype.hasOwnProperty.apply(t.options,["projectId"]))throw new B(M.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new wi(t.options.projectId,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const DE="__type__",TR="__max__",ml={mapValue:{}},OE="__vector__",Eu="value";function Mr(t){return"nullValue"in t?0:"booleanValue"in t?1:"integerValue"in t||"doubleValue"in t?2:"timestampValue"in t?3:"stringValue"in t?5:"bytesValue"in t?6:"referenceValue"in t?7:"geoPointValue"in t?8:"arrayValue"in t?9:"mapValue"in t?yp(t)?4:xR(t)?9007199254740991:IR(t)?10:11:G(28295,{value:t})}function En(t,e){if(t===e)return!0;const n=Mr(t);if(n!==Mr(e))return!1;switch(n){case 0:case 9007199254740991:return!0;case 1:return t.booleanValue===e.booleanValue;case 4:return aa(t).isEqual(aa(e));case 3:return function(s,i){if(typeof s.timestampValue=="string"&&typeof i.timestampValue=="string"&&s.timestampValue.length===i.timestampValue.length)return s.timestampValue===i.timestampValue;const o=Vr(s.timestampValue),l=Vr(i.timestampValue);return o.seconds===l.seconds&&o.nanos===l.nanos}(t,e);case 5:return t.stringValue===e.stringValue;case 6:return function(s,i){return Lr(s.bytesValue).isEqual(Lr(i.bytesValue))}(t,e);case 7:return t.referenceValue===e.referenceValue;case 8:return function(s,i){return Ne(s.geoPointValue.latitude)===Ne(i.geoPointValue.latitude)&&Ne(s.geoPointValue.longitude)===Ne(i.geoPointValue.longitude)}(t,e);case 2:return function(s,i){if("integerValue"in s&&"integerValue"in i)return Ne(s.integerValue)===Ne(i.integerValue);if("doubleValue"in s&&"doubleValue"in i){const o=Ne(s.doubleValue),l=Ne(i.doubleValue);return o===l?vu(o)===vu(l):isNaN(o)&&isNaN(l)}return!1}(t,e);case 9:return vi(t.arrayValue.values||[],e.arrayValue.values||[],En);case 10:case 11:return function(s,i){const o=s.mapValue.fields||{},l=i.mapValue.fields||{};if(t_(o)!==t_(l))return!1;for(const u in o)if(o.hasOwnProperty(u)&&(l[u]===void 0||!En(o[u],l[u])))return!1;return!0}(t,e);default:return G(52216,{left:t})}}function la(t,e){return(t.values||[]).find(n=>En(n,e))!==void 0}function Ei(t,e){if(t===e)return 0;const n=Mr(t),r=Mr(e);if(n!==r)return ee(n,r);switch(n){case 0:case 9007199254740991:return 0;case 1:return ee(t.booleanValue,e.booleanValue);case 2:return function(i,o){const l=Ne(i.integerValue||i.doubleValue),u=Ne(o.integerValue||o.doubleValue);return l<u?-1:l>u?1:l===u?0:isNaN(l)?isNaN(u)?0:-1:1}(t,e);case 3:return r_(t.timestampValue,e.timestampValue);case 4:return r_(aa(t),aa(e));case 5:return qd(t.stringValue,e.stringValue);case 6:return function(i,o){const l=Lr(i),u=Lr(o);return l.compareTo(u)}(t.bytesValue,e.bytesValue);case 7:return function(i,o){const l=i.split("/"),u=o.split("/");for(let c=0;c<l.length&&c<u.length;c++){const d=ee(l[c],u[c]);if(d!==0)return d}return ee(l.length,u.length)}(t.referenceValue,e.referenceValue);case 8:return function(i,o){const l=ee(Ne(i.latitude),Ne(o.latitude));return l!==0?l:ee(Ne(i.longitude),Ne(o.longitude))}(t.geoPointValue,e.geoPointValue);case 9:return s_(t.arrayValue,e.arrayValue);case 10:return function(i,o){var g,w,A,P;const l=i.fields||{},u=o.fields||{},c=(g=l[Eu])==null?void 0:g.arrayValue,d=(w=u[Eu])==null?void 0:w.arrayValue,m=ee(((A=c==null?void 0:c.values)==null?void 0:A.length)||0,((P=d==null?void 0:d.values)==null?void 0:P.length)||0);return m!==0?m:s_(c,d)}(t.mapValue,e.mapValue);case 11:return function(i,o){if(i===ml.mapValue&&o===ml.mapValue)return 0;if(i===ml.mapValue)return 1;if(o===ml.mapValue)return-1;const l=i.fields||{},u=Object.keys(l),c=o.fields||{},d=Object.keys(c);u.sort(),d.sort();for(let m=0;m<u.length&&m<d.length;++m){const g=qd(u[m],d[m]);if(g!==0)return g;const w=Ei(l[u[m]],c[d[m]]);if(w!==0)return w}return ee(u.length,d.length)}(t.mapValue,e.mapValue);default:throw G(23264,{he:n})}}function r_(t,e){if(typeof t=="string"&&typeof e=="string"&&t.length===e.length)return ee(t,e);const n=Vr(t),r=Vr(e),s=ee(n.seconds,r.seconds);return s!==0?s:ee(n.nanos,r.nanos)}function s_(t,e){const n=t.values||[],r=e.values||[];for(let s=0;s<n.length&&s<r.length;++s){const i=Ei(n[s],r[s]);if(i)return i}return ee(n.length,r.length)}function Ti(t){return Kd(t)}function Kd(t){return"nullValue"in t?"null":"booleanValue"in t?""+t.booleanValue:"integerValue"in t?""+t.integerValue:"doubleValue"in t?""+t.doubleValue:"timestampValue"in t?function(n){const r=Vr(n);return`time(${r.seconds},${r.nanos})`}(t.timestampValue):"stringValue"in t?t.stringValue:"bytesValue"in t?function(n){return Lr(n).toBase64()}(t.bytesValue):"referenceValue"in t?function(n){return q.fromName(n).toString()}(t.referenceValue):"geoPointValue"in t?function(n){return`geo(${n.latitude},${n.longitude})`}(t.geoPointValue):"arrayValue"in t?function(n){let r="[",s=!0;for(const i of n.values||[])s?s=!1:r+=",",r+=Kd(i);return r+"]"}(t.arrayValue):"mapValue"in t?function(n){const r=Object.keys(n.fields||{}).sort();let s="{",i=!0;for(const o of r)i?i=!1:s+=",",s+=`${o}:${Kd(n.fields[o])}`;return s+"}"}(t.mapValue):G(61005,{value:t})}function Ll(t){switch(Mr(t)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=ac(t);return e?16+Ll(e):16;case 5:return 2*t.stringValue.length;case 6:return Lr(t.bytesValue).approximateByteSize();case 7:return t.referenceValue.length;case 9:return function(r){return(r.values||[]).reduce((s,i)=>s+Ll(i),0)}(t.arrayValue);case 10:case 11:return function(r){let s=0;return Hr(r.fields,(i,o)=>{s+=i.length+Ll(o)}),s}(t.mapValue);default:throw G(13486,{value:t})}}function i_(t,e){return{referenceValue:`projects/${t.projectId}/databases/${t.database}/documents/${e.path.canonicalString()}`}}function Gd(t){return!!t&&"integerValue"in t}function _p(t){return!!t&&"arrayValue"in t}function o_(t){return!!t&&"nullValue"in t}function a_(t){return!!t&&"doubleValue"in t&&isNaN(Number(t.doubleValue))}function Ml(t){return!!t&&"mapValue"in t}function IR(t){var n,r;return((r=(((n=t==null?void 0:t.mapValue)==null?void 0:n.fields)||{})[DE])==null?void 0:r.stringValue)===OE}function bo(t){if(t.geoPointValue)return{geoPointValue:{...t.geoPointValue}};if(t.timestampValue&&typeof t.timestampValue=="object")return{timestampValue:{...t.timestampValue}};if(t.mapValue){const e={mapValue:{fields:{}}};return Hr(t.mapValue.fields,(n,r)=>e.mapValue.fields[n]=bo(r)),e}if(t.arrayValue){const e={arrayValue:{values:[]}};for(let n=0;n<(t.arrayValue.values||[]).length;++n)e.arrayValue.values[n]=bo(t.arrayValue.values[n]);return e}return{...t}}function xR(t){return(((t.mapValue||{}).fields||{}).__type__||{}).stringValue===TR}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wt{constructor(e){this.value=e}static empty(){return new wt({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let n=this.value;for(let r=0;r<e.length-1;++r)if(n=(n.mapValue.fields||{})[e.get(r)],!Ml(n))return null;return n=(n.mapValue.fields||{})[e.lastSegment()],n||null}}set(e,n){this.getFieldsMap(e.popLast())[e.lastSegment()]=bo(n)}setAll(e){let n=He.emptyPath(),r={},s=[];e.forEach((o,l)=>{if(!n.isImmediateParentOf(l)){const u=this.getFieldsMap(n);this.applyChanges(u,r,s),r={},s=[],n=l.popLast()}o?r[l.lastSegment()]=bo(o):s.push(l.lastSegment())});const i=this.getFieldsMap(n);this.applyChanges(i,r,s)}delete(e){const n=this.field(e.popLast());Ml(n)&&n.mapValue.fields&&delete n.mapValue.fields[e.lastSegment()]}isEqual(e){return En(this.value,e.value)}getFieldsMap(e){let n=this.value;n.mapValue.fields||(n.mapValue={fields:{}});for(let r=0;r<e.length;++r){let s=n.mapValue.fields[e.get(r)];Ml(s)&&s.mapValue.fields||(s={mapValue:{fields:{}}},n.mapValue.fields[e.get(r)]=s),n=s}return n.mapValue.fields}applyChanges(e,n,r){Hr(n,(s,i)=>e[s]=i);for(const s of r)delete e[s]}clone(){return new wt(bo(this.value))}}function VE(t){const e=[];return Hr(t.fields,(n,r)=>{const s=new He([n]);if(Ml(r)){const i=VE(r.mapValue).fields;if(i.length===0)e.push(s);else for(const o of i)e.push(s.child(o))}else e.push(s)}),new Pt(e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ot{constructor(e,n,r,s,i,o,l){this.key=e,this.documentType=n,this.version=r,this.readTime=s,this.createTime=i,this.data=o,this.documentState=l}static newInvalidDocument(e){return new ot(e,0,Y.min(),Y.min(),Y.min(),wt.empty(),0)}static newFoundDocument(e,n,r,s){return new ot(e,1,n,Y.min(),r,s,0)}static newNoDocument(e,n){return new ot(e,2,n,Y.min(),Y.min(),wt.empty(),0)}static newUnknownDocument(e,n){return new ot(e,3,n,Y.min(),Y.min(),wt.empty(),2)}convertToFoundDocument(e,n){return!this.createTime.isEqual(Y.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=n,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=wt.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=wt.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=Y.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof ot&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new ot(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
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
 */class Tu{constructor(e,n){this.position=e,this.inclusive=n}}function l_(t,e,n){let r=0;for(let s=0;s<t.position.length;s++){const i=e[s],o=t.position[s];if(i.field.isKeyField()?r=q.comparator(q.fromName(o.referenceValue),n.key):r=Ei(o,n.data.field(i.field)),i.dir==="desc"&&(r*=-1),r!==0)break}return r}function u_(t,e){if(t===null)return e===null;if(e===null||t.inclusive!==e.inclusive||t.position.length!==e.position.length)return!1;for(let n=0;n<t.position.length;n++)if(!En(t.position[n],e.position[n]))return!1;return!0}/**
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
 */class ua{constructor(e,n="asc"){this.field=e,this.dir=n}}function SR(t,e){return t.dir===e.dir&&t.field.isEqual(e.field)}/**
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
 */class LE{}class Ve extends LE{constructor(e,n,r){super(),this.field=e,this.op=n,this.value=r}static create(e,n,r){return e.isKeyField()?n==="in"||n==="not-in"?this.createKeyFieldInFilter(e,n,r):new CR(e,n,r):n==="array-contains"?new PR(e,r):n==="in"?new NR(e,r):n==="not-in"?new bR(e,r):n==="array-contains-any"?new DR(e,r):new Ve(e,n,r)}static createKeyFieldInFilter(e,n,r){return n==="in"?new kR(e,r):new RR(e,r)}matches(e){const n=e.data.field(this.field);return this.op==="!="?n!==null&&n.nullValue===void 0&&this.matchesComparison(Ei(n,this.value)):n!==null&&Mr(this.value)===Mr(n)&&this.matchesComparison(Ei(n,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return G(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class sn extends LE{constructor(e,n){super(),this.filters=e,this.op=n,this.Pe=null}static create(e,n){return new sn(e,n)}matches(e){return ME(this)?this.filters.find(n=>!n.matches(e))===void 0:this.filters.find(n=>n.matches(e))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce((e,n)=>e.concat(n.getFlattenedFilters()),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function ME(t){return t.op==="and"}function jE(t){return AR(t)&&ME(t)}function AR(t){for(const e of t.filters)if(e instanceof sn)return!1;return!0}function Qd(t){if(t instanceof Ve)return t.field.canonicalString()+t.op.toString()+Ti(t.value);if(jE(t))return t.filters.map(e=>Qd(e)).join(",");{const e=t.filters.map(n=>Qd(n)).join(",");return`${t.op}(${e})`}}function UE(t,e){return t instanceof Ve?function(r,s){return s instanceof Ve&&r.op===s.op&&r.field.isEqual(s.field)&&En(r.value,s.value)}(t,e):t instanceof sn?function(r,s){return s instanceof sn&&r.op===s.op&&r.filters.length===s.filters.length?r.filters.reduce((i,o,l)=>i&&UE(o,s.filters[l]),!0):!1}(t,e):void G(19439)}function FE(t){return t instanceof Ve?function(n){return`${n.field.canonicalString()} ${n.op} ${Ti(n.value)}`}(t):t instanceof sn?function(n){return n.op.toString()+" {"+n.getFilters().map(FE).join(" ,")+"}"}(t):"Filter"}class CR extends Ve{constructor(e,n,r){super(e,n,r),this.key=q.fromName(r.referenceValue)}matches(e){const n=q.comparator(e.key,this.key);return this.matchesComparison(n)}}class kR extends Ve{constructor(e,n){super(e,"in",n),this.keys=zE("in",n)}matches(e){return this.keys.some(n=>n.isEqual(e.key))}}class RR extends Ve{constructor(e,n){super(e,"not-in",n),this.keys=zE("not-in",n)}matches(e){return!this.keys.some(n=>n.isEqual(e.key))}}function zE(t,e){var n;return(((n=e.arrayValue)==null?void 0:n.values)||[]).map(r=>q.fromName(r.referenceValue))}class PR extends Ve{constructor(e,n){super(e,"array-contains",n)}matches(e){const n=e.data.field(this.field);return _p(n)&&la(n.arrayValue,this.value)}}class NR extends Ve{constructor(e,n){super(e,"in",n)}matches(e){const n=e.data.field(this.field);return n!==null&&la(this.value.arrayValue,n)}}class bR extends Ve{constructor(e,n){super(e,"not-in",n)}matches(e){if(la(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const n=e.data.field(this.field);return n!==null&&n.nullValue===void 0&&!la(this.value.arrayValue,n)}}class DR extends Ve{constructor(e,n){super(e,"array-contains-any",n)}matches(e){const n=e.data.field(this.field);return!(!_p(n)||!n.arrayValue.values)&&n.arrayValue.values.some(r=>la(this.value.arrayValue,r))}}/**
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
 */class OR{constructor(e,n=null,r=[],s=[],i=null,o=null,l=null){this.path=e,this.collectionGroup=n,this.orderBy=r,this.filters=s,this.limit=i,this.startAt=o,this.endAt=l,this.Te=null}}function c_(t,e=null,n=[],r=[],s=null,i=null,o=null){return new OR(t,e,n,r,s,i,o)}function vp(t){const e=X(t);if(e.Te===null){let n=e.path.canonicalString();e.collectionGroup!==null&&(n+="|cg:"+e.collectionGroup),n+="|f:",n+=e.filters.map(r=>Qd(r)).join(","),n+="|ob:",n+=e.orderBy.map(r=>function(i){return i.field.canonicalString()+i.dir}(r)).join(","),oc(e.limit)||(n+="|l:",n+=e.limit),e.startAt&&(n+="|lb:",n+=e.startAt.inclusive?"b:":"a:",n+=e.startAt.position.map(r=>Ti(r)).join(",")),e.endAt&&(n+="|ub:",n+=e.endAt.inclusive?"a:":"b:",n+=e.endAt.position.map(r=>Ti(r)).join(",")),e.Te=n}return e.Te}function wp(t,e){if(t.limit!==e.limit||t.orderBy.length!==e.orderBy.length)return!1;for(let n=0;n<t.orderBy.length;n++)if(!SR(t.orderBy[n],e.orderBy[n]))return!1;if(t.filters.length!==e.filters.length)return!1;for(let n=0;n<t.filters.length;n++)if(!UE(t.filters[n],e.filters[n]))return!1;return t.collectionGroup===e.collectionGroup&&!!t.path.isEqual(e.path)&&!!u_(t.startAt,e.startAt)&&u_(t.endAt,e.endAt)}function Yd(t){return q.isDocumentKey(t.path)&&t.collectionGroup===null&&t.filters.length===0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vi{constructor(e,n=null,r=[],s=[],i=null,o="F",l=null,u=null){this.path=e,this.collectionGroup=n,this.explicitOrderBy=r,this.filters=s,this.limit=i,this.limitType=o,this.startAt=l,this.endAt=u,this.Ie=null,this.Ee=null,this.Re=null,this.startAt,this.endAt}}function VR(t,e,n,r,s,i,o,l){return new Vi(t,e,n,r,s,i,o,l)}function lc(t){return new Vi(t)}function h_(t){return t.filters.length===0&&t.limit===null&&t.startAt==null&&t.endAt==null&&(t.explicitOrderBy.length===0||t.explicitOrderBy.length===1&&t.explicitOrderBy[0].field.isKeyField())}function LR(t){return q.isDocumentKey(t.path)&&t.collectionGroup===null&&t.filters.length===0}function BE(t){return t.collectionGroup!==null}function Do(t){const e=X(t);if(e.Ie===null){e.Ie=[];const n=new Set;for(const i of e.explicitOrderBy)e.Ie.push(i),n.add(i.field.canonicalString());const r=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let l=new ze(He.comparator);return o.filters.forEach(u=>{u.getFlattenedFilters().forEach(c=>{c.isInequality()&&(l=l.add(c.field))})}),l})(e).forEach(i=>{n.has(i.canonicalString())||i.isKeyField()||e.Ie.push(new ua(i,r))}),n.has(He.keyField().canonicalString())||e.Ie.push(new ua(He.keyField(),r))}return e.Ie}function _n(t){const e=X(t);return e.Ee||(e.Ee=MR(e,Do(t))),e.Ee}function MR(t,e){if(t.limitType==="F")return c_(t.path,t.collectionGroup,e,t.filters,t.limit,t.startAt,t.endAt);{e=e.map(s=>{const i=s.dir==="desc"?"asc":"desc";return new ua(s.field,i)});const n=t.endAt?new Tu(t.endAt.position,t.endAt.inclusive):null,r=t.startAt?new Tu(t.startAt.position,t.startAt.inclusive):null;return c_(t.path,t.collectionGroup,e,t.filters,t.limit,n,r)}}function Xd(t,e){const n=t.filters.concat([e]);return new Vi(t.path,t.collectionGroup,t.explicitOrderBy.slice(),n,t.limit,t.limitType,t.startAt,t.endAt)}function jR(t,e){const n=t.explicitOrderBy.concat([e]);return new Vi(t.path,t.collectionGroup,n,t.filters.slice(),t.limit,t.limitType,t.startAt,t.endAt)}function Iu(t,e,n){return new Vi(t.path,t.collectionGroup,t.explicitOrderBy.slice(),t.filters.slice(),e,n,t.startAt,t.endAt)}function uc(t,e){return wp(_n(t),_n(e))&&t.limitType===e.limitType}function $E(t){return`${vp(_n(t))}|lt:${t.limitType}`}function js(t){return`Query(target=${function(n){let r=n.path.canonicalString();return n.collectionGroup!==null&&(r+=" collectionGroup="+n.collectionGroup),n.filters.length>0&&(r+=`, filters: [${n.filters.map(s=>FE(s)).join(", ")}]`),oc(n.limit)||(r+=", limit: "+n.limit),n.orderBy.length>0&&(r+=`, orderBy: [${n.orderBy.map(s=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(s)).join(", ")}]`),n.startAt&&(r+=", startAt: ",r+=n.startAt.inclusive?"b:":"a:",r+=n.startAt.position.map(s=>Ti(s)).join(",")),n.endAt&&(r+=", endAt: ",r+=n.endAt.inclusive?"a:":"b:",r+=n.endAt.position.map(s=>Ti(s)).join(",")),`Target(${r})`}(_n(t))}; limitType=${t.limitType})`}function cc(t,e){return e.isFoundDocument()&&function(r,s){const i=s.key.path;return r.collectionGroup!==null?s.key.hasCollectionId(r.collectionGroup)&&r.path.isPrefixOf(i):q.isDocumentKey(r.path)?r.path.isEqual(i):r.path.isImmediateParentOf(i)}(t,e)&&function(r,s){for(const i of Do(r))if(!i.field.isKeyField()&&s.data.field(i.field)===null)return!1;return!0}(t,e)&&function(r,s){for(const i of r.filters)if(!i.matches(s))return!1;return!0}(t,e)&&function(r,s){return!(r.startAt&&!function(o,l,u){const c=l_(o,l,u);return o.inclusive?c<=0:c<0}(r.startAt,Do(r),s)||r.endAt&&!function(o,l,u){const c=l_(o,l,u);return o.inclusive?c>=0:c>0}(r.endAt,Do(r),s))}(t,e)}function UR(t){return t.collectionGroup||(t.path.length%2==1?t.path.lastSegment():t.path.get(t.path.length-2))}function WE(t){return(e,n)=>{let r=!1;for(const s of Do(t)){const i=FR(s,e,n);if(i!==0)return i;r=r||s.field.isKeyField()}return 0}}function FR(t,e,n){const r=t.field.isKeyField()?q.comparator(e.key,n.key):function(i,o,l){const u=o.data.field(i),c=l.data.field(i);return u!==null&&c!==null?Ei(u,c):G(42886)}(t.field,e,n);switch(t.dir){case"asc":return r;case"desc":return-1*r;default:return G(19790,{direction:t.dir})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ks{constructor(e,n){this.mapKeyFn=e,this.equalsFn=n,this.inner={},this.innerSize=0}get(e){const n=this.mapKeyFn(e),r=this.inner[n];if(r!==void 0){for(const[s,i]of r)if(this.equalsFn(s,e))return i}}has(e){return this.get(e)!==void 0}set(e,n){const r=this.mapKeyFn(e),s=this.inner[r];if(s===void 0)return this.inner[r]=[[e,n]],void this.innerSize++;for(let i=0;i<s.length;i++)if(this.equalsFn(s[i][0],e))return void(s[i]=[e,n]);s.push([e,n]),this.innerSize++}delete(e){const n=this.mapKeyFn(e),r=this.inner[n];if(r===void 0)return!1;for(let s=0;s<r.length;s++)if(this.equalsFn(r[s][0],e))return r.length===1?delete this.inner[n]:r.splice(s,1),this.innerSize--,!0;return!1}forEach(e){Hr(this.inner,(n,r)=>{for(const[s,i]of r)e(s,i)})}isEmpty(){return CE(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zR=new we(q.comparator);function $n(){return zR}const HE=new we(q.comparator);function Eo(...t){let e=HE;for(const n of t)e=e.insert(n.key,n);return e}function qE(t){let e=HE;return t.forEach((n,r)=>e=e.insert(n,r.overlayedDocument)),e}function as(){return Oo()}function KE(){return Oo()}function Oo(){return new ks(t=>t.toString(),(t,e)=>t.isEqual(e))}const BR=new we(q.comparator),$R=new ze(q.comparator);function te(...t){let e=$R;for(const n of t)e=e.add(n);return e}const WR=new ze(ee);function HR(){return WR}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ep(t,e){if(t.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:vu(e)?"-0":e}}function GE(t){return{integerValue:""+t}}function QE(t,e){return gR(e)?GE(e):Ep(t,e)}/**
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
 */class hc{constructor(){this._=void 0}}function qR(t,e,n){return t instanceof ca?function(s,i){const o={fields:{[PE]:{stringValue:RE},[bE]:{timestampValue:{seconds:s.seconds,nanos:s.nanoseconds}}}};return i&&yp(i)&&(i=ac(i)),i&&(o.fields[NE]=i),{mapValue:o}}(n,e):t instanceof Ii?XE(t,e):t instanceof ha?JE(t,e):function(s,i){const o=YE(s,i),l=d_(o)+d_(s.Ae);return Gd(o)&&Gd(s.Ae)?GE(l):Ep(s.serializer,l)}(t,e)}function KR(t,e,n){return t instanceof Ii?XE(t,e):t instanceof ha?JE(t,e):n}function YE(t,e){return t instanceof da?function(r){return Gd(r)||function(i){return!!i&&"doubleValue"in i}(r)}(e)?e:{integerValue:0}:null}class ca extends hc{}class Ii extends hc{constructor(e){super(),this.elements=e}}function XE(t,e){const n=ZE(e);for(const r of t.elements)n.some(s=>En(s,r))||n.push(r);return{arrayValue:{values:n}}}class ha extends hc{constructor(e){super(),this.elements=e}}function JE(t,e){let n=ZE(e);for(const r of t.elements)n=n.filter(s=>!En(s,r));return{arrayValue:{values:n}}}class da extends hc{constructor(e,n){super(),this.serializer=e,this.Ae=n}}function d_(t){return Ne(t.integerValue||t.doubleValue)}function ZE(t){return _p(t)&&t.arrayValue.values?t.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tp{constructor(e,n){this.field=e,this.transform=n}}function GR(t,e){return t.field.isEqual(e.field)&&function(r,s){return r instanceof Ii&&s instanceof Ii||r instanceof ha&&s instanceof ha?vi(r.elements,s.elements,En):r instanceof da&&s instanceof da?En(r.Ae,s.Ae):r instanceof ca&&s instanceof ca}(t.transform,e.transform)}class QR{constructor(e,n){this.version=e,this.transformResults=n}}class mt{constructor(e,n){this.updateTime=e,this.exists=n}static none(){return new mt}static exists(e){return new mt(void 0,e)}static updateTime(e){return new mt(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function jl(t,e){return t.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(t.updateTime):t.exists===void 0||t.exists===e.isFoundDocument()}class dc{}function eT(t,e){if(!t.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return t.isNoDocument()?new fc(t.key,mt.none()):new Aa(t.key,t.data,mt.none());{const n=t.data,r=wt.empty();let s=new ze(He.comparator);for(let i of e.fields)if(!s.has(i)){let o=n.field(i);o===null&&i.length>1&&(i=i.popLast(),o=n.field(i)),o===null?r.delete(i):r.set(i,o),s=s.add(i)}return new qr(t.key,r,new Pt(s.toArray()),mt.none())}}function YR(t,e,n){t instanceof Aa?function(s,i,o){const l=s.value.clone(),u=p_(s.fieldTransforms,i,o.transformResults);l.setAll(u),i.convertToFoundDocument(o.version,l).setHasCommittedMutations()}(t,e,n):t instanceof qr?function(s,i,o){if(!jl(s.precondition,i))return void i.convertToUnknownDocument(o.version);const l=p_(s.fieldTransforms,i,o.transformResults),u=i.data;u.setAll(tT(s)),u.setAll(l),i.convertToFoundDocument(o.version,u).setHasCommittedMutations()}(t,e,n):function(s,i,o){i.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,n)}function Vo(t,e,n,r){return t instanceof Aa?function(i,o,l,u){if(!jl(i.precondition,o))return l;const c=i.value.clone(),d=m_(i.fieldTransforms,u,o);return c.setAll(d),o.convertToFoundDocument(o.version,c).setHasLocalMutations(),null}(t,e,n,r):t instanceof qr?function(i,o,l,u){if(!jl(i.precondition,o))return l;const c=m_(i.fieldTransforms,u,o),d=o.data;return d.setAll(tT(i)),d.setAll(c),o.convertToFoundDocument(o.version,d).setHasLocalMutations(),l===null?null:l.unionWith(i.fieldMask.fields).unionWith(i.fieldTransforms.map(m=>m.field))}(t,e,n,r):function(i,o,l){return jl(i.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):l}(t,e,n)}function XR(t,e){let n=null;for(const r of t.fieldTransforms){const s=e.data.field(r.field),i=YE(r.transform,s||null);i!=null&&(n===null&&(n=wt.empty()),n.set(r.field,i))}return n||null}function f_(t,e){return t.type===e.type&&!!t.key.isEqual(e.key)&&!!t.precondition.isEqual(e.precondition)&&!!function(r,s){return r===void 0&&s===void 0||!(!r||!s)&&vi(r,s,(i,o)=>GR(i,o))}(t.fieldTransforms,e.fieldTransforms)&&(t.type===0?t.value.isEqual(e.value):t.type!==1||t.data.isEqual(e.data)&&t.fieldMask.isEqual(e.fieldMask))}class Aa extends dc{constructor(e,n,r,s=[]){super(),this.key=e,this.value=n,this.precondition=r,this.fieldTransforms=s,this.type=0}getFieldMask(){return null}}class qr extends dc{constructor(e,n,r,s,i=[]){super(),this.key=e,this.data=n,this.fieldMask=r,this.precondition=s,this.fieldTransforms=i,this.type=1}getFieldMask(){return this.fieldMask}}function tT(t){const e=new Map;return t.fieldMask.fields.forEach(n=>{if(!n.isEmpty()){const r=t.data.field(n);e.set(n,r)}}),e}function p_(t,e,n){const r=new Map;le(t.length===n.length,32656,{Ve:n.length,de:t.length});for(let s=0;s<n.length;s++){const i=t[s],o=i.transform,l=e.data.field(i.field);r.set(i.field,KR(o,l,n[s]))}return r}function m_(t,e,n){const r=new Map;for(const s of t){const i=s.transform,o=n.data.field(s.field);r.set(s.field,qR(i,o,e))}return r}class fc extends dc{constructor(e,n){super(),this.key=e,this.precondition=n,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class JR extends dc{constructor(e,n){super(),this.key=e,this.precondition=n,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ZR{constructor(e,n,r,s){this.batchId=e,this.localWriteTime=n,this.baseMutations=r,this.mutations=s}applyToRemoteDocument(e,n){const r=n.mutationResults;for(let s=0;s<this.mutations.length;s++){const i=this.mutations[s];i.key.isEqual(e.key)&&YR(i,e,r[s])}}applyToLocalView(e,n){for(const r of this.baseMutations)r.key.isEqual(e.key)&&(n=Vo(r,e,n,this.localWriteTime));for(const r of this.mutations)r.key.isEqual(e.key)&&(n=Vo(r,e,n,this.localWriteTime));return n}applyToLocalDocumentSet(e,n){const r=KE();return this.mutations.forEach(s=>{const i=e.get(s.key),o=i.overlayedDocument;let l=this.applyToLocalView(o,i.mutatedFields);l=n.has(s.key)?null:l;const u=eT(o,l);u!==null&&r.set(s.key,u),o.isValidDocument()||o.convertToNoDocument(Y.min())}),r}keys(){return this.mutations.reduce((e,n)=>e.add(n.key),te())}isEqual(e){return this.batchId===e.batchId&&vi(this.mutations,e.mutations,(n,r)=>f_(n,r))&&vi(this.baseMutations,e.baseMutations,(n,r)=>f_(n,r))}}class Ip{constructor(e,n,r,s){this.batch=e,this.commitVersion=n,this.mutationResults=r,this.docVersions=s}static from(e,n,r){le(e.mutations.length===r.length,58842,{me:e.mutations.length,fe:r.length});let s=function(){return BR}();const i=e.mutations;for(let o=0;o<i.length;o++)s=s.insert(i[o].key,r[o].version);return new Ip(e,n,r,s)}}/**
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
 */class eP{constructor(e,n){this.largestBatchId=e,this.mutation=n}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
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
 */class tP{constructor(e,n){this.count=e,this.unchangedNames=n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var De,ie;function nP(t){switch(t){case M.OK:return G(64938);case M.CANCELLED:case M.UNKNOWN:case M.DEADLINE_EXCEEDED:case M.RESOURCE_EXHAUSTED:case M.INTERNAL:case M.UNAVAILABLE:case M.UNAUTHENTICATED:return!1;case M.INVALID_ARGUMENT:case M.NOT_FOUND:case M.ALREADY_EXISTS:case M.PERMISSION_DENIED:case M.FAILED_PRECONDITION:case M.ABORTED:case M.OUT_OF_RANGE:case M.UNIMPLEMENTED:case M.DATA_LOSS:return!0;default:return G(15467,{code:t})}}function nT(t){if(t===void 0)return Bn("GRPC error has no .code"),M.UNKNOWN;switch(t){case De.OK:return M.OK;case De.CANCELLED:return M.CANCELLED;case De.UNKNOWN:return M.UNKNOWN;case De.DEADLINE_EXCEEDED:return M.DEADLINE_EXCEEDED;case De.RESOURCE_EXHAUSTED:return M.RESOURCE_EXHAUSTED;case De.INTERNAL:return M.INTERNAL;case De.UNAVAILABLE:return M.UNAVAILABLE;case De.UNAUTHENTICATED:return M.UNAUTHENTICATED;case De.INVALID_ARGUMENT:return M.INVALID_ARGUMENT;case De.NOT_FOUND:return M.NOT_FOUND;case De.ALREADY_EXISTS:return M.ALREADY_EXISTS;case De.PERMISSION_DENIED:return M.PERMISSION_DENIED;case De.FAILED_PRECONDITION:return M.FAILED_PRECONDITION;case De.ABORTED:return M.ABORTED;case De.OUT_OF_RANGE:return M.OUT_OF_RANGE;case De.UNIMPLEMENTED:return M.UNIMPLEMENTED;case De.DATA_LOSS:return M.DATA_LOSS;default:return G(39323,{code:t})}}(ie=De||(De={}))[ie.OK=0]="OK",ie[ie.CANCELLED=1]="CANCELLED",ie[ie.UNKNOWN=2]="UNKNOWN",ie[ie.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",ie[ie.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",ie[ie.NOT_FOUND=5]="NOT_FOUND",ie[ie.ALREADY_EXISTS=6]="ALREADY_EXISTS",ie[ie.PERMISSION_DENIED=7]="PERMISSION_DENIED",ie[ie.UNAUTHENTICATED=16]="UNAUTHENTICATED",ie[ie.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",ie[ie.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",ie[ie.ABORTED=10]="ABORTED",ie[ie.OUT_OF_RANGE=11]="OUT_OF_RANGE",ie[ie.UNIMPLEMENTED=12]="UNIMPLEMENTED",ie[ie.INTERNAL=13]="INTERNAL",ie[ie.UNAVAILABLE=14]="UNAVAILABLE",ie[ie.DATA_LOSS=15]="DATA_LOSS";/**
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
 */function rP(){return new TextEncoder}/**
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
 */const sP=new Sr([4294967295,4294967295],0);function g_(t){const e=rP().encode(t),n=new pE;return n.update(e),new Uint8Array(n.digest())}function y_(t){const e=new DataView(t.buffer),n=e.getUint32(0,!0),r=e.getUint32(4,!0),s=e.getUint32(8,!0),i=e.getUint32(12,!0);return[new Sr([n,r],0),new Sr([s,i],0)]}class xp{constructor(e,n,r){if(this.bitmap=e,this.padding=n,this.hashCount=r,n<0||n>=8)throw new To(`Invalid padding: ${n}`);if(r<0)throw new To(`Invalid hash count: ${r}`);if(e.length>0&&this.hashCount===0)throw new To(`Invalid hash count: ${r}`);if(e.length===0&&n!==0)throw new To(`Invalid padding when bitmap length is 0: ${n}`);this.ge=8*e.length-n,this.pe=Sr.fromNumber(this.ge)}ye(e,n,r){let s=e.add(n.multiply(Sr.fromNumber(r)));return s.compare(sP)===1&&(s=new Sr([s.getBits(0),s.getBits(1)],0)),s.modulo(this.pe).toNumber()}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.ge===0)return!1;const n=g_(e),[r,s]=y_(n);for(let i=0;i<this.hashCount;i++){const o=this.ye(r,s,i);if(!this.we(o))return!1}return!0}static create(e,n,r){const s=e%8==0?0:8-e%8,i=new Uint8Array(Math.ceil(e/8)),o=new xp(i,s,n);return r.forEach(l=>o.insert(l)),o}insert(e){if(this.ge===0)return;const n=g_(e),[r,s]=y_(n);for(let i=0;i<this.hashCount;i++){const o=this.ye(r,s,i);this.Se(o)}}Se(e){const n=Math.floor(e/8),r=e%8;this.bitmap[n]|=1<<r}}class To extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ca{constructor(e,n,r,s,i){this.snapshotVersion=e,this.targetChanges=n,this.targetMismatches=r,this.documentUpdates=s,this.resolvedLimboDocuments=i}static createSynthesizedRemoteEventForCurrentChange(e,n,r){const s=new Map;return s.set(e,ka.createSynthesizedTargetChangeForCurrentChange(e,n,r)),new Ca(Y.min(),s,new we(ee),$n(),te())}}class ka{constructor(e,n,r,s,i){this.resumeToken=e,this.current=n,this.addedDocuments=r,this.modifiedDocuments=s,this.removedDocuments=i}static createSynthesizedTargetChangeForCurrentChange(e,n,r){return new ka(r,n,te(),te(),te())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ul{constructor(e,n,r,s){this.be=e,this.removedTargetIds=n,this.key=r,this.De=s}}class rT{constructor(e,n){this.targetId=e,this.Ce=n}}class sT{constructor(e,n,r=Ge.EMPTY_BYTE_STRING,s=null){this.state=e,this.targetIds=n,this.resumeToken=r,this.cause=s}}class __{constructor(){this.ve=0,this.Fe=v_(),this.Me=Ge.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e)}ke(){let e=te(),n=te(),r=te();return this.Fe.forEach((s,i)=>{switch(i){case 0:e=e.add(s);break;case 2:n=n.add(s);break;case 1:r=r.add(s);break;default:G(38017,{changeType:i})}}),new ka(this.Me,this.xe,e,n,r)}Ke(){this.Oe=!1,this.Fe=v_()}qe(e,n){this.Oe=!0,this.Fe=this.Fe.insert(e,n)}Ue(e){this.Oe=!0,this.Fe=this.Fe.remove(e)}$e(){this.ve+=1}We(){this.ve-=1,le(this.ve>=0,3241,{ve:this.ve})}Qe(){this.Oe=!0,this.xe=!0}}class iP{constructor(e){this.Ge=e,this.ze=new Map,this.je=$n(),this.Je=gl(),this.He=gl(),this.Ze=new we(ee)}Xe(e){for(const n of e.be)e.De&&e.De.isFoundDocument()?this.Ye(n,e.De):this.et(n,e.key,e.De);for(const n of e.removedTargetIds)this.et(n,e.key,e.De)}tt(e){this.forEachTarget(e,n=>{const r=this.nt(n);switch(e.state){case 0:this.rt(n)&&r.Le(e.resumeToken);break;case 1:r.We(),r.Ne||r.Ke(),r.Le(e.resumeToken);break;case 2:r.We(),r.Ne||this.removeTarget(n);break;case 3:this.rt(n)&&(r.Qe(),r.Le(e.resumeToken));break;case 4:this.rt(n)&&(this.it(n),r.Le(e.resumeToken));break;default:G(56790,{state:e.state})}})}forEachTarget(e,n){e.targetIds.length>0?e.targetIds.forEach(n):this.ze.forEach((r,s)=>{this.rt(s)&&n(s)})}st(e){const n=e.targetId,r=e.Ce.count,s=this.ot(n);if(s){const i=s.target;if(Yd(i))if(r===0){const o=new q(i.path);this.et(n,o,ot.newNoDocument(o,Y.min()))}else le(r===1,20013,{expectedCount:r});else{const o=this._t(n);if(o!==r){const l=this.ut(e),u=l?this.ct(l,e,o):1;if(u!==0){this.it(n);const c=u===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ze=this.Ze.insert(n,c)}}}}}ut(e){const n=e.Ce.unchangedNames;if(!n||!n.bits)return null;const{bits:{bitmap:r="",padding:s=0},hashCount:i=0}=n;let o,l;try{o=Lr(r).toUint8Array()}catch(u){if(u instanceof kE)return Dr("Decoding the base64 bloom filter in existence filter failed ("+u.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw u}try{l=new xp(o,s,i)}catch(u){return Dr(u instanceof To?"BloomFilter error: ":"Applying bloom filter failed: ",u),null}return l.ge===0?null:l}ct(e,n,r){return n.Ce.count===r-this.Pt(e,n.targetId)?0:2}Pt(e,n){const r=this.Ge.getRemoteKeysForTarget(n);let s=0;return r.forEach(i=>{const o=this.Ge.ht(),l=`projects/${o.projectId}/databases/${o.database}/documents/${i.path.canonicalString()}`;e.mightContain(l)||(this.et(n,i,null),s++)}),s}Tt(e){const n=new Map;this.ze.forEach((i,o)=>{const l=this.ot(o);if(l){if(i.current&&Yd(l.target)){const u=new q(l.target.path);this.It(u).has(o)||this.Et(o,u)||this.et(o,u,ot.newNoDocument(u,e))}i.Be&&(n.set(o,i.ke()),i.Ke())}});let r=te();this.He.forEach((i,o)=>{let l=!0;o.forEachWhile(u=>{const c=this.ot(u);return!c||c.purpose==="TargetPurposeLimboResolution"||(l=!1,!1)}),l&&(r=r.add(i))}),this.je.forEach((i,o)=>o.setReadTime(e));const s=new Ca(e,n,this.Ze,this.je,r);return this.je=$n(),this.Je=gl(),this.He=gl(),this.Ze=new we(ee),s}Ye(e,n){if(!this.rt(e))return;const r=this.Et(e,n.key)?2:0;this.nt(e).qe(n.key,r),this.je=this.je.insert(n.key,n),this.Je=this.Je.insert(n.key,this.It(n.key).add(e)),this.He=this.He.insert(n.key,this.Rt(n.key).add(e))}et(e,n,r){if(!this.rt(e))return;const s=this.nt(e);this.Et(e,n)?s.qe(n,1):s.Ue(n),this.He=this.He.insert(n,this.Rt(n).delete(e)),this.He=this.He.insert(n,this.Rt(n).add(e)),r&&(this.je=this.je.insert(n,r))}removeTarget(e){this.ze.delete(e)}_t(e){const n=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+n.addedDocuments.size-n.removedDocuments.size}$e(e){this.nt(e).$e()}nt(e){let n=this.ze.get(e);return n||(n=new __,this.ze.set(e,n)),n}Rt(e){let n=this.He.get(e);return n||(n=new ze(ee),this.He=this.He.insert(e,n)),n}It(e){let n=this.Je.get(e);return n||(n=new ze(ee),this.Je=this.Je.insert(e,n)),n}rt(e){const n=this.ot(e)!==null;return n||W("WatchChangeAggregator","Detected inactive target",e),n}ot(e){const n=this.ze.get(e);return n&&n.Ne?null:this.Ge.At(e)}it(e){this.ze.set(e,new __),this.Ge.getRemoteKeysForTarget(e).forEach(n=>{this.et(e,n,null)})}Et(e,n){return this.Ge.getRemoteKeysForTarget(e).has(n)}}function gl(){return new we(q.comparator)}function v_(){return new we(q.comparator)}const oP={asc:"ASCENDING",desc:"DESCENDING"},aP={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},lP={and:"AND",or:"OR"};class uP{constructor(e,n){this.databaseId=e,this.useProto3Json=n}}function Jd(t,e){return t.useProto3Json||oc(e)?e:{value:e}}function xu(t,e){return t.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function iT(t,e){return t.useProto3Json?e.toBase64():e.toUint8Array()}function cP(t,e){return xu(t,e.toTimestamp())}function vn(t){return le(!!t,49232),Y.fromTimestamp(function(n){const r=Vr(n);return new de(r.seconds,r.nanos)}(t))}function Sp(t,e){return Zd(t,e).canonicalString()}function Zd(t,e){const n=function(s){return new he(["projects",s.projectId,"databases",s.database])}(t).child("documents");return e===void 0?n:n.child(e)}function oT(t){const e=he.fromString(t);return le(hT(e),10190,{key:e.toString()}),e}function ef(t,e){return Sp(t.databaseId,e.path)}function Dh(t,e){const n=oT(e);if(n.get(1)!==t.databaseId.projectId)throw new B(M.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+n.get(1)+" vs "+t.databaseId.projectId);if(n.get(3)!==t.databaseId.database)throw new B(M.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+n.get(3)+" vs "+t.databaseId.database);return new q(lT(n))}function aT(t,e){return Sp(t.databaseId,e)}function hP(t){const e=oT(t);return e.length===4?he.emptyPath():lT(e)}function tf(t){return new he(["projects",t.databaseId.projectId,"databases",t.databaseId.database]).canonicalString()}function lT(t){return le(t.length>4&&t.get(4)==="documents",29091,{key:t.toString()}),t.popFirst(5)}function w_(t,e,n){return{name:ef(t,e),fields:n.value.mapValue.fields}}function dP(t,e){let n;if("targetChange"in e){e.targetChange;const r=function(c){return c==="NO_CHANGE"?0:c==="ADD"?1:c==="REMOVE"?2:c==="CURRENT"?3:c==="RESET"?4:G(39313,{state:c})}(e.targetChange.targetChangeType||"NO_CHANGE"),s=e.targetChange.targetIds||[],i=function(c,d){return c.useProto3Json?(le(d===void 0||typeof d=="string",58123),Ge.fromBase64String(d||"")):(le(d===void 0||d instanceof Buffer||d instanceof Uint8Array,16193),Ge.fromUint8Array(d||new Uint8Array))}(t,e.targetChange.resumeToken),o=e.targetChange.cause,l=o&&function(c){const d=c.code===void 0?M.UNKNOWN:nT(c.code);return new B(d,c.message||"")}(o);n=new sT(r,s,i,l||null)}else if("documentChange"in e){e.documentChange;const r=e.documentChange;r.document,r.document.name,r.document.updateTime;const s=Dh(t,r.document.name),i=vn(r.document.updateTime),o=r.document.createTime?vn(r.document.createTime):Y.min(),l=new wt({mapValue:{fields:r.document.fields}}),u=ot.newFoundDocument(s,i,o,l),c=r.targetIds||[],d=r.removedTargetIds||[];n=new Ul(c,d,u.key,u)}else if("documentDelete"in e){e.documentDelete;const r=e.documentDelete;r.document;const s=Dh(t,r.document),i=r.readTime?vn(r.readTime):Y.min(),o=ot.newNoDocument(s,i),l=r.removedTargetIds||[];n=new Ul([],l,o.key,o)}else if("documentRemove"in e){e.documentRemove;const r=e.documentRemove;r.document;const s=Dh(t,r.document),i=r.removedTargetIds||[];n=new Ul([],i,s,null)}else{if(!("filter"in e))return G(11601,{Vt:e});{e.filter;const r=e.filter;r.targetId;const{count:s=0,unchangedNames:i}=r,o=new tP(s,i),l=r.targetId;n=new rT(l,o)}}return n}function fP(t,e){let n;if(e instanceof Aa)n={update:w_(t,e.key,e.value)};else if(e instanceof fc)n={delete:ef(t,e.key)};else if(e instanceof qr)n={update:w_(t,e.key,e.data),updateMask:TP(e.fieldMask)};else{if(!(e instanceof JR))return G(16599,{dt:e.type});n={verify:ef(t,e.key)}}return e.fieldTransforms.length>0&&(n.updateTransforms=e.fieldTransforms.map(r=>function(i,o){const l=o.transform;if(l instanceof ca)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(l instanceof Ii)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:l.elements}};if(l instanceof ha)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:l.elements}};if(l instanceof da)return{fieldPath:o.field.canonicalString(),increment:l.Ae};throw G(20930,{transform:o.transform})}(0,r))),e.precondition.isNone||(n.currentDocument=function(s,i){return i.updateTime!==void 0?{updateTime:cP(s,i.updateTime)}:i.exists!==void 0?{exists:i.exists}:G(27497)}(t,e.precondition)),n}function pP(t,e){return t&&t.length>0?(le(e!==void 0,14353),t.map(n=>function(s,i){let o=s.updateTime?vn(s.updateTime):vn(i);return o.isEqual(Y.min())&&(o=vn(i)),new QR(o,s.transformResults||[])}(n,e))):[]}function mP(t,e){return{documents:[aT(t,e.path)]}}function gP(t,e){const n={structuredQuery:{}},r=e.path;let s;e.collectionGroup!==null?(s=r,n.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(s=r.popLast(),n.structuredQuery.from=[{collectionId:r.lastSegment()}]),n.parent=aT(t,s);const i=function(c){if(c.length!==0)return cT(sn.create(c,"and"))}(e.filters);i&&(n.structuredQuery.where=i);const o=function(c){if(c.length!==0)return c.map(d=>function(g){return{field:Us(g.field),direction:vP(g.dir)}}(d))}(e.orderBy);o&&(n.structuredQuery.orderBy=o);const l=Jd(t,e.limit);return l!==null&&(n.structuredQuery.limit=l),e.startAt&&(n.structuredQuery.startAt=function(c){return{before:c.inclusive,values:c.position}}(e.startAt)),e.endAt&&(n.structuredQuery.endAt=function(c){return{before:!c.inclusive,values:c.position}}(e.endAt)),{ft:n,parent:s}}function yP(t){let e=hP(t.parent);const n=t.structuredQuery,r=n.from?n.from.length:0;let s=null;if(r>0){le(r===1,65062);const d=n.from[0];d.allDescendants?s=d.collectionId:e=e.child(d.collectionId)}let i=[];n.where&&(i=function(m){const g=uT(m);return g instanceof sn&&jE(g)?g.getFilters():[g]}(n.where));let o=[];n.orderBy&&(o=function(m){return m.map(g=>function(A){return new ua(Fs(A.field),function(N){switch(N){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(A.direction))}(g))}(n.orderBy));let l=null;n.limit&&(l=function(m){let g;return g=typeof m=="object"?m.value:m,oc(g)?null:g}(n.limit));let u=null;n.startAt&&(u=function(m){const g=!!m.before,w=m.values||[];return new Tu(w,g)}(n.startAt));let c=null;return n.endAt&&(c=function(m){const g=!m.before,w=m.values||[];return new Tu(w,g)}(n.endAt)),VR(e,s,o,i,l,"F",u,c)}function _P(t,e){const n=function(s){switch(s){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return G(28987,{purpose:s})}}(e.purpose);return n==null?null:{"goog-listen-tags":n}}function uT(t){return t.unaryFilter!==void 0?function(n){switch(n.unaryFilter.op){case"IS_NAN":const r=Fs(n.unaryFilter.field);return Ve.create(r,"==",{doubleValue:NaN});case"IS_NULL":const s=Fs(n.unaryFilter.field);return Ve.create(s,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const i=Fs(n.unaryFilter.field);return Ve.create(i,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Fs(n.unaryFilter.field);return Ve.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return G(61313);default:return G(60726)}}(t):t.fieldFilter!==void 0?function(n){return Ve.create(Fs(n.fieldFilter.field),function(s){switch(s){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return G(58110);default:return G(50506)}}(n.fieldFilter.op),n.fieldFilter.value)}(t):t.compositeFilter!==void 0?function(n){return sn.create(n.compositeFilter.filters.map(r=>uT(r)),function(s){switch(s){case"AND":return"and";case"OR":return"or";default:return G(1026)}}(n.compositeFilter.op))}(t):G(30097,{filter:t})}function vP(t){return oP[t]}function wP(t){return aP[t]}function EP(t){return lP[t]}function Us(t){return{fieldPath:t.canonicalString()}}function Fs(t){return He.fromServerFormat(t.fieldPath)}function cT(t){return t instanceof Ve?function(n){if(n.op==="=="){if(a_(n.value))return{unaryFilter:{field:Us(n.field),op:"IS_NAN"}};if(o_(n.value))return{unaryFilter:{field:Us(n.field),op:"IS_NULL"}}}else if(n.op==="!="){if(a_(n.value))return{unaryFilter:{field:Us(n.field),op:"IS_NOT_NAN"}};if(o_(n.value))return{unaryFilter:{field:Us(n.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:Us(n.field),op:wP(n.op),value:n.value}}}(t):t instanceof sn?function(n){const r=n.getFilters().map(s=>cT(s));return r.length===1?r[0]:{compositeFilter:{op:EP(n.op),filters:r}}}(t):G(54877,{filter:t})}function TP(t){const e=[];return t.fields.forEach(n=>e.push(n.canonicalString())),{fieldPaths:e}}function hT(t){return t.length>=4&&t.get(0)==="projects"&&t.get(2)==="databases"}function dT(t){return!!t&&typeof t._toProto=="function"&&t._protoValueType==="ProtoValue"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pn{constructor(e,n,r,s,i=Y.min(),o=Y.min(),l=Ge.EMPTY_BYTE_STRING,u=null){this.target=e,this.targetId=n,this.purpose=r,this.sequenceNumber=s,this.snapshotVersion=i,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=l,this.expectedCount=u}withSequenceNumber(e){return new Pn(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,n){return new Pn(this.target,this.targetId,this.purpose,this.sequenceNumber,n,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new Pn(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new Pn(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class IP{constructor(e){this.yt=e}}function xP(t){const e=yP({parent:t.parent,structuredQuery:t.structuredQuery});return t.limitType==="LAST"?Iu(e,e.limit,"L"):e}/**
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
 */class SP{constructor(){this.bn=new AP}addToCollectionParentIndex(e,n){return this.bn.add(n),j.resolve()}getCollectionParents(e,n){return j.resolve(this.bn.getEntries(n))}addFieldIndex(e,n){return j.resolve()}deleteFieldIndex(e,n){return j.resolve()}deleteAllFieldIndexes(e){return j.resolve()}createTargetIndexes(e,n){return j.resolve()}getDocumentsMatchingTarget(e,n){return j.resolve(null)}getIndexType(e,n){return j.resolve(0)}getFieldIndexes(e,n){return j.resolve([])}getNextCollectionGroupToUpdate(e){return j.resolve(null)}getMinOffset(e,n){return j.resolve(Or.min())}getMinOffsetFromCollectionGroup(e,n){return j.resolve(Or.min())}updateCollectionGroup(e,n,r){return j.resolve()}updateIndexEntries(e,n){return j.resolve()}}class AP{constructor(){this.index={}}add(e){const n=e.lastSegment(),r=e.popLast(),s=this.index[n]||new ze(he.comparator),i=!s.has(r);return this.index[n]=s.add(r),i}has(e){const n=e.lastSegment(),r=e.popLast(),s=this.index[n];return s&&s.has(r)}getEntries(e){return(this.index[e]||new ze(he.comparator)).toArray()}}/**
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
 */const E_={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},fT=41943040;class _t{static withCacheSize(e){return new _t(e,_t.DEFAULT_COLLECTION_PERCENTILE,_t.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,n,r){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=n,this.maximumSequenceNumbersToCollect=r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */_t.DEFAULT_COLLECTION_PERCENTILE=10,_t.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,_t.DEFAULT=new _t(fT,_t.DEFAULT_COLLECTION_PERCENTILE,_t.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),_t.DISABLED=new _t(-1,0,0);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jr{constructor(e){this.sr=e}next(){return this.sr+=2,this.sr}static _r(){return new jr(0)}static ar(){return new jr(-1)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const T_="LruGarbageCollector",CP=1048576;function I_([t,e],[n,r]){const s=ee(t,n);return s===0?ee(e,r):s}class kP{constructor(e){this.Pr=e,this.buffer=new ze(I_),this.Tr=0}Ir(){return++this.Tr}Er(e){const n=[e,this.Ir()];if(this.buffer.size<this.Pr)this.buffer=this.buffer.add(n);else{const r=this.buffer.last();I_(n,r)<0&&(this.buffer=this.buffer.delete(r).add(n))}}get maxValue(){return this.buffer.last()[0]}}class RP{constructor(e,n,r){this.garbageCollector=e,this.asyncQueue=n,this.localStore=r,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Ar(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Ar(e){W(T_,`Garbage collection scheduled in ${e}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(n){Oi(n)?W(T_,"Ignoring IndexedDB error during garbage collection: ",n):await Di(n)}await this.Ar(3e5)})}}class PP{constructor(e,n){this.Vr=e,this.params=n}calculateTargetCount(e,n){return this.Vr.dr(e).next(r=>Math.floor(n/100*r))}nthSequenceNumber(e,n){if(n===0)return j.resolve(ic.ce);const r=new kP(n);return this.Vr.forEachTarget(e,s=>r.Er(s.sequenceNumber)).next(()=>this.Vr.mr(e,s=>r.Er(s))).next(()=>r.maxValue)}removeTargets(e,n,r){return this.Vr.removeTargets(e,n,r)}removeOrphanedDocuments(e,n){return this.Vr.removeOrphanedDocuments(e,n)}collect(e,n){return this.params.cacheSizeCollectionThreshold===-1?(W("LruGarbageCollector","Garbage collection skipped; disabled"),j.resolve(E_)):this.getCacheSize(e).next(r=>r<this.params.cacheSizeCollectionThreshold?(W("LruGarbageCollector",`Garbage collection skipped; Cache size ${r} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),E_):this.gr(e,n))}getCacheSize(e){return this.Vr.getCacheSize(e)}gr(e,n){let r,s,i,o,l,u,c;const d=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(m=>(m>this.params.maximumSequenceNumbersToCollect?(W("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${m}`),s=this.params.maximumSequenceNumbersToCollect):s=m,o=Date.now(),this.nthSequenceNumber(e,s))).next(m=>(r=m,l=Date.now(),this.removeTargets(e,r,n))).next(m=>(i=m,u=Date.now(),this.removeOrphanedDocuments(e,r))).next(m=>(c=Date.now(),Ms()<=re.DEBUG&&W("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-d}ms
	Determined least recently used ${s} in `+(l-o)+`ms
	Removed ${i} targets in `+(u-l)+`ms
	Removed ${m} documents in `+(c-u)+`ms
Total Duration: ${c-d}ms`),j.resolve({didRun:!0,sequenceNumbersCollected:s,targetsRemoved:i,documentsRemoved:m})))}}function NP(t,e){return new PP(t,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bP{constructor(){this.changes=new ks(e=>e.toString(),(e,n)=>e.isEqual(n)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,n){this.assertNotApplied(),this.changes.set(e,ot.newInvalidDocument(e).setReadTime(n))}getEntry(e,n){this.assertNotApplied();const r=this.changes.get(n);return r!==void 0?j.resolve(r):this.getFromCache(e,n)}getEntries(e,n){return this.getAllFromCache(e,n)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */class DP{constructor(e,n){this.overlayedDocument=e,this.mutatedFields=n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class OP{constructor(e,n,r,s){this.remoteDocumentCache=e,this.mutationQueue=n,this.documentOverlayCache=r,this.indexManager=s}getDocument(e,n){let r=null;return this.documentOverlayCache.getOverlay(e,n).next(s=>(r=s,this.remoteDocumentCache.getEntry(e,n))).next(s=>(r!==null&&Vo(r.mutation,s,Pt.empty(),de.now()),s))}getDocuments(e,n){return this.remoteDocumentCache.getEntries(e,n).next(r=>this.getLocalViewOfDocuments(e,r,te()).next(()=>r))}getLocalViewOfDocuments(e,n,r=te()){const s=as();return this.populateOverlays(e,s,n).next(()=>this.computeViews(e,n,s,r).next(i=>{let o=Eo();return i.forEach((l,u)=>{o=o.insert(l,u.overlayedDocument)}),o}))}getOverlayedDocuments(e,n){const r=as();return this.populateOverlays(e,r,n).next(()=>this.computeViews(e,n,r,te()))}populateOverlays(e,n,r){const s=[];return r.forEach(i=>{n.has(i)||s.push(i)}),this.documentOverlayCache.getOverlays(e,s).next(i=>{i.forEach((o,l)=>{n.set(o,l)})})}computeViews(e,n,r,s){let i=$n();const o=Oo(),l=function(){return Oo()}();return n.forEach((u,c)=>{const d=r.get(c.key);s.has(c.key)&&(d===void 0||d.mutation instanceof qr)?i=i.insert(c.key,c):d!==void 0?(o.set(c.key,d.mutation.getFieldMask()),Vo(d.mutation,c,d.mutation.getFieldMask(),de.now())):o.set(c.key,Pt.empty())}),this.recalculateAndSaveOverlays(e,i).next(u=>(u.forEach((c,d)=>o.set(c,d)),n.forEach((c,d)=>l.set(c,new DP(d,o.get(c)??null))),l))}recalculateAndSaveOverlays(e,n){const r=Oo();let s=new we((o,l)=>o-l),i=te();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,n).next(o=>{for(const l of o)l.keys().forEach(u=>{const c=n.get(u);if(c===null)return;let d=r.get(u)||Pt.empty();d=l.applyToLocalView(c,d),r.set(u,d);const m=(s.get(l.batchId)||te()).add(u);s=s.insert(l.batchId,m)})}).next(()=>{const o=[],l=s.getReverseIterator();for(;l.hasNext();){const u=l.getNext(),c=u.key,d=u.value,m=KE();d.forEach(g=>{if(!i.has(g)){const w=eT(n.get(g),r.get(g));w!==null&&m.set(g,w),i=i.add(g)}}),o.push(this.documentOverlayCache.saveOverlays(e,c,m))}return j.waitFor(o)}).next(()=>r)}recalculateAndSaveOverlaysForDocumentKeys(e,n){return this.remoteDocumentCache.getEntries(e,n).next(r=>this.recalculateAndSaveOverlays(e,r))}getDocumentsMatchingQuery(e,n,r,s){return LR(n)?this.getDocumentsMatchingDocumentQuery(e,n.path):BE(n)?this.getDocumentsMatchingCollectionGroupQuery(e,n,r,s):this.getDocumentsMatchingCollectionQuery(e,n,r,s)}getNextDocuments(e,n,r,s){return this.remoteDocumentCache.getAllFromCollectionGroup(e,n,r,s).next(i=>{const o=s-i.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,n,r.largestBatchId,s-i.size):j.resolve(as());let l=oa,u=i;return o.next(c=>j.forEach(c,(d,m)=>(l<m.largestBatchId&&(l=m.largestBatchId),i.get(d)?j.resolve():this.remoteDocumentCache.getEntry(e,d).next(g=>{u=u.insert(d,g)}))).next(()=>this.populateOverlays(e,c,i)).next(()=>this.computeViews(e,u,c,te())).next(d=>({batchId:l,changes:qE(d)})))})}getDocumentsMatchingDocumentQuery(e,n){return this.getDocument(e,new q(n)).next(r=>{let s=Eo();return r.isFoundDocument()&&(s=s.insert(r.key,r)),s})}getDocumentsMatchingCollectionGroupQuery(e,n,r,s){const i=n.collectionGroup;let o=Eo();return this.indexManager.getCollectionParents(e,i).next(l=>j.forEach(l,u=>{const c=function(m,g){return new Vi(g,null,m.explicitOrderBy.slice(),m.filters.slice(),m.limit,m.limitType,m.startAt,m.endAt)}(n,u.child(i));return this.getDocumentsMatchingCollectionQuery(e,c,r,s).next(d=>{d.forEach((m,g)=>{o=o.insert(m,g)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,n,r,s){let i;return this.documentOverlayCache.getOverlaysForCollection(e,n.path,r.largestBatchId).next(o=>(i=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,n,r,i,s))).next(o=>{i.forEach((u,c)=>{const d=c.getKey();o.get(d)===null&&(o=o.insert(d,ot.newInvalidDocument(d)))});let l=Eo();return o.forEach((u,c)=>{const d=i.get(u);d!==void 0&&Vo(d.mutation,c,Pt.empty(),de.now()),cc(n,c)&&(l=l.insert(u,c))}),l})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class VP{constructor(e){this.serializer=e,this.Nr=new Map,this.Br=new Map}getBundleMetadata(e,n){return j.resolve(this.Nr.get(n))}saveBundleMetadata(e,n){return this.Nr.set(n.id,function(s){return{id:s.id,version:s.version,createTime:vn(s.createTime)}}(n)),j.resolve()}getNamedQuery(e,n){return j.resolve(this.Br.get(n))}saveNamedQuery(e,n){return this.Br.set(n.name,function(s){return{name:s.name,query:xP(s.bundledQuery),readTime:vn(s.readTime)}}(n)),j.resolve()}}/**
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
 */class LP{constructor(){this.overlays=new we(q.comparator),this.Lr=new Map}getOverlay(e,n){return j.resolve(this.overlays.get(n))}getOverlays(e,n){const r=as();return j.forEach(n,s=>this.getOverlay(e,s).next(i=>{i!==null&&r.set(s,i)})).next(()=>r)}saveOverlays(e,n,r){return r.forEach((s,i)=>{this.St(e,n,i)}),j.resolve()}removeOverlaysForBatchId(e,n,r){const s=this.Lr.get(r);return s!==void 0&&(s.forEach(i=>this.overlays=this.overlays.remove(i)),this.Lr.delete(r)),j.resolve()}getOverlaysForCollection(e,n,r){const s=as(),i=n.length+1,o=new q(n.child("")),l=this.overlays.getIteratorFrom(o);for(;l.hasNext();){const u=l.getNext().value,c=u.getKey();if(!n.isPrefixOf(c.path))break;c.path.length===i&&u.largestBatchId>r&&s.set(u.getKey(),u)}return j.resolve(s)}getOverlaysForCollectionGroup(e,n,r,s){let i=new we((c,d)=>c-d);const o=this.overlays.getIterator();for(;o.hasNext();){const c=o.getNext().value;if(c.getKey().getCollectionGroup()===n&&c.largestBatchId>r){let d=i.get(c.largestBatchId);d===null&&(d=as(),i=i.insert(c.largestBatchId,d)),d.set(c.getKey(),c)}}const l=as(),u=i.getIterator();for(;u.hasNext()&&(u.getNext().value.forEach((c,d)=>l.set(c,d)),!(l.size()>=s)););return j.resolve(l)}St(e,n,r){const s=this.overlays.get(r.key);if(s!==null){const o=this.Lr.get(s.largestBatchId).delete(r.key);this.Lr.set(s.largestBatchId,o)}this.overlays=this.overlays.insert(r.key,new eP(n,r));let i=this.Lr.get(n);i===void 0&&(i=te(),this.Lr.set(n,i)),this.Lr.set(n,i.add(r.key))}}/**
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
 */class MP{constructor(){this.sessionToken=Ge.EMPTY_BYTE_STRING}getSessionToken(e){return j.resolve(this.sessionToken)}setSessionToken(e,n){return this.sessionToken=n,j.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ap{constructor(){this.kr=new ze($e.Kr),this.qr=new ze($e.Ur)}isEmpty(){return this.kr.isEmpty()}addReference(e,n){const r=new $e(e,n);this.kr=this.kr.add(r),this.qr=this.qr.add(r)}$r(e,n){e.forEach(r=>this.addReference(r,n))}removeReference(e,n){this.Wr(new $e(e,n))}Qr(e,n){e.forEach(r=>this.removeReference(r,n))}Gr(e){const n=new q(new he([])),r=new $e(n,e),s=new $e(n,e+1),i=[];return this.qr.forEachInRange([r,s],o=>{this.Wr(o),i.push(o.key)}),i}zr(){this.kr.forEach(e=>this.Wr(e))}Wr(e){this.kr=this.kr.delete(e),this.qr=this.qr.delete(e)}jr(e){const n=new q(new he([])),r=new $e(n,e),s=new $e(n,e+1);let i=te();return this.qr.forEachInRange([r,s],o=>{i=i.add(o.key)}),i}containsKey(e){const n=new $e(e,0),r=this.kr.firstAfterOrEqual(n);return r!==null&&e.isEqual(r.key)}}class $e{constructor(e,n){this.key=e,this.Jr=n}static Kr(e,n){return q.comparator(e.key,n.key)||ee(e.Jr,n.Jr)}static Ur(e,n){return ee(e.Jr,n.Jr)||q.comparator(e.key,n.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jP{constructor(e,n){this.indexManager=e,this.referenceDelegate=n,this.mutationQueue=[],this.Yn=1,this.Hr=new ze($e.Kr)}checkEmpty(e){return j.resolve(this.mutationQueue.length===0)}addMutationBatch(e,n,r,s){const i=this.Yn;this.Yn++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new ZR(i,n,r,s);this.mutationQueue.push(o);for(const l of s)this.Hr=this.Hr.add(new $e(l.key,i)),this.indexManager.addToCollectionParentIndex(e,l.key.path.popLast());return j.resolve(o)}lookupMutationBatch(e,n){return j.resolve(this.Zr(n))}getNextMutationBatchAfterBatchId(e,n){const r=n+1,s=this.Xr(r),i=s<0?0:s;return j.resolve(this.mutationQueue.length>i?this.mutationQueue[i]:null)}getHighestUnacknowledgedBatchId(){return j.resolve(this.mutationQueue.length===0?gp:this.Yn-1)}getAllMutationBatches(e){return j.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,n){const r=new $e(n,0),s=new $e(n,Number.POSITIVE_INFINITY),i=[];return this.Hr.forEachInRange([r,s],o=>{const l=this.Zr(o.Jr);i.push(l)}),j.resolve(i)}getAllMutationBatchesAffectingDocumentKeys(e,n){let r=new ze(ee);return n.forEach(s=>{const i=new $e(s,0),o=new $e(s,Number.POSITIVE_INFINITY);this.Hr.forEachInRange([i,o],l=>{r=r.add(l.Jr)})}),j.resolve(this.Yr(r))}getAllMutationBatchesAffectingQuery(e,n){const r=n.path,s=r.length+1;let i=r;q.isDocumentKey(i)||(i=i.child(""));const o=new $e(new q(i),0);let l=new ze(ee);return this.Hr.forEachWhile(u=>{const c=u.key.path;return!!r.isPrefixOf(c)&&(c.length===s&&(l=l.add(u.Jr)),!0)},o),j.resolve(this.Yr(l))}Yr(e){const n=[];return e.forEach(r=>{const s=this.Zr(r);s!==null&&n.push(s)}),n}removeMutationBatch(e,n){le(this.ei(n.batchId,"removed")===0,55003),this.mutationQueue.shift();let r=this.Hr;return j.forEach(n.mutations,s=>{const i=new $e(s.key,n.batchId);return r=r.delete(i),this.referenceDelegate.markPotentiallyOrphaned(e,s.key)}).next(()=>{this.Hr=r})}nr(e){}containsKey(e,n){const r=new $e(n,0),s=this.Hr.firstAfterOrEqual(r);return j.resolve(n.isEqual(s&&s.key))}performConsistencyCheck(e){return this.mutationQueue.length,j.resolve()}ei(e,n){return this.Xr(e)}Xr(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Zr(e){const n=this.Xr(e);return n<0||n>=this.mutationQueue.length?null:this.mutationQueue[n]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class UP{constructor(e){this.ti=e,this.docs=function(){return new we(q.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,n){const r=n.key,s=this.docs.get(r),i=s?s.size:0,o=this.ti(n);return this.docs=this.docs.insert(r,{document:n.mutableCopy(),size:o}),this.size+=o-i,this.indexManager.addToCollectionParentIndex(e,r.path.popLast())}removeEntry(e){const n=this.docs.get(e);n&&(this.docs=this.docs.remove(e),this.size-=n.size)}getEntry(e,n){const r=this.docs.get(n);return j.resolve(r?r.document.mutableCopy():ot.newInvalidDocument(n))}getEntries(e,n){let r=$n();return n.forEach(s=>{const i=this.docs.get(s);r=r.insert(s,i?i.document.mutableCopy():ot.newInvalidDocument(s))}),j.resolve(r)}getDocumentsMatchingQuery(e,n,r,s){let i=$n();const o=n.path,l=new q(o.child("__id-9223372036854775808__")),u=this.docs.getIteratorFrom(l);for(;u.hasNext();){const{key:c,value:{document:d}}=u.getNext();if(!o.isPrefixOf(c.path))break;c.path.length>o.length+1||dR(hR(d),r)<=0||(s.has(d.key)||cc(n,d))&&(i=i.insert(d.key,d.mutableCopy()))}return j.resolve(i)}getAllFromCollectionGroup(e,n,r,s){G(9500)}ni(e,n){return j.forEach(this.docs,r=>n(r))}newChangeBuffer(e){return new FP(this)}getSize(e){return j.resolve(this.size)}}class FP extends bP{constructor(e){super(),this.Mr=e}applyChanges(e){const n=[];return this.changes.forEach((r,s)=>{s.isValidDocument()?n.push(this.Mr.addEntry(e,s)):this.Mr.removeEntry(r)}),j.waitFor(n)}getFromCache(e,n){return this.Mr.getEntry(e,n)}getAllFromCache(e,n){return this.Mr.getEntries(e,n)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zP{constructor(e){this.persistence=e,this.ri=new ks(n=>vp(n),wp),this.lastRemoteSnapshotVersion=Y.min(),this.highestTargetId=0,this.ii=0,this.si=new Ap,this.targetCount=0,this.oi=jr._r()}forEachTarget(e,n){return this.ri.forEach((r,s)=>n(s)),j.resolve()}getLastRemoteSnapshotVersion(e){return j.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return j.resolve(this.ii)}allocateTargetId(e){return this.highestTargetId=this.oi.next(),j.resolve(this.highestTargetId)}setTargetsMetadata(e,n,r){return r&&(this.lastRemoteSnapshotVersion=r),n>this.ii&&(this.ii=n),j.resolve()}lr(e){this.ri.set(e.target,e);const n=e.targetId;n>this.highestTargetId&&(this.oi=new jr(n),this.highestTargetId=n),e.sequenceNumber>this.ii&&(this.ii=e.sequenceNumber)}addTargetData(e,n){return this.lr(n),this.targetCount+=1,j.resolve()}updateTargetData(e,n){return this.lr(n),j.resolve()}removeTargetData(e,n){return this.ri.delete(n.target),this.si.Gr(n.targetId),this.targetCount-=1,j.resolve()}removeTargets(e,n,r){let s=0;const i=[];return this.ri.forEach((o,l)=>{l.sequenceNumber<=n&&r.get(l.targetId)===null&&(this.ri.delete(o),i.push(this.removeMatchingKeysForTargetId(e,l.targetId)),s++)}),j.waitFor(i).next(()=>s)}getTargetCount(e){return j.resolve(this.targetCount)}getTargetData(e,n){const r=this.ri.get(n)||null;return j.resolve(r)}addMatchingKeys(e,n,r){return this.si.$r(n,r),j.resolve()}removeMatchingKeys(e,n,r){this.si.Qr(n,r);const s=this.persistence.referenceDelegate,i=[];return s&&n.forEach(o=>{i.push(s.markPotentiallyOrphaned(e,o))}),j.waitFor(i)}removeMatchingKeysForTargetId(e,n){return this.si.Gr(n),j.resolve()}getMatchingKeysForTargetId(e,n){const r=this.si.jr(n);return j.resolve(r)}containsKey(e,n){return j.resolve(this.si.containsKey(n))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pT{constructor(e,n){this._i={},this.overlays={},this.ai=new ic(0),this.ui=!1,this.ui=!0,this.ci=new MP,this.referenceDelegate=e(this),this.li=new zP(this),this.indexManager=new SP,this.remoteDocumentCache=function(s){return new UP(s)}(r=>this.referenceDelegate.hi(r)),this.serializer=new IP(n),this.Pi=new VP(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.ui=!1,Promise.resolve()}get started(){return this.ui}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let n=this.overlays[e.toKey()];return n||(n=new LP,this.overlays[e.toKey()]=n),n}getMutationQueue(e,n){let r=this._i[e.toKey()];return r||(r=new jP(n,this.referenceDelegate),this._i[e.toKey()]=r),r}getGlobalsCache(){return this.ci}getTargetCache(){return this.li}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Pi}runTransaction(e,n,r){W("MemoryPersistence","Starting transaction:",e);const s=new BP(this.ai.next());return this.referenceDelegate.Ti(),r(s).next(i=>this.referenceDelegate.Ii(s).next(()=>i)).toPromise().then(i=>(s.raiseOnCommittedEvent(),i))}Ei(e,n){return j.or(Object.values(this._i).map(r=>()=>r.containsKey(e,n)))}}class BP extends pR{constructor(e){super(),this.currentSequenceNumber=e}}class Cp{constructor(e){this.persistence=e,this.Ri=new Ap,this.Ai=null}static Vi(e){return new Cp(e)}get di(){if(this.Ai)return this.Ai;throw G(60996)}addReference(e,n,r){return this.Ri.addReference(r,n),this.di.delete(r.toString()),j.resolve()}removeReference(e,n,r){return this.Ri.removeReference(r,n),this.di.add(r.toString()),j.resolve()}markPotentiallyOrphaned(e,n){return this.di.add(n.toString()),j.resolve()}removeTarget(e,n){this.Ri.Gr(n.targetId).forEach(s=>this.di.add(s.toString()));const r=this.persistence.getTargetCache();return r.getMatchingKeysForTargetId(e,n.targetId).next(s=>{s.forEach(i=>this.di.add(i.toString()))}).next(()=>r.removeTargetData(e,n))}Ti(){this.Ai=new Set}Ii(e){const n=this.persistence.getRemoteDocumentCache().newChangeBuffer();return j.forEach(this.di,r=>{const s=q.fromPath(r);return this.mi(e,s).next(i=>{i||n.removeEntry(s,Y.min())})}).next(()=>(this.Ai=null,n.apply(e)))}updateLimboDocument(e,n){return this.mi(e,n).next(r=>{r?this.di.delete(n.toString()):this.di.add(n.toString())})}hi(e){return 0}mi(e,n){return j.or([()=>j.resolve(this.Ri.containsKey(n)),()=>this.persistence.getTargetCache().containsKey(e,n),()=>this.persistence.Ei(e,n)])}}class Su{constructor(e,n){this.persistence=e,this.fi=new ks(r=>yR(r.path),(r,s)=>r.isEqual(s)),this.garbageCollector=NP(this,n)}static Vi(e,n){return new Su(e,n)}Ti(){}Ii(e){return j.resolve()}forEachTarget(e,n){return this.persistence.getTargetCache().forEachTarget(e,n)}dr(e){const n=this.pr(e);return this.persistence.getTargetCache().getTargetCount(e).next(r=>n.next(s=>r+s))}pr(e){let n=0;return this.mr(e,r=>{n++}).next(()=>n)}mr(e,n){return j.forEach(this.fi,(r,s)=>this.wr(e,r,s).next(i=>i?j.resolve():n(s)))}removeTargets(e,n,r){return this.persistence.getTargetCache().removeTargets(e,n,r)}removeOrphanedDocuments(e,n){let r=0;const s=this.persistence.getRemoteDocumentCache(),i=s.newChangeBuffer();return s.ni(e,o=>this.wr(e,o,n).next(l=>{l||(r++,i.removeEntry(o,Y.min()))})).next(()=>i.apply(e)).next(()=>r)}markPotentiallyOrphaned(e,n){return this.fi.set(n,e.currentSequenceNumber),j.resolve()}removeTarget(e,n){const r=n.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,r)}addReference(e,n,r){return this.fi.set(r,e.currentSequenceNumber),j.resolve()}removeReference(e,n,r){return this.fi.set(r,e.currentSequenceNumber),j.resolve()}updateLimboDocument(e,n){return this.fi.set(n,e.currentSequenceNumber),j.resolve()}hi(e){let n=e.key.toString().length;return e.isFoundDocument()&&(n+=Ll(e.data.value)),n}wr(e,n,r){return j.or([()=>this.persistence.Ei(e,n),()=>this.persistence.getTargetCache().containsKey(e,n),()=>{const s=this.fi.get(n);return j.resolve(s!==void 0&&s>r)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kp{constructor(e,n,r,s){this.targetId=e,this.fromCache=n,this.Ts=r,this.Is=s}static Es(e,n){let r=te(),s=te();for(const i of n.docChanges)switch(i.type){case 0:r=r.add(i.doc.key);break;case 1:s=s.add(i.doc.key)}return new kp(e,n.fromCache,r,s)}}/**
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
 */class $P{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
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
 */class WP{constructor(){this.Rs=!1,this.As=!1,this.Vs=100,this.ds=function(){return LC()?8:mR(ut())>0?6:4}()}initialize(e,n){this.fs=e,this.indexManager=n,this.Rs=!0}getDocumentsMatchingQuery(e,n,r,s){const i={result:null};return this.gs(e,n).next(o=>{i.result=o}).next(()=>{if(!i.result)return this.ps(e,n,s,r).next(o=>{i.result=o})}).next(()=>{if(i.result)return;const o=new $P;return this.ys(e,n,o).next(l=>{if(i.result=l,this.As)return this.ws(e,n,o,l.size)})}).next(()=>i.result)}ws(e,n,r,s){return r.documentReadCount<this.Vs?(Ms()<=re.DEBUG&&W("QueryEngine","SDK will not create cache indexes for query:",js(n),"since it only creates cache indexes for collection contains","more than or equal to",this.Vs,"documents"),j.resolve()):(Ms()<=re.DEBUG&&W("QueryEngine","Query:",js(n),"scans",r.documentReadCount,"local documents and returns",s,"documents as results."),r.documentReadCount>this.ds*s?(Ms()<=re.DEBUG&&W("QueryEngine","The SDK decides to create cache indexes for query:",js(n),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,_n(n))):j.resolve())}gs(e,n){if(h_(n))return j.resolve(null);let r=_n(n);return this.indexManager.getIndexType(e,r).next(s=>s===0?null:(n.limit!==null&&s===1&&(n=Iu(n,null,"F"),r=_n(n)),this.indexManager.getDocumentsMatchingTarget(e,r).next(i=>{const o=te(...i);return this.fs.getDocuments(e,o).next(l=>this.indexManager.getMinOffset(e,r).next(u=>{const c=this.Ss(n,l);return this.bs(n,c,o,u.readTime)?this.gs(e,Iu(n,null,"F")):this.Ds(e,c,n,u)}))})))}ps(e,n,r,s){return h_(n)||s.isEqual(Y.min())?j.resolve(null):this.fs.getDocuments(e,r).next(i=>{const o=this.Ss(n,i);return this.bs(n,o,r,s)?j.resolve(null):(Ms()<=re.DEBUG&&W("QueryEngine","Re-using previous result from %s to execute query: %s",s.toString(),js(n)),this.Ds(e,o,n,cR(s,oa)).next(l=>l))})}Ss(e,n){let r=new ze(WE(e));return n.forEach((s,i)=>{cc(e,i)&&(r=r.add(i))}),r}bs(e,n,r,s){if(e.limit===null)return!1;if(r.size!==n.size)return!0;const i=e.limitType==="F"?n.last():n.first();return!!i&&(i.hasPendingWrites||i.version.compareTo(s)>0)}ys(e,n,r){return Ms()<=re.DEBUG&&W("QueryEngine","Using full collection scan to execute query:",js(n)),this.fs.getDocumentsMatchingQuery(e,n,Or.min(),r)}Ds(e,n,r,s){return this.fs.getDocumentsMatchingQuery(e,r,s).next(i=>(n.forEach(o=>{i=i.insert(o.key,o)}),i))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rp="LocalStore",HP=3e8;class qP{constructor(e,n,r,s){this.persistence=e,this.Cs=n,this.serializer=s,this.vs=new we(ee),this.Fs=new ks(i=>vp(i),wp),this.Ms=new Map,this.xs=e.getRemoteDocumentCache(),this.li=e.getTargetCache(),this.Pi=e.getBundleCache(),this.Os(r)}Os(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new OP(this.xs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.xs.setIndexManager(this.indexManager),this.Cs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",n=>e.collect(n,this.vs))}}function KP(t,e,n,r){return new qP(t,e,n,r)}async function mT(t,e){const n=X(t);return await n.persistence.runTransaction("Handle user change","readonly",r=>{let s;return n.mutationQueue.getAllMutationBatches(r).next(i=>(s=i,n.Os(e),n.mutationQueue.getAllMutationBatches(r))).next(i=>{const o=[],l=[];let u=te();for(const c of s){o.push(c.batchId);for(const d of c.mutations)u=u.add(d.key)}for(const c of i){l.push(c.batchId);for(const d of c.mutations)u=u.add(d.key)}return n.localDocuments.getDocuments(r,u).next(c=>({Ns:c,removedBatchIds:o,addedBatchIds:l}))})})}function GP(t,e){const n=X(t);return n.persistence.runTransaction("Acknowledge batch","readwrite-primary",r=>{const s=e.batch.keys(),i=n.xs.newChangeBuffer({trackRemovals:!0});return function(l,u,c,d){const m=c.batch,g=m.keys();let w=j.resolve();return g.forEach(A=>{w=w.next(()=>d.getEntry(u,A)).next(P=>{const N=c.docVersions.get(A);le(N!==null,48541),P.version.compareTo(N)<0&&(m.applyToRemoteDocument(P,c),P.isValidDocument()&&(P.setReadTime(c.commitVersion),d.addEntry(P)))})}),w.next(()=>l.mutationQueue.removeMutationBatch(u,m))}(n,r,e,i).next(()=>i.apply(r)).next(()=>n.mutationQueue.performConsistencyCheck(r)).next(()=>n.documentOverlayCache.removeOverlaysForBatchId(r,s,e.batch.batchId)).next(()=>n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(r,function(l){let u=te();for(let c=0;c<l.mutationResults.length;++c)l.mutationResults[c].transformResults.length>0&&(u=u.add(l.batch.mutations[c].key));return u}(e))).next(()=>n.localDocuments.getDocuments(r,s))})}function gT(t){const e=X(t);return e.persistence.runTransaction("Get last remote snapshot version","readonly",n=>e.li.getLastRemoteSnapshotVersion(n))}function QP(t,e){const n=X(t),r=e.snapshotVersion;let s=n.vs;return n.persistence.runTransaction("Apply remote event","readwrite-primary",i=>{const o=n.xs.newChangeBuffer({trackRemovals:!0});s=n.vs;const l=[];e.targetChanges.forEach((d,m)=>{const g=s.get(m);if(!g)return;l.push(n.li.removeMatchingKeys(i,d.removedDocuments,m).next(()=>n.li.addMatchingKeys(i,d.addedDocuments,m)));let w=g.withSequenceNumber(i.currentSequenceNumber);e.targetMismatches.get(m)!==null?w=w.withResumeToken(Ge.EMPTY_BYTE_STRING,Y.min()).withLastLimboFreeSnapshotVersion(Y.min()):d.resumeToken.approximateByteSize()>0&&(w=w.withResumeToken(d.resumeToken,r)),s=s.insert(m,w),function(P,N,x){return P.resumeToken.approximateByteSize()===0||N.snapshotVersion.toMicroseconds()-P.snapshotVersion.toMicroseconds()>=HP?!0:x.addedDocuments.size+x.modifiedDocuments.size+x.removedDocuments.size>0}(g,w,d)&&l.push(n.li.updateTargetData(i,w))});let u=$n(),c=te();if(e.documentUpdates.forEach(d=>{e.resolvedLimboDocuments.has(d)&&l.push(n.persistence.referenceDelegate.updateLimboDocument(i,d))}),l.push(YP(i,o,e.documentUpdates).next(d=>{u=d.Bs,c=d.Ls})),!r.isEqual(Y.min())){const d=n.li.getLastRemoteSnapshotVersion(i).next(m=>n.li.setTargetsMetadata(i,i.currentSequenceNumber,r));l.push(d)}return j.waitFor(l).next(()=>o.apply(i)).next(()=>n.localDocuments.getLocalViewOfDocuments(i,u,c)).next(()=>u)}).then(i=>(n.vs=s,i))}function YP(t,e,n){let r=te(),s=te();return n.forEach(i=>r=r.add(i)),e.getEntries(t,r).next(i=>{let o=$n();return n.forEach((l,u)=>{const c=i.get(l);u.isFoundDocument()!==c.isFoundDocument()&&(s=s.add(l)),u.isNoDocument()&&u.version.isEqual(Y.min())?(e.removeEntry(l,u.readTime),o=o.insert(l,u)):!c.isValidDocument()||u.version.compareTo(c.version)>0||u.version.compareTo(c.version)===0&&c.hasPendingWrites?(e.addEntry(u),o=o.insert(l,u)):W(Rp,"Ignoring outdated watch update for ",l,". Current version:",c.version," Watch version:",u.version)}),{Bs:o,Ls:s}})}function XP(t,e){const n=X(t);return n.persistence.runTransaction("Get next mutation batch","readonly",r=>(e===void 0&&(e=gp),n.mutationQueue.getNextMutationBatchAfterBatchId(r,e)))}function JP(t,e){const n=X(t);return n.persistence.runTransaction("Allocate target","readwrite",r=>{let s;return n.li.getTargetData(r,e).next(i=>i?(s=i,j.resolve(s)):n.li.allocateTargetId(r).next(o=>(s=new Pn(e,o,"TargetPurposeListen",r.currentSequenceNumber),n.li.addTargetData(r,s).next(()=>s))))}).then(r=>{const s=n.vs.get(r.targetId);return(s===null||r.snapshotVersion.compareTo(s.snapshotVersion)>0)&&(n.vs=n.vs.insert(r.targetId,r),n.Fs.set(e,r.targetId)),r})}async function nf(t,e,n){const r=X(t),s=r.vs.get(e),i=n?"readwrite":"readwrite-primary";try{n||await r.persistence.runTransaction("Release target",i,o=>r.persistence.referenceDelegate.removeTarget(o,s))}catch(o){if(!Oi(o))throw o;W(Rp,`Failed to update sequence numbers for target ${e}: ${o}`)}r.vs=r.vs.remove(e),r.Fs.delete(s.target)}function x_(t,e,n){const r=X(t);let s=Y.min(),i=te();return r.persistence.runTransaction("Execute query","readwrite",o=>function(u,c,d){const m=X(u),g=m.Fs.get(d);return g!==void 0?j.resolve(m.vs.get(g)):m.li.getTargetData(c,d)}(r,o,_n(e)).next(l=>{if(l)return s=l.lastLimboFreeSnapshotVersion,r.li.getMatchingKeysForTargetId(o,l.targetId).next(u=>{i=u})}).next(()=>r.Cs.getDocumentsMatchingQuery(o,e,n?s:Y.min(),n?i:te())).next(l=>(ZP(r,UR(e),l),{documents:l,ks:i})))}function ZP(t,e,n){let r=t.Ms.get(e)||Y.min();n.forEach((s,i)=>{i.readTime.compareTo(r)>0&&(r=i.readTime)}),t.Ms.set(e,r)}class S_{constructor(){this.activeTargetIds=HR()}Qs(e){this.activeTargetIds=this.activeTargetIds.add(e)}Gs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Ws(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class eN{constructor(){this.vo=new S_,this.Fo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,n,r){}addLocalQueryTarget(e,n=!0){return n&&this.vo.Qs(e),this.Fo[e]||"not-current"}updateQueryState(e,n,r){this.Fo[e]=n}removeLocalQueryTarget(e){this.vo.Gs(e)}isLocalQueryTarget(e){return this.vo.activeTargetIds.has(e)}clearQueryState(e){delete this.Fo[e]}getAllActiveQueryTargets(){return this.vo.activeTargetIds}isActiveQueryTarget(e){return this.vo.activeTargetIds.has(e)}start(){return this.vo=new S_,Promise.resolve()}handleUserChange(e,n,r){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
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
 */class tN{Mo(e){}shutdown(){}}/**
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
 */const A_="ConnectivityMonitor";class C_{constructor(){this.xo=()=>this.Oo(),this.No=()=>this.Bo(),this.Lo=[],this.ko()}Mo(e){this.Lo.push(e)}shutdown(){window.removeEventListener("online",this.xo),window.removeEventListener("offline",this.No)}ko(){window.addEventListener("online",this.xo),window.addEventListener("offline",this.No)}Oo(){W(A_,"Network connectivity changed: AVAILABLE");for(const e of this.Lo)e(0)}Bo(){W(A_,"Network connectivity changed: UNAVAILABLE");for(const e of this.Lo)e(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
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
 */let yl=null;function rf(){return yl===null?yl=function(){return 268435456+Math.round(2147483648*Math.random())}():yl++,"0x"+yl.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Oh="RestConnection",nN={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery",ExecutePipeline:"executePipeline"};class rN{get Ko(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const n=e.ssl?"https":"http",r=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.qo=n+"://"+e.host,this.Uo=`projects/${r}/databases/${s}`,this.$o=this.databaseId.database===wu?`project_id=${r}`:`project_id=${r}&database_id=${s}`}Wo(e,n,r,s,i){const o=rf(),l=this.Qo(e,n.toUriEncodedString());W(Oh,`Sending RPC '${e}' ${o}:`,l,r);const u={"google-cloud-resource-prefix":this.Uo,"x-goog-request-params":this.$o};this.Go(u,s,i);const{host:c}=new URL(l),d=As(c);return this.zo(e,l,u,r,d).then(m=>(W(Oh,`Received RPC '${e}' ${o}: `,m),m),m=>{throw Dr(Oh,`RPC '${e}' ${o} failed with error: `,m,"url: ",l,"request:",r),m})}jo(e,n,r,s,i,o){return this.Wo(e,n,r,s,i)}Go(e,n,r){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+bi}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),n&&n.headers.forEach((s,i)=>e[i]=s),r&&r.headers.forEach((s,i)=>e[i]=s)}Qo(e,n){const r=nN[e];let s=`${this.qo}/v1/${n}:${r}`;return this.databaseInfo.apiKey&&(s=`${s}?key=${encodeURIComponent(this.databaseInfo.apiKey)}`),s}terminate(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sN{constructor(e){this.Jo=e.Jo,this.Ho=e.Ho}Zo(e){this.Xo=e}Yo(e){this.e_=e}t_(e){this.n_=e}onMessage(e){this.r_=e}close(){this.Ho()}send(e){this.Jo(e)}i_(){this.Xo()}s_(){this.e_()}o_(e){this.n_(e)}__(e){this.r_(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const rt="WebChannelConnection",ho=(t,e,n)=>{t.listen(e,r=>{try{n(r)}catch(s){setTimeout(()=>{throw s},0)}})};class oi extends rN{constructor(e){super(e),this.a_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}static u_(){if(!oi.c_){const e=_E();ho(e,yE.STAT_EVENT,n=>{n.stat===Hd.PROXY?W(rt,"STAT_EVENT: detected buffering proxy"):n.stat===Hd.NOPROXY&&W(rt,"STAT_EVENT: detected no buffering proxy")}),oi.c_=!0}}zo(e,n,r,s,i){const o=rf();return new Promise((l,u)=>{const c=new mE;c.setWithCredentials(!0),c.listenOnce(gE.COMPLETE,()=>{try{switch(c.getLastErrorCode()){case Vl.NO_ERROR:const m=c.getResponseJson();W(rt,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(m)),l(m);break;case Vl.TIMEOUT:W(rt,`RPC '${e}' ${o} timed out`),u(new B(M.DEADLINE_EXCEEDED,"Request time out"));break;case Vl.HTTP_ERROR:const g=c.getStatus();if(W(rt,`RPC '${e}' ${o} failed with status:`,g,"response text:",c.getResponseText()),g>0){let w=c.getResponseJson();Array.isArray(w)&&(w=w[0]);const A=w==null?void 0:w.error;if(A&&A.status&&A.message){const P=function(x){const v=x.toLowerCase().replace(/_/g,"-");return Object.values(M).indexOf(v)>=0?v:M.UNKNOWN}(A.status);u(new B(P,A.message))}else u(new B(M.UNKNOWN,"Server responded with status "+c.getStatus()))}else u(new B(M.UNAVAILABLE,"Connection failed."));break;default:G(9055,{l_:e,streamId:o,h_:c.getLastErrorCode(),P_:c.getLastError()})}}finally{W(rt,`RPC '${e}' ${o} completed.`)}});const d=JSON.stringify(s);W(rt,`RPC '${e}' ${o} sending request:`,s),c.send(n,"POST",d,r,15)})}T_(e,n,r){const s=rf(),i=[this.qo,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=this.createWebChannelTransport(),l={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;u!==void 0&&(l.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(l.useFetchStreams=!0),this.Go(l.initMessageHeaders,n,r),l.encodeInitMessageHeaders=!0;const c=i.join("");W(rt,`Creating RPC '${e}' stream ${s}: ${c}`,l);const d=o.createWebChannel(c,l);this.I_(d);let m=!1,g=!1;const w=new sN({Jo:A=>{g?W(rt,`Not sending because RPC '${e}' stream ${s} is closed:`,A):(m||(W(rt,`Opening RPC '${e}' stream ${s} transport.`),d.open(),m=!0),W(rt,`RPC '${e}' stream ${s} sending:`,A),d.send(A))},Ho:()=>d.close()});return ho(d,wo.EventType.OPEN,()=>{g||(W(rt,`RPC '${e}' stream ${s} transport opened.`),w.i_())}),ho(d,wo.EventType.CLOSE,()=>{g||(g=!0,W(rt,`RPC '${e}' stream ${s} transport closed`),w.o_(),this.E_(d))}),ho(d,wo.EventType.ERROR,A=>{g||(g=!0,Dr(rt,`RPC '${e}' stream ${s} transport errored. Name:`,A.name,"Message:",A.message),w.o_(new B(M.UNAVAILABLE,"The operation could not be completed")))}),ho(d,wo.EventType.MESSAGE,A=>{var P;if(!g){const N=A.data[0];le(!!N,16349);const x=N,v=(x==null?void 0:x.error)||((P=x[0])==null?void 0:P.error);if(v){W(rt,`RPC '${e}' stream ${s} received error:`,v);const k=v.status;let D=function(E){const _=De[E];if(_!==void 0)return nT(_)}(k),U=v.message;k==="NOT_FOUND"&&U.includes("database")&&U.includes("does not exist")&&U.includes(this.databaseId.database)&&Dr(`Database '${this.databaseId.database}' not found. Please check your project configuration.`),D===void 0&&(D=M.INTERNAL,U="Unknown error status: "+k+" with message "+v.message),g=!0,w.o_(new B(D,U)),d.close()}else W(rt,`RPC '${e}' stream ${s} received:`,N),w.__(N)}}),oi.u_(),setTimeout(()=>{w.s_()},0),w}terminate(){this.a_.forEach(e=>e.close()),this.a_=[]}I_(e){this.a_.push(e)}E_(e){this.a_=this.a_.filter(n=>n===e)}Go(e,n,r){super.Go(e,n,r),this.databaseInfo.apiKey&&(e["x-goog-api-key"]=this.databaseInfo.apiKey)}createWebChannelTransport(){return vE()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function iN(t){return new oi(t)}function Vh(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pc(t){return new uP(t,!0)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */oi.c_=!1;class yT{constructor(e,n,r=1e3,s=1.5,i=6e4){this.Ci=e,this.timerId=n,this.R_=r,this.A_=s,this.V_=i,this.d_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.d_=0}g_(){this.d_=this.V_}p_(e){this.cancel();const n=Math.floor(this.d_+this.y_()),r=Math.max(0,Date.now()-this.f_),s=Math.max(0,n-r);s>0&&W("ExponentialBackoff",`Backing off for ${s} ms (base delay: ${this.d_} ms, delay with jitter: ${n} ms, last attempt: ${r} ms ago)`),this.m_=this.Ci.enqueueAfterDelay(this.timerId,s,()=>(this.f_=Date.now(),e())),this.d_*=this.A_,this.d_<this.R_&&(this.d_=this.R_),this.d_>this.V_&&(this.d_=this.V_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.d_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const k_="PersistentStream";class _T{constructor(e,n,r,s,i,o,l,u){this.Ci=e,this.S_=r,this.b_=s,this.connection=i,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=l,this.listener=u,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new yT(e,n)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Ci.enqueueAfterDelay(this.S_,6e4,()=>this.k_()))}K_(e){this.q_(),this.stream.send(e)}async k_(){if(this.O_())return this.close(0)}q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,n){this.q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():n&&n.code===M.RESOURCE_EXHAUSTED?(Bn(n.toString()),Bn("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):n&&n.code===M.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.W_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.t_(n)}W_(){}auth(){this.state=1;const e=this.Q_(this.D_),n=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([r,s])=>{this.D_===n&&this.G_(r,s)},r=>{e(()=>{const s=new B(M.UNKNOWN,"Fetching auth token failed: "+r.message);return this.z_(s)})})}G_(e,n){const r=this.Q_(this.D_);this.stream=this.j_(e,n),this.stream.Zo(()=>{r(()=>this.listener.Zo())}),this.stream.Yo(()=>{r(()=>(this.state=2,this.v_=this.Ci.enqueueAfterDelay(this.b_,1e4,()=>(this.O_()&&(this.state=3),Promise.resolve())),this.listener.Yo()))}),this.stream.t_(s=>{r(()=>this.z_(s))}),this.stream.onMessage(s=>{r(()=>++this.F_==1?this.J_(s):this.onNext(s))})}N_(){this.state=5,this.M_.p_(async()=>{this.state=0,this.start()})}z_(e){return W(k_,`close with error: ${e}`),this.stream=null,this.close(4,e)}Q_(e){return n=>{this.Ci.enqueueAndForget(()=>this.D_===e?n():(W(k_,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class oN extends _T{constructor(e,n,r,s,i,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",n,r,s,o),this.serializer=i}j_(e,n){return this.connection.T_("Listen",e,n)}J_(e){return this.onNext(e)}onNext(e){this.M_.reset();const n=dP(this.serializer,e),r=function(i){if(!("targetChange"in i))return Y.min();const o=i.targetChange;return o.targetIds&&o.targetIds.length?Y.min():o.readTime?vn(o.readTime):Y.min()}(e);return this.listener.H_(n,r)}Z_(e){const n={};n.database=tf(this.serializer),n.addTarget=function(i,o){let l;const u=o.target;if(l=Yd(u)?{documents:mP(i,u)}:{query:gP(i,u).ft},l.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){l.resumeToken=iT(i,o.resumeToken);const c=Jd(i,o.expectedCount);c!==null&&(l.expectedCount=c)}else if(o.snapshotVersion.compareTo(Y.min())>0){l.readTime=xu(i,o.snapshotVersion.toTimestamp());const c=Jd(i,o.expectedCount);c!==null&&(l.expectedCount=c)}return l}(this.serializer,e);const r=_P(this.serializer,e);r&&(n.labels=r),this.K_(n)}X_(e){const n={};n.database=tf(this.serializer),n.removeTarget=e,this.K_(n)}}class aN extends _T{constructor(e,n,r,s,i,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",n,r,s,o),this.serializer=i}get Y_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}W_(){this.Y_&&this.ea([])}j_(e,n){return this.connection.T_("Write",e,n)}J_(e){return le(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,le(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta()}onNext(e){le(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();const n=pP(e.writeResults,e.commitTime),r=vn(e.commitTime);return this.listener.na(r,n)}ra(){const e={};e.database=tf(this.serializer),this.K_(e)}ea(e){const n={streamToken:this.lastStreamToken,writes:e.map(r=>fP(this.serializer,r))};this.K_(n)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lN{}class uN extends lN{constructor(e,n,r,s){super(),this.authCredentials=e,this.appCheckCredentials=n,this.connection=r,this.serializer=s,this.ia=!1}sa(){if(this.ia)throw new B(M.FAILED_PRECONDITION,"The client has already been terminated.")}Wo(e,n,r,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([i,o])=>this.connection.Wo(e,Zd(n,r),s,i,o)).catch(i=>{throw i.name==="FirebaseError"?(i.code===M.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),i):new B(M.UNKNOWN,i.toString())})}jo(e,n,r,s,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,l])=>this.connection.jo(e,Zd(n,r),s,o,l,i)).catch(o=>{throw o.name==="FirebaseError"?(o.code===M.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new B(M.UNKNOWN,o.toString())})}terminate(){this.ia=!0,this.connection.terminate()}}function cN(t,e,n,r){return new uN(t,e,n,r)}class hN{constructor(e,n){this.asyncQueue=e,this.onlineStateHandler=n,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve())))}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ca("Offline")))}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e)}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}la(e){const n=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.aa?(Bn(n),this.aa=!1):W("OnlineStateTracker",n)}Pa(){this._a!==null&&(this._a.cancel(),this._a=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Tn="RemoteStore";class dN{constructor(e,n,r,s,i){this.localStore=e,this.datastore=n,this.asyncQueue=r,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Map,this.Ra=new Map,this.Aa=new jr(1e3),this.Va=new jr(1001),this.da=new Set,this.ma=[],this.fa=i,this.fa.Mo(o=>{r.enqueueAndForget(async()=>{Rs(this)&&(W(Tn,"Restarting streams for network reachability change."),await async function(u){const c=X(u);c.da.add(4),await Ra(c),c.ga.set("Unknown"),c.da.delete(4),await mc(c)}(this))})}),this.ga=new hN(r,s)}}async function mc(t){if(Rs(t))for(const e of t.ma)await e(!0)}async function Ra(t){for(const e of t.ma)await e(!1)}function sf(t,e){return t.Ea.get(e)||void 0}function vT(t,e){const n=X(t),r=sf(n,e.targetId);if(r!==void 0&&n.Ia.has(r))return;const s=function(l,u){const c=sf(l,u);c!==void 0&&l.Ra.delete(c);const d=function(g,w){return w%2!=0?g.Va.next():g.Aa.next()}(l,u);return l.Ea.set(u,d),l.Ra.set(d,u),d}(n,e.targetId);W(Tn,"remoteStoreListen mapping SDK target ID to remote",e.targetId,s);const i=new Pn(e.target,s,e.purpose,e.sequenceNumber,e.snapshotVersion,e.lastLimboFreeSnapshotVersion,e.resumeToken);n.Ia.set(s,i),Dp(n)?bp(n):Li(n).O_()&&Np(n,i)}function Pp(t,e){const n=X(t),r=Li(n),s=sf(n,e);W(Tn,"remoteStoreUnlisten removing mapping of SDK target ID to remote",e,s),n.Ia.delete(s),n.Ea.delete(e),n.Ra.delete(s),r.O_()&&wT(n,s),n.Ia.size===0&&(r.O_()?r.L_():Rs(n)&&n.ga.set("Unknown"))}function Np(t,e){if(t.pa.$e(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(Y.min())>0){const n=t.Ra.get(e.targetId);if(n===void 0)return void W(Tn,"SDK target ID not found for remote ID: "+e.targetId);const r=t.remoteSyncer.getRemoteKeysForTarget(n).size;e=e.withExpectedCount(r)}Li(t).Z_(e)}function wT(t,e){t.pa.$e(e),Li(t).X_(e)}function bp(t){t.pa=new iP({getRemoteKeysForTarget:e=>{const n=t.Ra.get(e);return n!==void 0?t.remoteSyncer.getRemoteKeysForTarget(n):te()},At:e=>t.Ia.get(e)||null,ht:()=>t.datastore.serializer.databaseId}),Li(t).start(),t.ga.ua()}function Dp(t){return Rs(t)&&!Li(t).x_()&&t.Ia.size>0}function Rs(t){return X(t).da.size===0}function ET(t){t.pa=void 0}async function fN(t){t.ga.set("Online")}async function pN(t){t.Ia.forEach((e,n)=>{Np(t,e)})}async function mN(t,e){ET(t),Dp(t)?(t.ga.ha(e),bp(t)):t.ga.set("Unknown")}async function gN(t,e,n){if(t.ga.set("Online"),e instanceof sT&&e.state===2&&e.cause)try{await async function(s,i){const o=i.cause;for(const l of i.targetIds){if(s.Ia.has(l)){const u=s.Ra.get(l);u!==void 0&&(await s.remoteSyncer.rejectListen(u,o),s.Ea.delete(u),s.Ra.delete(l)),s.Ia.delete(l)}s.pa.removeTarget(l)}}(t,e)}catch(r){W(Tn,"Failed to remove targets %s: %s ",e.targetIds.join(","),r),await Au(t,r)}else if(e instanceof Ul?t.pa.Xe(e):e instanceof rT?t.pa.st(e):t.pa.tt(e),!n.isEqual(Y.min()))try{const r=await gT(t.localStore);n.compareTo(r)>=0&&await function(i,o){const l=i.pa.Tt(o);l.targetChanges.forEach((c,d)=>{if(c.resumeToken.approximateByteSize()>0){const m=i.Ia.get(d);m&&i.Ia.set(d,m.withResumeToken(c.resumeToken,o))}}),l.targetMismatches.forEach((c,d)=>{const m=i.Ia.get(c);if(!m)return;i.Ia.set(c,m.withResumeToken(Ge.EMPTY_BYTE_STRING,m.snapshotVersion)),wT(i,c);const g=new Pn(m.target,c,d,m.sequenceNumber);Np(i,g)});const u=function(d,m){const g=new Map;m.targetChanges.forEach((A,P)=>{const N=d.Ra.get(P);N!==void 0&&g.set(N,A)});let w=new we(ee);return m.targetMismatches.forEach((A,P)=>{const N=d.Ra.get(A);N!==void 0&&(w=w.insert(N,P))}),new Ca(m.snapshotVersion,g,w,m.documentUpdates,m.resolvedLimboDocuments)}(i,l);return i.remoteSyncer.applyRemoteEvent(u)}(t,n)}catch(r){W(Tn,"Failed to raise snapshot:",r),await Au(t,r)}}async function Au(t,e,n){if(!Oi(e))throw e;t.da.add(1),await Ra(t),t.ga.set("Offline"),n||(n=()=>gT(t.localStore)),t.asyncQueue.enqueueRetryable(async()=>{W(Tn,"Retrying IndexedDB access"),await n(),t.da.delete(1),await mc(t)})}function TT(t,e){return e().catch(n=>Au(t,n,e))}async function gc(t){const e=X(t),n=Ur(e);let r=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:gp;for(;yN(e);)try{const s=await XP(e.localStore,r);if(s===null){e.Ta.length===0&&n.L_();break}r=s.batchId,_N(e,s)}catch(s){await Au(e,s)}IT(e)&&xT(e)}function yN(t){return Rs(t)&&t.Ta.length<10}function _N(t,e){t.Ta.push(e);const n=Ur(t);n.O_()&&n.Y_&&n.ea(e.mutations)}function IT(t){return Rs(t)&&!Ur(t).x_()&&t.Ta.length>0}function xT(t){Ur(t).start()}async function vN(t){Ur(t).ra()}async function wN(t){const e=Ur(t);for(const n of t.Ta)e.ea(n.mutations)}async function EN(t,e,n){const r=t.Ta.shift(),s=Ip.from(r,e,n);await TT(t,()=>t.remoteSyncer.applySuccessfulWrite(s)),await gc(t)}async function TN(t,e){e&&Ur(t).Y_&&await async function(r,s){if(function(o){return nP(o)&&o!==M.ABORTED}(s.code)){const i=r.Ta.shift();Ur(r).B_(),await TT(r,()=>r.remoteSyncer.rejectFailedWrite(i.batchId,s)),await gc(r)}}(t,e),IT(t)&&xT(t)}async function R_(t,e){const n=X(t);n.asyncQueue.verifyOperationInProgress(),W(Tn,"RemoteStore received new credentials");const r=Rs(n);n.da.add(3),await Ra(n),r&&n.ga.set("Unknown"),await n.remoteSyncer.handleCredentialChange(e),n.da.delete(3),await mc(n)}async function IN(t,e){const n=X(t);e?(n.da.delete(2),await mc(n)):e||(n.da.add(2),await Ra(n),n.ga.set("Unknown"))}function Li(t){return t.ya||(t.ya=function(n,r,s){const i=X(n);return i.sa(),new oN(r,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(t.datastore,t.asyncQueue,{Zo:fN.bind(null,t),Yo:pN.bind(null,t),t_:mN.bind(null,t),H_:gN.bind(null,t)}),t.ma.push(async e=>{e?(t.ya.B_(),Dp(t)?bp(t):t.ga.set("Unknown")):(await t.ya.stop(),ET(t))})),t.ya}function Ur(t){return t.wa||(t.wa=function(n,r,s){const i=X(n);return i.sa(),new aN(r,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(t.datastore,t.asyncQueue,{Zo:()=>Promise.resolve(),Yo:vN.bind(null,t),t_:TN.bind(null,t),ta:wN.bind(null,t),na:EN.bind(null,t)}),t.ma.push(async e=>{e?(t.wa.B_(),await gc(t)):(await t.wa.stop(),t.Ta.length>0&&(W(Tn,`Stopping write stream with ${t.Ta.length} pending writes`),t.Ta=[]))})),t.wa}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Op{constructor(e,n,r,s,i){this.asyncQueue=e,this.timerId=n,this.targetTimeMs=r,this.op=s,this.removalCallback=i,this.deferred=new On,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,n,r,s,i){const o=Date.now()+r,l=new Op(e,n,o,s,i);return l.start(r),l}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new B(M.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Vp(t,e){if(Bn("AsyncQueue",`${e}: ${t}`),Oi(t))return new B(M.UNAVAILABLE,`${e}: ${t}`);throw t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ai{static emptySet(e){return new ai(e.comparator)}constructor(e){this.comparator=e?(n,r)=>e(n,r)||q.comparator(n.key,r.key):(n,r)=>q.comparator(n.key,r.key),this.keyedMap=Eo(),this.sortedSet=new we(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const n=this.keyedMap.get(e);return n?this.sortedSet.indexOf(n):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((n,r)=>(e(n),!1))}add(e){const n=this.delete(e.key);return n.copy(n.keyedMap.insert(e.key,e),n.sortedSet.insert(e,null))}delete(e){const n=this.get(e);return n?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(n)):this}isEqual(e){if(!(e instanceof ai)||this.size!==e.size)return!1;const n=this.sortedSet.getIterator(),r=e.sortedSet.getIterator();for(;n.hasNext();){const s=n.getNext().key,i=r.getNext().key;if(!s.isEqual(i))return!1}return!0}toString(){const e=[];return this.forEach(n=>{e.push(n.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,n){const r=new ai;return r.comparator=this.comparator,r.keyedMap=e,r.sortedSet=n,r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class P_{constructor(){this.Sa=new we(q.comparator)}track(e){const n=e.doc.key,r=this.Sa.get(n);r?e.type!==0&&r.type===3?this.Sa=this.Sa.insert(n,e):e.type===3&&r.type!==1?this.Sa=this.Sa.insert(n,{type:r.type,doc:e.doc}):e.type===2&&r.type===2?this.Sa=this.Sa.insert(n,{type:2,doc:e.doc}):e.type===2&&r.type===0?this.Sa=this.Sa.insert(n,{type:0,doc:e.doc}):e.type===1&&r.type===0?this.Sa=this.Sa.remove(n):e.type===1&&r.type===2?this.Sa=this.Sa.insert(n,{type:1,doc:r.doc}):e.type===0&&r.type===1?this.Sa=this.Sa.insert(n,{type:2,doc:e.doc}):G(63341,{Vt:e,ba:r}):this.Sa=this.Sa.insert(n,e)}Da(){const e=[];return this.Sa.inorderTraversal((n,r)=>{e.push(r)}),e}}class xi{constructor(e,n,r,s,i,o,l,u,c){this.query=e,this.docs=n,this.oldDocs=r,this.docChanges=s,this.mutatedKeys=i,this.fromCache=o,this.syncStateChanged=l,this.excludesMetadataChanges=u,this.hasCachedResults=c}static fromInitialDocuments(e,n,r,s,i){const o=[];return n.forEach(l=>{o.push({type:0,doc:l})}),new xi(e,n,ai.emptySet(n),o,r,s,!0,!1,i)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&uc(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const n=this.docChanges,r=e.docChanges;if(n.length!==r.length)return!1;for(let s=0;s<n.length;s++)if(n[s].type!==r[s].type||!n[s].doc.isEqual(r[s].doc))return!1;return!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xN{constructor(){this.Ca=void 0,this.va=[]}Fa(){return this.va.some(e=>e.Ma())}}class SN{constructor(){this.queries=N_(),this.onlineState="Unknown",this.xa=new Set}terminate(){(function(n,r){const s=X(n),i=s.queries;s.queries=N_(),i.forEach((o,l)=>{for(const u of l.va)u.onError(r)})})(this,new B(M.ABORTED,"Firestore shutting down"))}}function N_(){return new ks(t=>$E(t),uc)}async function Lp(t,e){const n=X(t);let r=3;const s=e.query;let i=n.queries.get(s);i?!i.Fa()&&e.Ma()&&(r=2):(i=new xN,r=e.Ma()?0:1);try{switch(r){case 0:i.Ca=await n.onListen(s,!0);break;case 1:i.Ca=await n.onListen(s,!1);break;case 2:await n.onFirstRemoteStoreListen(s)}}catch(o){const l=Vp(o,`Initialization of query '${js(e.query)}' failed`);return void e.onError(l)}n.queries.set(s,i),i.va.push(e),e.Oa(n.onlineState),i.Ca&&e.Na(i.Ca)&&jp(n)}async function Mp(t,e){const n=X(t),r=e.query;let s=3;const i=n.queries.get(r);if(i){const o=i.va.indexOf(e);o>=0&&(i.va.splice(o,1),i.va.length===0?s=e.Ma()?0:1:!i.Fa()&&e.Ma()&&(s=2))}switch(s){case 0:return n.queries.delete(r),n.onUnlisten(r,!0);case 1:return n.queries.delete(r),n.onUnlisten(r,!1);case 2:return n.onLastRemoteStoreUnlisten(r);default:return}}function AN(t,e){const n=X(t);let r=!1;for(const s of e){const i=s.query,o=n.queries.get(i);if(o){for(const l of o.va)l.Na(s)&&(r=!0);o.Ca=s}}r&&jp(n)}function CN(t,e,n){const r=X(t),s=r.queries.get(e);if(s)for(const i of s.va)i.onError(n);r.queries.delete(e)}function jp(t){t.xa.forEach(e=>{e.next()})}var of,b_;(b_=of||(of={})).Ba="default",b_.Cache="cache";class Up{constructor(e,n,r){this.query=e,this.La=n,this.ka=!1,this.Ka=null,this.onlineState="Unknown",this.options=r||{}}Na(e){if(!this.options.includeMetadataChanges){const r=[];for(const s of e.docChanges)s.type!==3&&r.push(s);e=new xi(e.query,e.docs,e.oldDocs,r,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let n=!1;return this.ka?this.qa(e)&&(this.La.next(e),n=!0):this.Ua(e,this.onlineState)&&(this.$a(e),n=!0),this.Ka=e,n}onError(e){this.La.error(e)}Oa(e){this.onlineState=e;let n=!1;return this.Ka&&!this.ka&&this.Ua(this.Ka,e)&&(this.$a(this.Ka),n=!0),n}Ua(e,n){if(!e.fromCache||!this.Ma())return!0;const r=n!=="Offline";return(!this.options.Wa||!r)&&(!e.docs.isEmpty()||e.hasCachedResults||n==="Offline")}qa(e){if(e.docChanges.length>0)return!0;const n=this.Ka&&this.Ka.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!n)&&this.options.includeMetadataChanges===!0}$a(e){e=xi.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.ka=!0,this.La.next(e)}Ma(){return this.options.source!==of.Cache}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ST{constructor(e){this.key=e}}class AT{constructor(e){this.key=e}}class kN{constructor(e,n){this.query=e,this.tu=n,this.nu=null,this.hasCachedResults=!1,this.current=!1,this.ru=te(),this.mutatedKeys=te(),this.iu=WE(e),this.su=new ai(this.iu)}get ou(){return this.tu}_u(e,n){const r=n?n.au:new P_,s=n?n.su:this.su;let i=n?n.mutatedKeys:this.mutatedKeys,o=s,l=!1;const u=this.query.limitType==="F"&&s.size===this.query.limit?s.last():null,c=this.query.limitType==="L"&&s.size===this.query.limit?s.first():null;if(e.inorderTraversal((d,m)=>{const g=s.get(d),w=cc(this.query,m)?m:null,A=!!g&&this.mutatedKeys.has(g.key),P=!!w&&(w.hasLocalMutations||this.mutatedKeys.has(w.key)&&w.hasCommittedMutations);let N=!1;g&&w?g.data.isEqual(w.data)?A!==P&&(r.track({type:3,doc:w}),N=!0):this.uu(g,w)||(r.track({type:2,doc:w}),N=!0,(u&&this.iu(w,u)>0||c&&this.iu(w,c)<0)&&(l=!0)):!g&&w?(r.track({type:0,doc:w}),N=!0):g&&!w&&(r.track({type:1,doc:g}),N=!0,(u||c)&&(l=!0)),N&&(w?(o=o.add(w),i=P?i.add(d):i.delete(d)):(o=o.delete(d),i=i.delete(d)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const d=this.query.limitType==="F"?o.last():o.first();o=o.delete(d.key),i=i.delete(d.key),r.track({type:1,doc:d})}return{su:o,au:r,bs:l,mutatedKeys:i}}uu(e,n){return e.hasLocalMutations&&n.hasCommittedMutations&&!n.hasLocalMutations}applyChanges(e,n,r,s){const i=this.su;this.su=e.su,this.mutatedKeys=e.mutatedKeys;const o=e.au.Da();o.sort((d,m)=>function(w,A){const P=N=>{switch(N){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return G(20277,{Vt:N})}};return P(w)-P(A)}(d.type,m.type)||this.iu(d.doc,m.doc)),this.cu(r),s=s??!1;const l=n&&!s?this.lu():[],u=this.ru.size===0&&this.current&&!s?1:0,c=u!==this.nu;return this.nu=u,o.length!==0||c?{snapshot:new xi(this.query,e.su,i,o,e.mutatedKeys,u===0,c,!1,!!r&&r.resumeToken.approximateByteSize()>0),hu:l}:{hu:l}}Oa(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({su:this.su,au:new P_,mutatedKeys:this.mutatedKeys,bs:!1},!1)):{hu:[]}}Pu(e){return!this.tu.has(e)&&!!this.su.has(e)&&!this.su.get(e).hasLocalMutations}cu(e){e&&(e.addedDocuments.forEach(n=>this.tu=this.tu.add(n)),e.modifiedDocuments.forEach(n=>{}),e.removedDocuments.forEach(n=>this.tu=this.tu.delete(n)),this.current=e.current)}lu(){if(!this.current)return[];const e=this.ru;this.ru=te(),this.su.forEach(r=>{this.Pu(r.key)&&(this.ru=this.ru.add(r.key))});const n=[];return e.forEach(r=>{this.ru.has(r)||n.push(new AT(r))}),this.ru.forEach(r=>{e.has(r)||n.push(new ST(r))}),n}Tu(e){this.tu=e.ks,this.ru=te();const n=this._u(e.documents);return this.applyChanges(n,!0)}Iu(){return xi.fromInitialDocuments(this.query,this.su,this.mutatedKeys,this.nu===0,this.hasCachedResults)}}const Fp="SyncEngine";class RN{constructor(e,n,r){this.query=e,this.targetId=n,this.view=r}}class PN{constructor(e){this.key=e,this.Eu=!1}}class NN{constructor(e,n,r,s,i,o){this.localStore=e,this.remoteStore=n,this.eventManager=r,this.sharedClientState=s,this.currentUser=i,this.maxConcurrentLimboResolutions=o,this.Ru={},this.Au=new ks(l=>$E(l),uc),this.Vu=new Map,this.du=new Set,this.mu=new we(q.comparator),this.fu=new Map,this.gu=new Ap,this.pu={},this.yu=new Map,this.wu=jr.ar(),this.onlineState="Unknown",this.Su=void 0}get isPrimaryClient(){return this.Su===!0}}async function bN(t,e,n=!0){const r=bT(t);let s;const i=r.Au.get(e);return i?(r.sharedClientState.addLocalQueryTarget(i.targetId),s=i.view.Iu()):s=await CT(r,e,n,!0),s}async function DN(t,e){const n=bT(t);await CT(n,e,!0,!1)}async function CT(t,e,n,r){const s=await JP(t.localStore,_n(e)),i=s.targetId,o=t.sharedClientState.addLocalQueryTarget(i,n);let l;return r&&(l=await ON(t,e,i,o==="current",s.resumeToken)),t.isPrimaryClient&&n&&vT(t.remoteStore,s),l}async function ON(t,e,n,r,s){t.bu=(m,g,w)=>async function(P,N,x,v){let k=N.view._u(x);k.bs&&(k=await x_(P.localStore,N.query,!1).then(({documents:E})=>N.view._u(E,k)));const D=v&&v.targetChanges.get(N.targetId),U=v&&v.targetMismatches.get(N.targetId)!=null,L=N.view.applyChanges(k,P.isPrimaryClient,D,U);return O_(P,N.targetId,L.hu),L.snapshot}(t,m,g,w);const i=await x_(t.localStore,e,!0),o=new kN(e,i.ks),l=o._u(i.documents),u=ka.createSynthesizedTargetChangeForCurrentChange(n,r&&t.onlineState!=="Offline",s),c=o.applyChanges(l,t.isPrimaryClient,u);O_(t,n,c.hu);const d=new RN(e,n,o);return t.Au.set(e,d),t.Vu.has(n)?t.Vu.get(n).push(e):t.Vu.set(n,[e]),c.snapshot}async function VN(t,e,n){const r=X(t),s=r.Au.get(e),i=r.Vu.get(s.targetId);if(i.length>1)return r.Vu.set(s.targetId,i.filter(o=>!uc(o,e))),void r.Au.delete(e);r.isPrimaryClient?(r.sharedClientState.removeLocalQueryTarget(s.targetId),r.sharedClientState.isActiveQueryTarget(s.targetId)||await nf(r.localStore,s.targetId,!1).then(()=>{r.sharedClientState.clearQueryState(s.targetId),n&&Pp(r.remoteStore,s.targetId),af(r,s.targetId)}).catch(Di)):(af(r,s.targetId),await nf(r.localStore,s.targetId,!0))}async function LN(t,e){const n=X(t),r=n.Au.get(e),s=n.Vu.get(r.targetId);n.isPrimaryClient&&s.length===1&&(n.sharedClientState.removeLocalQueryTarget(r.targetId),Pp(n.remoteStore,r.targetId))}async function MN(t,e,n){const r=WN(t);try{const s=await function(o,l){const u=X(o),c=de.now(),d=l.reduce((w,A)=>w.add(A.key),te());let m,g;return u.persistence.runTransaction("Locally write mutations","readwrite",w=>{let A=$n(),P=te();return u.xs.getEntries(w,d).next(N=>{A=N,A.forEach((x,v)=>{v.isValidDocument()||(P=P.add(x))})}).next(()=>u.localDocuments.getOverlayedDocuments(w,A)).next(N=>{m=N;const x=[];for(const v of l){const k=XR(v,m.get(v.key).overlayedDocument);k!=null&&x.push(new qr(v.key,k,VE(k.value.mapValue),mt.exists(!0)))}return u.mutationQueue.addMutationBatch(w,c,x,l)}).next(N=>{g=N;const x=N.applyToLocalDocumentSet(m,P);return u.documentOverlayCache.saveOverlays(w,N.batchId,x)})}).then(()=>({batchId:g.batchId,changes:qE(m)}))}(r.localStore,e);r.sharedClientState.addPendingMutation(s.batchId),function(o,l,u){let c=o.pu[o.currentUser.toKey()];c||(c=new we(ee)),c=c.insert(l,u),o.pu[o.currentUser.toKey()]=c}(r,s.batchId,n),await Pa(r,s.changes),await gc(r.remoteStore)}catch(s){const i=Vp(s,"Failed to persist write");n.reject(i)}}async function kT(t,e){const n=X(t);try{const r=await QP(n.localStore,e);e.targetChanges.forEach((s,i)=>{const o=n.fu.get(i);o&&(le(s.addedDocuments.size+s.modifiedDocuments.size+s.removedDocuments.size<=1,22616),s.addedDocuments.size>0?o.Eu=!0:s.modifiedDocuments.size>0?le(o.Eu,14607):s.removedDocuments.size>0&&(le(o.Eu,42227),o.Eu=!1))}),await Pa(n,r,e)}catch(r){await Di(r)}}function D_(t,e,n){const r=X(t);if(r.isPrimaryClient&&n===0||!r.isPrimaryClient&&n===1){const s=[];r.Au.forEach((i,o)=>{const l=o.view.Oa(e);l.snapshot&&s.push(l.snapshot)}),function(o,l){const u=X(o);u.onlineState=l;let c=!1;u.queries.forEach((d,m)=>{for(const g of m.va)g.Oa(l)&&(c=!0)}),c&&jp(u)}(r.eventManager,e),s.length&&r.Ru.H_(s),r.onlineState=e,r.isPrimaryClient&&r.sharedClientState.setOnlineState(e)}}async function jN(t,e,n){const r=X(t);r.sharedClientState.updateQueryState(e,"rejected",n);const s=r.fu.get(e),i=s&&s.key;if(i){let o=new we(q.comparator);o=o.insert(i,ot.newNoDocument(i,Y.min()));const l=te().add(i),u=new Ca(Y.min(),new Map,new we(ee),o,l);await kT(r,u),r.mu=r.mu.remove(i),r.fu.delete(e),zp(r)}else await nf(r.localStore,e,!1).then(()=>af(r,e,n)).catch(Di)}async function UN(t,e){const n=X(t),r=e.batch.batchId;try{const s=await GP(n.localStore,e);PT(n,r,null),RT(n,r),n.sharedClientState.updateMutationState(r,"acknowledged"),await Pa(n,s)}catch(s){await Di(s)}}async function FN(t,e,n){const r=X(t);try{const s=await function(o,l){const u=X(o);return u.persistence.runTransaction("Reject batch","readwrite-primary",c=>{let d;return u.mutationQueue.lookupMutationBatch(c,l).next(m=>(le(m!==null,37113),d=m.keys(),u.mutationQueue.removeMutationBatch(c,m))).next(()=>u.mutationQueue.performConsistencyCheck(c)).next(()=>u.documentOverlayCache.removeOverlaysForBatchId(c,d,l)).next(()=>u.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(c,d)).next(()=>u.localDocuments.getDocuments(c,d))})}(r.localStore,e);PT(r,e,n),RT(r,e),r.sharedClientState.updateMutationState(e,"rejected",n),await Pa(r,s)}catch(s){await Di(s)}}function RT(t,e){(t.yu.get(e)||[]).forEach(n=>{n.resolve()}),t.yu.delete(e)}function PT(t,e,n){const r=X(t);let s=r.pu[r.currentUser.toKey()];if(s){const i=s.get(e);i&&(n?i.reject(n):i.resolve(),s=s.remove(e)),r.pu[r.currentUser.toKey()]=s}}function af(t,e,n=null){t.sharedClientState.removeLocalQueryTarget(e);for(const r of t.Vu.get(e))t.Au.delete(r),n&&t.Ru.Du(r,n);t.Vu.delete(e),t.isPrimaryClient&&t.gu.Gr(e).forEach(r=>{t.gu.containsKey(r)||NT(t,r)})}function NT(t,e){t.du.delete(e.path.canonicalString());const n=t.mu.get(e);n!==null&&(Pp(t.remoteStore,n),t.mu=t.mu.remove(e),t.fu.delete(n),zp(t))}function O_(t,e,n){for(const r of n)r instanceof ST?(t.gu.addReference(r.key,e),zN(t,r)):r instanceof AT?(W(Fp,"Document no longer in limbo: "+r.key),t.gu.removeReference(r.key,e),t.gu.containsKey(r.key)||NT(t,r.key)):G(19791,{Cu:r})}function zN(t,e){const n=e.key,r=n.path.canonicalString();t.mu.get(n)||t.du.has(r)||(W(Fp,"New document in limbo: "+n),t.du.add(r),zp(t))}function zp(t){for(;t.du.size>0&&t.mu.size<t.maxConcurrentLimboResolutions;){const e=t.du.values().next().value;t.du.delete(e);const n=new q(he.fromString(e)),r=t.wu.next();t.fu.set(r,new PN(n)),t.mu=t.mu.insert(n,r),vT(t.remoteStore,new Pn(_n(lc(n.path)),r,"TargetPurposeLimboResolution",ic.ce))}}async function Pa(t,e,n){const r=X(t),s=[],i=[],o=[];r.Au.isEmpty()||(r.Au.forEach((l,u)=>{o.push(r.bu(u,e,n).then(c=>{var d;if((c||n)&&r.isPrimaryClient){const m=c?!c.fromCache:(d=n==null?void 0:n.targetChanges.get(u.targetId))==null?void 0:d.current;r.sharedClientState.updateQueryState(u.targetId,m?"current":"not-current")}if(c){s.push(c);const m=kp.Es(u.targetId,c);i.push(m)}}))}),await Promise.all(o),r.Ru.H_(s),await async function(u,c){const d=X(u);try{await d.persistence.runTransaction("notifyLocalViewChanges","readwrite",m=>j.forEach(c,g=>j.forEach(g.Ts,w=>d.persistence.referenceDelegate.addReference(m,g.targetId,w)).next(()=>j.forEach(g.Is,w=>d.persistence.referenceDelegate.removeReference(m,g.targetId,w)))))}catch(m){if(!Oi(m))throw m;W(Rp,"Failed to update sequence numbers: "+m)}for(const m of c){const g=m.targetId;if(!m.fromCache){const w=d.vs.get(g),A=w.snapshotVersion,P=w.withLastLimboFreeSnapshotVersion(A);d.vs=d.vs.insert(g,P)}}}(r.localStore,i))}async function BN(t,e){const n=X(t);if(!n.currentUser.isEqual(e)){W(Fp,"User change. New user:",e.toKey());const r=await mT(n.localStore,e);n.currentUser=e,function(i,o){i.yu.forEach(l=>{l.forEach(u=>{u.reject(new B(M.CANCELLED,o))})}),i.yu.clear()}(n,"'waitForPendingWrites' promise is rejected due to a user change."),n.sharedClientState.handleUserChange(e,r.removedBatchIds,r.addedBatchIds),await Pa(n,r.Ns)}}function $N(t,e){const n=X(t),r=n.fu.get(e);if(r&&r.Eu)return te().add(r.key);{let s=te();const i=n.Vu.get(e);if(!i)return s;for(const o of i){const l=n.Au.get(o);s=s.unionWith(l.view.ou)}return s}}function bT(t){const e=X(t);return e.remoteStore.remoteSyncer.applyRemoteEvent=kT.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=$N.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=jN.bind(null,e),e.Ru.H_=AN.bind(null,e.eventManager),e.Ru.Du=CN.bind(null,e.eventManager),e}function WN(t){const e=X(t);return e.remoteStore.remoteSyncer.applySuccessfulWrite=UN.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=FN.bind(null,e),e}class Cu{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=pc(e.databaseInfo.databaseId),this.sharedClientState=this.Mu(e),this.persistence=this.xu(e),await this.persistence.start(),this.localStore=this.Ou(e),this.gcScheduler=this.Nu(e,this.localStore),this.indexBackfillerScheduler=this.Bu(e,this.localStore)}Nu(e,n){return null}Bu(e,n){return null}Ou(e){return KP(this.persistence,new WP,e.initialUser,this.serializer)}xu(e){return new pT(Cp.Vi,this.serializer)}Mu(e){return new eN}async terminate(){var e,n;(e=this.gcScheduler)==null||e.stop(),(n=this.indexBackfillerScheduler)==null||n.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}Cu.provider={build:()=>new Cu};class HN extends Cu{constructor(e){super(),this.cacheSizeBytes=e}Nu(e,n){le(this.persistence.referenceDelegate instanceof Su,46915);const r=this.persistence.referenceDelegate.garbageCollector;return new RP(r,e.asyncQueue,n)}xu(e){const n=this.cacheSizeBytes!==void 0?_t.withCacheSize(this.cacheSizeBytes):_t.DEFAULT;return new pT(r=>Su.Vi(r,n),this.serializer)}}class lf{async initialize(e,n){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(n),this.remoteStore=this.createRemoteStore(n),this.eventManager=this.createEventManager(n),this.syncEngine=this.createSyncEngine(n,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=r=>D_(this.syncEngine,r,1),this.remoteStore.remoteSyncer.handleCredentialChange=BN.bind(null,this.syncEngine),await IN(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new SN}()}createDatastore(e){const n=pc(e.databaseInfo.databaseId),r=iN(e.databaseInfo);return cN(e.authCredentials,e.appCheckCredentials,r,n)}createRemoteStore(e){return function(r,s,i,o,l){return new dN(r,s,i,o,l)}(this.localStore,this.datastore,e.asyncQueue,n=>D_(this.syncEngine,n,0),function(){return C_.v()?new C_:new tN}())}createSyncEngine(e,n){return function(s,i,o,l,u,c,d){const m=new NN(s,i,o,l,u,c);return d&&(m.Su=!0),m}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,n)}async terminate(){var e,n;await async function(s){const i=X(s);W(Tn,"RemoteStore shutting down."),i.da.add(5),await Ra(i),i.fa.shutdown(),i.ga.set("Unknown")}(this.remoteStore),(e=this.datastore)==null||e.terminate(),(n=this.eventManager)==null||n.terminate()}}lf.provider={build:()=>new lf};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */class Bp{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.ku(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.ku(this.observer.error,e):Bn("Uncaught Error in snapshot listener:",e.toString()))}Ku(){this.muted=!0}ku(e,n){setTimeout(()=>{this.muted||e(n)},0)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fr="FirestoreClient";class qN{constructor(e,n,r,s,i){this.authCredentials=e,this.appCheckCredentials=n,this.asyncQueue=r,this._databaseInfo=s,this.user=st.UNAUTHENTICATED,this.clientId=rc.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=i,this.authCredentials.start(r,async o=>{W(Fr,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(r,o=>(W(Fr,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this._databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new On;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(n){const r=Vp(n,"Failed to shutdown persistence");e.reject(r)}}),e.promise}}async function Lh(t,e){t.asyncQueue.verifyOperationInProgress(),W(Fr,"Initializing OfflineComponentProvider");const n=t.configuration;await e.initialize(n);let r=n.initialUser;t.setCredentialChangeListener(async s=>{r.isEqual(s)||(await mT(e.localStore,s),r=s)}),e.persistence.setDatabaseDeletedListener(()=>t.terminate()),t._offlineComponents=e}async function V_(t,e){t.asyncQueue.verifyOperationInProgress();const n=await KN(t);W(Fr,"Initializing OnlineComponentProvider"),await e.initialize(n,t.configuration),t.setCredentialChangeListener(r=>R_(e.remoteStore,r)),t.setAppCheckTokenChangeListener((r,s)=>R_(e.remoteStore,s)),t._onlineComponents=e}async function KN(t){if(!t._offlineComponents)if(t._uninitializedComponentsProvider){W(Fr,"Using user provided OfflineComponentProvider");try{await Lh(t,t._uninitializedComponentsProvider._offline)}catch(e){const n=e;if(!function(s){return s.name==="FirebaseError"?s.code===M.FAILED_PRECONDITION||s.code===M.UNIMPLEMENTED:!(typeof DOMException<"u"&&s instanceof DOMException)||s.code===22||s.code===20||s.code===11}(n))throw n;Dr("Error using user provided cache. Falling back to memory cache: "+n),await Lh(t,new Cu)}}else W(Fr,"Using default OfflineComponentProvider"),await Lh(t,new HN(void 0));return t._offlineComponents}async function DT(t){return t._onlineComponents||(t._uninitializedComponentsProvider?(W(Fr,"Using user provided OnlineComponentProvider"),await V_(t,t._uninitializedComponentsProvider._online)):(W(Fr,"Using default OnlineComponentProvider"),await V_(t,new lf))),t._onlineComponents}function GN(t){return DT(t).then(e=>e.syncEngine)}async function ku(t){const e=await DT(t),n=e.eventManager;return n.onListen=bN.bind(null,e.syncEngine),n.onUnlisten=VN.bind(null,e.syncEngine),n.onFirstRemoteStoreListen=DN.bind(null,e.syncEngine),n.onLastRemoteStoreUnlisten=LN.bind(null,e.syncEngine),n}function QN(t,e,n,r){const s=new Bp(r),i=new Up(e,s,n);return t.asyncQueue.enqueueAndForget(async()=>Lp(await ku(t),i)),()=>{s.Ku(),t.asyncQueue.enqueueAndForget(async()=>Mp(await ku(t),i))}}function YN(t,e,n={}){const r=new On;return t.asyncQueue.enqueueAndForget(async()=>function(i,o,l,u,c){const d=new Bp({next:g=>{d.Ku(),o.enqueueAndForget(()=>Mp(i,m));const w=g.docs.has(l);!w&&g.fromCache?c.reject(new B(M.UNAVAILABLE,"Failed to get document because the client is offline.")):w&&g.fromCache&&u&&u.source==="server"?c.reject(new B(M.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):c.resolve(g)},error:g=>c.reject(g)}),m=new Up(lc(l.path),d,{includeMetadataChanges:!0,Wa:!0});return Lp(i,m)}(await ku(t),t.asyncQueue,e,n,r)),r.promise}function XN(t,e,n={}){const r=new On;return t.asyncQueue.enqueueAndForget(async()=>function(i,o,l,u,c){const d=new Bp({next:g=>{d.Ku(),o.enqueueAndForget(()=>Mp(i,m)),g.fromCache&&u.source==="server"?c.reject(new B(M.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):c.resolve(g)},error:g=>c.reject(g)}),m=new Up(l,d,{includeMetadataChanges:!0,Wa:!0});return Lp(i,m)}(await ku(t),t.asyncQueue,e,n,r)),r.promise}function JN(t,e){const n=new On;return t.asyncQueue.enqueueAndForget(async()=>MN(await GN(t),e,n)),n.promise}/**
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
 */function OT(t){const e={};return t.timeoutSeconds!==void 0&&(e.timeoutSeconds=t.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ZN="ComponentProvider",L_=new Map;function eb(t,e,n,r,s){return new wR(t,e,n,s.host,s.ssl,s.experimentalForceLongPolling,s.experimentalAutoDetectLongPolling,OT(s.experimentalLongPollingOptions),s.useFetchStreams,s.isUsingEmulator,r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const VT="firestore.googleapis.com",M_=!0;class j_{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new B(M.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=VT,this.ssl=M_}else this.host=e.host,this.ssl=e.ssl??M_;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=fT;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<CP)throw new B(M.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}xE("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=OT(e.experimentalLongPollingOptions??{}),function(r){if(r.timeoutSeconds!==void 0){if(isNaN(r.timeoutSeconds))throw new B(M.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (must not be NaN)`);if(r.timeoutSeconds<5)throw new B(M.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (minimum allowed value is 5)`);if(r.timeoutSeconds>30)throw new B(M.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(r,s){return r.timeoutSeconds===s.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class yc{constructor(e,n,r,s){this._authCredentials=e,this._appCheckCredentials=n,this._databaseId=r,this._app=s,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new j_({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new B(M.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new B(M.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new j_(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(r){if(!r)return new TE;switch(r.type){case"firstParty":return new sR(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new B(M.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(n){const r=L_.get(n);r&&(W(ZN,"Removing Datastore"),L_.delete(n),r.terminate())}(this),Promise.resolve()}}function LT(t,e,n,r={}){var c;t=at(t,yc);const s=As(e),i=t._getSettings(),o={...i,emulatorOptions:t._getEmulatorOptions()},l=`${e}:${n}`;s&&hp(`https://${l}`),i.host!==VT&&i.host!==l&&Dr("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const u={...i,host:l,ssl:s,emulatorOptions:r};if(!Nr(u,o)&&(t._setSettings(u),r.mockUserToken)){let d,m;if(typeof r.mockUserToken=="string")d=r.mockUserToken,m=st.MOCK_USER;else{d=lE(r.mockUserToken,(c=t._app)==null?void 0:c.options.projectId);const g=r.mockUserToken.sub||r.mockUserToken.user_id;if(!g)throw new B(M.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");m=new st(g)}t._authCredentials=new tR(new EE(d,m))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xn{constructor(e,n,r){this.converter=n,this._query=r,this.type="query",this.firestore=e}withConverter(e){return new xn(this.firestore,e,this._query)}}class Te{constructor(e,n,r){this.converter=n,this._key=r,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new Vn(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new Te(this.firestore,e,this._key)}toJSON(){return{type:Te._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,n,r){if(Sa(n,Te._jsonSchema))return new Te(e,r||null,new q(he.fromString(n.referencePath)))}}Te._jsonSchemaVersion="firestore/documentReference/1.0",Te._jsonSchema={type:Me("string",Te._jsonSchemaVersion),referencePath:Me("string")};class Vn extends xn{constructor(e,n,r){super(e,n,lc(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new Te(this.firestore,null,new q(e))}withConverter(e){return new Vn(this.firestore,e,this._path)}}function uf(t,e,...n){if(t=pe(t),IE("collection","path",e),t instanceof yc){const r=he.fromString(e,...n);return Xy(r),new Vn(t,null,r)}{if(!(t instanceof Te||t instanceof Vn))throw new B(M.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=t._path.child(he.fromString(e,...n));return Xy(r),new Vn(t.firestore,null,r)}}function qe(t,e,...n){if(t=pe(t),arguments.length===1&&(e=rc.newId()),IE("doc","path",e),t instanceof yc){const r=he.fromString(e,...n);return Yy(r),new Te(t,null,new q(r))}{if(!(t instanceof Te||t instanceof Vn))throw new B(M.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=t._path.child(he.fromString(e,...n));return Yy(r),new Te(t.firestore,t instanceof Vn?t.converter:null,new q(r))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const U_="AsyncQueue";class F_{constructor(e=Promise.resolve()){this.rc=[],this.sc=!1,this.oc=[],this._c=null,this.ac=!1,this.uc=!1,this.cc=[],this.M_=new yT(this,"async_queue_retry"),this.lc=()=>{const r=Vh();r&&W(U_,"Visibility state changed to "+r.visibilityState),this.M_.w_()},this.hc=e;const n=Vh();n&&typeof n.addEventListener=="function"&&n.addEventListener("visibilitychange",this.lc)}get isShuttingDown(){return this.sc}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.Pc(),this.Tc(e)}enterRestrictedMode(e){if(!this.sc){this.sc=!0,this.uc=e||!1;const n=Vh();n&&typeof n.removeEventListener=="function"&&n.removeEventListener("visibilitychange",this.lc)}}enqueue(e){if(this.Pc(),this.sc)return new Promise(()=>{});const n=new On;return this.Tc(()=>this.sc&&this.uc?Promise.resolve():(e().then(n.resolve,n.reject),n.promise)).then(()=>n.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.rc.push(e),this.Ic()))}async Ic(){if(this.rc.length!==0){try{await this.rc[0](),this.rc.shift(),this.M_.reset()}catch(e){if(!Oi(e))throw e;W(U_,"Operation failed with retryable error: "+e)}this.rc.length>0&&this.M_.p_(()=>this.Ic())}}Tc(e){const n=this.hc.then(()=>(this.ac=!0,e().catch(r=>{throw this._c=r,this.ac=!1,Bn("INTERNAL UNHANDLED ERROR: ",z_(r)),r}).then(r=>(this.ac=!1,r))));return this.hc=n,n}enqueueAfterDelay(e,n,r){this.Pc(),this.cc.indexOf(e)>-1&&(n=0);const s=Op.createAndSchedule(this,e,n,r,i=>this.Ec(i));return this.oc.push(s),s}Pc(){this._c&&G(47125,{Rc:z_(this._c)})}verifyOperationInProgress(){}async Ac(){let e;do e=this.hc,await e;while(e!==this.hc)}Vc(e){for(const n of this.oc)if(n.timerId===e)return!0;return!1}dc(e){return this.Ac().then(()=>{this.oc.sort((n,r)=>n.targetTimeMs-r.targetTimeMs);for(const n of this.oc)if(n.skipDelay(),e!=="all"&&n.timerId===e)break;return this.Ac()})}mc(e){this.cc.push(e)}Ec(e){const n=this.oc.indexOf(e);this.oc.splice(n,1)}}function z_(t){let e=t.message||"";return t.stack&&(e=t.stack.includes(t.message)?t.stack:t.message+`
`+t.stack),e}class on extends yc{constructor(e,n,r,s){super(e,n,r,s),this.type="firestore",this._queue=new F_,this._persistenceKey=(s==null?void 0:s.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new F_(e),this._firestoreClient=void 0,await e}}}function MT(t,e){const n=typeof t=="object"?t:pp(),r=typeof t=="string"?t:wu,s=nc(n,"firestore").getImmediate({identifier:r});if(!s._initialized){const i=iE("firestore");i&&LT(s,...i)}return s}function Mi(t){if(t._terminated)throw new B(M.FAILED_PRECONDITION,"The client has already been terminated.");return t._firestoreClient||tb(t),t._firestoreClient}function tb(t){var r,s,i,o;const e=t._freezeSettings(),n=eb(t._databaseId,((r=t._app)==null?void 0:r.options.appId)||"",t._persistenceKey,(s=t._app)==null?void 0:s.options.apiKey,e);t._componentsProvider||(i=e.localCache)!=null&&i._offlineComponentProvider&&((o=e.localCache)!=null&&o._onlineComponentProvider)&&(t._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),t._firestoreClient=new qN(t._authCredentials,t._appCheckCredentials,t._queue,n,t._componentsProvider&&function(u){const c=u==null?void 0:u._online.build();return{_offline:u==null?void 0:u._offline.build(c),_online:c}}(t._componentsProvider))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kt{constructor(e){this._byteString=e}static fromBase64String(e){try{return new kt(Ge.fromBase64String(e))}catch(n){throw new B(M.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+n)}}static fromUint8Array(e){return new kt(Ge.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:kt._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(Sa(e,kt._jsonSchema))return kt.fromBase64String(e.bytes)}}kt._jsonSchemaVersion="firestore/bytes/1.0",kt._jsonSchema={type:Me("string",kt._jsonSchemaVersion),bytes:Me("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Na{constructor(...e){for(let n=0;n<e.length;++n)if(e[n].length===0)throw new B(M.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new He(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ps{constructor(e){this._methodName=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tn{constructor(e,n){if(!isFinite(e)||e<-90||e>90)throw new B(M.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(n)||n<-180||n>180)throw new B(M.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+n);this._lat=e,this._long=n}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return ee(this._lat,e._lat)||ee(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:tn._jsonSchemaVersion}}static fromJSON(e){if(Sa(e,tn._jsonSchema))return new tn(e.latitude,e.longitude)}}tn._jsonSchemaVersion="firestore/geoPoint/1.0",tn._jsonSchema={type:Me("string",tn._jsonSchemaVersion),latitude:Me("number"),longitude:Me("number")};/**
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
 */class zt{constructor(e){this._values=(e||[]).map(n=>n)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(r,s){if(r.length!==s.length)return!1;for(let i=0;i<r.length;++i)if(r[i]!==s[i])return!1;return!0}(this._values,e._values)}toJSON(){return{type:zt._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(Sa(e,zt._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(n=>typeof n=="number"))return new zt(e.vectorValues);throw new B(M.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}zt._jsonSchemaVersion="firestore/vectorValue/1.0",zt._jsonSchema={type:Me("string",zt._jsonSchemaVersion),vectorValues:Me("object")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nb=/^__.*__$/;class rb{constructor(e,n,r){this.data=e,this.fieldMask=n,this.fieldTransforms=r}toMutation(e,n){return this.fieldMask!==null?new qr(e,this.data,this.fieldMask,n,this.fieldTransforms):new Aa(e,this.data,n,this.fieldTransforms)}}class jT{constructor(e,n,r){this.data=e,this.fieldMask=n,this.fieldTransforms=r}toMutation(e,n){return new qr(e,this.data,this.fieldMask,n,this.fieldTransforms)}}function UT(t){switch(t){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw G(40011,{dataSource:t})}}class _c{constructor(e,n,r,s,i,o){this.settings=e,this.databaseId=n,this.serializer=r,this.ignoreUndefinedProperties=s,i===void 0&&this.fc(),this.fieldTransforms=i||[],this.fieldMask=o||[]}get path(){return this.settings.path}get dataSource(){return this.settings.dataSource}i(e){return new _c({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}yc(e){var s;const n=(s=this.path)==null?void 0:s.child(e),r=this.i({path:n,arrayElement:!1});return r.wc(e),r}Sc(e){var s;const n=(s=this.path)==null?void 0:s.child(e),r=this.i({path:n,arrayElement:!1});return r.fc(),r}bc(e){return this.i({path:void 0,arrayElement:!0})}Dc(e){return Ru(e,this.settings.methodName,this.settings.hasConverter||!1,this.path,this.settings.targetDoc)}contains(e){return this.fieldMask.find(n=>e.isPrefixOf(n))!==void 0||this.fieldTransforms.find(n=>e.isPrefixOf(n.field))!==void 0}fc(){if(this.path)for(let e=0;e<this.path.length;e++)this.wc(this.path.get(e))}wc(e){if(e.length===0)throw this.Dc("Document fields must not be empty");if(UT(this.dataSource)&&nb.test(e))throw this.Dc('Document fields cannot begin and end with "__"')}}class sb{constructor(e,n,r){this.databaseId=e,this.ignoreUndefinedProperties=n,this.serializer=r||pc(e)}V(e,n,r,s=!1){return new _c({dataSource:e,methodName:n,targetDoc:r,path:He.emptyPath(),arrayElement:!1,hasConverter:s},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function ba(t){const e=t._freezeSettings(),n=pc(t._databaseId);return new sb(t._databaseId,!!e.ignoreUndefinedProperties,n)}function $p(t,e,n,r,s,i={}){const o=t.V(i.merge||i.mergeFields?2:0,e,n,s);Kp("Data must be an object, but it was:",o,r);const l=BT(r,o);let u,c;if(i.merge)u=new Pt(o.fieldMask),c=o.fieldTransforms;else if(i.mergeFields){const d=[];for(const m of i.mergeFields){const g=vs(e,m,n);if(!o.contains(g))throw new B(M.INVALID_ARGUMENT,`Field '${g}' is specified in your field mask but missing from your input data.`);HT(d,g)||d.push(g)}u=new Pt(d),c=o.fieldTransforms.filter(m=>u.covers(m.field))}else u=null,c=o.fieldTransforms;return new rb(new wt(l),u,c)}class vc extends Ps{_toFieldTransform(e){if(e.dataSource!==2)throw e.dataSource===1?e.Dc(`${this._methodName}() can only appear at the top level of your update data`):e.Dc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof vc}}function ib(t,e,n){return new _c({dataSource:3,targetDoc:e.settings.targetDoc,methodName:t._methodName,arrayElement:n},e.databaseId,e.serializer,e.ignoreUndefinedProperties)}class Wp extends Ps{_toFieldTransform(e){return new Tp(e.path,new ca)}isEqual(e){return e instanceof Wp}}class Hp extends Ps{constructor(e,n){super(e),this.vc=n}_toFieldTransform(e){const n=ib(this,e,!0),r=this.vc.map(i=>ji(i,n)),s=new Ii(r);return new Tp(e.path,s)}isEqual(e){return e instanceof Hp&&Nr(this.vc,e.vc)}}class qp extends Ps{constructor(e,n){super(e),this.Fc=n}_toFieldTransform(e){const n=new da(e.serializer,QE(e.serializer,this.Fc));return new Tp(e.path,n)}isEqual(e){return e instanceof qp&&this.Fc===e.Fc}}function FT(t,e,n,r){const s=t.V(1,e,n);Kp("Data must be an object, but it was:",s,r);const i=[],o=wt.empty();Hr(r,(u,c)=>{const d=WT(e,u,n);c=pe(c);const m=s.Sc(d);if(c instanceof vc)i.push(d);else{const g=ji(c,m);g!=null&&(i.push(d),o.set(d,g))}});const l=new Pt(i);return new jT(o,l,s.fieldTransforms)}function zT(t,e,n,r,s,i){const o=t.V(1,e,n),l=[vs(e,r,n)],u=[s];if(i.length%2!=0)throw new B(M.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let g=0;g<i.length;g+=2)l.push(vs(e,i[g])),u.push(i[g+1]);const c=[],d=wt.empty();for(let g=l.length-1;g>=0;--g)if(!HT(c,l[g])){const w=l[g];let A=u[g];A=pe(A);const P=o.Sc(w);if(A instanceof vc)c.push(w);else{const N=ji(A,P);N!=null&&(c.push(w),d.set(w,N))}}const m=new Pt(c);return new jT(d,m,o.fieldTransforms)}function ob(t,e,n,r=!1){return ji(n,t.V(r?4:3,e))}function ji(t,e){if($T(t=pe(t)))return Kp("Unsupported field value:",e,t),BT(t,e);if(t instanceof Ps)return function(r,s){if(!UT(s.dataSource))throw s.Dc(`${r._methodName}() can only be used with update() and set()`);if(!s.path)throw s.Dc(`${r._methodName}() is not currently supported inside arrays`);const i=r._toFieldTransform(s);i&&s.fieldTransforms.push(i)}(t,e),null;if(t===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),t instanceof Array){if(e.settings.arrayElement&&e.dataSource!==4)throw e.Dc("Nested arrays are not supported");return function(r,s){const i=[];let o=0;for(const l of r){let u=ji(l,s.bc(o));u==null&&(u={nullValue:"NULL_VALUE"}),i.push(u),o++}return{arrayValue:{values:i}}}(t,e)}return function(r,s){if((r=pe(r))===null)return{nullValue:"NULL_VALUE"};if(typeof r=="number")return QE(s.serializer,r);if(typeof r=="boolean")return{booleanValue:r};if(typeof r=="string")return{stringValue:r};if(r instanceof Date){const i=de.fromDate(r);return{timestampValue:xu(s.serializer,i)}}if(r instanceof de){const i=new de(r.seconds,1e3*Math.floor(r.nanoseconds/1e3));return{timestampValue:xu(s.serializer,i)}}if(r instanceof tn)return{geoPointValue:{latitude:r.latitude,longitude:r.longitude}};if(r instanceof kt)return{bytesValue:iT(s.serializer,r._byteString)};if(r instanceof Te){const i=s.databaseId,o=r.firestore._databaseId;if(!o.isEqual(i))throw s.Dc(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${i.projectId}/${i.database}`);return{referenceValue:Sp(r.firestore._databaseId||s.databaseId,r._key.path)}}if(r instanceof zt)return function(o,l){const u=o instanceof zt?o.toArray():o;return{mapValue:{fields:{[DE]:{stringValue:OE},[Eu]:{arrayValue:{values:u.map(d=>{if(typeof d!="number")throw l.Dc("VectorValues must only contain numeric values.");return Ep(l.serializer,d)})}}}}}}(r,s);if(dT(r))return r._toProto(s.serializer);throw s.Dc(`Unsupported field value: ${sc(r)}`)}(t,e)}function BT(t,e){const n={};return CE(t)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Hr(t,(r,s)=>{const i=ji(s,e.yc(r));i!=null&&(n[r]=i)}),{mapValue:{fields:n}}}function $T(t){return!(typeof t!="object"||t===null||t instanceof Array||t instanceof Date||t instanceof de||t instanceof tn||t instanceof kt||t instanceof Te||t instanceof Ps||t instanceof zt||dT(t))}function Kp(t,e,n){if(!$T(n)||!SE(n)){const r=sc(n);throw r==="an object"?e.Dc(t+" a custom object"):e.Dc(t+" "+r)}}function vs(t,e,n){if((e=pe(e))instanceof Na)return e._internalPath;if(typeof e=="string")return WT(t,e);throw Ru("Field path arguments must be of type string or ",t,!1,void 0,n)}const ab=new RegExp("[~\\*/\\[\\]]");function WT(t,e,n){if(e.search(ab)>=0)throw Ru(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,t,!1,void 0,n);try{return new Na(...e.split("."))._internalPath}catch{throw Ru(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,t,!1,void 0,n)}}function Ru(t,e,n,r,s){const i=r&&!r.isEmpty(),o=s!==void 0;let l=`Function ${e}() called with invalid data`;n&&(l+=" (via `toFirestore()`)"),l+=". ";let u="";return(i||o)&&(u+=" (found",i&&(u+=` in field ${r}`),o&&(u+=` in document ${s}`),u+=")"),new B(M.INVALID_ARGUMENT,l+t+u)}function HT(t,e){return t.some(n=>n.isEqual(e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qT{convertValue(e,n="none"){switch(Mr(e)){case 0:return null;case 1:return e.booleanValue;case 2:return Ne(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,n);case 5:return e.stringValue;case 6:return this.convertBytes(Lr(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,n);case 11:return this.convertObject(e.mapValue,n);case 10:return this.convertVectorValue(e.mapValue);default:throw G(62114,{value:e})}}convertObject(e,n){return this.convertObjectMap(e.fields,n)}convertObjectMap(e,n="none"){const r={};return Hr(e,(s,i)=>{r[s]=this.convertValue(i,n)}),r}convertVectorValue(e){var r,s,i;const n=(i=(s=(r=e.fields)==null?void 0:r[Eu].arrayValue)==null?void 0:s.values)==null?void 0:i.map(o=>Ne(o.doubleValue));return new zt(n)}convertGeoPoint(e){return new tn(Ne(e.latitude),Ne(e.longitude))}convertArray(e,n){return(e.values||[]).map(r=>this.convertValue(r,n))}convertServerTimestamp(e,n){switch(n){case"previous":const r=ac(e);return r==null?null:this.convertValue(r,n);case"estimate":return this.convertTimestamp(aa(e));default:return null}}convertTimestamp(e){const n=Vr(e);return new de(n.seconds,n.nanos)}convertDocumentKey(e,n){const r=he.fromString(e);le(hT(r),9688,{name:e});const s=new wi(r.get(1),r.get(3)),i=new q(r.popFirst(5));return s.isEqual(n)||Bn(`Document ${i} contains a document reference within a different database (${s.projectId}/${s.database}) which is not supported. It will be treated as a reference in the current database (${n.projectId}/${n.database}) instead.`),i}}/**
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
 */class Gp extends qT{constructor(e){super(),this.firestore=e}convertBytes(e){return new kt(e)}convertReference(e){const n=this.convertDocumentKey(e,this.firestore._databaseId);return new Te(this.firestore,null,n)}}function ws(){return new Wp("serverTimestamp")}function Fl(...t){return new Hp("arrayUnion",t)}function zl(t){return new qp("increment",t)}const B_="@firebase/firestore",$_="4.14.1";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function W_(t){return function(n,r){if(typeof n!="object"||n===null)return!1;const s=n;for(const i of r)if(i in s&&typeof s[i]=="function")return!0;return!1}(t,["next","error","complete"])}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class KT{constructor(e,n,r,s,i){this._firestore=e,this._userDataWriter=n,this._key=r,this._document=s,this._converter=i}get id(){return this._key.path.lastSegment()}get ref(){return new Te(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new lb(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}_fieldsProto(){var e;return((e=this._document)==null?void 0:e.data.clone().value.mapValue.fields)??void 0}get(e){if(this._document){const n=this._document.data.field(vs("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n)}}}class lb extends KT{data(){return super.data()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function GT(t){if(t.limitType==="L"&&t.explicitOrderBy.length===0)throw new B(M.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class Qp{}class wc extends Qp{}function Yp(t,e,...n){let r=[];e instanceof Qp&&r.push(e),r=r.concat(n),function(i){const o=i.filter(u=>u instanceof Ec).length,l=i.filter(u=>u instanceof Da).length;if(o>1||o>0&&l>0)throw new B(M.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(r);for(const s of r)t=s._apply(t);return t}class Da extends wc{constructor(e,n,r){super(),this._field=e,this._op=n,this._value=r,this.type="where"}static _create(e,n,r){return new Da(e,n,r)}_apply(e){const n=this._parse(e);return YT(e._query,n),new xn(e.firestore,e.converter,Xd(e._query,n))}_parse(e){const n=ba(e.firestore);return function(i,o,l,u,c,d,m){let g;if(c.isKeyField()){if(d==="array-contains"||d==="array-contains-any")throw new B(M.INVALID_ARGUMENT,`Invalid Query. You can't perform '${d}' queries on documentId().`);if(d==="in"||d==="not-in"){q_(m,d);const A=[];for(const P of m)A.push(H_(u,i,P));g={arrayValue:{values:A}}}else g=H_(u,i,m)}else d!=="in"&&d!=="not-in"&&d!=="array-contains-any"||q_(m,d),g=ob(l,o,m,d==="in"||d==="not-in");return Ve.create(c,d,g)}(e._query,"where",n,e.firestore._databaseId,this._field,this._op,this._value)}}function Xp(t,e,n){const r=e,s=vs("where",t);return Da._create(s,r,n)}class Ec extends Qp{constructor(e,n){super(),this.type=e,this._queryConstraints=n}static _create(e,n){return new Ec(e,n)}_parse(e){const n=this._queryConstraints.map(r=>r._parse(e)).filter(r=>r.getFilters().length>0);return n.length===1?n[0]:sn.create(n,this._getOperator())}_apply(e){const n=this._parse(e);return n.getFilters().length===0?e:(function(s,i){let o=s;const l=i.getFlattenedFilters();for(const u of l)YT(o,u),o=Xd(o,u)}(e._query,n),new xn(e.firestore,e.converter,Xd(e._query,n)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class Tc extends wc{constructor(e,n){super(),this._field=e,this._direction=n,this.type="orderBy"}static _create(e,n){return new Tc(e,n)}_apply(e){const n=function(s,i,o){if(s.startAt!==null)throw new B(M.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(s.endAt!==null)throw new B(M.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new ua(i,o)}(e._query,this._field,this._direction);return new xn(e.firestore,e.converter,jR(e._query,n))}}function Ic(t,e="asc"){const n=e,r=vs("orderBy",t);return Tc._create(r,n)}class xc extends wc{constructor(e,n,r){super(),this.type=e,this._limit=n,this._limitType=r}static _create(e,n,r){return new xc(e,n,r)}_apply(e){return new xn(e.firestore,e.converter,Iu(e._query,this._limit,this._limitType))}}function QT(t){return xc._create("limit",t,"F")}function H_(t,e,n){if(typeof(n=pe(n))=="string"){if(n==="")throw new B(M.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!BE(e)&&n.indexOf("/")!==-1)throw new B(M.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${n}' contains a '/' character.`);const r=e.path.child(he.fromString(n));if(!q.isDocumentKey(r))throw new B(M.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${r}' is not because it has an odd number of segments (${r.length}).`);return i_(t,new q(r))}if(n instanceof Te)return i_(t,n._key);throw new B(M.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${sc(n)}.`)}function q_(t,e){if(!Array.isArray(t)||t.length===0)throw new B(M.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function YT(t,e){const n=function(s,i){for(const o of s)for(const l of o.getFlattenedFilters())if(i.indexOf(l.op)>=0)return l.op;return null}(t.filters,function(s){switch(s){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(n!==null)throw n===e.op?new B(M.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new B(M.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${n.toString()}' filters.`)}function Jp(t,e,n){let r;return r=t?n&&(n.merge||n.mergeFields)?t.toFirestore(e,n):t.toFirestore(e):e,r}class Zs{constructor(e,n){this.hasPendingWrites=e,this.fromCache=n}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class Ar extends KT{constructor(e,n,r,s,i,o){super(e,n,r,s,o),this._firestore=e,this._firestoreImpl=e,this.metadata=i}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const n=new Lo(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(n,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,n={}){if(this._document){const r=this._document.data.field(vs("DocumentSnapshot.get",e));if(r!==null)return this._userDataWriter.convertValue(r,n.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new B(M.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,n={};return n.type=Ar._jsonSchemaVersion,n.bundle="",n.bundleSource="DocumentSnapshot",n.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?n:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),n.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),n)}}Ar._jsonSchemaVersion="firestore/documentSnapshot/1.0",Ar._jsonSchema={type:Me("string",Ar._jsonSchemaVersion),bundleSource:Me("string","DocumentSnapshot"),bundleName:Me("string"),bundle:Me("string")};class Lo extends Ar{data(e={}){return super.data(e)}}class Cr{constructor(e,n,r,s){this._firestore=e,this._userDataWriter=n,this._snapshot=s,this.metadata=new Zs(s.hasPendingWrites,s.fromCache),this.query=r}get docs(){const e=[];return this.forEach(n=>e.push(n)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,n){this._snapshot.docs.forEach(r=>{e.call(n,new Lo(this._firestore,this._userDataWriter,r.key,r,new Zs(this._snapshot.mutatedKeys.has(r.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const n=!!e.includeMetadataChanges;if(n&&this._snapshot.excludesMetadataChanges)throw new B(M.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===n||(this._cachedChanges=function(s,i){if(s._snapshot.oldDocs.isEmpty()){let o=0;return s._snapshot.docChanges.map(l=>{const u=new Lo(s._firestore,s._userDataWriter,l.doc.key,l.doc,new Zs(s._snapshot.mutatedKeys.has(l.doc.key),s._snapshot.fromCache),s.query.converter);return l.doc,{type:"added",doc:u,oldIndex:-1,newIndex:o++}})}{let o=s._snapshot.oldDocs;return s._snapshot.docChanges.filter(l=>i||l.type!==3).map(l=>{const u=new Lo(s._firestore,s._userDataWriter,l.doc.key,l.doc,new Zs(s._snapshot.mutatedKeys.has(l.doc.key),s._snapshot.fromCache),s.query.converter);let c=-1,d=-1;return l.type!==0&&(c=o.indexOf(l.doc.key),o=o.delete(l.doc.key)),l.type!==1&&(o=o.add(l.doc),d=o.indexOf(l.doc.key)),{type:ub(l.type),doc:u,oldIndex:c,newIndex:d}})}}(this,n),this._cachedChangesIncludeMetadataChanges=n),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new B(M.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=Cr._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=rc.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const n=[],r=[],s=[];return this.docs.forEach(i=>{i._document!==null&&(n.push(i._document),r.push(this._userDataWriter.convertObjectMap(i._document.data.value.mapValue.fields,"previous")),s.push(i.ref.path))}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function ub(t){switch(t){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return G(61501,{type:t})}}/**
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
 */Cr._jsonSchemaVersion="firestore/querySnapshot/1.0",Cr._jsonSchema={type:Me("string",Cr._jsonSchemaVersion),bundleSource:Me("string","QuerySnapshot"),bundleName:Me("string"),bundle:Me("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class XT{constructor(e,n){this._firestore=e,this._commitHandler=n,this._mutations=[],this._committed=!1,this._dataReader=ba(e)}set(e,n,r){this._verifyNotCommitted();const s=Mh(e,this._firestore),i=Jp(s.converter,n,r),o=$p(this._dataReader,"WriteBatch.set",s._key,i,s.converter!==null,r);return this._mutations.push(o.toMutation(s._key,mt.none())),this}update(e,n,r,...s){this._verifyNotCommitted();const i=Mh(e,this._firestore);let o;return o=typeof(n=pe(n))=="string"||n instanceof Na?zT(this._dataReader,"WriteBatch.update",i._key,n,r,s):FT(this._dataReader,"WriteBatch.update",i._key,n),this._mutations.push(o.toMutation(i._key,mt.exists(!0))),this}delete(e){this._verifyNotCommitted();const n=Mh(e,this._firestore);return this._mutations=this._mutations.concat(new fc(n._key,mt.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new B(M.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function Mh(t,e){if((t=pe(t)).firestore!==e)throw new B(M.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function JT(t){t=at(t,Te);const e=at(t.firestore,on),n=Mi(e);return YN(n,t._key).then(r=>tI(e,t,r))}function ZT(t){t=at(t,xn);const e=at(t.firestore,on),n=Mi(e),r=new Gp(e);return GT(t._query),XN(n,t._query).then(s=>new Cr(e,r,t,s))}function eI(t,e,n){t=at(t,Te);const r=at(t.firestore,on),s=Jp(t.converter,e,n),i=ba(r);return Ui(r,[$p(i,"setDoc",t._key,s,t.converter!==null,n).toMutation(t._key,mt.none())])}function Ln(t,e,n,...r){t=at(t,Te);const s=at(t.firestore,on),i=ba(s);let o;return o=typeof(e=pe(e))=="string"||e instanceof Na?zT(i,"updateDoc",t._key,e,n,r):FT(i,"updateDoc",t._key,e),Ui(s,[o.toMutation(t._key,mt.exists(!0))])}function Sc(t){return Ui(at(t.firestore,on),[new fc(t._key,mt.none())])}function Ac(t,e){const n=at(t.firestore,on),r=qe(t),s=Jp(t.converter,e),i=ba(t.firestore);return Ui(n,[$p(i,"addDoc",r._key,s,t.converter!==null,{}).toMutation(r._key,mt.exists(!1))]).then(()=>r)}function Cc(t,...e){var c,d,m;t=pe(t);let n={includeMetadataChanges:!1,source:"default"},r=0;typeof e[r]!="object"||W_(e[r])||(n=e[r++]);const s={includeMetadataChanges:n.includeMetadataChanges,source:n.source};if(W_(e[r])){const g=e[r];e[r]=(c=g.next)==null?void 0:c.bind(g),e[r+1]=(d=g.error)==null?void 0:d.bind(g),e[r+2]=(m=g.complete)==null?void 0:m.bind(g)}let i,o,l;if(t instanceof Te)o=at(t.firestore,on),l=lc(t._key.path),i={next:g=>{e[r]&&e[r](tI(o,t,g))},error:e[r+1],complete:e[r+2]};else{const g=at(t,xn);o=at(g.firestore,on),l=g._query;const w=new Gp(o);i={next:A=>{e[r]&&e[r](new Cr(o,w,g,A))},error:e[r+1],complete:e[r+2]},GT(t._query)}const u=Mi(o);return QN(u,l,s,i)}function Ui(t,e){const n=Mi(t);return JN(n,e)}function tI(t,e,n){const r=n.docs.get(e._key),s=new Gp(t);return new Ar(t,s,e._key,r,new Zs(n.hasPendingWrites,n.fromCache),e.converter)}function nI(t){return t=at(t,on),Mi(t),new XT(t,e=>Ui(t,e))}(function(e,n=!0){eR(Cs),ys(new br("firestore",(r,{instanceIdentifier:s,options:i})=>{const o=r.getProvider("app").getImmediate(),l=new on(new nR(r.getProvider("auth-internal")),new iR(o,r.getProvider("app-check-internal")),ER(o,s),o);return i={useFetchStreams:n,...i},l._setSettings(i),l},"PUBLIC").setMultipleInstances(!0)),yn(B_,$_,e),yn(B_,$_,"esm2020")})();const rI=Object.freeze(Object.defineProperty({__proto__:null,AbstractUserDataWriter:qT,Bytes:kt,CollectionReference:Vn,DocumentReference:Te,DocumentSnapshot:Ar,FieldPath:Na,FieldValue:Ps,Firestore:on,FirestoreError:B,GeoPoint:tn,Query:xn,QueryCompositeFilterConstraint:Ec,QueryConstraint:wc,QueryDocumentSnapshot:Lo,QueryFieldFilterConstraint:Da,QueryLimitConstraint:xc,QueryOrderByConstraint:Tc,QuerySnapshot:Cr,SnapshotMetadata:Zs,Timestamp:de,VectorValue:zt,WriteBatch:XT,_AutoId:rc,_ByteString:Ge,_DatabaseId:wi,_DocumentKey:q,_EmptyAuthCredentialsProvider:TE,_FieldPath:He,_cast:at,_logWarn:Dr,_validateIsNotUsedTogether:xE,addDoc:Ac,arrayUnion:Fl,collection:uf,connectFirestoreEmulator:LT,deleteDoc:Sc,doc:qe,ensureFirestoreConfigured:Mi,executeWrite:Ui,getDoc:JT,getDocs:ZT,getFirestore:MT,increment:zl,limit:QT,onSnapshot:Cc,orderBy:Ic,query:Yp,serverTimestamp:ws,setDoc:eI,updateDoc:Ln,where:Xp,writeBatch:nI},Symbol.toStringTag,{value:"Module"}));var cb="firebase",hb="12.13.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */yn(cb,hb,"app");function sI(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const db=sI,iI=new Ia("auth","Firebase",sI());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pu=new dp("@firebase/auth");function fb(t,...e){Pu.logLevel<=re.WARN&&Pu.warn(`Auth (${Cs}): ${t}`,...e)}function Bl(t,...e){Pu.logLevel<=re.ERROR&&Pu.error(`Auth (${Cs}): ${t}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Wt(t,...e){throw em(t,...e)}function nn(t,...e){return em(t,...e)}function Zp(t,e,n){const r={...db(),[e]:n};return new Ia("auth","Firebase",r).create(e,{appName:t.name})}function kr(t){return Zp(t,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function pb(t,e,n){const r=n;if(!(e instanceof r))throw r.name!==e.constructor.name&&Wt(t,"argument-error"),Zp(t,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function em(t,...e){if(typeof t!="string"){const n=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=t.name),t._errorFactory.create(n,...r)}return iI.create(t,...e)}function K(t,e,...n){if(!t)throw em(e,...n)}function Nn(t){const e="INTERNAL ASSERTION FAILED: "+t;throw Bl(e),new Error(e)}function Wn(t,e){t||Nn(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function cf(){var t;return typeof self<"u"&&((t=self.location)==null?void 0:t.href)||""}function mb(){return K_()==="http:"||K_()==="https:"}function K_(){var t;return typeof self<"u"&&((t=self.location)==null?void 0:t.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gb(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(mb()||DC()||"connection"in navigator)?navigator.onLine:!0}function yb(){if(typeof navigator>"u")return null;const t=navigator;return t.languages&&t.languages[0]||t.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oa{constructor(e,n){this.shortDelay=e,this.longDelay=n,Wn(n>e,"Short delay should be less than long delay!"),this.isMobile=PC()||OC()}get(){return gb()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function tm(t,e){Wn(t.emulator,"Emulator should always be set here");const{url:n}=t.emulator;return e?`${n}${e.startsWith("/")?e.slice(1):e}`:n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oI{static initialize(e,n,r){this.fetchImpl=e,n&&(this.headersImpl=n),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;Nn("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;Nn("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;Nn("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _b={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vb=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],wb=new Oa(3e4,6e4);function Ns(t,e){return t.tenantId&&!e.tenantId?{...e,tenantId:t.tenantId}:e}async function Kr(t,e,n,r,s={}){return aI(t,s,async()=>{let i={},o={};r&&(e==="GET"?o=r:i={body:JSON.stringify(r)});const l=xa({key:t.config.apiKey,...o}).slice(1),u=await t._getAdditionalHeaders();u["Content-Type"]="application/json",t.languageCode&&(u["X-Firebase-Locale"]=t.languageCode);const c={method:e,headers:u,...i};return bC()||(c.referrerPolicy="no-referrer"),t.emulatorConfig&&As(t.emulatorConfig.host)&&(c.credentials="include"),oI.fetch()(await lI(t,t.config.apiHost,n,l),c)})}async function aI(t,e,n){t._canInitEmulator=!1;const r={..._b,...e};try{const s=new Tb(t),i=await Promise.race([n(),s.promise]);s.clearNetworkTimeout();const o=await i.json();if("needConfirmation"in o)throw _l(t,"account-exists-with-different-credential",o);if(i.ok&&!("errorMessage"in o))return o;{const l=i.ok?o.errorMessage:o.error.message,[u,c]=l.split(" : ");if(u==="FEDERATED_USER_ID_ALREADY_LINKED")throw _l(t,"credential-already-in-use",o);if(u==="EMAIL_EXISTS")throw _l(t,"email-already-in-use",o);if(u==="USER_DISABLED")throw _l(t,"user-disabled",o);const d=r[u]||u.toLowerCase().replace(/[_\s]+/g,"-");if(c)throw Zp(t,d,c);Wt(t,d)}}catch(s){if(s instanceof In)throw s;Wt(t,"network-request-failed",{message:String(s)})}}async function kc(t,e,n,r,s={}){const i=await Kr(t,e,n,r,s);return"mfaPendingCredential"in i&&Wt(t,"multi-factor-auth-required",{_serverResponse:i}),i}async function lI(t,e,n,r){const s=`${e}${n}?${r}`,i=t,o=i.config.emulator?tm(t.config,s):`${t.config.apiScheme}://${s}`;return vb.includes(n)&&(await i._persistenceManagerAvailable,i._getPersistenceType()==="COOKIE")?i._getPersistence()._getFinalTarget(o).toString():o}function Eb(t){switch(t){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class Tb{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((n,r)=>{this.timer=setTimeout(()=>r(nn(this.auth,"network-request-failed")),wb.get())})}}function _l(t,e,n){const r={appName:t.name};n.email&&(r.email=n.email),n.phoneNumber&&(r.phoneNumber=n.phoneNumber);const s=nn(t,e,r);return s.customData._tokenResponse=n,s}function G_(t){return t!==void 0&&t.enterprise!==void 0}class Ib{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const n of this.recaptchaEnforcementState)if(n.provider&&n.provider===e)return Eb(n.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}async function xb(t,e){return Kr(t,"GET","/v2/recaptchaConfig",Ns(t,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Sb(t,e){return Kr(t,"POST","/v1/accounts:delete",e)}async function Nu(t,e){return Kr(t,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Mo(t){if(t)try{const e=new Date(Number(t));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function Ab(t,e=!1){const n=pe(t),r=await n.getIdToken(e),s=nm(r);K(s&&s.exp&&s.auth_time&&s.iat,n.auth,"internal-error");const i=typeof s.firebase=="object"?s.firebase:void 0,o=i==null?void 0:i.sign_in_provider;return{claims:s,token:r,authTime:Mo(jh(s.auth_time)),issuedAtTime:Mo(jh(s.iat)),expirationTime:Mo(jh(s.exp)),signInProvider:o||null,signInSecondFactor:(i==null?void 0:i.sign_in_second_factor)||null}}function jh(t){return Number(t)*1e3}function nm(t){const[e,n,r]=t.split(".");if(e===void 0||n===void 0||r===void 0)return Bl("JWT malformed, contained fewer than 3 sections"),null;try{const s=rE(n);return s?JSON.parse(s):(Bl("Failed to decode base64 JWT payload"),null)}catch(s){return Bl("Caught error parsing JWT payload as JSON",s==null?void 0:s.toString()),null}}function Q_(t){const e=nm(t);return K(e,"internal-error"),K(typeof e.exp<"u","internal-error"),K(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function fa(t,e,n=!1){if(n)return e;try{return await e}catch(r){throw r instanceof In&&Cb(r)&&t.auth.currentUser===t&&await t.auth.signOut(),r}}function Cb({code:t}){return t==="auth/user-disabled"||t==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kb{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const n=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),n}else{this.errorBackoff=3e4;const r=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,r)}}schedule(e=!1){if(!this.isRunning)return;const n=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},n)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hf{constructor(e,n){this.createdAt=e,this.lastLoginAt=n,this._initializeTime()}_initializeTime(){this.lastSignInTime=Mo(this.lastLoginAt),this.creationTime=Mo(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
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
 */async function bu(t){var m;const e=t.auth,n=await t.getIdToken(),r=await fa(t,Nu(e,{idToken:n}));K(r==null?void 0:r.users.length,e,"internal-error");const s=r.users[0];t._notifyReloadListener(s);const i=(m=s.providerUserInfo)!=null&&m.length?uI(s.providerUserInfo):[],o=Pb(t.providerData,i),l=t.isAnonymous,u=!(t.email&&s.passwordHash)&&!(o!=null&&o.length),c=l?u:!1,d={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:o,metadata:new hf(s.createdAt,s.lastLoginAt),isAnonymous:c};Object.assign(t,d)}async function Rb(t){const e=pe(t);await bu(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function Pb(t,e){return[...t.filter(r=>!e.some(s=>s.providerId===r.providerId)),...e]}function uI(t){return t.map(({providerId:e,...n})=>({providerId:e,uid:n.rawId||"",displayName:n.displayName||null,email:n.email||null,phoneNumber:n.phoneNumber||null,photoURL:n.photoUrl||null}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Nb(t,e){const n=await aI(t,{},async()=>{const r=xa({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:s,apiKey:i}=t.config,o=await lI(t,s,"/v1/token",`key=${i}`),l=await t._getAdditionalHeaders();l["Content-Type"]="application/x-www-form-urlencoded";const u={method:"POST",headers:l,body:r};return t.emulatorConfig&&As(t.emulatorConfig.host)&&(u.credentials="include"),oI.fetch()(o,u)});return{accessToken:n.access_token,expiresIn:n.expires_in,refreshToken:n.refresh_token}}async function bb(t,e){return Kr(t,"POST","/v2/accounts:revokeToken",Ns(t,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class li{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){K(e.idToken,"internal-error"),K(typeof e.idToken<"u","internal-error"),K(typeof e.refreshToken<"u","internal-error");const n="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):Q_(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,n)}updateFromIdToken(e){K(e.length!==0,"internal-error");const n=Q_(e);this.updateTokensAndExpiration(e,null,n)}async getToken(e,n=!1){return!n&&this.accessToken&&!this.isExpired?this.accessToken:(K(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,n){const{accessToken:r,refreshToken:s,expiresIn:i}=await Nb(e,n);this.updateTokensAndExpiration(r,s,Number(i))}updateTokensAndExpiration(e,n,r){this.refreshToken=n||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,n){const{refreshToken:r,accessToken:s,expirationTime:i}=n,o=new li;return r&&(K(typeof r=="string","internal-error",{appName:e}),o.refreshToken=r),s&&(K(typeof s=="string","internal-error",{appName:e}),o.accessToken=s),i&&(K(typeof i=="number","internal-error",{appName:e}),o.expirationTime=i),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new li,this.toJSON())}_performRefresh(){return Nn("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nr(t,e){K(typeof t=="string"||typeof t>"u","internal-error",{appName:e})}class Jt{constructor({uid:e,auth:n,stsTokenManager:r,...s}){this.providerId="firebase",this.proactiveRefresh=new kb(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=n,this.stsTokenManager=r,this.accessToken=r.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new hf(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const n=await fa(this,this.stsTokenManager.getToken(this.auth,e));return K(n,this.auth,"internal-error"),this.accessToken!==n&&(this.accessToken=n,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),n}getIdTokenResult(e){return Ab(this,e)}reload(){return Rb(this)}_assign(e){this!==e&&(K(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(n=>({...n})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const n=new Jt({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return n.metadata._copy(this.metadata),n}_onReload(e){K(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,n=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),n&&await bu(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(Ct(this.auth.app))return Promise.reject(kr(this.auth));const e=await this.getIdToken();return await fa(this,Sb(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,n){const r=n.displayName??void 0,s=n.email??void 0,i=n.phoneNumber??void 0,o=n.photoURL??void 0,l=n.tenantId??void 0,u=n._redirectEventId??void 0,c=n.createdAt??void 0,d=n.lastLoginAt??void 0,{uid:m,emailVerified:g,isAnonymous:w,providerData:A,stsTokenManager:P}=n;K(m&&P,e,"internal-error");const N=li.fromJSON(this.name,P);K(typeof m=="string",e,"internal-error"),nr(r,e.name),nr(s,e.name),K(typeof g=="boolean",e,"internal-error"),K(typeof w=="boolean",e,"internal-error"),nr(i,e.name),nr(o,e.name),nr(l,e.name),nr(u,e.name),nr(c,e.name),nr(d,e.name);const x=new Jt({uid:m,auth:e,email:s,emailVerified:g,displayName:r,isAnonymous:w,photoURL:o,phoneNumber:i,tenantId:l,stsTokenManager:N,createdAt:c,lastLoginAt:d});return A&&Array.isArray(A)&&(x.providerData=A.map(v=>({...v}))),u&&(x._redirectEventId=u),x}static async _fromIdTokenResponse(e,n,r=!1){const s=new li;s.updateFromServerResponse(n);const i=new Jt({uid:n.localId,auth:e,stsTokenManager:s,isAnonymous:r});return await bu(i),i}static async _fromGetAccountInfoResponse(e,n,r){const s=n.users[0];K(s.localId!==void 0,"internal-error");const i=s.providerUserInfo!==void 0?uI(s.providerUserInfo):[],o=!(s.email&&s.passwordHash)&&!(i!=null&&i.length),l=new li;l.updateFromIdToken(r);const u=new Jt({uid:s.localId,auth:e,stsTokenManager:l,isAnonymous:o}),c={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:i,metadata:new hf(s.createdAt,s.lastLoginAt),isAnonymous:!(s.email&&s.passwordHash)&&!(i!=null&&i.length)};return Object.assign(u,c),u}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Y_=new Map;function bn(t){Wn(t instanceof Function,"Expected a class definition");let e=Y_.get(t);return e?(Wn(e instanceof t,"Instance stored in cache mismatched with class"),e):(e=new t,Y_.set(t,e),e)}/**
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
 */class cI{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,n){this.storage[e]=n}async _get(e){const n=this.storage[e];return n===void 0?null:n}async _remove(e){delete this.storage[e]}_addListener(e,n){}_removeListener(e,n){}}cI.type="NONE";const X_=cI;/**
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
 */function $l(t,e,n){return`firebase:${t}:${e}:${n}`}class ui{constructor(e,n,r){this.persistence=e,this.auth=n,this.userKey=r;const{config:s,name:i}=this.auth;this.fullUserKey=$l(this.userKey,s.apiKey,i),this.fullPersistenceKey=$l("persistence",s.apiKey,i),this.boundEventHandler=n._onStorageEvent.bind(n),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const n=await Nu(this.auth,{idToken:e}).catch(()=>{});return n?Jt._fromGetAccountInfoResponse(this.auth,n,e):null}return Jt._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const n=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,n)return this.setCurrentUser(n)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,n,r="authUser"){if(!n.length)return new ui(bn(X_),e,r);const s=(await Promise.all(n.map(async c=>{if(await c._isAvailable())return c}))).filter(c=>c);let i=s[0]||bn(X_);const o=$l(r,e.config.apiKey,e.name);let l=null;for(const c of n)try{const d=await c._get(o);if(d){let m;if(typeof d=="string"){const g=await Nu(e,{idToken:d}).catch(()=>{});if(!g)break;m=await Jt._fromGetAccountInfoResponse(e,g,d)}else m=Jt._fromJSON(e,d);c!==i&&(l=m),i=c;break}}catch{}const u=s.filter(c=>c._shouldAllowMigration);return!i._shouldAllowMigration||!u.length?new ui(i,e,r):(i=u[0],l&&await i._set(o,l.toJSON()),await Promise.all(n.map(async c=>{if(c!==i)try{await c._remove(o)}catch{}})),new ui(i,e,r))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function J_(t){const e=t.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(pI(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(hI(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(gI(e))return"Blackberry";if(yI(e))return"Webos";if(dI(e))return"Safari";if((e.includes("chrome/")||fI(e))&&!e.includes("edge/"))return"Chrome";if(mI(e))return"Android";{const n=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=t.match(n);if((r==null?void 0:r.length)===2)return r[1]}return"Other"}function hI(t=ut()){return/firefox\//i.test(t)}function dI(t=ut()){const e=t.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function fI(t=ut()){return/crios\//i.test(t)}function pI(t=ut()){return/iemobile/i.test(t)}function mI(t=ut()){return/android/i.test(t)}function gI(t=ut()){return/blackberry/i.test(t)}function yI(t=ut()){return/webos/i.test(t)}function rm(t=ut()){return/iphone|ipad|ipod/i.test(t)||/macintosh/i.test(t)&&/mobile/i.test(t)}function Db(t=ut()){var e;return rm(t)&&!!((e=window.navigator)!=null&&e.standalone)}function Ob(){return VC()&&document.documentMode===10}function _I(t=ut()){return rm(t)||mI(t)||yI(t)||gI(t)||/windows phone/i.test(t)||pI(t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vI(t,e=[]){let n;switch(t){case"Browser":n=J_(ut());break;case"Worker":n=`${J_(ut())}-${t}`;break;default:n=t}const r=e.length?e.join(","):"FirebaseCore-web";return`${n}/JsCore/${Cs}/${r}`}/**
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
 */class Vb{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,n){const r=i=>new Promise((o,l)=>{try{const u=e(i);o(u)}catch(u){l(u)}});r.onAbort=n,this.queue.push(r);const s=this.queue.length-1;return()=>{this.queue[s]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const n=[];try{for(const r of this.queue)await r(e),r.onAbort&&n.push(r.onAbort)}catch(r){n.reverse();for(const s of n)try{s()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r==null?void 0:r.message})}}}/**
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
 */async function Lb(t,e={}){return Kr(t,"GET","/v2/passwordPolicy",Ns(t,e))}/**
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
 */const Mb=6;class jb{constructor(e){var r;const n=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=n.minPasswordLength??Mb,n.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=n.maxPasswordLength),n.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=n.containsLowercaseCharacter),n.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=n.containsUppercaseCharacter),n.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=n.containsNumericCharacter),n.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=n.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((r=e.allowedNonAlphanumericCharacters)==null?void 0:r.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const n={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,n),this.validatePasswordCharacterOptions(e,n),n.isValid&&(n.isValid=n.meetsMinPasswordLength??!0),n.isValid&&(n.isValid=n.meetsMaxPasswordLength??!0),n.isValid&&(n.isValid=n.containsLowercaseLetter??!0),n.isValid&&(n.isValid=n.containsUppercaseLetter??!0),n.isValid&&(n.isValid=n.containsNumericCharacter??!0),n.isValid&&(n.isValid=n.containsNonAlphanumericCharacter??!0),n}validatePasswordLengthOptions(e,n){const r=this.customStrengthOptions.minPasswordLength,s=this.customStrengthOptions.maxPasswordLength;r&&(n.meetsMinPasswordLength=e.length>=r),s&&(n.meetsMaxPasswordLength=e.length<=s)}validatePasswordCharacterOptions(e,n){this.updatePasswordCharacterOptionsStatuses(n,!1,!1,!1,!1);let r;for(let s=0;s<e.length;s++)r=e.charAt(s),this.updatePasswordCharacterOptionsStatuses(n,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,n,r,s,i){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=n)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=s)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=i))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ub{constructor(e,n,r,s){this.app=e,this.heartbeatServiceProvider=n,this.appCheckServiceProvider=r,this.config=s,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Z_(this),this.idTokenSubscription=new Z_(this),this.beforeStateQueue=new Vb(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=iI,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=s.sdkClientVersion,this._persistenceManagerAvailable=new Promise(i=>this._resolvePersistenceManagerAvailable=i)}_initializeWithPersistence(e,n){return n&&(this._popupRedirectResolver=bn(n)),this._initializationPromise=this.queue(async()=>{var r,s,i;if(!this._deleted&&(this.persistenceManager=await ui.create(this,e),(r=this._resolvePersistenceManagerAvailable)==null||r.call(this),!this._deleted)){if((s=this._popupRedirectResolver)!=null&&s._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(n),this.lastNotifiedUid=((i=this.currentUser)==null?void 0:i.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const n=await Nu(this,{idToken:e}),r=await Jt._fromGetAccountInfoResponse(this,n,e);await this.directlySetCurrentUser(r)}catch(n){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",n),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var i;if(Ct(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(l=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(l,l))}):this.directlySetCurrentUser(null)}const n=await this.assertedPersistence.getCurrentUser();let r=n,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(i=this.redirectUser)==null?void 0:i._redirectEventId,l=r==null?void 0:r._redirectEventId,u=await this.tryRedirectSignIn(e);(!o||o===l)&&(u!=null&&u.user)&&(r=u.user,s=!0)}if(!r)return this.directlySetCurrentUser(null);if(!r._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(r)}catch(o){r=n,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return r?this.reloadAndSetCurrentUserOrClear(r):this.directlySetCurrentUser(null)}return K(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===r._redirectEventId?this.directlySetCurrentUser(r):this.reloadAndSetCurrentUserOrClear(r)}async tryRedirectSignIn(e){let n=null;try{n=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return n}async reloadAndSetCurrentUserOrClear(e){try{await bu(e)}catch(n){if((n==null?void 0:n.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=yb()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(Ct(this.app))return Promise.reject(kr(this));const n=e?pe(e):null;return n&&K(n.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(n&&n._clone(this))}async _updateCurrentUser(e,n=!1){if(!this._deleted)return e&&K(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),n||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return Ct(this.app)?Promise.reject(kr(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return Ct(this.app)?Promise.reject(kr(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(bn(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const n=this._getPasswordPolicyInternal();return n.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):n.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await Lb(this),n=new jb(e);this.tenantId===null?this._projectPasswordPolicy=n:this._tenantPasswordPolicies[this.tenantId]=n}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new Ia("auth","Firebase",e())}onAuthStateChanged(e,n,r){return this.registerStateListener(this.authStateSubscription,e,n,r)}beforeAuthStateChanged(e,n){return this.beforeStateQueue.pushCallback(e,n)}onIdTokenChanged(e,n,r){return this.registerStateListener(this.idTokenSubscription,e,n,r)}authStateReady(){return new Promise((e,n)=>{if(this.currentUser)e();else{const r=this.onAuthStateChanged(()=>{r(),e()},n)}})}async revokeAccessToken(e){if(this.currentUser){const n=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:n};this.tenantId!=null&&(r.tenantId=this.tenantId),await bb(this,r)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,n){const r=await this.getOrInitRedirectPersistenceManager(n);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const n=e&&bn(e)||this._popupRedirectResolver;K(n,this,"argument-error"),this.redirectPersistenceManager=await ui.create(this,[bn(n._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var n,r;return this._isInitialized&&await this.queue(async()=>{}),((n=this._currentUser)==null?void 0:n._redirectEventId)===e?this._currentUser:((r=this.redirectUser)==null?void 0:r._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var n;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((n=this.currentUser)==null?void 0:n.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,n,r,s){if(this._deleted)return()=>{};const i=typeof n=="function"?n:n.next.bind(n);let o=!1;const l=this._isInitialized?Promise.resolve():this._initializationPromise;if(K(l,this,"internal-error"),l.then(()=>{o||i(this.currentUser)}),typeof n=="function"){const u=e.addObserver(n,r,s);return()=>{o=!0,u()}}else{const u=e.addObserver(n);return()=>{o=!0,u()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return K(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=vI(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var s;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const n=await((s=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:s.getHeartbeatsHeader());n&&(e["X-Firebase-Client"]=n);const r=await this._getAppCheckToken();return r&&(e["X-Firebase-AppCheck"]=r),e}async _getAppCheckToken(){var n;if(Ct(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((n=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:n.getToken());return e!=null&&e.error&&fb(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function bs(t){return pe(t)}class Z_{constructor(e){this.auth=e,this.observer=null,this.addObserver=$C(n=>this.observer=n)}get next(){return K(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Rc={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function Fb(t){Rc=t}function wI(t){return Rc.loadJS(t)}function zb(){return Rc.recaptchaEnterpriseScript}function Bb(){return Rc.gapiScript}function $b(t){return`__${t}${Math.floor(Math.random()*1e6)}`}class Wb{constructor(){this.enterprise=new Hb}ready(e){e()}execute(e,n){return Promise.resolve("token")}render(e,n){return""}}class Hb{ready(e){e()}execute(e,n){return Promise.resolve("token")}render(e,n){return""}}const qb="recaptcha-enterprise",EI="NO_RECAPTCHA";class Kb{constructor(e){this.type=qb,this.auth=bs(e)}async verify(e="verify",n=!1){async function r(i){if(!n){if(i.tenantId==null&&i._agentRecaptchaConfig!=null)return i._agentRecaptchaConfig.siteKey;if(i.tenantId!=null&&i._tenantRecaptchaConfigs[i.tenantId]!==void 0)return i._tenantRecaptchaConfigs[i.tenantId].siteKey}return new Promise(async(o,l)=>{xb(i,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(u=>{if(u.recaptchaKey===void 0)l(new Error("recaptcha Enterprise site key undefined"));else{const c=new Ib(u);return i.tenantId==null?i._agentRecaptchaConfig=c:i._tenantRecaptchaConfigs[i.tenantId]=c,o(c.siteKey)}}).catch(u=>{l(u)})})}function s(i,o,l){const u=window.grecaptcha;G_(u)?u.enterprise.ready(()=>{u.enterprise.execute(i,{action:e}).then(c=>{o(c)}).catch(()=>{o(EI)})}):l(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new Wb().execute("siteKey",{action:"verify"}):new Promise((i,o)=>{r(this.auth).then(l=>{if(!n&&G_(window.grecaptcha))s(l,i,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let u=zb();u.length!==0&&(u+=l),wI(u).then(()=>{s(l,i,o)}).catch(c=>{o(c)})}}).catch(l=>{o(l)})})}}async function ev(t,e,n,r=!1,s=!1){const i=new Kb(t);let o;if(s)o=EI;else try{o=await i.verify(n)}catch{o=await i.verify(n,!0)}const l={...e};if(n==="mfaSmsEnrollment"||n==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in l){const u=l.phoneEnrollmentInfo.phoneNumber,c=l.phoneEnrollmentInfo.recaptchaToken;Object.assign(l,{phoneEnrollmentInfo:{phoneNumber:u,recaptchaToken:c,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in l){const u=l.phoneSignInInfo.recaptchaToken;Object.assign(l,{phoneSignInInfo:{recaptchaToken:u,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return l}return r?Object.assign(l,{captchaResp:o}):Object.assign(l,{captchaResponse:o}),Object.assign(l,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(l,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),l}async function tv(t,e,n,r,s){var i;if((i=t._getRecaptchaConfig())!=null&&i.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const o=await ev(t,e,n,n==="getOobCode");return r(t,o)}else return r(t,e).catch(async o=>{if(o.code==="auth/missing-recaptcha-token"){console.log(`${n} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const l=await ev(t,e,n,n==="getOobCode");return r(t,l)}else return Promise.reject(o)})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Gb(t,e){const n=nc(t,"auth");if(n.isInitialized()){const s=n.getImmediate(),i=n.getOptions();if(Nr(i,e??{}))return s;Wt(s,"already-initialized")}return n.initialize({options:e})}function Qb(t,e){const n=(e==null?void 0:e.persistence)||[],r=(Array.isArray(n)?n:[n]).map(bn);e!=null&&e.errorMap&&t._updateErrorMap(e.errorMap),t._initializeWithPersistence(r,e==null?void 0:e.popupRedirectResolver)}function Yb(t,e,n){const r=bs(t);K(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");const s=!1,i=TI(e),{host:o,port:l}=Xb(e),u=l===null?"":`:${l}`,c={url:`${i}//${o}${u}/`},d=Object.freeze({host:o,port:l,protocol:i.replace(":",""),options:Object.freeze({disableWarnings:s})});if(!r._canInitEmulator){K(r.config.emulator&&r.emulatorConfig,r,"emulator-config-failed"),K(Nr(c,r.config.emulator)&&Nr(d,r.emulatorConfig),r,"emulator-config-failed");return}r.config.emulator=c,r.emulatorConfig=d,r.settings.appVerificationDisabledForTesting=!0,As(o)?hp(`${i}//${o}${u}`):Jb()}function TI(t){const e=t.indexOf(":");return e<0?"":t.substr(0,e+1)}function Xb(t){const e=TI(t),n=/(\/\/)?([^?#/]+)/.exec(t.substr(e.length));if(!n)return{host:"",port:null};const r=n[2].split("@").pop()||"",s=/^(\[[^\]]+\])(:|$)/.exec(r);if(s){const i=s[1];return{host:i,port:nv(r.substr(i.length+1))}}else{const[i,o]=r.split(":");return{host:i,port:nv(o)}}}function nv(t){if(!t)return null;const e=Number(t);return isNaN(e)?null:e}function Jb(){function t(){const e=document.createElement("p"),n=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",n.position="fixed",n.width="100%",n.backgroundColor="#ffffff",n.border=".1em solid #000000",n.color="#b50000",n.bottom="0px",n.left="0px",n.margin="0px",n.zIndex="10000",n.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",t):t())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sm{constructor(e,n){this.providerId=e,this.signInMethod=n}toJSON(){return Nn("not implemented")}_getIdTokenResponse(e){return Nn("not implemented")}_linkToIdToken(e,n){return Nn("not implemented")}_getReauthenticationResolver(e){return Nn("not implemented")}}async function Zb(t,e){return Kr(t,"POST","/v1/accounts:signUp",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function e2(t,e){return kc(t,"POST","/v1/accounts:signInWithPassword",Ns(t,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function t2(t,e){return kc(t,"POST","/v1/accounts:signInWithEmailLink",Ns(t,e))}async function n2(t,e){return kc(t,"POST","/v1/accounts:signInWithEmailLink",Ns(t,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pa extends sm{constructor(e,n,r,s=null){super("password",r),this._email=e,this._password=n,this._tenantId=s}static _fromEmailAndPassword(e,n){return new pa(e,n,"password")}static _fromEmailAndCode(e,n,r=null){return new pa(e,n,"emailLink",r)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const n=typeof e=="string"?JSON.parse(e):e;if(n!=null&&n.email&&(n!=null&&n.password)){if(n.signInMethod==="password")return this._fromEmailAndPassword(n.email,n.password);if(n.signInMethod==="emailLink")return this._fromEmailAndCode(n.email,n.password,n.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const n={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return tv(e,n,"signInWithPassword",e2);case"emailLink":return t2(e,{email:this._email,oobCode:this._password});default:Wt(e,"internal-error")}}async _linkToIdToken(e,n){switch(this.signInMethod){case"password":const r={idToken:n,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return tv(e,r,"signUpPassword",Zb);case"emailLink":return n2(e,{idToken:n,email:this._email,oobCode:this._password});default:Wt(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ci(t,e){return kc(t,"POST","/v1/accounts:signInWithIdp",Ns(t,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const r2="http://localhost";class Es extends sm{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const n=new Es(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(n.idToken=e.idToken),e.accessToken&&(n.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(n.nonce=e.nonce),e.pendingToken&&(n.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(n.accessToken=e.oauthToken,n.secret=e.oauthTokenSecret):Wt("argument-error"),n}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const n=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:s,...i}=n;if(!r||!s)return null;const o=new Es(r,s);return o.idToken=i.idToken||void 0,o.accessToken=i.accessToken||void 0,o.secret=i.secret,o.nonce=i.nonce,o.pendingToken=i.pendingToken||null,o}_getIdTokenResponse(e){const n=this.buildRequest();return ci(e,n)}_linkToIdToken(e,n){const r=this.buildRequest();return r.idToken=n,ci(e,r)}_getReauthenticationResolver(e){const n=this.buildRequest();return n.autoCreate=!1,ci(e,n)}buildRequest(){const e={requestUri:r2,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const n={};this.idToken&&(n.id_token=this.idToken),this.accessToken&&(n.access_token=this.accessToken),this.secret&&(n.oauth_token_secret=this.secret),n.providerId=this.providerId,this.nonce&&!this.pendingToken&&(n.nonce=this.nonce),e.postBody=xa(n)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function s2(t){switch(t){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function i2(t){const e=_o(vo(t)).link,n=e?_o(vo(e)).deep_link_id:null,r=_o(vo(t)).deep_link_id;return(r?_o(vo(r)).link:null)||r||n||e||t}class im{constructor(e){const n=_o(vo(e)),r=n.apiKey??null,s=n.oobCode??null,i=s2(n.mode??null);K(r&&s&&i,"argument-error"),this.apiKey=r,this.operation=i,this.code=s,this.continueUrl=n.continueUrl??null,this.languageCode=n.lang??null,this.tenantId=n.tenantId??null}static parseLink(e){const n=i2(e);try{return new im(n)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fi{constructor(){this.providerId=Fi.PROVIDER_ID}static credential(e,n){return pa._fromEmailAndPassword(e,n)}static credentialWithLink(e,n){const r=im.parseLink(n);return K(r,"argument-error"),pa._fromEmailAndCode(e,r.code,r.tenantId)}}Fi.PROVIDER_ID="password";Fi.EMAIL_PASSWORD_SIGN_IN_METHOD="password";Fi.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class om{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
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
 */class Va extends om{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ar extends Va{constructor(){super("facebook.com")}static credential(e){return Es._fromParams({providerId:ar.PROVIDER_ID,signInMethod:ar.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return ar.credentialFromTaggedObject(e)}static credentialFromError(e){return ar.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return ar.credential(e.oauthAccessToken)}catch{return null}}}ar.FACEBOOK_SIGN_IN_METHOD="facebook.com";ar.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cn extends Va{constructor(){super("google.com"),this.addScope("profile")}static credential(e,n){return Es._fromParams({providerId:Cn.PROVIDER_ID,signInMethod:Cn.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:n})}static credentialFromResult(e){return Cn.credentialFromTaggedObject(e)}static credentialFromError(e){return Cn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:n,oauthAccessToken:r}=e;if(!n&&!r)return null;try{return Cn.credential(n,r)}catch{return null}}}Cn.GOOGLE_SIGN_IN_METHOD="google.com";Cn.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lr extends Va{constructor(){super("github.com")}static credential(e){return Es._fromParams({providerId:lr.PROVIDER_ID,signInMethod:lr.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return lr.credentialFromTaggedObject(e)}static credentialFromError(e){return lr.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return lr.credential(e.oauthAccessToken)}catch{return null}}}lr.GITHUB_SIGN_IN_METHOD="github.com";lr.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ur extends Va{constructor(){super("twitter.com")}static credential(e,n){return Es._fromParams({providerId:ur.PROVIDER_ID,signInMethod:ur.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:n})}static credentialFromResult(e){return ur.credentialFromTaggedObject(e)}static credentialFromError(e){return ur.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:n,oauthTokenSecret:r}=e;if(!n||!r)return null;try{return ur.credential(n,r)}catch{return null}}}ur.TWITTER_SIGN_IN_METHOD="twitter.com";ur.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Si{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,n,r,s=!1){const i=await Jt._fromIdTokenResponse(e,r,s),o=rv(r);return new Si({user:i,providerId:o,_tokenResponse:r,operationType:n})}static async _forOperation(e,n,r){await e._updateTokensIfNecessary(r,!0);const s=rv(r);return new Si({user:e,providerId:s,_tokenResponse:r,operationType:n})}}function rv(t){return t.providerId?t.providerId:"phoneNumber"in t?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Du extends In{constructor(e,n,r,s){super(n.code,n.message),this.operationType=r,this.user=s,Object.setPrototypeOf(this,Du.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:n.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,n,r,s){return new Du(e,n,r,s)}}function II(t,e,n,r){return(e==="reauthenticate"?n._getReauthenticationResolver(t):n._getIdTokenResponse(t)).catch(i=>{throw i.code==="auth/multi-factor-auth-required"?Du._fromErrorAndOperation(t,i,e,r):i})}async function o2(t,e,n=!1){const r=await fa(t,e._linkToIdToken(t.auth,await t.getIdToken()),n);return Si._forOperation(t,"link",r)}/**
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
 */async function a2(t,e,n=!1){const{auth:r}=t;if(Ct(r.app))return Promise.reject(kr(r));const s="reauthenticate";try{const i=await fa(t,II(r,s,e,t),n);K(i.idToken,r,"internal-error");const o=nm(i.idToken);K(o,r,"internal-error");const{sub:l}=o;return K(t.uid===l,r,"user-mismatch"),Si._forOperation(t,s,i)}catch(i){throw(i==null?void 0:i.code)==="auth/user-not-found"&&Wt(r,"user-mismatch"),i}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function xI(t,e,n=!1){if(Ct(t.app))return Promise.reject(kr(t));const r="signIn",s=await II(t,r,e),i=await Si._fromIdTokenResponse(t,r,s);return n||await t._updateCurrentUser(i.user),i}async function l2(t,e){return xI(bs(t),e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function u2(t){const e=bs(t);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}function c2(t,e,n){return Ct(t.app)?Promise.reject(kr(t)):l2(pe(t),Fi.credential(e,n)).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&u2(t),r})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function h2(t,e){return pe(t).setPersistence(e)}function d2(t,e,n,r){return pe(t).onIdTokenChanged(e,n,r)}function f2(t,e,n){return pe(t).beforeAuthStateChanged(e,n)}function p2(t,e,n,r){return pe(t).onAuthStateChanged(e,n,r)}function m2(t){return pe(t).signOut()}const Ou="__sak";/**
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
 */class SI{constructor(e,n){this.storageRetriever=e,this.type=n}_isAvailable(){try{return this.storage?(this.storage.setItem(Ou,"1"),this.storage.removeItem(Ou),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,n){return this.storage.setItem(e,JSON.stringify(n)),Promise.resolve()}_get(e){const n=this.storage.getItem(e);return Promise.resolve(n?JSON.parse(n):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const g2=1e3,y2=10;class AI extends SI{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,n)=>this.onStorageEvent(e,n),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=_I(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const n of Object.keys(this.listeners)){const r=this.storage.getItem(n),s=this.localCache[n];r!==s&&e(n,s,r)}}onStorageEvent(e,n=!1){if(!e.key){this.forAllChangedKeys((o,l,u)=>{this.notifyListeners(o,u)});return}const r=e.key;n?this.detachListener():this.stopPolling();const s=()=>{const o=this.storage.getItem(r);!n&&this.localCache[r]===o||this.notifyListeners(r,o)},i=this.storage.getItem(r);Ob()&&i!==e.newValue&&e.newValue!==e.oldValue?setTimeout(s,y2):s()}notifyListeners(e,n){this.localCache[e]=n;const r=this.listeners[e];if(r)for(const s of Array.from(r))s(n&&JSON.parse(n))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,n,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:n,newValue:r}),!0)})},g2)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,n){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(n)}_removeListener(e,n){this.listeners[e]&&(this.listeners[e].delete(n),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,n){await super._set(e,n),this.localCache[e]=JSON.stringify(n)}async _get(e){const n=await super._get(e);return this.localCache[e]=JSON.stringify(n),n}async _remove(e){await super._remove(e),delete this.localCache[e]}}AI.type="LOCAL";const CI=AI;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kI extends SI{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,n){}_removeListener(e,n){}}kI.type="SESSION";const RI=kI;/**
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
 */function _2(t){return Promise.all(t.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(n){return{fulfilled:!1,reason:n}}}))}/**
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
 */class Pc{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const n=this.receivers.find(s=>s.isListeningto(e));if(n)return n;const r=new Pc(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const n=e,{eventId:r,eventType:s,data:i}=n.data,o=this.handlersMap[s];if(!(o!=null&&o.size))return;n.ports[0].postMessage({status:"ack",eventId:r,eventType:s});const l=Array.from(o).map(async c=>c(n.origin,i)),u=await _2(l);n.ports[0].postMessage({status:"done",eventId:r,eventType:s,response:u})}_subscribe(e,n){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(n)}_unsubscribe(e,n){this.handlersMap[e]&&n&&this.handlersMap[e].delete(n),(!n||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Pc.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function am(t="",e=10){let n="";for(let r=0;r<e;r++)n+=Math.floor(Math.random()*10);return t+n}/**
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
 */class v2{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,n,r=50){const s=typeof MessageChannel<"u"?new MessageChannel:null;if(!s)throw new Error("connection_unavailable");let i,o;return new Promise((l,u)=>{const c=am("",20);s.port1.start();const d=setTimeout(()=>{u(new Error("unsupported_event"))},r);o={messageChannel:s,onMessage(m){const g=m;if(g.data.eventId===c)switch(g.data.status){case"ack":clearTimeout(d),i=setTimeout(()=>{u(new Error("timeout"))},3e3);break;case"done":clearTimeout(i),l(g.data.response);break;default:clearTimeout(d),clearTimeout(i),u(new Error("invalid_response"));break}}},this.handlers.add(o),s.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:c,data:n},[s.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wn(){return window}function w2(t){wn().location.href=t}/**
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
 */function PI(){return typeof wn().WorkerGlobalScope<"u"&&typeof wn().importScripts=="function"}async function E2(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function T2(){var t;return((t=navigator==null?void 0:navigator.serviceWorker)==null?void 0:t.controller)||null}function I2(){return PI()?self:null}/**
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
 */const NI="firebaseLocalStorageDb",x2=1,Vu="firebaseLocalStorage",bI="fbase_key";class La{constructor(e){this.request=e}toPromise(){return new Promise((e,n)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{n(this.request.error)})})}}function Nc(t,e){return t.transaction([Vu],e?"readwrite":"readonly").objectStore(Vu)}function S2(){const t=indexedDB.deleteDatabase(NI);return new La(t).toPromise()}function df(){const t=indexedDB.open(NI,x2);return new Promise((e,n)=>{t.addEventListener("error",()=>{n(t.error)}),t.addEventListener("upgradeneeded",()=>{const r=t.result;try{r.createObjectStore(Vu,{keyPath:bI})}catch(s){n(s)}}),t.addEventListener("success",async()=>{const r=t.result;r.objectStoreNames.contains(Vu)?e(r):(r.close(),await S2(),e(await df()))})})}async function sv(t,e,n){const r=Nc(t,!0).put({[bI]:e,value:n});return new La(r).toPromise()}async function A2(t,e){const n=Nc(t,!1).get(e),r=await new La(n).toPromise();return r===void 0?null:r.value}function iv(t,e){const n=Nc(t,!0).delete(e);return new La(n).toPromise()}const C2=800,k2=3;class DI{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await df(),this.db)}async _withRetries(e){let n=0;for(;;)try{const r=await this._openDb();return await e(r)}catch(r){if(n++>k2)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return PI()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Pc._getInstance(I2()),this.receiver._subscribe("keyChanged",async(e,n)=>({keyProcessed:(await this._poll()).includes(n.key)})),this.receiver._subscribe("ping",async(e,n)=>["keyChanged"])}async initializeSender(){var n,r;if(this.activeServiceWorker=await E2(),!this.activeServiceWorker)return;this.sender=new v2(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(n=e[0])!=null&&n.fulfilled&&(r=e[0])!=null&&r.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||T2()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await df();return await sv(e,Ou,"1"),await iv(e,Ou),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,n){return this._withPendingWrite(async()=>(await this._withRetries(r=>sv(r,e,n)),this.localCache[e]=n,this.notifyServiceWorker(e)))}async _get(e){const n=await this._withRetries(r=>A2(r,e));return this.localCache[e]=n,n}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(n=>iv(n,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(s=>{const i=Nc(s,!1).getAll();return new La(i).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const n=[],r=new Set;if(e.length!==0)for(const{fbase_key:s,value:i}of e)r.add(s),JSON.stringify(this.localCache[s])!==JSON.stringify(i)&&(this.notifyListeners(s,i),n.push(s));for(const s of Object.keys(this.localCache))this.localCache[s]&&!r.has(s)&&(this.notifyListeners(s,null),n.push(s));return n}notifyListeners(e,n){this.localCache[e]=n;const r=this.listeners[e];if(r)for(const s of Array.from(r))s(n)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),C2)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,n){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(n)}_removeListener(e,n){this.listeners[e]&&(this.listeners[e].delete(n),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}DI.type="LOCAL";const R2=DI;new Oa(3e4,6e4);/**
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
 */function OI(t,e){return e?bn(e):(K(t._popupRedirectResolver,t,"argument-error"),t._popupRedirectResolver)}/**
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
 */class lm extends sm{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return ci(e,this._buildIdpRequest())}_linkToIdToken(e,n){return ci(e,this._buildIdpRequest(n))}_getReauthenticationResolver(e){return ci(e,this._buildIdpRequest())}_buildIdpRequest(e){const n={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(n.idToken=e),n}}function P2(t){return xI(t.auth,new lm(t),t.bypassAuthState)}function N2(t){const{auth:e,user:n}=t;return K(n,e,"internal-error"),a2(n,new lm(t),t.bypassAuthState)}async function b2(t){const{auth:e,user:n}=t;return K(n,e,"internal-error"),o2(n,new lm(t),t.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class VI{constructor(e,n,r,s,i=!1){this.auth=e,this.resolver=r,this.user=s,this.bypassAuthState=i,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(n)?n:[n]}execute(){return new Promise(async(e,n)=>{this.pendingPromise={resolve:e,reject:n};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){const{urlResponse:n,sessionId:r,postBody:s,tenantId:i,error:o,type:l}=e;if(o){this.reject(o);return}const u={auth:this.auth,requestUri:n,sessionId:r,tenantId:i||void 0,postBody:s||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(l)(u))}catch(c){this.reject(c)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return P2;case"linkViaPopup":case"linkViaRedirect":return b2;case"reauthViaPopup":case"reauthViaRedirect":return N2;default:Wt(this.auth,"internal-error")}}resolve(e){Wn(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){Wn(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const D2=new Oa(2e3,1e4);async function O2(t,e,n){if(Ct(t.app))return Promise.reject(nn(t,"operation-not-supported-in-this-environment"));const r=bs(t);pb(t,e,om);const s=OI(r,n);return new ls(r,"signInViaPopup",e,s).executeNotNull()}class ls extends VI{constructor(e,n,r,s,i){super(e,n,s,i),this.provider=r,this.authWindow=null,this.pollId=null,ls.currentPopupAction&&ls.currentPopupAction.cancel(),ls.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return K(e,this.auth,"internal-error"),e}async onExecution(){Wn(this.filter.length===1,"Popup operations only handle one event");const e=am();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(n=>{this.reject(n)}),this.resolver._isIframeWebStorageSupported(this.auth,n=>{n||this.reject(nn(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(nn(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,ls.currentPopupAction=null}pollUserCancellation(){const e=()=>{var n,r;if((r=(n=this.authWindow)==null?void 0:n.window)!=null&&r.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(nn(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,D2.get())};e()}}ls.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const V2="pendingRedirect",Wl=new Map;class L2 extends VI{constructor(e,n,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],n,void 0,r),this.eventId=null}async execute(){let e=Wl.get(this.auth._key());if(!e){try{const r=await M2(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(n){e=()=>Promise.reject(n)}Wl.set(this.auth._key(),e)}return this.bypassAuthState||Wl.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const n=await this.auth._redirectUserForId(e.eventId);if(n)return this.user=n,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function M2(t,e){const n=F2(e),r=U2(t);if(!await r._isAvailable())return!1;const s=await r._get(n)==="true";return await r._remove(n),s}function j2(t,e){Wl.set(t._key(),e)}function U2(t){return bn(t._redirectPersistence)}function F2(t){return $l(V2,t.config.apiKey,t.name)}async function z2(t,e,n=!1){if(Ct(t.app))return Promise.reject(kr(t));const r=bs(t),s=OI(r,e),o=await new L2(r,s,n).execute();return o&&!n&&(delete o.user._redirectEventId,await r._persistUserIfCurrent(o.user),await r._setRedirectUser(null,e)),o}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const B2=10*60*1e3;class $2{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let n=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(n=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!W2(e)||(this.hasHandledPotentialRedirect=!0,n||(this.queuedRedirectEvent=e,n=!0)),n}sendToConsumer(e,n){var r;if(e.error&&!LI(e)){const s=((r=e.error.code)==null?void 0:r.split("auth/")[1])||"internal-error";n.onError(nn(this.auth,s))}else n.onAuthEvent(e)}isEventForConsumer(e,n){const r=n.eventId===null||!!e.eventId&&e.eventId===n.eventId;return n.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=B2&&this.cachedEventUids.clear(),this.cachedEventUids.has(ov(e))}saveEventToCache(e){this.cachedEventUids.add(ov(e)),this.lastProcessedEventTime=Date.now()}}function ov(t){return[t.type,t.eventId,t.sessionId,t.tenantId].filter(e=>e).join("-")}function LI({type:t,error:e}){return t==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function W2(t){switch(t.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return LI(t);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function H2(t,e={}){return Kr(t,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const q2=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,K2=/^https?/;async function G2(t){if(t.config.emulator)return;const{authorizedDomains:e}=await H2(t);for(const n of e)try{if(Q2(n))return}catch{}Wt(t,"unauthorized-domain")}function Q2(t){const e=cf(),{protocol:n,hostname:r}=new URL(e);if(t.startsWith("chrome-extension://")){const o=new URL(t);return o.hostname===""&&r===""?n==="chrome-extension:"&&t.replace("chrome-extension://","")===e.replace("chrome-extension://",""):n==="chrome-extension:"&&o.hostname===r}if(!K2.test(n))return!1;if(q2.test(t))return r===t;const s=t.replace(/\./g,"\\.");return new RegExp("^(.+\\."+s+"|"+s+")$","i").test(r)}/**
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
 */const Y2=new Oa(3e4,6e4);function av(){const t=wn().___jsl;if(t!=null&&t.H){for(const e of Object.keys(t.H))if(t.H[e].r=t.H[e].r||[],t.H[e].L=t.H[e].L||[],t.H[e].r=[...t.H[e].L],t.CP)for(let n=0;n<t.CP.length;n++)t.CP[n]=null}}function X2(t){return new Promise((e,n)=>{var s,i,o;function r(){av(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{av(),n(nn(t,"network-request-failed"))},timeout:Y2.get()})}if((i=(s=wn().gapi)==null?void 0:s.iframes)!=null&&i.Iframe)e(gapi.iframes.getContext());else if((o=wn().gapi)!=null&&o.load)r();else{const l=$b("iframefcb");return wn()[l]=()=>{gapi.load?r():n(nn(t,"network-request-failed"))},wI(`${Bb()}?onload=${l}`).catch(u=>n(u))}}).catch(e=>{throw Hl=null,e})}let Hl=null;function J2(t){return Hl=Hl||X2(t),Hl}/**
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
 */const Z2=new Oa(5e3,15e3),eD="__/auth/iframe",tD="emulator/auth/iframe",nD={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},rD=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function sD(t){const e=t.config;K(e.authDomain,t,"auth-domain-config-required");const n=e.emulator?tm(e,tD):`https://${t.config.authDomain}/${eD}`,r={apiKey:e.apiKey,appName:t.name,v:Cs},s=rD.get(t.config.apiHost);s&&(r.eid=s);const i=t._getFrameworks();return i.length&&(r.fw=i.join(",")),`${n}?${xa(r).slice(1)}`}async function iD(t){const e=await J2(t),n=wn().gapi;return K(n,t,"internal-error"),e.open({where:document.body,url:sD(t),messageHandlersFilter:n.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:nD,dontclear:!0},r=>new Promise(async(s,i)=>{await r.restyle({setHideOnLeave:!1});const o=nn(t,"network-request-failed"),l=wn().setTimeout(()=>{i(o)},Z2.get());function u(){wn().clearTimeout(l),s(r)}r.ping(u).then(u,()=>{i(o)})}))}/**
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
 */const oD={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},aD=500,lD=600,uD="_blank",cD="http://localhost";class lv{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function hD(t,e,n,r=aD,s=lD){const i=Math.max((window.screen.availHeight-s)/2,0).toString(),o=Math.max((window.screen.availWidth-r)/2,0).toString();let l="";const u={...oD,width:r.toString(),height:s.toString(),top:i,left:o},c=ut().toLowerCase();n&&(l=fI(c)?uD:n),hI(c)&&(e=e||cD,u.scrollbars="yes");const d=Object.entries(u).reduce((g,[w,A])=>`${g}${w}=${A},`,"");if(Db(c)&&l!=="_self")return dD(e||"",l),new lv(null);const m=window.open(e||"",l,d);K(m,t,"popup-blocked");try{m.focus()}catch{}return new lv(m)}function dD(t,e){const n=document.createElement("a");n.href=t,n.target=e;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),n.dispatchEvent(r)}/**
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
 */const fD="__/auth/handler",pD="emulator/auth/handler",mD=encodeURIComponent("fac");async function uv(t,e,n,r,s,i){K(t.config.authDomain,t,"auth-domain-config-required"),K(t.config.apiKey,t,"invalid-api-key");const o={apiKey:t.config.apiKey,appName:t.name,authType:n,redirectUrl:r,v:Cs,eventId:s};if(e instanceof om){e.setDefaultLanguage(t.languageCode),o.providerId=e.providerId||"",BC(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[d,m]of Object.entries({}))o[d]=m}if(e instanceof Va){const d=e.getScopes().filter(m=>m!=="");d.length>0&&(o.scopes=d.join(","))}t.tenantId&&(o.tid=t.tenantId);const l=o;for(const d of Object.keys(l))l[d]===void 0&&delete l[d];const u=await t._getAppCheckToken(),c=u?`#${mD}=${encodeURIComponent(u)}`:"";return`${gD(t)}?${xa(l).slice(1)}${c}`}function gD({config:t}){return t.emulator?tm(t,pD):`https://${t.authDomain}/${fD}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Uh="webStorageSupport";class yD{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=RI,this._completeRedirectFn=z2,this._overrideRedirectResult=j2}async _openPopup(e,n,r,s){var o;Wn((o=this.eventManagers[e._key()])==null?void 0:o.manager,"_initialize() not called before _openPopup()");const i=await uv(e,n,r,cf(),s);return hD(e,i,am())}async _openRedirect(e,n,r,s){await this._originValidation(e);const i=await uv(e,n,r,cf(),s);return w2(i),new Promise(()=>{})}_initialize(e){const n=e._key();if(this.eventManagers[n]){const{manager:s,promise:i}=this.eventManagers[n];return s?Promise.resolve(s):(Wn(i,"If manager is not set, promise should be"),i)}const r=this.initAndGetManager(e);return this.eventManagers[n]={promise:r},r.catch(()=>{delete this.eventManagers[n]}),r}async initAndGetManager(e){const n=await iD(e),r=new $2(e);return n.register("authEvent",s=>(K(s==null?void 0:s.authEvent,e,"invalid-auth-event"),{status:r.onEvent(s.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=n,r}_isIframeWebStorageSupported(e,n){this.iframes[e._key()].send(Uh,{type:Uh},s=>{var o;const i=(o=s==null?void 0:s[0])==null?void 0:o[Uh];i!==void 0&&n(!!i),Wt(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const n=e._key();return this.originValidationPromises[n]||(this.originValidationPromises[n]=G2(e)),this.originValidationPromises[n]}get _shouldInitProactively(){return _I()||dI()||rm()}}const _D=yD;var cv="@firebase/auth",hv="1.13.1";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vD{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const n=this.auth.onIdTokenChanged(r=>{e((r==null?void 0:r.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,n),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const n=this.internalListeners.get(e);n&&(this.internalListeners.delete(e),n(),this.updateProactiveRefresh())}assertAuthConfigured(){K(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wD(t){switch(t){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function ED(t){ys(new br("auth",(e,{options:n})=>{const r=e.getProvider("app").getImmediate(),s=e.getProvider("heartbeat"),i=e.getProvider("app-check-internal"),{apiKey:o,authDomain:l}=r.options;K(o&&!o.includes(":"),"invalid-api-key",{appName:r.name});const u={apiKey:o,authDomain:l,clientPlatform:t,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:vI(t)},c=new Ub(r,s,i,u);return Qb(c,n),c},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,n,r)=>{e.getProvider("auth-internal").initialize()})),ys(new br("auth-internal",e=>{const n=bs(e.getProvider("auth").getImmediate());return(r=>new vD(r))(n)},"PRIVATE").setInstantiationMode("EXPLICIT")),yn(cv,hv,wD(t)),yn(cv,hv,"esm2020")}/**
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
 */const TD=5*60,ID=aE("authIdTokenMaxAge")||TD;let dv=null;const xD=t=>async e=>{const n=e&&await e.getIdTokenResult(),r=n&&(new Date().getTime()-Date.parse(n.issuedAtTime))/1e3;if(r&&r>ID)return;const s=n==null?void 0:n.token;dv!==s&&(dv=s,await fetch(t,{method:s?"POST":"DELETE",headers:s?{Authorization:`Bearer ${s}`}:{}}))};function SD(t=pp()){const e=nc(t,"auth");if(e.isInitialized())return e.getImmediate();const n=Gb(t,{popupRedirectResolver:_D,persistence:[R2,CI,RI]}),r=aE("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){const i=new URL(r,location.origin);if(location.origin===i.origin){const o=xD(i.toString());f2(n,o,()=>o(n.currentUser)),d2(n,l=>o(l))}}const s=sE("auth");return s&&Yb(n,`http://${s}`),n}function AD(){var t;return((t=document.getElementsByTagName("head"))==null?void 0:t[0])??document}Fb({loadJS(t){return new Promise((e,n)=>{const r=document.createElement("script");r.setAttribute("src",t),r.onload=e,r.onerror=s=>{const i=nn("internal-error");i.customData=s,n(i)},r.type="text/javascript",r.charset="UTF-8",AD().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});ED("Browser");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const MI="firebasestorage.googleapis.com",jI="storageBucket",CD=2*60*1e3,kD=10*60*1e3;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Re extends In{constructor(e,n,r=0){super(Fh(e),`Firebase Storage: ${n} (${Fh(e)})`),this.status_=r,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,Re.prototype)}get status(){return this.status_}set status(e){this.status_=e}_codeEquals(e){return Fh(e)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var ke;(function(t){t.UNKNOWN="unknown",t.OBJECT_NOT_FOUND="object-not-found",t.BUCKET_NOT_FOUND="bucket-not-found",t.PROJECT_NOT_FOUND="project-not-found",t.QUOTA_EXCEEDED="quota-exceeded",t.UNAUTHENTICATED="unauthenticated",t.UNAUTHORIZED="unauthorized",t.UNAUTHORIZED_APP="unauthorized-app",t.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",t.INVALID_CHECKSUM="invalid-checksum",t.CANCELED="canceled",t.INVALID_EVENT_NAME="invalid-event-name",t.INVALID_URL="invalid-url",t.INVALID_DEFAULT_BUCKET="invalid-default-bucket",t.NO_DEFAULT_BUCKET="no-default-bucket",t.CANNOT_SLICE_BLOB="cannot-slice-blob",t.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",t.NO_DOWNLOAD_URL="no-download-url",t.INVALID_ARGUMENT="invalid-argument",t.INVALID_ARGUMENT_COUNT="invalid-argument-count",t.APP_DELETED="app-deleted",t.INVALID_ROOT_OPERATION="invalid-root-operation",t.INVALID_FORMAT="invalid-format",t.INTERNAL_ERROR="internal-error",t.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(ke||(ke={}));function Fh(t){return"storage/"+t}function um(){const t="An unknown error occurred, please check the error payload for server response.";return new Re(ke.UNKNOWN,t)}function RD(t){return new Re(ke.OBJECT_NOT_FOUND,"Object '"+t+"' does not exist.")}function PD(t){return new Re(ke.QUOTA_EXCEEDED,"Quota for bucket '"+t+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}function ND(){const t="User is not authenticated, please authenticate using Firebase Authentication and try again.";return new Re(ke.UNAUTHENTICATED,t)}function bD(){return new Re(ke.UNAUTHORIZED_APP,"This app does not have permission to access Firebase Storage on this project.")}function DD(t){return new Re(ke.UNAUTHORIZED,"User does not have permission to access '"+t+"'.")}function OD(){return new Re(ke.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function VD(){return new Re(ke.CANCELED,"User canceled the upload/download.")}function LD(t){return new Re(ke.INVALID_URL,"Invalid URL '"+t+"'.")}function MD(t){return new Re(ke.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+t+"'.")}function jD(){return new Re(ke.NO_DEFAULT_BUCKET,"No default bucket found. Did you set the '"+jI+"' property when initializing the app?")}function UD(){return new Re(ke.CANNOT_SLICE_BLOB,"Cannot slice blob for upload. Please retry the upload.")}function FD(){return new Re(ke.NO_DOWNLOAD_URL,"The given file does not have any download URLs.")}function zD(t){return new Re(ke.UNSUPPORTED_ENVIRONMENT,`${t} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`)}function ff(t){return new Re(ke.INVALID_ARGUMENT,t)}function UI(){return new Re(ke.APP_DELETED,"The Firebase app was deleted.")}function BD(t){return new Re(ke.INVALID_ROOT_OPERATION,"The operation '"+t+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}function jo(t,e){return new Re(ke.INVALID_FORMAT,"String does not match format '"+t+"': "+e)}function fo(t){throw new Re(ke.INTERNAL_ERROR,"Internal error: "+t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nt{constructor(e,n){this.bucket=e,this.path_=n}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const e=encodeURIComponent;return"/b/"+e(this.bucket)+"/o/"+e(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(e,n){let r;try{r=Nt.makeFromUrl(e,n)}catch{return new Nt(e,"")}if(r.path==="")return r;throw MD(e)}static makeFromUrl(e,n){let r=null;const s="([A-Za-z0-9.\\-_]+)";function i(D){D.path.charAt(D.path.length-1)==="/"&&(D.path_=D.path_.slice(0,-1))}const o="(/(.*))?$",l=new RegExp("^gs://"+s+o,"i"),u={bucket:1,path:3};function c(D){D.path_=decodeURIComponent(D.path)}const d="v[A-Za-z0-9_]+",m=n.replace(/[.]/g,"\\."),g="(/([^?#]*).*)?$",w=new RegExp(`^https?://${m}/${d}/b/${s}/o${g}`,"i"),A={bucket:1,path:3},P=n===MI?"(?:storage.googleapis.com|storage.cloud.google.com)":n,N="([^?#]*)",x=new RegExp(`^https?://${P}/${s}/${N}`,"i"),k=[{regex:l,indices:u,postModify:i},{regex:w,indices:A,postModify:c},{regex:x,indices:{bucket:1,path:2},postModify:c}];for(let D=0;D<k.length;D++){const U=k[D],L=U.regex.exec(e);if(L){const E=L[U.indices.bucket];let _=L[U.indices.path];_||(_=""),r=new Nt(E,_),U.postModify(r);break}}if(r==null)throw LD(e);return r}}class $D{constructor(e){this.promise_=Promise.reject(e)}getPromise(){return this.promise_}cancel(e=!1){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function WD(t,e,n){let r=1,s=null,i=null,o=!1,l=0;function u(){return l===2}let c=!1;function d(...N){c||(c=!0,e.apply(null,N))}function m(N){s=setTimeout(()=>{s=null,t(w,u())},N)}function g(){i&&clearTimeout(i)}function w(N,...x){if(c){g();return}if(N){g(),d.call(null,N,...x);return}if(u()||o){g(),d.call(null,N,...x);return}r<64&&(r*=2);let k;l===1?(l=2,k=0):k=(r+Math.random())*1e3,m(k)}let A=!1;function P(N){A||(A=!0,g(),!c&&(s!==null?(N||(l=2),clearTimeout(s),m(0)):N||(l=1)))}return m(0),i=setTimeout(()=>{o=!0,P(!0)},n),P}function HD(t){t(!1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qD(t){return t!==void 0}function KD(t){return typeof t=="object"&&!Array.isArray(t)}function cm(t){return typeof t=="string"||t instanceof String}function fv(t){return hm()&&t instanceof Blob}function hm(){return typeof Blob<"u"}function pv(t,e,n,r){if(r<e)throw ff(`Invalid value for '${t}'. Expected ${e} or greater.`);if(r>n)throw ff(`Invalid value for '${t}'. Expected ${n} or less.`)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dm(t,e,n){let r=e;return n==null&&(r=`https://${e}`),`${n}://${r}/v0${t}`}function FI(t){const e=encodeURIComponent;let n="?";for(const r in t)if(t.hasOwnProperty(r)){const s=e(r)+"="+e(t[r]);n=n+s+"&"}return n=n.slice(0,-1),n}var hs;(function(t){t[t.NO_ERROR=0]="NO_ERROR",t[t.NETWORK_ERROR=1]="NETWORK_ERROR",t[t.ABORT=2]="ABORT"})(hs||(hs={}));/**
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
 */function GD(t,e){const n=t>=500&&t<600,s=[408,429].indexOf(t)!==-1,i=e.indexOf(t)!==-1;return n||s||i}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class QD{constructor(e,n,r,s,i,o,l,u,c,d,m,g=!0,w=!1){this.url_=e,this.method_=n,this.headers_=r,this.body_=s,this.successCodes_=i,this.additionalRetryCodes_=o,this.callback_=l,this.errorCallback_=u,this.timeout_=c,this.progressCallback_=d,this.connectionFactory_=m,this.retry=g,this.isUsingEmulator=w,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((A,P)=>{this.resolve_=A,this.reject_=P,this.start_()})}start_(){const e=(r,s)=>{if(s){r(!1,new vl(!1,null,!0));return}const i=this.connectionFactory_();this.pendingConnection_=i;const o=l=>{const u=l.loaded,c=l.lengthComputable?l.total:-1;this.progressCallback_!==null&&this.progressCallback_(u,c)};this.progressCallback_!==null&&i.addUploadProgressListener(o),i.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&i.removeUploadProgressListener(o),this.pendingConnection_=null;const l=i.getErrorCode()===hs.NO_ERROR,u=i.getStatus();if(!l||GD(u,this.additionalRetryCodes_)&&this.retry){const d=i.getErrorCode()===hs.ABORT;r(!1,new vl(!1,null,d));return}const c=this.successCodes_.indexOf(u)!==-1;r(!0,new vl(c,i))})},n=(r,s)=>{const i=this.resolve_,o=this.reject_,l=s.connection;if(s.wasSuccessCode)try{const u=this.callback_(l,l.getResponse());qD(u)?i(u):i()}catch(u){o(u)}else if(l!==null){const u=um();u.serverResponse=l.getErrorText(),this.errorCallback_?o(this.errorCallback_(l,u)):o(u)}else if(s.canceled){const u=this.appDelete_?UI():VD();o(u)}else{const u=OD();o(u)}};this.canceled_?n(!1,new vl(!1,null,!0)):this.backoffId_=WD(e,n,this.timeout_)}getPromise(){return this.promise_}cancel(e){this.canceled_=!0,this.appDelete_=e||!1,this.backoffId_!==null&&HD(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class vl{constructor(e,n,r){this.wasSuccessCode=e,this.connection=n,this.canceled=!!r}}function YD(t,e){e!==null&&e.length>0&&(t.Authorization="Firebase "+e)}function XD(t,e){t["X-Firebase-Storage-Version"]="webjs/"+(e??"AppManager")}function JD(t,e){e&&(t["X-Firebase-GMPID"]=e)}function ZD(t,e){e!==null&&(t["X-Firebase-AppCheck"]=e)}function eO(t,e,n,r,s,i,o=!0,l=!1){const u=FI(t.urlParams),c=t.url+u,d=Object.assign({},t.headers);return JD(d,e),YD(d,n),XD(d,i),ZD(d,r),new QD(c,t.method,d,t.body,t.successCodes,t.additionalRetryCodes,t.handler,t.errorHandler,t.timeout,t.progressCallback,s,o,l)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function tO(){return typeof BlobBuilder<"u"?BlobBuilder:typeof WebKitBlobBuilder<"u"?WebKitBlobBuilder:void 0}function nO(...t){const e=tO();if(e!==void 0){const n=new e;for(let r=0;r<t.length;r++)n.append(t[r]);return n.getBlob()}else{if(hm())return new Blob(t);throw new Re(ke.UNSUPPORTED_ENVIRONMENT,"This browser doesn't seem to support creating Blobs")}}function rO(t,e,n){return t.webkitSlice?t.webkitSlice(e,n):t.mozSlice?t.mozSlice(e,n):t.slice?t.slice(e,n):null}/**
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
 */function sO(t){if(typeof atob>"u")throw zD("base-64");return atob(t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pn={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"};class zh{constructor(e,n){this.data=e,this.contentType=n||null}}function iO(t,e){switch(t){case pn.RAW:return new zh(zI(e));case pn.BASE64:case pn.BASE64URL:return new zh(BI(t,e));case pn.DATA_URL:return new zh(aO(e),lO(e))}throw um()}function zI(t){const e=[];for(let n=0;n<t.length;n++){let r=t.charCodeAt(n);if(r<=127)e.push(r);else if(r<=2047)e.push(192|r>>6,128|r&63);else if((r&64512)===55296)if(!(n<t.length-1&&(t.charCodeAt(n+1)&64512)===56320))e.push(239,191,189);else{const i=r,o=t.charCodeAt(++n);r=65536|(i&1023)<<10|o&1023,e.push(240|r>>18,128|r>>12&63,128|r>>6&63,128|r&63)}else(r&64512)===56320?e.push(239,191,189):e.push(224|r>>12,128|r>>6&63,128|r&63)}return new Uint8Array(e)}function oO(t){let e;try{e=decodeURIComponent(t)}catch{throw jo(pn.DATA_URL,"Malformed data URL.")}return zI(e)}function BI(t,e){switch(t){case pn.BASE64:{const s=e.indexOf("-")!==-1,i=e.indexOf("_")!==-1;if(s||i)throw jo(t,"Invalid character '"+(s?"-":"_")+"' found: is it base64url encoded?");break}case pn.BASE64URL:{const s=e.indexOf("+")!==-1,i=e.indexOf("/")!==-1;if(s||i)throw jo(t,"Invalid character '"+(s?"+":"/")+"' found: is it base64 encoded?");e=e.replace(/-/g,"+").replace(/_/g,"/");break}}let n;try{n=sO(e)}catch(s){throw s.message.includes("polyfill")?s:jo(t,"Invalid character found")}const r=new Uint8Array(n.length);for(let s=0;s<n.length;s++)r[s]=n.charCodeAt(s);return r}class $I{constructor(e){this.base64=!1,this.contentType=null;const n=e.match(/^data:([^,]+)?,/);if(n===null)throw jo(pn.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");const r=n[1]||null;r!=null&&(this.base64=uO(r,";base64"),this.contentType=this.base64?r.substring(0,r.length-7):r),this.rest=e.substring(e.indexOf(",")+1)}}function aO(t){const e=new $I(t);return e.base64?BI(pn.BASE64,e.rest):oO(e.rest)}function lO(t){return new $I(t).contentType}function uO(t,e){return t.length>=e.length?t.substring(t.length-e.length)===e:!1}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cr{constructor(e,n){let r=0,s="";fv(e)?(this.data_=e,r=e.size,s=e.type):e instanceof ArrayBuffer?(n?this.data_=new Uint8Array(e):(this.data_=new Uint8Array(e.byteLength),this.data_.set(new Uint8Array(e))),r=this.data_.length):e instanceof Uint8Array&&(n?this.data_=e:(this.data_=new Uint8Array(e.length),this.data_.set(e)),r=e.length),this.size_=r,this.type_=s}size(){return this.size_}type(){return this.type_}slice(e,n){if(fv(this.data_)){const r=this.data_,s=rO(r,e,n);return s===null?null:new cr(s)}else{const r=new Uint8Array(this.data_.buffer,e,n-e);return new cr(r,!0)}}static getBlob(...e){if(hm()){const n=e.map(r=>r instanceof cr?r.data_:r);return new cr(nO.apply(null,n))}else{const n=e.map(o=>cm(o)?iO(pn.RAW,o).data:o.data_);let r=0;n.forEach(o=>{r+=o.byteLength});const s=new Uint8Array(r);let i=0;return n.forEach(o=>{for(let l=0;l<o.length;l++)s[i++]=o[l]}),new cr(s,!0)}}uploadData(){return this.data_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function WI(t){let e;try{e=JSON.parse(t)}catch{return null}return KD(e)?e:null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function cO(t){if(t.length===0)return null;const e=t.lastIndexOf("/");return e===-1?"":t.slice(0,e)}function hO(t,e){const n=e.split("/").filter(r=>r.length>0).join("/");return t.length===0?n:t+"/"+n}function HI(t){const e=t.lastIndexOf("/",t.length-2);return e===-1?t:t.slice(e+1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dO(t,e){return e}class dt{constructor(e,n,r,s){this.server=e,this.local=n||e,this.writable=!!r,this.xform=s||dO}}let wl=null;function fO(t){return!cm(t)||t.length<2?t:HI(t)}function qI(){if(wl)return wl;const t=[];t.push(new dt("bucket")),t.push(new dt("generation")),t.push(new dt("metageneration")),t.push(new dt("name","fullPath",!0));function e(i,o){return fO(o)}const n=new dt("name");n.xform=e,t.push(n);function r(i,o){return o!==void 0?Number(o):o}const s=new dt("size");return s.xform=r,t.push(s),t.push(new dt("timeCreated")),t.push(new dt("updated")),t.push(new dt("md5Hash",null,!0)),t.push(new dt("cacheControl",null,!0)),t.push(new dt("contentDisposition",null,!0)),t.push(new dt("contentEncoding",null,!0)),t.push(new dt("contentLanguage",null,!0)),t.push(new dt("contentType",null,!0)),t.push(new dt("metadata","customMetadata",!0)),wl=t,wl}function pO(t,e){function n(){const r=t.bucket,s=t.fullPath,i=new Nt(r,s);return e._makeStorageReference(i)}Object.defineProperty(t,"ref",{get:n})}function mO(t,e,n){const r={};r.type="file";const s=n.length;for(let i=0;i<s;i++){const o=n[i];r[o.local]=o.xform(r,e[o.server])}return pO(r,t),r}function KI(t,e,n){const r=WI(e);return r===null?null:mO(t,r,n)}function gO(t,e,n,r){const s=WI(e);if(s===null||!cm(s.downloadTokens))return null;const i=s.downloadTokens;if(i.length===0)return null;const o=encodeURIComponent;return i.split(",").map(c=>{const d=t.bucket,m=t.fullPath,g="/b/"+o(d)+"/o/"+o(m),w=dm(g,n,r),A=FI({alt:"media",token:c});return w+A})[0]}function yO(t,e){const n={},r=e.length;for(let s=0;s<r;s++){const i=e[s];i.writable&&(n[i.server]=t[i.local])}return JSON.stringify(n)}class GI{constructor(e,n,r,s){this.url=e,this.method=n,this.handler=r,this.timeout=s,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function QI(t){if(!t)throw um()}function _O(t,e){function n(r,s){const i=KI(t,s,e);return QI(i!==null),i}return n}function vO(t,e){function n(r,s){const i=KI(t,s,e);return QI(i!==null),gO(i,s,t.host,t._protocol)}return n}function YI(t){function e(n,r){let s;return n.getStatus()===401?n.getErrorText().includes("Firebase App Check token is invalid")?s=bD():s=ND():n.getStatus()===402?s=PD(t.bucket):n.getStatus()===403?s=DD(t.path):s=r,s.status=n.getStatus(),s.serverResponse=r.serverResponse,s}return e}function wO(t){const e=YI(t);function n(r,s){let i=e(r,s);return r.getStatus()===404&&(i=RD(t.path)),i.serverResponse=s.serverResponse,i}return n}function EO(t,e,n){const r=e.fullServerUrl(),s=dm(r,t.host,t._protocol),i="GET",o=t.maxOperationRetryTime,l=new GI(s,i,vO(t,n),o);return l.errorHandler=wO(e),l}function TO(t,e){return t&&t.contentType||e&&e.type()||"application/octet-stream"}function IO(t,e,n){const r=Object.assign({},n);return r.fullPath=t.path,r.size=e.size(),r.contentType||(r.contentType=TO(null,e)),r}function xO(t,e,n,r,s){const i=e.bucketOnlyServerUrl(),o={"X-Goog-Upload-Protocol":"multipart"};function l(){let k="";for(let D=0;D<2;D++)k=k+Math.random().toString().slice(2);return k}const u=l();o["Content-Type"]="multipart/related; boundary="+u;const c=IO(e,r,s),d=yO(c,n),m="--"+u+`\r
Content-Type: application/json; charset=utf-8\r
\r
`+d+`\r
--`+u+`\r
Content-Type: `+c.contentType+`\r
\r
`,g=`\r
--`+u+"--",w=cr.getBlob(m,r,g);if(w===null)throw UD();const A={name:c.fullPath},P=dm(i,t.host,t._protocol),N="POST",x=t.maxUploadRetryTime,v=new GI(P,N,_O(t,n),x);return v.urlParams=A,v.headers=o,v.body=w.uploadData(),v.errorHandler=YI(e),v}class SO{constructor(){this.sent_=!1,this.xhr_=new XMLHttpRequest,this.initXhr(),this.errorCode_=hs.NO_ERROR,this.sendPromise_=new Promise(e=>{this.xhr_.addEventListener("abort",()=>{this.errorCode_=hs.ABORT,e()}),this.xhr_.addEventListener("error",()=>{this.errorCode_=hs.NETWORK_ERROR,e()}),this.xhr_.addEventListener("load",()=>{e()})})}send(e,n,r,s,i){if(this.sent_)throw fo("cannot .send() more than once");if(As(e)&&r&&(this.xhr_.withCredentials=!0),this.sent_=!0,this.xhr_.open(n,e,!0),i!==void 0)for(const o in i)i.hasOwnProperty(o)&&this.xhr_.setRequestHeader(o,i[o].toString());return s!==void 0?this.xhr_.send(s):this.xhr_.send(),this.sendPromise_}getErrorCode(){if(!this.sent_)throw fo("cannot .getErrorCode() before sending");return this.errorCode_}getStatus(){if(!this.sent_)throw fo("cannot .getStatus() before sending");try{return this.xhr_.status}catch{return-1}}getResponse(){if(!this.sent_)throw fo("cannot .getResponse() before sending");return this.xhr_.response}getErrorText(){if(!this.sent_)throw fo("cannot .getErrorText() before sending");return this.xhr_.statusText}abort(){this.xhr_.abort()}getResponseHeader(e){return this.xhr_.getResponseHeader(e)}addUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.addEventListener("progress",e)}removeUploadProgressListener(e){this.xhr_.upload!=null&&this.xhr_.upload.removeEventListener("progress",e)}}class AO extends SO{initXhr(){this.xhr_.responseType="text"}}function XI(){return new AO}/**
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
 */class Ts{constructor(e,n){this._service=e,n instanceof Nt?this._location=n:this._location=Nt.makeFromUrl(n,e.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(e,n){return new Ts(e,n)}get root(){const e=new Nt(this._location.bucket,"");return this._newRef(this._service,e)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return HI(this._location.path)}get storage(){return this._service}get parent(){const e=cO(this._location.path);if(e===null)return null;const n=new Nt(this._location.bucket,e);return new Ts(this._service,n)}_throwIfRoot(e){if(this._location.path==="")throw BD(e)}}function CO(t,e,n){t._throwIfRoot("uploadBytes");const r=xO(t.storage,t._location,qI(),new cr(e,!0),n);return t.storage.makeRequestWithTokens(r,XI).then(s=>({metadata:s,ref:t}))}function kO(t){t._throwIfRoot("getDownloadURL");const e=EO(t.storage,t._location,qI());return t.storage.makeRequestWithTokens(e,XI).then(n=>{if(n===null)throw FD();return n})}function RO(t,e){const n=hO(t._location.path,e),r=new Nt(t._location.bucket,n);return new Ts(t.storage,r)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function PO(t){return/^[A-Za-z]+:\/\//.test(t)}function NO(t,e){return new Ts(t,e)}function JI(t,e){if(t instanceof fm){const n=t;if(n._bucket==null)throw jD();const r=new Ts(n,n._bucket);return e!=null?JI(r,e):r}else return e!==void 0?RO(t,e):t}function bO(t,e){if(e&&PO(e)){if(t instanceof fm)return NO(t,e);throw ff("To use ref(service, url), the first argument must be a Storage instance.")}else return JI(t,e)}function mv(t,e){const n=e==null?void 0:e[jI];return n==null?null:Nt.makeFromBucketSpec(n,t)}function DO(t,e,n,r={}){t.host=`${e}:${n}`;const s=As(e);s&&hp(`https://${t.host}/b`),t._isUsingEmulator=!0,t._protocol=s?"https":"http";const{mockUserToken:i}=r;i&&(t._overrideAuthToken=typeof i=="string"?i:lE(i,t.app.options.projectId))}class fm{constructor(e,n,r,s,i,o=!1){this.app=e,this._authProvider=n,this._appCheckProvider=r,this._url=s,this._firebaseVersion=i,this._isUsingEmulator=o,this._bucket=null,this._host=MI,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=CD,this._maxUploadRetryTime=kD,this._requests=new Set,s!=null?this._bucket=Nt.makeFromBucketSpec(s,this._host):this._bucket=mv(this._host,this.app.options)}get host(){return this._host}set host(e){this._host=e,this._url!=null?this._bucket=Nt.makeFromBucketSpec(this._url,e):this._bucket=mv(e,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(e){pv("time",0,Number.POSITIVE_INFINITY,e),this._maxUploadRetryTime=e}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(e){pv("time",0,Number.POSITIVE_INFINITY,e),this._maxOperationRetryTime=e}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const e=this._authProvider.getImmediate({optional:!0});if(e){const n=await e.getToken();if(n!==null)return n.accessToken}return null}async _getAppCheckToken(){if(Ct(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=this._appCheckProvider.getImmediate({optional:!0});return e?(await e.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(e=>e.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(e){return new Ts(this,e)}_makeRequest(e,n,r,s,i=!0){if(this._deleted)return new $D(UI());{const o=eO(e,this._appId,r,s,n,this._firebaseVersion,i,this._isUsingEmulator);return this._requests.add(o),o.getPromise().then(()=>this._requests.delete(o),()=>this._requests.delete(o)),o}}async makeRequestWithTokens(e,n){const[r,s]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(e,n,r,s).getPromise()}}const gv="@firebase/storage",yv="0.14.3";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ZI="storage";function OO(t,e,n){return t=pe(t),CO(t,e,n)}function VO(t){return t=pe(t),kO(t)}function LO(t,e){return t=pe(t),bO(t,e)}function MO(t=pp(),e){t=pe(t);const r=nc(t,ZI).getImmediate({identifier:e}),s=iE("storage");return s&&jO(r,...s),r}function jO(t,e,n,r={}){DO(t,e,n,r)}function UO(t,{instanceIdentifier:e}){const n=t.getProvider("app").getImmediate(),r=t.getProvider("auth-internal"),s=t.getProvider("app-check-internal");return new fm(n,r,s,e,Cs)}function FO(){ys(new br(ZI,UO,"PUBLIC").setMultipleInstances(!0)),yn(gv,yv,""),yn(gv,yv,"esm2020")}FO();const zO={apiKey:"AIzaSyDqVkAhkXALm3hLcrmzjiaS3flUezPFe2Q",authDomain:"barberia-elegance.firebaseapp.com",projectId:"barberia-elegance",storageBucket:"barberia-elegance.firebasestorage.app",messagingSenderId:"515311607907",appId:"1:515311607907:web:8add6005144015c5e85856"},pm=$y().length?$y()[0]:hE(zO),ma=SD(pm);h2(ma,CI).catch(()=>{});const Is=MT(pm),BO=MO(pm),$O={"barberiaelegance.synaptechspa.cl":"elegance","barberiaferraza.synaptechspa.cl":"ferraza","gitananails.synaptechspa.cl":"gitana"};function mm(){const e=new URL(window.location.href).searchParams.get("local");if(e)return sessionStorage.setItem("saas_current_tenant",e),e;const n=$O[window.location.hostname.toLowerCase()];return n||sessionStorage.getItem("saas_current_tenant")||"elegance"}function Le(t){const e=mm();return e==="elegance"?uf(Is,t):uf(Is,`tenants/${e}/${t}`)}function _v(t,e){return qe(Le(t),e)}const vv={elegance:{name:"𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐁𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩",accent:"emerald",emoji:"✂️"},ferraza:{name:"Barbería Ferraza",accent:"slate",emoji:"✂️"},gitana:{name:"Gitana Nails Studio",accent:"pink",emoji:"💅"}},ex=V.createContext(null);function WO({children:t}){const e=V.useMemo(()=>mm(),[]),n=vv[e]??vv.elegance;return f.jsx(ex.Provider,{value:{id:e,...n},children:t})}const tx=()=>V.useContext(ex),nx=V.createContext(null);function HO({children:t}){const[e,n]=V.useState(void 0),[r,s]=V.useState(null),[i,o]=V.useState(!0);return V.useEffect(()=>p2(ma,async u=>{if(!u){n(null),s(null),o(!1);return}n(u);try{const c=await JT(qe(Is,"users",u.uid));s(c.exists()?c.data().rol:"cliente")}catch{s("cliente")}o(!1)}),[]),f.jsx(nx.Provider,{value:{user:e,role:r,loading:i},children:t})}const qO=()=>V.useContext(nx);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const KO=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),rx=(...t)=>t.filter((e,n,r)=>!!e&&r.indexOf(e)===n).join(" ");/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var GO={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const QO=V.forwardRef(({color:t="currentColor",size:e=24,strokeWidth:n=2,absoluteStrokeWidth:r,className:s="",children:i,iconNode:o,...l},u)=>V.createElement("svg",{ref:u,...GO,width:e,height:e,stroke:t,strokeWidth:r?Number(n)*24/Number(e):n,className:rx("lucide",s),...l},[...o.map(([c,d])=>V.createElement(c,d)),...Array.isArray(i)?i:[i]]));/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ae=(t,e)=>{const n=V.forwardRef(({className:r,...s},i)=>V.createElement(QO,{ref:i,iconNode:e,className:rx(`lucide-${KO(t)}`,r),...s}));return n.displayName=`${t}`,n};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sx=ae("BarChart3",[["path",{d:"M3 3v18h18",key:"1s2lah"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const YO=ae("CalendarCheck",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"m9 16 2 2 4-4",key:"19s6y9"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const XO=ae("CalendarDays",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const JO=ae("Calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ZO=ae("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ix=ae("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eV=ae("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tV=ae("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nV=ae("DollarSign",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rV=ae("Ellipsis",[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"19",cy:"12",r:"1",key:"1wjl8i"}],["circle",{cx:"5",cy:"12",r:"1",key:"1pcz8c"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sV=ae("Gift",[["rect",{x:"3",y:"8",width:"18",height:"4",rx:"1",key:"bkv52"}],["path",{d:"M12 8v13",key:"1c76mn"}],["path",{d:"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7",key:"6wjy6b"}],["path",{d:"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5",key:"1ihvrl"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ox=ae("ImageOff",[["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}],["path",{d:"M10.41 10.41a2 2 0 1 1-2.83-2.83",key:"1bzlo9"}],["line",{x1:"13.5",x2:"6",y1:"13.5",y2:"21",key:"1q0aeu"}],["line",{x1:"18",x2:"21",y1:"12",y2:"15",key:"5mozeu"}],["path",{d:"M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59",key:"mmje98"}],["path",{d:"M21 15V5a2 2 0 0 0-2-2H9",key:"43el77"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iV=ae("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oV=ae("Menu",[["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6",key:"1owob3"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18",key:"yk5zj1"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aV=ae("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gm=ae("Pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lV=ae("Phone",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ma=ae("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uV=ae("PowerOff",[["path",{d:"M18.36 6.64A9 9 0 0 1 20.77 15",key:"dxknvb"}],["path",{d:"M6.16 6.16a9 9 0 1 0 12.68 12.68",key:"1x7qb5"}],["path",{d:"M12 2v4",key:"3427ic"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cV=ae("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ax=ae("Scissors",[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hV=ae("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lx=ae("ShoppingBag",[["path",{d:"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z",key:"hou9p0"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M16 10a4 4 0 0 1-8 0",key:"1ltviw"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dV=ae("Star",[["polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",key:"8f66p6"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fV=ae("Tag",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ym=ae("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pV=ae("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ga=ae("Trophy",[["path",{d:"M6 9H4.5a2.5 2.5 0 0 1 0-5H6",key:"17hqa7"}],["path",{d:"M18 9h1.5a2.5 2.5 0 0 0 0-5H18",key:"lmptdp"}],["path",{d:"M4 22h16",key:"57wxv0"}],["path",{d:"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",key:"1nw9bq"}],["path",{d:"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",key:"1np0yb"}],["path",{d:"M18 2H6v7a6 6 0 0 0 12 0V2Z",key:"u46fv3"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mV=ae("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ux=ae("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gV=ae("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _m=ae("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]),yV=[{to:"agenda",label:"Agenda",Icon:XO},{to:"servicios",label:"Servicios",Icon:ax},{to:"equipo",label:"Equipo",Icon:gV},{to:"clientes",label:"Clientes",Icon:dV},{to:"premios",label:"Premios",Icon:ga},{to:"productos",label:"Productos",Icon:lx},{to:"metricas",label:"Métricas",Icon:sx}];function wv({onClose:t}){const e=tx();return f.jsxs("aside",{className:"flex flex-col h-full bg-slate-900 border-r border-slate-800",children:[f.jsxs("div",{className:"px-5 pt-6 pb-5 border-b border-slate-800",children:[f.jsx("p",{className:"text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1",children:"Panel Admin"}),f.jsx("h1",{className:"text-sm font-bold text-white leading-tight",children:e.name})]}),f.jsx("nav",{className:"flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar",children:yV.map(({to:n,label:r,Icon:s})=>f.jsx(yC,{to:n,onClick:t,className:({isActive:i})=>`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${i?"bg-emerald-500/10 text-emerald-400":"text-slate-400 hover:text-white hover:bg-slate-800"}`,children:({isActive:i})=>f.jsxs(f.Fragment,{children:[f.jsx(s,{size:17,strokeWidth:i?2.5:2}),f.jsx("span",{className:"flex-1",children:r}),i&&f.jsx(ix,{size:14,className:"text-emerald-500 opacity-60"})]})},n))}),f.jsx("div",{className:"px-3 py-4 border-t border-slate-800",children:f.jsxs("button",{onClick:()=>m2(ma),className:"flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all",children:[f.jsx(iV,{size:17}),"Cerrar sesión"]})})]})}function _V({children:t}){const[e,n]=V.useState(!1);return f.jsxs("div",{className:"flex h-screen bg-slate-950 overflow-hidden",children:[f.jsx("div",{className:"hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0",children:f.jsx(wv,{})}),e&&f.jsxs("div",{className:"fixed inset-0 z-50 flex lg:hidden animate-fade-in",children:[f.jsx("div",{className:"absolute inset-0 bg-black/60 backdrop-blur-sm",onClick:()=>n(!1)}),f.jsx("div",{className:"relative z-10 w-64 flex flex-col animate-slide-in-right",children:f.jsx(wv,{onClose:()=>n(!1)})})]}),f.jsxs("div",{className:"flex-1 flex flex-col min-w-0 overflow-hidden",children:[f.jsxs("header",{className:"lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0",children:[f.jsx("button",{onClick:()=>n(!0),className:"p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all",children:f.jsx(oV,{size:20})}),f.jsx("span",{className:"text-sm font-semibold text-white",children:"Panel Admin"})]}),f.jsx("main",{className:"flex-1 overflow-y-auto bg-slate-950 p-5 lg:p-7",children:t})]})]})}function Hn(t,e=[]){const[n,r]=V.useState([]),[s,i]=V.useState(!0),[o,l]=V.useState(null);return V.useEffect(()=>{const u=Le(t),c=e.length?Yp(u,...e):u;return Cc(c,m=>{r(m.docs.map(g=>({id:g.id,...g.data()}))),i(!1)},m=>{l(m),i(!1)})},[t]),{data:n,loading:s,error:o}}const Bh={categoriasServicio:["Otro","Cortes","Combo","Barba","Extras"]};function vV(){const[t,e]=V.useState(Bh),[n,r]=V.useState(!0);return V.useEffect(()=>{const i=_v("configuracion","main");return Cc(i,l=>{e(l.exists()?{...Bh,...l.data()}:Bh),r(!1)},()=>r(!1))},[]),{config:t,loading:n,updateConfig:i=>eI(_v("configuracion","main"),i,{merge:!0})}}function bc({isOpen:t,onClose:e,title:n,subtitle:r,children:s,footer:i,maxWidth:o="max-w-md"}){return V.useEffect(()=>{if(!t)return;const l=u=>u.key==="Escape"&&e();return window.addEventListener("keydown",l),()=>window.removeEventListener("keydown",l)},[t,e]),t?f.jsxs("div",{className:"fixed inset-0 z-50 flex justify-end animate-fade-in",children:[f.jsx("div",{className:"absolute inset-0 bg-black/55 backdrop-blur-sm",onClick:e}),f.jsxs("div",{className:`relative z-10 w-full ${o} flex flex-col bg-slate-900 shadow-2xl border-l border-slate-800 animate-slide-in-right`,children:[f.jsxs("div",{className:"flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-slate-800 shrink-0",children:[f.jsxs("div",{children:[f.jsx("h2",{className:"text-base font-semibold text-white",children:n}),r&&f.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:r})]}),f.jsx("button",{onClick:e,className:"p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all shrink-0",children:f.jsx(_m,{size:18})})]}),f.jsx("div",{className:"flex-1 overflow-y-auto px-6 py-5 no-scrollbar",children:s}),i&&f.jsx("div",{className:"px-6 py-4 border-t border-slate-800 shrink-0",children:i})]})]}):null}const wV=["ph-scissors","ph-user-focus","ph-mask-happy","ph-magic-wand","ph-sparkle","ph-star","ph-crown","ph-fire","ph-drop","ph-wave","ph-lightning","ph-paint-brush","ph-gift","ph-eye","ph-smiley","ph-flower","ph-leaf","ph-diamond","ph-trophy","ph-confetti","ph-clock","ph-sun","ph-moon","ph-wind"],Ev={nombre:"",categoria:"Otro",precio:"",duracion:"",icono:"ph-scissors"};function EV({value:t,onChange:e}){const[n,r]=V.useState(!1);return f.jsxs("div",{children:[f.jsxs("button",{type:"button",onClick:()=>r(s=>!s),className:"flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-slate-600 transition-colors",children:[f.jsx("i",{className:`ph ${t} text-base text-emerald-400`}),f.jsx("span",{children:"Elegir ícono"})]}),n&&f.jsx("div",{className:"mt-2 bg-slate-800 border border-slate-700 rounded-xl p-3 grid grid-cols-8 gap-1.5",children:wV.map(s=>f.jsx("button",{type:"button",title:s.replace("ph-",""),onClick:()=>{e(s),r(!1)},className:`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${t===s?"border-emerald-500 bg-emerald-500/10":"border-slate-600 hover:border-slate-400"}`,children:f.jsx("i",{className:`ph ${s} text-base ${t===s?"text-emerald-400":"text-slate-400"}`})},s))})]})}function TV(){const{data:t,loading:e}=Hn("servicios",[Ic("orden")]),{config:n,updateConfig:r}=vV(),s=n.categoriasServicio??["Otro"],[i,o]=V.useState(!1),[l,u]=V.useState(null),[c,d]=V.useState(Ev),[m,g]=V.useState(!1),[w,A]=V.useState(""),[P,N]=V.useState(null),x=V.useRef(null),v=()=>{u(null),d({...Ev,categoria:s[0]||"Otro"}),o(!0)},k=T=>{u(T.id),d({nombre:T.nombre,categoria:T.categoria||"Otro",precio:T.precio,duracion:T.duracion,icono:T.icono||"ph-scissors"}),o(!0)},D=async()=>{if(!(!c.nombre||!c.precio||!c.duracion)){g(!0);try{const T={nombre:c.nombre,categoria:c.categoria,precio:Number(c.precio),duracion:Number(c.duracion),icono:c.icono||"ph-scissors",updatedAt:ws()};l?await Ln(qe(Le("servicios"),l),T):await Ac(Le("servicios"),{...T,orden:t.length,createdAt:ws()}),o(!1)}finally{g(!1)}}},U=async T=>{confirm("¿Eliminar este servicio?")&&await Sc(qe(Le("servicios"),T))},L=async T=>{if(!x.current||x.current===T)return;const C=[...t],I=C.findIndex(Ht=>Ht.id===x.current),se=C.findIndex(Ht=>Ht.id===T);if(I===-1||se===-1)return;const[Ze]=C.splice(I,1);C.splice(se,0,Ze),x.current=null,N(null);const an=nI(Is);C.forEach((Ht,$)=>an.update(qe(Le("servicios"),Ht.id),{orden:$})),await an.commit()},E=async()=>{const T=w.trim();T&&(s.map(C=>C.toLowerCase()).includes(T.toLowerCase())||(await r({categoriasServicio:[...s,T]}),A("")))},_=async T=>r({categoriasServicio:s.filter(C=>C!==T)}),S="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",R="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5";return f.jsxs("div",{className:"flex flex-col lg:flex-row gap-6 items-start",children:[f.jsxs("div",{className:"flex-1 min-w-0",children:[f.jsxs("div",{className:"flex items-center justify-between mb-4",children:[f.jsxs("div",{children:[f.jsx("h1",{className:"text-xl font-bold text-white",children:"Servicios"}),f.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:"Arrastra para reordenar. El orden se guarda en Firestore."})]}),f.jsxs("button",{onClick:v,className:"flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors",children:[f.jsx(Ma,{size:16})," Nuevo servicio"]})]}),e?f.jsx("div",{className:"flex justify-center py-16",children:f.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):t.length===0?f.jsxs("div",{className:"flex flex-col items-center py-16 text-slate-600",children:[f.jsx(fV,{size:32,className:"mb-3"}),f.jsx("p",{className:"text-sm",children:"No hay servicios creados."})]}):f.jsx("div",{className:"space-y-2",children:t.map(T=>f.jsxs("div",{draggable:!0,onDragStart:()=>{x.current=T.id},onDragEnd:()=>{x.current=null,N(null)},onDragOver:C=>{C.preventDefault(),N(T.id)},onDragLeave:()=>N(null),onDrop:()=>L(T.id),className:`flex items-center gap-4 bg-slate-900 border rounded-xl p-4 transition-all cursor-grab active:cursor-grabbing select-none ${P===T.id?"border-emerald-500 bg-emerald-500/5":"border-slate-800 hover:border-slate-700"}`,children:[f.jsxs("svg",{className:"text-slate-600 shrink-0",width:"12",height:"18",viewBox:"0 0 12 18",fill:"currentColor",children:[f.jsx("circle",{cx:"3",cy:"3",r:"1.5"}),f.jsx("circle",{cx:"9",cy:"3",r:"1.5"}),f.jsx("circle",{cx:"3",cy:"9",r:"1.5"}),f.jsx("circle",{cx:"9",cy:"9",r:"1.5"}),f.jsx("circle",{cx:"3",cy:"15",r:"1.5"}),f.jsx("circle",{cx:"9",cy:"15",r:"1.5"})]}),f.jsx("div",{className:"w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0",children:f.jsx("i",{className:`ph ${T.icono||"ph-scissors"} text-base text-emerald-400`})}),f.jsxs("div",{className:"flex-1 min-w-0",children:[f.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[f.jsx("h4",{className:"font-bold text-white text-sm",children:T.nombre}),f.jsx("span",{className:"text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-950 text-slate-400 border-slate-700",children:T.categoria||"Otro"})]}),f.jsxs("p",{className:"text-xs text-slate-400 mt-0.5",children:["$",Number(T.precio||0).toLocaleString("es-CL")," · ",T.duracion," min"]})]}),f.jsxs("div",{className:"flex items-center gap-2 shrink-0",children:[f.jsx("button",{onClick:()=>k(T),className:"p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-colors",children:f.jsx("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:f.jsx("path",{d:"M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"})})}),f.jsx("button",{onClick:()=>U(T.id),className:"p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors",children:f.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[f.jsx("polyline",{points:"3,6 5,6 21,6"}),f.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"})]})})]})]},T.id))})]}),f.jsx("div",{className:"w-full lg:w-60 shrink-0",children:f.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-4",children:[f.jsx("h2",{className:"text-sm font-semibold text-white mb-3",children:"Categorías"}),f.jsx("div",{className:"space-y-1.5 mb-3",children:s.map(T=>f.jsxs("div",{className:"flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2",children:[f.jsx("span",{className:"text-xs text-white",children:T}),f.jsx("button",{onClick:()=>_(T),className:"text-slate-600 hover:text-red-400 transition-colors p-0.5 rounded",children:f.jsxs("svg",{width:"11",height:"11",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:[f.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),f.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]})})]},T))}),f.jsxs("div",{className:"flex gap-1.5",children:[f.jsx("input",{className:"flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",placeholder:"Nueva categoría...",value:w,onChange:T=>A(T.target.value),onKeyDown:T=>T.key==="Enter"&&E()}),f.jsx("button",{onClick:E,className:"px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors",children:"+"})]})]})}),f.jsx(bc,{isOpen:i,onClose:()=>o(!1),title:l?"Editar servicio":"Nuevo servicio",footer:f.jsxs("div",{className:"flex gap-3 justify-end",children:[f.jsx("button",{onClick:()=>o(!1),className:"px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),f.jsxs("button",{onClick:D,disabled:m||!c.nombre||!c.precio||!c.duracion,className:"px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2",children:[m&&f.jsx("span",{className:"w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"}),l?"Guardar":"Crear servicio"]})]}),children:f.jsxs("div",{className:"space-y-4",children:[f.jsxs("div",{children:[f.jsx("label",{className:R,children:"Nombre del servicio"}),f.jsx("input",{className:S,placeholder:"Corte clásico",value:c.nombre,onChange:T=>d(C=>({...C,nombre:T.target.value}))})]}),f.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[f.jsxs("div",{children:[f.jsx("label",{className:R,children:"Precio ($)"}),f.jsx("input",{className:S,type:"number",placeholder:"12000",value:c.precio,onChange:T=>d(C=>({...C,precio:T.target.value}))})]}),f.jsxs("div",{children:[f.jsx("label",{className:R,children:"Duración (min)"}),f.jsx("input",{className:S,type:"number",placeholder:"45",value:c.duracion,onChange:T=>d(C=>({...C,duracion:T.target.value}))})]})]}),f.jsxs("div",{children:[f.jsx("label",{className:R,children:"Categoría"}),f.jsx("select",{className:S,value:c.categoria,onChange:T=>d(C=>({...C,categoria:T.target.value})),children:s.map(T=>f.jsx("option",{value:T,children:T},T))})]}),f.jsxs("div",{children:[f.jsx("label",{className:R,children:"Ícono"}),f.jsx(EV,{value:c.icono,onChange:T=>d(C=>({...C,icono:T}))})]})]})})]})}const vm=8,IV=20,ya=30,Tv=(IV-vm)*(60/ya);function xV(t){return t.toISOString().split("T")[0]}function SV(t){const[e,n]=t.split(":").map(Number);return(e-vm)*(60/ya)+Math.floor(n/ya)}function AV(t){return Math.max(1,Math.round(t/ya))}const Iv={Confirmada:"bg-emerald-500/20 border-emerald-500/40 text-emerald-300",Cancelada:"bg-red-500/10     border-red-500/30     text-red-400",Completada:"bg-blue-500/10    border-blue-500/30    text-blue-400"};function CV({cita:t}){const e=SV(t.hora),n=AV(t.duracion||30),r=Iv[t.estado]??Iv.Confirmada;return f.jsxs("div",{title:`${t.servicioNombre} · ${t.clienteNombre}`,className:`absolute inset-x-0.5 rounded-md border px-2 py-1 overflow-hidden cursor-pointer hover:brightness-110 transition-all text-xs ${r}`,style:{top:`${e*40}px`,height:`${n*40-4}px`},children:[f.jsx("p",{className:"font-semibold truncate leading-tight",children:t.clienteNombre||"Cliente"}),f.jsx("p",{className:"truncate text-[10px] opacity-75",children:t.servicioNombre})]})}function kV(){const[t,e]=V.useState(new Date),n=xV(t),{data:r}=Hn("barberos"),{data:s}=Hn("citas",[Xp("fecha","==",n)]),i=V.useMemo(()=>r.filter(u=>u.disponible!==!1),[r]),o=u=>{const c=new Date(t);c.setDate(c.getDate()+u),e(c)},l=Array.from({length:Tv},(u,c)=>{const d=c*ya,m=vm+Math.floor(d/60),g=d%60;return`${String(m).padStart(2,"0")}:${String(g).padStart(2,"0")}`});return f.jsxs("div",{className:"flex flex-col h-full gap-4",children:[f.jsxs("div",{className:"flex items-center justify-between shrink-0",children:[f.jsx("h1",{className:"text-xl font-bold text-white",children:"Agenda"}),f.jsxs("div",{className:"flex items-center gap-2",children:[f.jsx("button",{onClick:()=>o(-1),className:"p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all",children:f.jsx(ZO,{size:18})}),f.jsx("span",{className:"text-sm font-semibold text-white min-w-[130px] text-center capitalize",children:t.toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"})}),f.jsx("button",{onClick:()=>o(1),className:"p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all",children:f.jsx(ix,{size:18})}),f.jsx("button",{onClick:()=>e(new Date),className:"ml-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all",children:"Hoy"})]})]}),f.jsx("div",{className:"flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-auto no-scrollbar",children:f.jsxs("div",{className:"flex min-w-max",children:[f.jsxs("div",{className:"w-16 shrink-0 sticky left-0 bg-slate-900 z-10 border-r border-slate-800",children:[f.jsx("div",{className:"h-10 border-b border-slate-800"})," ",l.map((u,c)=>f.jsx("div",{className:"h-10 flex items-center justify-end pr-3 text-[10px] font-mono text-slate-600 border-b border-slate-800/60",children:u.endsWith(":00")?u:""},c))]}),i.length===0?f.jsx("div",{className:"flex-1 flex items-center justify-center py-20 text-slate-600 text-sm",children:"Sin barberos activos"}):i.map(u=>{var d;const c=s.filter(m=>m.barberoId===u.id||m.barbero===u.nombre);return f.jsxs("div",{className:"flex-1 min-w-[160px] border-r border-slate-800 last:border-r-0",children:[f.jsxs("div",{className:"h-10 px-3 flex items-center gap-2 border-b border-slate-800 sticky top-0 bg-slate-900 z-10",children:[f.jsx("div",{className:"w-6 h-6 rounded-full overflow-hidden bg-emerald-500/20 flex items-center justify-center shrink-0",children:u.foto?f.jsx("img",{src:u.foto,alt:u.nombre,className:"w-full h-full object-cover"}):f.jsx("span",{className:"text-[10px] font-bold text-emerald-400",children:((d=u.nombre)==null?void 0:d[0])??"?"})}),f.jsx("span",{className:"text-xs font-semibold text-white truncate",children:u.nombre})]}),f.jsxs("div",{className:"relative",style:{height:`${Tv*40}px`},children:[l.map((m,g)=>f.jsx("div",{className:`absolute inset-x-0 h-10 border-b border-slate-800/40 ${g%2===0?"":"bg-slate-800/10"}`,style:{top:`${g*40}px`}},g)),c.map(m=>f.jsx(CV,{cita:m},m.id))]})]},u.id)})]})})]})}const RV="modulepreload",PV=function(t){return"/panel/"+t},xv={},cx=function(e,n,r){let s=Promise.resolve();if(n&&n.length>0){document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),l=(o==null?void 0:o.nonce)||(o==null?void 0:o.getAttribute("nonce"));s=Promise.allSettled(n.map(u=>{if(u=PV(u),u in xv)return;xv[u]=!0;const c=u.endsWith(".css"),d=c?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${u}"]${d}`))return;const m=document.createElement("link");if(m.rel=c?"stylesheet":RV,c||(m.as="script"),m.crossOrigin="",m.href=u,l&&m.setAttribute("nonce",l),document.head.appendChild(m),c)return new Promise((g,w)=>{m.addEventListener("load",g),m.addEventListener("error",()=>w(new Error(`Unable to preload CSS for ${u}`)))})}))}function i(o){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=o,window.dispatchEvent(l),!l.defaultPrevented)throw o}return s.then(o=>{for(const l of o||[])l.status==="rejected"&&i(l.reason);return e().catch(i)})},Sv={active:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20",inactive:"bg-slate-700/50   text-slate-400   border-slate-600/30",pending:"bg-amber-500/10   text-amber-400   border-amber-500/20",cancelled:"bg-red-500/10     text-red-400     border-red-500/20",completed:"bg-blue-500/10    text-blue-400    border-blue-500/20",admin:"bg-purple-500/10  text-purple-400  border-purple-500/20"};function NV({variant:t="active",children:e,className:n=""}){return f.jsx("span",{className:`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${Sv[t]??Sv.active} ${n}`,children:e})}function bV({items:t,align:e="right"}){const[n,r]=V.useState(!1),s=V.useRef(null);return V.useEffect(()=>{if(!n)return;const i=o=>{var l;(l=s.current)!=null&&l.contains(o.target)||r(!1)};return document.addEventListener("mousedown",i),()=>document.removeEventListener("mousedown",i)},[n]),f.jsxs("div",{ref:s,className:"relative",children:[f.jsx("button",{onClick:i=>{i.stopPropagation(),r(o=>!o)},className:"p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-all",children:f.jsx(rV,{size:16})}),n&&f.jsx("div",{className:`absolute z-30 mt-1 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fade-in ${e==="right"?"right-0":"left-0"}`,children:t.map((i,o)=>i==="separator"?f.jsx("div",{className:"h-px bg-slate-700 my-1"},o):f.jsxs("button",{onClick:l=>{var u;l.stopPropagation(),r(!1),(u=i.onClick)==null||u.call(i)},className:`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left transition-colors ${i.danger?"text-red-400 hover:bg-red-950/40":"text-slate-300 hover:text-white hover:bg-slate-700"}`,children:[i.Icon&&f.jsx(i.Icon,{size:15}),i.label]},o))})]})}function DV({barber:t,onEdit:e}){const n=t.disponible!==!1,r=Le("barberos").path,o=[{label:"Editar datos",Icon:gm,onClick:()=>e(t)},{label:"Configurar horario",Icon:tV,onClick:()=>{}},"separator",{label:n?"Desactivar":"Activar",Icon:uV,onClick:()=>Ln(qe(Is,`${r}/${t.id}`),{disponible:!n})},{label:"Eliminar",Icon:ym,onClick:async()=>{if(!confirm(`¿Eliminar a ${t.nombre}?`))return;const{deleteDoc:l}=await cx(async()=>{const{deleteDoc:u}=await Promise.resolve().then(()=>rI);return{deleteDoc:u}},void 0);await l(qe(Is,`${r}/${t.id}`))},danger:!0}];return f.jsxs("div",{className:"relative bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center gap-3 hover:border-slate-700 transition-all group",children:[f.jsx("div",{className:"absolute top-3 right-3",children:f.jsx(bV,{items:o})}),f.jsx("div",{className:"w-20 h-20 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0",children:t.foto?f.jsx("img",{src:t.foto,alt:t.nombre,className:"w-full h-full object-cover"}):f.jsx("div",{className:"w-full h-full flex items-center justify-center text-2xl font-bold text-slate-600",children:f.jsx(ux,{size:32})})}),f.jsxs("div",{className:"text-center",children:[f.jsx("p",{className:"font-semibold text-white text-sm",children:t.nombre}),t.especialidad&&f.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:t.especialidad}),f.jsx("div",{className:"mt-2",children:f.jsx(NV,{variant:n?"active":"inactive",children:n?"Activo":"Inactivo"})})]}),f.jsxs("button",{className:"mt-1 flex items-center gap-1.5 w-full justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-all border border-slate-700",children:[f.jsx(JO,{size:13})," Ver Agenda"]})]})}const Av={nombre:"",especialidad:""};function OV(){const{data:t,loading:e}=Hn("barberos"),[n,r]=V.useState(!1),[s,i]=V.useState(null),[o,l]=V.useState(Av),u=w=>{i(w),l({nombre:w.nombre,especialidad:w.especialidad||""}),r(!0)},c=()=>{i(null),l(Av),r(!0)},d=async()=>{const w=Le("barberos").path;if(s)await Ln(qe(Is,`${w}/${s.id}`),o);else{const{addDoc:A,serverTimestamp:P}=await cx(async()=>{const{addDoc:N,serverTimestamp:x}=await Promise.resolve().then(()=>rI);return{addDoc:N,serverTimestamp:x}},void 0);await A(Le("barberos"),{...o,disponible:!0,createdAt:P()})}r(!1)},m="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",g="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5";return f.jsxs("div",{children:[f.jsxs("div",{className:"flex items-center justify-between mb-6",children:[f.jsxs("div",{children:[f.jsx("h1",{className:"text-xl font-bold text-white",children:"Equipo"}),f.jsxs("p",{className:"text-sm text-slate-500 mt-0.5",children:[t.length," miembros"]})]}),f.jsxs("button",{onClick:c,className:"flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors",children:[f.jsx(Ma,{size:16})," Agregar"]})]}),e?f.jsx("div",{className:"flex justify-center py-20",children:f.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):f.jsx("div",{className:"grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",children:t.map(w=>f.jsx(DV,{barber:w,onEdit:u},w.id))}),f.jsx(bc,{isOpen:n,onClose:()=>r(!1),title:s?"Editar barbero":"Nuevo barbero",footer:f.jsxs("div",{className:"flex gap-3 justify-end",children:[f.jsx("button",{onClick:()=>r(!1),className:"px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),f.jsx("button",{onClick:d,className:"px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all",children:s?"Guardar":"Crear"})]}),children:f.jsxs("div",{className:"space-y-4",children:[f.jsxs("div",{children:[f.jsx("label",{className:g,children:"Nombre"}),f.jsx("input",{className:m,placeholder:"Nicolás Fabián",value:o.nombre,onChange:w=>l(A=>({...A,nombre:w.target.value}))})]}),f.jsxs("div",{children:[f.jsx("label",{className:g,children:"Especialidad"}),f.jsx("input",{className:m,placeholder:"Cortes y barba clásica",value:o.especialidad,onChange:w=>l(A=>({...A,especialidad:w.target.value}))})]})]})})]})}function hx(t=""){return t.trim().split(/\s+/).map(e=>{var n;return(n=e[0])==null?void 0:n.toUpperCase()}).slice(0,2).join("")}function Cv(t){return t?new Date(t).toLocaleDateString("es-CL",{day:"numeric",month:"short",year:"numeric"}):"—"}function VV({stamps:t,premios:e}){const n=e.length?Math.max(...e.map(i=>i.costoSellos)):10,r=Math.max(n,t,10),s=r<=10?10:r<=15?15:20;return f.jsx("div",{className:"grid gap-1",style:{gridTemplateColumns:`repeat(${s}, minmax(0, 1fr))`},children:Array.from({length:r},(i,o)=>{const l=o+1,u=l<=t,c=e.some(d=>d.costoSellos===l);return f.jsxs("div",{className:`relative aspect-square rounded-md border flex items-center justify-center text-[9px] font-bold ${u?"bg-emerald-500/15 border-emerald-500/40 text-emerald-400":"bg-white/3 border-white/8 text-slate-600"}`,children:[u?f.jsx("i",{className:"ph-fill ph-scissors text-[9px]"}):l,c&&f.jsx("span",{className:"absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-400 border border-slate-950"})]},l)})})}function LV({cliente:t,premios:e,onClose:n}){var T;const[r,s]=V.useState(t),[i,o]=V.useState([]),[l,u]=V.useState(null),[c,d]=V.useState(!1),[m,g]=V.useState(""),[w,A]=V.useState(!1);V.useEffect(()=>{const C=qe(Le("users"),t.uid);return Cc(C,se=>{se.exists()&&(s({uid:se.id,...se.data()}),u(null))})},[t.uid]),V.useEffect(()=>{t.email&&ZT(Yp(Le("citas"),Xp("clienteEmail","==",t.email),QT(10))).then(C=>{const I=C.docs.map(se=>({id:se.id,...se.data()}));I.sort((se,Ze)=>(Ze.fecha||"").localeCompare(se.fecha||"")||(Ze.hora||"").localeCompare(se.hora||"")),o(I)}).catch(()=>{})},[t.uid,t.email]);const P=r.stamps||0,N=[...e].sort((C,I)=>C.costoSellos-I.costoSellos),x=N.find(C=>P<C.costoSellos),v=N.length?N[N.length-1].costoSellos:10,k=x?x.costoSellos:v,D=Math.min(P/Math.max(k,1)*100,100),U=(r.telefono||"").replace(/\D/g,""),L=U.length>=8?`https://wa.me/${U.startsWith("56")?U:"56"+U}`:null,E=async C=>{d(!0);try{await Ln(qe(Le("users"),r.uid),{stamps:zl(C),...C>0?{ultimoSello:new Date().toISOString()}:{},historialSellos:Fl({fecha:new Date().toISOString(),tipo:C>0?"suma":"resta",cantidad:C,nota:C>0?"Sello añadido manualmente":"Sello quitado manualmente"})})}finally{d(!1)}},_=async()=>{if(!l){g("Selecciona un premio primero.");return}if(P<l.costoSellos){g("Sellos insuficientes.");return}d(!0);try{await Ln(qe(Le("users"),r.uid),{stamps:zl(-l.costoSellos),historialSellos:Fl({fecha:new Date().toISOString(),tipo:"canje",cantidad:-l.costoSellos,nota:l.nombre})}),g(`✓ ${l.nombre} canjeado`)}catch(C){g(C.message)}finally{d(!1)}},S=async()=>{if(!P){A(!1);return}d(!0);try{await Ln(qe(Le("users"),r.uid),{stamps:zl(-P),historialSellos:Fl({fecha:new Date().toISOString(),tipo:"resta",cantidad:-P,nota:"Reset manual por admin"})})}finally{d(!1),A(!1)}},R=[...r.historialSellos||[]].sort((C,I)=>new Date(I.fecha)-new Date(C.fecha)).slice(0,20);return f.jsxs("div",{className:"space-y-6",children:[f.jsxs("div",{className:"flex items-start gap-4",children:[f.jsx("div",{className:"w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0",children:r.photoURL?f.jsx("img",{src:r.photoURL,alt:"",className:"w-full h-full object-cover"}):f.jsx("span",{className:"text-sm font-bold text-slate-400",children:hx(r.nombre||r.email||"?")})}),f.jsxs("div",{className:"flex-1 min-w-0",children:[f.jsx("p",{className:"font-semibold text-white",children:r.nombre||"—"}),f.jsx("p",{className:"text-xs text-slate-500 truncate",children:r.email}),r.telefono&&f.jsxs("div",{className:"flex items-center gap-2 mt-1",children:[f.jsx("p",{className:"text-xs text-slate-400",children:r.telefono}),L&&f.jsx("a",{href:L,target:"_blank",rel:"noreferrer",className:"text-[10px] font-bold text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md hover:bg-emerald-500/10 transition-colors",children:"WhatsApp ↗"})]}),f.jsxs("p",{className:"text-[10px] text-slate-600 mt-1",children:["Miembro desde ",Cv((T=r.creadoEn)!=null&&T.toDate?r.creadoEn.toDate().toISOString():r.creadoEn)]})]})]}),f.jsxs("div",{className:"bg-slate-950 border border-slate-800 rounded-xl p-4",children:[f.jsxs("div",{className:"flex items-end gap-1 mb-1",children:[f.jsx("span",{className:"text-4xl font-black text-emerald-400 leading-none",children:P}),f.jsxs("span",{className:"text-lg font-bold text-slate-600 mb-0.5",children:["/",k]})]}),f.jsx("p",{className:"text-[10px] text-slate-500 mb-2",children:x?`${k-P} sello${k-P!==1?"s":""} para: ${x.nombre}`:P>0?"¡Premios disponibles!":"Sin sellos aún"}),f.jsx("div",{className:"w-full bg-white/5 rounded-full h-1.5 overflow-hidden mb-4",children:f.jsx("div",{className:"h-1.5 rounded-full bg-emerald-500 transition-all",style:{width:`${D}%`}})}),f.jsx(VV,{stamps:P,premios:e}),f.jsxs("div",{className:"flex gap-2 mt-4",children:[f.jsxs("button",{onClick:()=>E(-1),disabled:c||P<=0,className:"flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all",children:[f.jsx(aV,{size:13})," Quitar sello"]}),f.jsxs("button",{onClick:()=>E(1),disabled:c,className:"flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all",children:[f.jsx(Ma,{size:13})," Añadir sello"]})]})]}),e.length>0&&f.jsxs("div",{children:[f.jsx("p",{className:"text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2",children:"Canjear premio"}),f.jsx("div",{className:"space-y-1.5 mb-3",children:e.map(C=>{const I=P>=C.costoSellos,se=(l==null?void 0:l.id)===C.id;return f.jsxs("button",{disabled:!I,onClick:()=>u(se?null:C),className:`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left ${se?"border-yellow-400/60 bg-yellow-400/10 text-white":I?"border-slate-700 hover:border-slate-500 bg-slate-800/40 text-white":"border-slate-800/40 bg-transparent text-slate-600 cursor-not-allowed opacity-50"}`,children:[f.jsx(ga,{size:14,className:I?"text-yellow-400":"text-slate-600"}),f.jsx("span",{className:"flex-1",children:C.nombre}),f.jsxs("span",{className:`text-xs font-bold ${I?"text-yellow-400":"text-slate-600"}`,children:[C.costoSellos," ✂"]})]},C.id)})}),m&&f.jsx("p",{className:`text-xs text-center font-bold mb-2 ${m.startsWith("✓")?"text-emerald-400":"text-red-400"}`,children:m}),f.jsxs("button",{onClick:_,disabled:c||!l,className:"w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 disabled:opacity-40 border border-yellow-500/30 text-yellow-400 text-sm font-semibold rounded-lg transition-all",children:[f.jsx(sV,{size:15})," Canjear premio"]})]}),R.length>0&&f.jsxs("div",{children:[f.jsx("p",{className:"text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2",children:"Historial de sellos"}),f.jsx("div",{className:"space-y-px max-h-44 overflow-y-auto",children:R.map((C,I)=>{const se=C.tipo==="suma"?"ph-plus-circle":C.tipo==="canje"?"ph-gift":"ph-minus-circle",Ze=C.tipo==="suma"?"text-emerald-400":C.tipo==="canje"?"text-yellow-400":"text-red-400",an=C.tipo==="suma"?`+${C.cantidad} sello`:C.tipo==="canje"?`Canje: ${C.nota}`:`${C.cantidad} sello`;return f.jsxs("div",{className:"flex items-start gap-2 py-1.5 border-b border-white/4 last:border-0",children:[f.jsx("i",{className:`ph-fill ${se} ${Ze} text-sm shrink-0 mt-0.5`}),f.jsxs("div",{className:"flex-1 min-w-0",children:[f.jsx("p",{className:"text-xs font-semibold text-white truncate",children:an}),f.jsx("p",{className:"text-[10px] text-slate-600",children:Cv(C.fecha)})]})]},I)})})]}),i.length>0&&f.jsxs("div",{children:[f.jsx("p",{className:"text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2",children:"Citas recientes"}),f.jsx("div",{className:"space-y-1.5",children:i.map(C=>{const I=C.estado==="Completada"?"text-emerald-400":C.estado==="Cancelada"?"text-red-400":"text-yellow-400";return f.jsxs("div",{className:"flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5",children:[f.jsxs("div",{className:"flex-1 min-w-0",children:[f.jsx("p",{className:"text-xs font-semibold text-white truncate",children:C.servicioNombre||"—"}),f.jsxs("p",{className:"text-[10px] text-slate-500 mt-0.5",children:[C.fecha," · ",C.hora," · ",C.barbero||"—"]})]}),f.jsx("span",{className:`text-[10px] font-bold ${I} shrink-0`,children:C.estado})]},C.id)})})]}),f.jsx("div",{className:"pt-2 border-t border-slate-800",children:w?f.jsxs("div",{className:"flex items-center gap-2",children:[f.jsxs("p",{className:"text-xs text-red-400 flex-1",children:["¿Resetear ",P," sellos a 0?"]}),f.jsx("button",{onClick:()=>A(!1),className:"px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),f.jsx("button",{onClick:S,disabled:c,className:"px-3 py-1.5 text-xs font-bold text-red-400 hover:text-white rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all",children:"Confirmar"})]}):f.jsxs("button",{onClick:()=>A(!0),disabled:!P,className:"flex items-center gap-2 text-xs text-slate-600 hover:text-red-400 disabled:opacity-30 transition-colors",children:[f.jsx(cV,{size:13})," Resetear todos los sellos"]})})]})}function MV(){const{data:t,loading:e}=Hn("users"),{data:n}=Hn("premios",[Ic("costoSellos")]),[r,s]=V.useState(""),[i,o]=V.useState(null),l=V.useMemo(()=>[...t].sort((g,w)=>(w.stamps||0)-(g.stamps||0)||(g.nombre||"").localeCompare(w.nombre||"")),[t]),u=V.useMemo(()=>{const g=r.toLowerCase();return g?l.filter(w=>{var A,P,N;return((A=w.nombre)==null?void 0:A.toLowerCase().includes(g))||((P=w.email)==null?void 0:P.toLowerCase().includes(g))||((N=w.telefono)==null?void 0:N.includes(g))}):l},[l,r]),c=t.length,d=c?(t.reduce((g,w)=>g+(w.stamps||0),0)/c).toFixed(1):0,m=n.length?t.filter(g=>{var w;return(g.stamps||0)>=((w=n[0])==null?void 0:w.costoSellos)}).length:t.filter(g=>(g.stamps||0)>=5).length;return f.jsxs("div",{className:"max-w-4xl mx-auto",children:[f.jsxs("div",{className:"mb-6",children:[f.jsx("h1",{className:"text-xl font-bold text-white",children:"Clientes y Fidelización"}),f.jsx("p",{className:"text-sm text-slate-500 mt-0.5",children:"Gestiona sellos y premios de cada cliente."})]}),f.jsx("div",{className:"grid grid-cols-3 gap-3 mb-5",children:[{label:"Clientes",value:c,color:"text-white"},{label:"Avg Sellos",value:d,color:"text-emerald-400"},{label:"Con premios",value:m,color:"text-yellow-400"}].map(({label:g,value:w,color:A})=>f.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center",children:[f.jsx("p",{className:`text-2xl font-black ${A}`,children:w}),f.jsx("p",{className:"text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5",children:g})]},g))}),f.jsxs("div",{className:"relative mb-4",children:[f.jsx(hV,{size:15,className:"absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"}),f.jsx("input",{placeholder:"Buscar por nombre, correo o teléfono…",value:r,onChange:g=>s(g.target.value),className:"w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-600 transition-colors"}),r&&f.jsx("button",{onClick:()=>s(""),className:"absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white",children:f.jsx(_m,{size:14})})]}),f.jsx("div",{className:"bg-slate-900 border border-slate-800 rounded-xl overflow-hidden",children:e?f.jsx("div",{className:"flex justify-center py-16",children:f.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):u.length===0?f.jsxs("div",{className:"flex flex-col items-center py-16 text-slate-600",children:[f.jsx(ux,{size:28,className:"mb-3"}),f.jsx("p",{className:"text-sm",children:"Sin clientes"})]}):f.jsx("div",{className:"divide-y divide-slate-800/60",children:u.map(g=>{var v;const w=g.stamps||0,A=n.length?(v=n[n.length-1])==null?void 0:v.costoSellos:10,P=Math.min(w/Math.max(A,1)*100,100),N=w>=(A||10)?"text-yellow-400 border-yellow-400/40 bg-yellow-400/10":w>=5?"text-emerald-400 border-emerald-500/40 bg-emerald-500/10":"text-slate-500 border-slate-700",x=n.some(k=>w>=k.costoSellos);return f.jsxs("div",{onClick:()=>o(g),className:"grid grid-cols-12 items-center px-5 py-4 hover:bg-white/2 transition-colors cursor-pointer group",children:[f.jsxs("div",{className:"col-span-5 flex items-center gap-3 min-w-0",children:[f.jsx("div",{className:"w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0",children:g.photoURL?f.jsx("img",{src:g.photoURL,alt:"",className:"w-full h-full object-cover"}):f.jsx("span",{className:"text-xs font-bold text-slate-400",children:hx(g.nombre||g.email||"?")})}),f.jsxs("div",{className:"min-w-0",children:[f.jsx("p",{className:"font-semibold text-white text-sm truncate group-hover:text-emerald-400 transition-colors",children:g.nombre||"—"}),f.jsx("p",{className:"text-xs text-slate-500 truncate",children:g.email})]})]}),f.jsx("div",{className:"col-span-3 hidden sm:block",children:f.jsxs("p",{className:"text-xs text-slate-500 truncate flex items-center gap-1",children:[f.jsx(lV,{size:10})," ",g.telefono||"—"]})}),f.jsxs("div",{className:"col-span-5 sm:col-span-3",children:[f.jsxs("div",{className:"flex items-center gap-1.5 mb-1",children:[f.jsxs("span",{className:`text-xs font-bold px-2 py-0.5 rounded-full border ${N}`,children:[w," sellos"]}),x&&f.jsx(ga,{size:11,className:"text-yellow-400"})]}),f.jsx("div",{className:"w-full bg-white/5 rounded-full h-1",children:f.jsx("div",{className:"h-1 rounded-full bg-emerald-500 transition-all",style:{width:`${P}%`}})})]}),f.jsx("div",{className:"col-span-2 sm:col-span-1 flex justify-end",children:f.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",className:"text-slate-600 group-hover:text-emerald-400 transition-colors",children:f.jsx("polyline",{points:"9 18 15 12 9 6"})})})]},g.uid||g.id)})})}),f.jsx(bc,{isOpen:!!i,onClose:()=>o(null),title:(i==null?void 0:i.nombre)||"Cliente",subtitle:i==null?void 0:i.email,maxWidth:"max-w-lg",children:i&&f.jsx(LV,{cliente:{uid:i.uid||i.id,...i},premios:n,onClose:()=>o(null)},i.uid||i.id)})]})}function El({title:t,subtitle:e}){return f.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3",children:[f.jsxs("div",{children:[f.jsx("p",{className:"text-sm font-semibold text-white",children:t}),e&&f.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:e})]}),f.jsxs("div",{className:"flex-1 min-h-[160px] flex flex-col items-center justify-center gap-2 border border-dashed border-slate-700 rounded-lg",children:[f.jsx(sx,{size:28,className:"text-slate-700"}),f.jsx("p",{className:"text-xs text-slate-600 font-medium",children:"Integra Recharts aquí"})]})]})}function Tl({Icon:t,label:e,value:n,sub:r,color:s="emerald"}){const i={emerald:"bg-emerald-500/10 text-emerald-400",blue:"bg-blue-500/10    text-blue-400",red:"bg-red-500/10     text-red-400",amber:"bg-amber-500/10   text-amber-400"};return f.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4",children:[f.jsx("div",{className:`p-2.5 rounded-lg ${i[s]}`,children:f.jsx(t,{size:20})}),f.jsxs("div",{children:[f.jsx("p",{className:"text-xs font-semibold text-slate-500 uppercase tracking-wide",children:e}),f.jsx("p",{className:"text-2xl font-bold text-white mt-0.5",children:n}),r&&f.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:r})]})]})}function jV(){const{data:t}=Hn("citas"),e=V.useMemo(()=>{const n=new Date().toISOString().slice(0,7),r=t.filter(u=>{var c;return(c=u.fecha)==null?void 0:c.startsWith(n)}),s=r.filter(u=>u.estado==="Completada"),i=r.filter(u=>u.estado==="Cancelada"),o=s.reduce((u,c)=>u+(c.precio||0),0),l=s.length?o/s.length:0;return{total:r.length,completadas:s.length,canceladas:i.length,ingresos:o,ticket:l}},[t]);return f.jsxs("div",{className:"max-w-5xl mx-auto",children:[f.jsxs("div",{className:"mb-6",children:[f.jsx("h1",{className:"text-xl font-bold text-white",children:"Métricas"}),f.jsx("p",{className:"text-sm text-slate-500 mt-0.5",children:new Date().toLocaleDateString("es-CL",{month:"long",year:"numeric"})})]}),f.jsxs("div",{className:"grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6",children:[f.jsx(Tl,{Icon:nV,label:"Ingresos",value:`$${e.ingresos.toLocaleString("es-CL")}`,sub:"Citas completadas",color:"emerald"}),f.jsx(Tl,{Icon:YO,label:"Citas",value:e.completadas,sub:`${e.total} agendadas`,color:"blue"}),f.jsx(Tl,{Icon:pV,label:"Ticket prom.",value:`$${Math.round(e.ticket).toLocaleString("es-CL")}`,sub:"Por servicio",color:"amber"}),f.jsx(Tl,{Icon:eV,label:"Cancelaciones",value:e.canceladas,sub:e.total?`${Math.round(e.canceladas/e.total*100)}% del total`:"—",color:"red"})]}),f.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-4",children:[f.jsx(El,{title:"Ingresos mensuales",subtitle:"Últimos 6 meses · LineChart (Recharts)"}),f.jsx(El,{title:"Horas pico",subtitle:"Distribución de citas por hora · BarChart (Recharts)"}),f.jsx(El,{title:"Servicios más vendidos",subtitle:"Top 5 servicios del mes · PieChart (Recharts)"}),f.jsx(El,{title:"Rendimiento por barbero",subtitle:"Citas completadas por profesional · BarChart (Recharts)"})]})]})}const $h={nombre:"",costoSellos:""},kv=["text-yellow-400","text-emerald-400","text-blue-400","text-purple-400","text-rose-400","text-amber-400"];function UV(){const{data:t,loading:e}=Hn("premios",[Ic("costoSellos")]),[n,r]=V.useState($h),[s,i]=V.useState(null),[o,l]=V.useState(!1),u=A=>{i(A.id),r({nombre:A.nombre,costoSellos:A.costoSellos})},c=()=>{i(null),r($h)},d=async()=>{const A=n.nombre.trim(),P=parseInt(n.costoSellos);if(!(!A||!P||P<1)){l(!0);try{s?(await Ln(qe(Le("premios"),s),{nombre:A,costoSellos:P,updatedAt:ws()}),c()):(await Ac(Le("premios"),{nombre:A,costoSellos:P,creadoEn:ws()}),r($h))}finally{l(!1)}}},m=async A=>{confirm("¿Eliminar este premio?")&&await Sc(qe(Le("premios"),A))},g="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",w="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5";return f.jsxs("div",{className:"max-w-2xl mx-auto",children:[f.jsxs("div",{className:"mb-6",children:[f.jsx("h1",{className:"text-xl font-bold text-white",children:"Premios del Club"}),f.jsx("p",{className:"text-sm text-slate-500 mt-0.5",children:"Define los premios globales que obtienen los clientes por acumular sellos."})]}),f.jsx("div",{className:"bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6",children:e?f.jsx("div",{className:"flex justify-center py-10",children:f.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):t.length===0?f.jsxs("div",{className:"flex flex-col items-center py-10 text-slate-600",children:[f.jsx(ga,{size:28,className:"mb-2"}),f.jsx("p",{className:"text-sm",children:"Sin premios configurados."}),f.jsx("p",{className:"text-xs mt-0.5 text-slate-700",children:"Crea el primero con el formulario de abajo."})]}):f.jsx("div",{className:"divide-y divide-slate-800/60",children:t.map((A,P)=>f.jsxs("div",{className:"flex items-center gap-3 px-5 py-3.5 hover:bg-slate-800/30 transition-colors",children:[f.jsx(ga,{size:16,className:`shrink-0 ${kv[P%kv.length]}`}),f.jsxs("div",{className:"flex-1 min-w-0",children:[f.jsx("p",{className:"text-sm font-semibold text-white truncate",children:A.nombre}),f.jsxs("p",{className:"text-xs text-slate-500 mt-0.5",children:[A.costoSellos," sello",A.costoSellos!==1?"s":""]})]}),f.jsxs("div",{className:"flex items-center gap-2 shrink-0",children:[f.jsx("button",{onClick:()=>u(A),className:"p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors",children:f.jsx(gm,{size:13})}),f.jsx("button",{onClick:()=>m(A.id),className:"p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors",children:f.jsx(ym,{size:13})})]})]},A.id))})}),f.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-5",children:[f.jsxs("div",{className:"flex items-center justify-between mb-4",children:[f.jsx("h2",{className:"text-sm font-semibold text-white",children:s?"Editar premio":"Nuevo premio"}),s&&f.jsx("button",{onClick:c,className:"p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all",children:f.jsx(_m,{size:15})})]}),f.jsxs("div",{className:"grid grid-cols-2 gap-3 mb-4",children:[f.jsxs("div",{children:[f.jsx("label",{className:w,children:"Nombre"}),f.jsx("input",{className:g,placeholder:"Ej. Corte gratis",value:n.nombre,onChange:A=>r(P=>({...P,nombre:A.target.value})),onKeyDown:A=>A.key==="Enter"&&d()})]}),f.jsxs("div",{children:[f.jsx("label",{className:w,children:"Sellos requeridos"}),f.jsx("input",{className:g,type:"number",min:"1",max:"99",placeholder:"10",value:n.costoSellos,onChange:A=>r(P=>({...P,costoSellos:A.target.value})),onKeyDown:A=>A.key==="Enter"&&d()})]})]}),f.jsxs("div",{className:"flex gap-3 justify-end",children:[s&&f.jsx("button",{onClick:c,className:"px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),f.jsxs("button",{onClick:d,disabled:o||!n.nombre||!n.costoSellos,className:"flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all",children:[o&&f.jsx("span",{className:"w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"}),s?"Guardar":f.jsxs(f.Fragment,{children:[f.jsx(Ma,{size:15})," Agregar"]})]})]})]})]})}const Rv={nombre:"",descripcion:"",precio:"",stock:"",imagen:""};function FV({producto:t,onEdit:e,onDelete:n}){return f.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all group",children:[f.jsx("div",{className:"h-40 bg-slate-800 flex items-center justify-center overflow-hidden",children:t.imagen?f.jsx("img",{src:t.imagen,alt:t.nombre,className:"w-full h-full object-cover"}):f.jsx(ox,{size:28,className:"text-slate-600"})}),f.jsxs("div",{className:"p-4",children:[f.jsx("h3",{className:"font-semibold text-white text-sm",children:t.nombre}),t.descripcion&&f.jsx("p",{className:"text-xs text-slate-500 mt-0.5 line-clamp-2",children:t.descripcion}),f.jsxs("div",{className:"flex items-center justify-between mt-3",children:[f.jsxs("span",{className:"text-emerald-400 font-bold text-sm",children:["$",Number(t.precio||0).toLocaleString("es-CL")]}),f.jsxs("span",{className:`text-xs font-semibold px-2 py-0.5 rounded-full border ${(t.stock||0)>0?"text-slate-400 border-slate-700":"text-red-400 border-red-500/30 bg-red-500/5"}`,children:["Stock: ",t.stock??"—"]})]}),f.jsxs("div",{className:"flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity",children:[f.jsxs("button",{onClick:()=>e(t),className:"flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-semibold transition-colors",children:[f.jsx(gm,{size:12})," Editar"]}),f.jsxs("button",{onClick:()=>n(t.id),className:"flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-semibold transition-colors",children:[f.jsx(ym,{size:12})," Eliminar"]})]})]})]})}function zV(){const{data:t,loading:e}=Hn("productos"),[n,r]=V.useState(!1),[s,i]=V.useState(null),[o,l]=V.useState(Rv),[u,c]=V.useState(!1),[d,m]=V.useState(""),[g,w]=V.useState(!1),A=V.useRef(null),P=()=>{i(null),l(Rv),m(""),r(!0)},N=L=>{i(L.id),l({nombre:L.nombre||"",descripcion:L.descripcion||"",precio:L.precio||"",stock:L.stock??"",imagen:L.imagen||""}),m(L.imagen||""),r(!0)},x=async L=>{var _;const E=(_=L.target.files)==null?void 0:_[0];if(E){m(URL.createObjectURL(E)),w(!0);try{const S=mm(),R=`${S==="elegance"?"":`tenants/${S}/`}productos/${Date.now()}_${E.name}`,T=await OO(LO(BO,R),E),C=await VO(T.ref);l(I=>({...I,imagen:C})),m(C)}catch(S){console.error("Upload error:",S)}finally{w(!1)}}},v=async()=>{if(o.nombre){c(!0);try{const L={nombre:o.nombre,descripcion:o.descripcion,precio:Number(o.precio)||0,stock:o.stock!==""?Number(o.stock):null,imagen:o.imagen,updatedAt:ws()};s?await Ln(qe(Le("productos"),s),L):await Ac(Le("productos"),{...L,createdAt:ws()}),r(!1)}finally{c(!1)}}},k=async L=>{confirm("¿Eliminar este producto?")&&await Sc(qe(Le("productos"),L))},D="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",U="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5";return f.jsxs("div",{className:"max-w-5xl mx-auto",children:[f.jsxs("div",{className:"flex items-center justify-between mb-6",children:[f.jsxs("div",{children:[f.jsx("h1",{className:"text-xl font-bold text-white",children:"Productos"}),f.jsx("p",{className:"text-sm text-slate-500 mt-0.5",children:"Productos disponibles en el local · visibles en el dashboard de clientes."})]}),f.jsxs("button",{onClick:P,className:"flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors",children:[f.jsx(Ma,{size:16})," Agregar producto"]})]}),e?f.jsx("div",{className:"flex justify-center py-20",children:f.jsx("div",{className:"w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):t.length===0?f.jsxs("div",{className:"flex flex-col items-center py-20 text-slate-600",children:[f.jsx(lx,{size:40,className:"mb-3"}),f.jsx("p",{className:"text-sm font-medium",children:"Sin productos aún"}),f.jsx("p",{className:"text-xs mt-0.5",children:"Agrega el primero con el botón de arriba."})]}):f.jsx("div",{className:"grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4",children:t.map(L=>f.jsx(FV,{producto:L,onEdit:N,onDelete:k},L.id))}),f.jsx(bc,{isOpen:n,onClose:()=>r(!1),title:s?"Editar producto":"Nuevo producto",footer:f.jsxs("div",{className:"flex gap-3 justify-end",children:[f.jsx("button",{onClick:()=>r(!1),className:"px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all",children:"Cancelar"}),f.jsxs("button",{onClick:v,disabled:u||!o.nombre||g,className:"px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2",children:[u&&f.jsx("span",{className:"w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"}),s?"Guardar":"Crear producto"]})]}),children:f.jsxs("div",{className:"space-y-4",children:[f.jsxs("div",{children:[f.jsx("label",{className:U,children:"Imagen"}),f.jsxs("div",{className:"flex gap-3 items-start",children:[f.jsx("div",{className:"w-20 h-20 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0",children:d?f.jsx("img",{src:d,alt:"preview",className:"w-full h-full object-cover"}):f.jsx(ox,{size:20,className:"text-slate-600"})}),f.jsxs("div",{className:"flex-1 space-y-2",children:[f.jsx("input",{className:D,placeholder:"https://... o sube una imagen",value:o.imagen,onChange:L=>{l(E=>({...E,imagen:L.target.value})),m(L.target.value)}}),f.jsxs("button",{type:"button",onClick:()=>{var L;return(L=A.current)==null?void 0:L.click()},disabled:g,className:"flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50",children:[g?f.jsx("span",{className:"w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"}):f.jsx(mV,{size:12}),g?"Subiendo...":"Subir imagen"]}),f.jsx("input",{ref:A,type:"file",accept:"image/*",className:"hidden",onChange:x})]})]})]}),f.jsxs("div",{children:[f.jsx("label",{className:U,children:"Nombre"}),f.jsx("input",{className:D,placeholder:"Pomada para el cabello",value:o.nombre,onChange:L=>l(E=>({...E,nombre:L.target.value}))})]}),f.jsxs("div",{children:[f.jsx("label",{className:U,children:"Descripción"}),f.jsx("textarea",{className:`${D} resize-none`,rows:2,placeholder:"Descripción breve del producto...",value:o.descripcion,onChange:L=>l(E=>({...E,descripcion:L.target.value}))})]}),f.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[f.jsxs("div",{children:[f.jsx("label",{className:U,children:"Precio ($)"}),f.jsx("input",{className:D,type:"number",placeholder:"9900",value:o.precio,onChange:L=>l(E=>({...E,precio:L.target.value}))})]}),f.jsxs("div",{children:[f.jsx("label",{className:U,children:"Stock"}),f.jsx("input",{className:D,type:"number",placeholder:"0",min:"0",value:o.stock,onChange:L=>l(E=>({...E,stock:L.target.value}))})]})]})]})})]})}function BV(){const t=tx(),[e,n]=V.useState(""),[r,s]=V.useState(""),[i,o]=V.useState(""),[l,u]=V.useState(!1),c="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors",d=w=>async A=>{A==null||A.preventDefault(),o(""),u(!0);try{await w()}catch(P){o(P.message)}finally{u(!1)}},m=d(()=>c2(ma,e,r)),g=d(()=>O2(ma,new Cn));return f.jsx("div",{className:"min-h-screen bg-slate-950 flex items-center justify-center px-4",children:f.jsxs("div",{className:"w-full max-w-sm",children:[f.jsxs("div",{className:"flex flex-col items-center mb-8",children:[f.jsx("div",{className:"w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4",children:f.jsx(ax,{size:22,className:"text-emerald-400"})}),f.jsx("h1",{className:"text-lg font-bold text-white",children:"Panel Admin"}),f.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:t.name})]}),f.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-2xl p-6",children:[f.jsxs("form",{onSubmit:m,className:"space-y-3",children:[f.jsx("input",{type:"email",className:c,placeholder:"Correo electrónico",value:e,onChange:w=>n(w.target.value)}),f.jsx("input",{type:"password",className:c,placeholder:"Contraseña",value:r,onChange:w=>s(w.target.value)}),i&&f.jsx("p",{className:"text-xs text-red-400",children:i}),f.jsxs("button",{type:"submit",disabled:l,className:"w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2",children:[l&&f.jsx("span",{className:"w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"}),"Ingresar"]})]}),f.jsxs("div",{className:"flex items-center gap-3 my-4",children:[f.jsx("div",{className:"flex-1 h-px bg-slate-800"}),f.jsx("span",{className:"text-xs text-slate-600 uppercase tracking-widest",children:"o"}),f.jsx("div",{className:"flex-1 h-px bg-slate-800"})]}),f.jsxs("button",{onClick:g,className:"w-full flex items-center justify-center gap-2.5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-all",children:[f.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 48 48",children:[f.jsx("path",{fill:"#EA4335",d:"M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.3 30.2 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.8 6C12.3 13.2 17.7 9.5 24 9.5z"}),f.jsx("path",{fill:"#4285F4",d:"M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"}),f.jsx("path",{fill:"#FBBC05",d:"M10.5 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.8-6z"}),f.jsx("path",{fill:"#34A853",d:"M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.3 0-11.6-4.3-13.5-10l-7.8 6C6.7 42.6 14.7 48 24 48z"})]}),"Continuar con Google"]})]})]})})}function $V(){const{user:t,loading:e}=qO();return e?f.jsx("div",{className:"min-h-screen bg-slate-900 flex items-center justify-center",children:f.jsx("div",{className:"w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"})}):t?f.jsx(_V,{children:f.jsxs(Zw,{children:[f.jsx(Gt,{index:!0,element:f.jsx(Dy,{to:"agenda",replace:!0})}),f.jsx(Gt,{path:"agenda",element:f.jsx(kV,{})}),f.jsx(Gt,{path:"servicios",element:f.jsx(TV,{})}),f.jsx(Gt,{path:"equipo",element:f.jsx(OV,{})}),f.jsx(Gt,{path:"clientes",element:f.jsx(MV,{})}),f.jsx(Gt,{path:"premios",element:f.jsx(UV,{})}),f.jsx(Gt,{path:"productos",element:f.jsx(zV,{})}),f.jsx(Gt,{path:"metricas",element:f.jsx(jV,{})}),f.jsx(Gt,{path:"*",element:f.jsx(Dy,{to:"agenda",replace:!0})})]})}):f.jsx(BV,{})}function WV(){return f.jsx(WO,{children:f.jsx(HO,{children:f.jsx(fC,{basename:"/panel",children:f.jsx(Zw,{children:f.jsx(Gt,{path:"/*",element:f.jsx($V,{})})})})})})}Bw(document.getElementById("root")).render(f.jsx(V.StrictMode,{children:f.jsx(WV,{})}));

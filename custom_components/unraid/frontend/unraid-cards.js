var e=globalThis,t=e.ShadowRoot&&(e.ShadyCSS===void 0||e.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,n=Symbol(),r=new WeakMap,i=class{constructor(e,t,r){if(this._$cssResult$=!0,r!==n)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,n=this.t;if(t&&e===void 0){let t=n!==void 0&&n.length===1;t&&(e=r.get(n)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),t&&r.set(n,e))}return e}toString(){return this.cssText}},a=e=>new i(typeof e==`string`?e:e+``,void 0,n),o=(e,...t)=>new i(e.length===1?e[0]:t.reduce((t,n,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if(typeof e==`number`)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: `+e+`. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)})(n)+e[r+1],e[0]),e,n),s=(n,r)=>{if(t)n.adoptedStyleSheets=r.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let t of r){let r=document.createElement(`style`),i=e.litNonce;i!==void 0&&r.setAttribute(`nonce`,i),r.textContent=t.cssText,n.appendChild(r)}},c=t?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return a(t)})(e):e,{is:l,defineProperty:u,getOwnPropertyDescriptor:d,getOwnPropertyNames:f,getOwnPropertySymbols:p,getPrototypeOf:m}=Object,h=globalThis,g=h.trustedTypes,_=g?g.emptyScript:``,v=h.reactiveElementPolyfillSupport,y=(e,t)=>e,b={toAttribute(e,t){switch(t){case Boolean:e=e?_:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},x=(e,t)=>!l(e,t),S={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:x};Symbol.metadata??=Symbol(`metadata`),h.litPropertyMetadata??=new WeakMap;var C=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=S){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&u(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=d(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??S}static _$Ei(){if(this.hasOwnProperty(y(`elementProperties`)))return;let e=m(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(y(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(y(`properties`))){let e=this.properties,t=[...f(e),...p(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(c(e))}else e!==void 0&&t.push(c(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return s(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?b:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?b:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??=a.getPropertyOptions(e),!((n.hasChanged??x)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};C.elementStyles=[],C.shadowRootOptions={mode:`open`},C[y(`elementProperties`)]=new Map,C[y(`finalized`)]=new Map,v?.({ReactiveElement:C}),(h.reactiveElementVersions??=[]).push(`2.1.2`);var w=globalThis,T=e=>e,E=w.trustedTypes,D=E?E.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,O=`$lit$`,k=`lit$${Math.random().toFixed(9).slice(2)}$`,A=`?`+k,j=`<${A}>`,M=document,N=()=>M.createComment(``),P=e=>e===null||typeof e!=`object`&&typeof e!=`function`,F=Array.isArray,ee=e=>F(e)||typeof e?.[Symbol.iterator]==`function`,I="[ \t\n\f\r]",L=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,te=/-->/g,ne=/>/g,R=RegExp(`>|${I}(?:([^\\s"'>=/]+)(${I}*=${I}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),re=/'/g,ie=/"/g,ae=/^(?:script|style|textarea|title)$/i,z=(e=>(t,...n)=>({_$litType$:e,strings:t,values:n}))(1),B=Symbol.for(`lit-noChange`),V=Symbol.for(`lit-nothing`),oe=new WeakMap,H=M.createTreeWalker(M,129);function se(e,t){if(!F(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return D===void 0?t:D.createHTML(t)}var ce=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=L;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===L?c[1]===`!--`?o=te:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=R):(ae.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=R):o=ne:o===R?c[0]===`>`?(o=i??L,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?R:c[3]===`"`?ie:re):o===ie||o===re?o=R:o===te||o===ne?o=L:(o=R,i=void 0);let d=o===R&&e[t+1].startsWith(`/>`)?` `:``;a+=o===L?n+j:l>=0?(r.push(s),n.slice(0,l)+O+n.slice(l)+k+d):n+k+(l===-2?t:d)}return[se(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},le=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=ce(t,n);if(this.el=e.createElement(l,r),H.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=H.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(O)){let t=u[o++],n=i.getAttribute(e).split(k),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?fe:r[1]===`?`?pe:r[1]===`@`?me:W}),i.removeAttribute(e)}else e.startsWith(k)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(ae.test(i.tagName)){let e=i.textContent.split(k),t=e.length-1;if(t>0){i.textContent=E?E.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],N()),H.nextNode(),c.push({type:2,index:++a});i.append(e[t],N())}}}else if(i.nodeType===8){if(i.data===A)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(k,e+1))!==-1;)c.push({type:7,index:a}),e+=k.length-1}}a++}}static createElement(e,t){let n=M.createElement(`template`);return n.innerHTML=e,n}};function U(e,t,n=e,r){if(t===B)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=P(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=U(e,i._$AS(e,t.values),i,r)),t}var ue=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??M).importNode(t,!0);H.currentNode=r;let i=H.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new de(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new he(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=H.nextNode(),a++)}return H.currentNode=M,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},de=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=V,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=U(this,e,t),P(e)?e===V||e==null||e===``?(this._$AH!==V&&this._$AR(),this._$AH=V):e!==this._$AH&&e!==B&&this._(e):e._$litType$===void 0?e.nodeType===void 0?ee(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==V&&P(this._$AH)?this._$AA.nextSibling.data=e:this.T(M.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=le.createElement(se(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new ue(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=oe.get(e.strings);return t===void 0&&oe.set(e.strings,t=new le(e)),t}k(t){F(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(N()),this.O(N()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=T(e).nextSibling;T(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},W=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=V,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=V}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=U(this,e,t,0),a=!P(e)||e!==this._$AH&&e!==B,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=U(this,r[n+o],t,o),s===B&&(s=this._$AH[o]),a||=!P(s)||s!==this._$AH[o],s===V?e=V:e!==V&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===V?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},fe=class extends W{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===V?void 0:e}},pe=class extends W{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==V)}},me=class extends W{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=U(this,e,t,0)??V)===B)return;let n=this._$AH,r=e===V&&n!==V||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==V&&(n===V||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},he=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){U(this,e)}},ge=w.litHtmlPolyfillSupport;ge?.(le,de),(w.litHtmlVersions??=[]).push(`3.3.3`);var _e=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new de(t.insertBefore(N(),e),e,void 0,n??{})}return i._$AI(e),i},ve=globalThis,G=class extends C{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=_e(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return B}};G._$litElement$=!0,G.finalized=!0,ve.litElementHydrateSupport?.({LitElement:G});var ye=ve.litElementPolyfillSupport;ye?.({LitElement:G}),(ve.litElementVersions??=[]).push(`4.2.2`);var be=`unraid-server-card`,xe=`unraid-server-card-editor`,Se=`unraid-storage-card`,Ce=`unraid-storage-card-editor`,we=`unraid-docker-card`,Te=`unraid-docker-card-editor`,Ee=`unraid-ups-card`,De=`unraid-ups-card-editor`,Oe=`unraid-vm-card`,ke=`unraid-vm-card-editor`,Ae=`unraid-shares-card`,je=`unraid-shares-card-editor`,Me=`unraid-network-card`,Ne=`unraid-network-card-editor`,Pe=`unraid-dashboard-card`,Fe=`unraid-dashboard-card-editor`,Ie=[o`
  :host {
    --unraid-primary: var(
      --primary-color,
      var(--ha-color-fill-primary-loud-resting, #03a9f4)
    );
    --unraid-accent: var(--unraid-primary);
    --unraid-online: var(--success-color, #00883c);
    --unraid-warning: var(--warning-color, #c94e00);
    --unraid-error: var(--error-color, #db4437);
    --unraid-standby: var(--disabled-text-color, #7a7a7a);
    --unraid-info: var(--info-color, var(--unraid-primary));
    --unraid-card-bg: var(--ha-card-background, var(--card-background-color, #ffffff));
    --unraid-border: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
    --unraid-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg, 12px));
    --unraid-text: var(--primary-text-color, var(--ha-color-text-primary, #212121));
    --unraid-subtext: var(
      --secondary-text-color,
      var(--ha-color-text-secondary, #5e5e5e)
    );
    --unraid-control-border: var(--secondary-text-color, var(--unraid-subtext));
    --unraid-focus: var(--ha-color-focus, var(--unraid-text));
  }
`,o`
    :host {
      display: block;
      box-sizing: border-box;
      container-type: inline-size;
      font-family: var(--ha-card-font-family, var(--ha-font-family-body, inherit));
      font-size: var(--ha-font-size-m, 14px);
      line-height: var(--ha-line-height-normal, 1.6);
    }
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }
    ha-card {
      padding: var(--ha-space-4, 16px);
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-3, 12px);
      background: var(--unraid-card-bg);
      border: var(--ha-card-border-width, 1px) solid var(--unraid-border);
      border-radius: var(--unraid-radius);
      color: var(--unraid-text);
    }
    :host([embedded]) ha-card {
      border: none;
      box-shadow: none;
      background: transparent;
      padding: 0;
    }
    button,
    input,
    select {
      font: inherit;
    }
    button {
      color: inherit;
      text-align: inherit;
      cursor: pointer;
      touch-action: manipulation;
    }
    button:disabled {
      cursor: default;
      opacity: 0.6;
    }
    [role="tabpanel"][hidden] {
      display: none;
    }
    [role="tabpanel"] {
      min-width: 0;
    }
    :where(button, a, input, select, [tabindex]):focus-visible {
      outline: 2px solid var(--unraid-focus);
      outline-offset: 2px;
    }
    .icon {
      display: inline-block;
      vertical-align: middle;
      fill: currentColor;
      flex-shrink: 0;
    }
    .sr-only {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }
    .header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--ha-space-3, 12px);
    }
    .header-main {
      display: flex;
      flex: 1;
      align-items: center;
      gap: var(--ha-space-3, 12px);
      min-width: 0;
    }
    .header-icon {
      inline-size: var(--ha-space-10, 40px);
      block-size: var(--ha-space-10, 40px);
      border-radius: var(--ha-border-radius-lg, 12px);
      background: color-mix(in srgb, var(--unraid-accent) 12%, transparent);
      color: var(--unraid-accent);
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .header-titles {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .header-title {
      margin: 0;
      font-size: var(--ha-card-header-font-size, var(--ha-font-size-l, 16px));
      font-weight: var(--ha-font-weight-heading, 700);
      color: var(--unraid-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: var(--ha-line-height-condensed, 1.2);
    }
    .header-subtitle {
      font-size: var(--ha-font-size-s, 12px);
      color: var(--unraid-subtext);
      overflow-wrap: anywhere;
    }
    .header-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--ha-space-2, 8px);
      margin-inline-start: auto;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-1, 4px);
      padding: var(--ha-space-1, 4px) var(--ha-space-2, 8px);
      border-radius: var(--ha-border-radius-pill, 9999px);
      font-size: var(--ha-font-size-s, 12px);
      font-weight: var(--ha-font-weight-medium, 500);
      line-height: var(--ha-line-height-condensed, 1.2);
      white-space: nowrap;
      color: var(--unraid-text);
      border: 1px solid var(--unraid-border);
    }
    button.badge {
      min-block-size: var(--ha-space-10, 40px);
      min-inline-size: var(--ha-space-10, 40px);
    }
    .badge-online {
      background: color-mix(in srgb, var(--unraid-online) 12%, var(--unraid-card-bg));
      border-color: color-mix(in srgb, var(--unraid-online) 35%, var(--unraid-card-bg));
    }
    .badge-warning {
      background: color-mix(in srgb, var(--unraid-warning) 12%, var(--unraid-card-bg));
      border-color: color-mix(
        in srgb,
        var(--unraid-warning) 35%,
        var(--unraid-card-bg)
      );
    }
    .badge-error {
      background: color-mix(in srgb, var(--unraid-error) 12%, var(--unraid-card-bg));
      border-color: color-mix(in srgb, var(--unraid-error) 35%, var(--unraid-card-bg));
    }
    .badge-standby {
      background: color-mix(in srgb, var(--unraid-standby) 12%, var(--unraid-card-bg));
    }
    .pulse-dot {
      inline-size: var(--ha-space-2, 8px);
      block-size: var(--ha-space-2, 8px);
      border-radius: 50%;
      background: currentColor;
    }
    .rings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 80px), 1fr));
      gap: var(--ha-space-2, 8px);
    }
    .rings-grid.two {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .ring-card {
      background: color-mix(in srgb, var(--unraid-text) 3%, transparent);
      border: 1px solid var(--unraid-border);
      border-radius: var(--ha-border-radius-lg, 12px);
      padding: var(--ha-space-3, 12px) var(--ha-space-2, 8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--ha-space-1, 4px);
      min-width: 0;
    }
    .ring-gauge {
      inline-size: var(--ha-space-14, 56px);
      block-size: var(--ha-space-14, 56px);
      border-radius: 50%;
      position: relative;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      background: conic-gradient(
        var(--ring-color, var(--unraid-primary)) calc(var(--pct, 0) * 1%),
        color-mix(in srgb, var(--unraid-text) 55%, var(--unraid-card-bg)) 0
      );
    }
    .ring-gauge::after {
      content: "";
      position: absolute;
      inset: var(--ha-space-2, 8px);
      border-radius: 50%;
      background: var(--unraid-card-bg);
    }
    .ring-content {
      position: relative;
      z-index: 2;
      font-size: var(--ha-font-size-m, 14px);
      font-weight: var(--ha-font-weight-bold, 700);
      color: var(--unraid-text);
    }
    .ring-label {
      font-size: var(--ha-font-size-s, 12px);
      font-weight: var(--ha-font-weight-medium, 500);
      color: var(--unraid-text);
      line-height: var(--ha-line-height-condensed, 1.2);
    }
    .ring-subtext {
      font-size: var(--ha-font-size-s, 12px);
      color: var(--unraid-subtext);
      line-height: var(--ha-line-height-condensed, 1.2);
      overflow-wrap: anywhere;
    }
    .progress-bar {
      width: 100%;
      height: var(--ha-space-2, 8px);
      background: color-mix(in srgb, var(--unraid-text) 55%, var(--unraid-card-bg));
      border-radius: var(--ha-border-radius-pill, 9999px);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--fill-color, var(--unraid-accent));
      border-radius: inherit;
      transition: width var(--ha-animation-duration-normal, 250ms) ease;
    }
    .item-list {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2, 8px);
    }
    .list-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
      border-radius: var(--ha-border-radius-lg, 12px);
      background: color-mix(in srgb, var(--unraid-text) 3%, transparent);
      border: 1px solid var(--unraid-border);
      gap: var(--ha-space-3, 12px);
      font-size: var(--ha-font-size-m, 14px);
      min-width: 0;
      transition: border-color var(--ha-animation-duration-fast, 150ms) ease;
    }
    button.ring-card {
      border-color: var(--unraid-control-border);
    }
    button.list-row {
      border-color: var(--unraid-control-border);
      width: 100%;
      min-block-size: var(--ha-space-12, 48px);
    }
    .list-row:hover {
      border-color: color-mix(in srgb, var(--unraid-primary) 50%, var(--unraid-text));
    }
    .row-left {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2, 8px);
      min-width: 0;
      flex: 1;
    }
    .row-right {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2, 8px);
      flex-shrink: 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--ha-space-2, 8px);
      min-block-size: var(--ha-space-10, 40px);
      min-inline-size: var(--ha-space-10, 40px);
      padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
      border-radius: var(--ha-border-radius-pill, 9999px);
      font-size: var(--ha-font-size-m, 14px);
      font-weight: var(--ha-font-weight-action, 500);
      border: 1px solid var(--unraid-control-border);
      background: color-mix(in srgb, var(--unraid-text) 6%, transparent);
      color: var(--unraid-text);
      transition: background-color var(--ha-animation-duration-fast, 150ms) ease;
    }
    .btn:hover {
      background: color-mix(in srgb, var(--unraid-text) 12%, transparent);
    }
    .btn-primary {
      background: color-mix(in srgb, var(--unraid-primary) 12%, var(--unraid-card-bg));
      color: var(--unraid-text);
      border-color: color-mix(in srgb, var(--unraid-primary) 50%, var(--unraid-text));
    }
    .btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-inline-size: var(--ha-space-12, 48px);
      min-block-size: var(--ha-space-12, 48px);
      padding: var(--ha-space-2, 8px);
      border-radius: var(--ha-border-radius-pill, 9999px);
      border: 1px solid transparent;
      background: transparent;
      color: var(--unraid-subtext);
    }
    .btn-icon:hover {
      background: color-mix(in srgb, var(--unraid-text) 8%, transparent);
      color: var(--unraid-text);
    }
    .container-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
      gap: var(--ha-space-2, 8px);
    }
    .container-tile {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--ha-space-2, 8px);
      border-radius: var(--ha-border-radius-lg, 12px);
      background: color-mix(in srgb, var(--unraid-text) 4%, transparent);
      border: 1px solid var(--unraid-border);
      gap: var(--ha-space-1, 4px);
      min-width: 0;
      transition: border-color var(--ha-animation-duration-fast, 150ms) ease;
    }
    .container-tile:hover {
      border-color: color-mix(in srgb, var(--unraid-primary) 50%, var(--unraid-text));
    }
    .tile-main,
    .workload-name-button {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2, 8px);
      min-width: 0;
      min-block-size: var(--ha-space-12, 48px);
      flex: 1;
      border: 0;
      background: transparent;
      padding: var(--ha-space-1, 4px);
      border-radius: var(--ha-border-radius-md, 8px);
      color: var(--unraid-text);
    }
    .workload-label {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .tile-name,
    .vm-name {
      font-size: var(--ha-font-size-m, 14px);
      font-weight: var(--ha-font-weight-medium, 500);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
    .workload-status {
      font-size: var(--ha-font-size-s, 12px);
      color: var(--unraid-subtext);
    }
    .status-dot {
      width: var(--ha-space-2, 8px);
      height: var(--ha-space-2, 8px);
      border-radius: 50%;
      flex-shrink: 0;
    }
    .status-dot.online {
      background: var(--unraid-online);
    }
    .status-dot.paused {
      background: var(--warning-color, var(--unraid-warning, var(--unraid-standby)));
    }
    .status-dot.offline {
      background: var(--unraid-standby);
      border-radius: 2px;
    }
    .divider {
      height: 1px;
      background: var(--unraid-border);
      width: 100%;
      margin: var(--ha-space-1, 4px) 0;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
      gap: var(--ha-space-3, 12px);
      font-size: var(--ha-font-size-m, 14px);
    }
    /* Static and clickable items share one box, so both rows line up. */
    .detail-item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--ha-space-1, 4px);
      min-width: 0;
      min-block-size: var(--ha-space-12, 48px);
      padding: var(--ha-space-1, 4px);
      border: 1px solid transparent;
      border-radius: var(--ha-border-radius-md, 8px);
      box-sizing: border-box;
    }
    button.detail-item {
      background: transparent;
    }
    .detail-label {
      color: var(--unraid-subtext);
      font-size: var(--ha-font-size-s, 12px);
    }
    .detail-val {
      max-inline-size: 100%;
      font-weight: var(--ha-font-weight-medium, 500);
      color: var(--unraid-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    a.detail-val {
      display: inline-flex;
      align-items: center;
      min-block-size: var(--ha-space-10, 40px);
      white-space: normal;
      overflow-wrap: anywhere;
      text-decoration: underline;
      text-decoration-color: var(--unraid-accent);
    }
    .tab-strip {
      display: flex;
      gap: var(--ha-space-1, 4px);
      overflow-x: auto;
      padding: var(--ha-space-1, 4px);
      border-block-end: 1px solid var(--unraid-border);
      min-width: 0;
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--ha-space-2, 8px);
      min-block-size: var(--ha-space-10, 40px);
      padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
      border-radius: var(--ha-border-radius-pill, 9999px);
      font-size: var(--ha-font-size-m, 14px);
      font-weight: var(--ha-font-weight-action, 500);
      background: transparent;
      border: 2px solid transparent;
      color: var(--unraid-subtext);
      cursor: pointer;
      white-space: nowrap;
      transition: background-color var(--ha-animation-duration-fast, 150ms) ease;
    }
    .tab-btn:hover {
      color: var(--unraid-text);
      background: color-mix(in srgb, var(--unraid-text) 5%, transparent);
    }
    .tab-btn.active {
      background: color-mix(in srgb, var(--unraid-primary) 12%, var(--unraid-card-bg));
      color: var(--unraid-text);
      border-color: color-mix(in srgb, var(--unraid-primary) 50%, var(--unraid-text));
    }
    input[type="search"] {
      min-block-size: var(--ha-space-14, 56px);
      font: inherit;
    }
    label {
      font-size: var(--ha-font-size-s, 12px);
      color: var(--unraid-subtext);
    }
    .empty-state {
      padding: var(--ha-space-4, 16px);
      text-align: center;
      color: var(--unraid-subtext);
    }
    .network-row {
      overflow-wrap: anywhere;
    }
    .network-row > span {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-2, 8px);
    }
    @container (max-width: 360px) {
      .header-main {
        flex-basis: 100%;
      }
      .list-row {
        flex-wrap: wrap;
      }
      .row-left {
        flex-wrap: wrap;
      }
      .workload-name-button {
        flex-basis: 100%;
      }
      .row-right {
        flex-wrap: wrap;
        justify-content: flex-end;
        margin-inline-start: auto;
        max-width: 100%;
      }
      .list-row > .row-right {
        flex-basis: 100%;
      }
      .container-tile {
        flex-wrap: wrap;
      }
      .tile-main {
        flex-basis: 100%;
      }
      .network-row .row-left {
        flex-wrap: wrap;
      }
    }
    @container (max-width: 240px) {
      .rings-grid.two {
        grid-template-columns: 1fr;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
    }
  `];function K(e,t,n,r){let i=new CustomEvent(t,{bubbles:r?.bubbles??!0,cancelable:!!r?.cancelable,composed:r?.composed??!0,detail:n});return e.dispatchEvent(i),i}var q=`M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z`,Le=`M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z`,Re=`M21.81 10.25C21.75 10.21 21.25 9.82 20.17 9.82C19.89 9.82 19.61 9.85 19.33 9.9C19.12 8.5 17.95 7.79 17.9 7.76L17.61 7.59L17.43 7.86C17.19 8.22 17 8.63 16.92 9.05C16.72 9.85 16.84 10.61 17.25 11.26C16.76 11.54 15.96 11.61 15.79 11.61H2.62C2.28 11.61 2 11.89 2 12.24C2 13.39 2.18 14.54 2.58 15.62C3.03 16.81 3.71 17.69 4.58 18.23C5.56 18.83 7.17 19.17 9 19.17C9.79 19.17 10.61 19.1 11.42 18.95C12.54 18.75 13.62 18.36 14.61 17.79C15.43 17.32 16.16 16.72 16.78 16C17.83 14.83 18.45 13.5 18.9 12.35H19.09C20.23 12.35 20.94 11.89 21.33 11.5C21.59 11.26 21.78 10.97 21.92 10.63L22 10.39L21.81 10.25M3.85 11.24H5.61C5.69 11.24 5.77 11.17 5.77 11.08V9.5C5.77 9.42 5.7 9.34 5.61 9.34H3.85C3.76 9.34 3.69 9.41 3.69 9.5V11.08C3.7 11.17 3.76 11.24 3.85 11.24M6.28 11.24H8.04C8.12 11.24 8.2 11.17 8.2 11.08V9.5C8.2 9.42 8.13 9.34 8.04 9.34H6.28C6.19 9.34 6.12 9.41 6.12 9.5V11.08C6.13 11.17 6.19 11.24 6.28 11.24M8.75 11.24H10.5C10.6 11.24 10.67 11.17 10.67 11.08V9.5C10.67 9.42 10.61 9.34 10.5 9.34H8.75C8.67 9.34 8.6 9.41 8.6 9.5V11.08C8.6 11.17 8.66 11.24 8.75 11.24M11.19 11.24H12.96C13.04 11.24 13.11 11.17 13.11 11.08V9.5C13.11 9.42 13.05 9.34 12.96 9.34H11.19C11.11 9.34 11.04 9.41 11.04 9.5V11.08C11.04 11.17 11.11 11.24 11.19 11.24M6.28 9H8.04C8.12 9 8.2 8.91 8.2 8.82V7.25C8.2 7.16 8.13 7.09 8.04 7.09H6.28C6.19 7.09 6.12 7.15 6.12 7.25V8.82C6.13 8.91 6.19 9 6.28 9M8.75 9H10.5C10.6 9 10.67 8.91 10.67 8.82V7.25C10.67 7.16 10.61 7.09 10.5 7.09H8.75C8.67 7.09 8.6 7.15 8.6 7.25V8.82C8.6 8.91 8.66 9 8.75 9M11.19 9H12.96C13.04 9 13.11 8.91 13.11 8.82V7.25C13.11 7.16 13.04 7.09 12.96 7.09H11.19C11.11 7.09 11.04 7.15 11.04 7.25V8.82C11.04 8.91 11.11 9 11.19 9M11.19 6.72H12.96C13.04 6.72 13.11 6.65 13.11 6.56V5C13.11 4.9 13.04 4.83 12.96 4.83H11.19C11.11 4.83 11.04 4.89 11.04 5V6.56C11.04 6.64 11.11 6.72 11.19 6.72M13.65 11.24H15.41C15.5 11.24 15.57 11.17 15.57 11.08V9.5C15.57 9.42 15.5 9.34 15.41 9.34H13.65C13.57 9.34 13.5 9.41 13.5 9.5V11.08C13.5 11.17 13.57 11.24 13.65 11.24`,ze=`M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z`,Be=`M7,15H9V18H11V15H13V18H15V15H17V18H19V9H15V6H9V9H5V18H7V15M4.38,3H19.63C20.94,3 22,4.06 22,5.38V19.63A2.37,2.37 0 0,1 19.63,22H4.38C3.06,22 2,20.94 2,19.63V5.38C2,4.06 3.06,3 4.38,3Z`,Ve=`M7,2V13H10V22L17,10H13L17,2H7Z`,He=`M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z`,Ue=`M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M12,4A6,6 0 0,0 6,10C6,13.31 8.69,16 12.1,16L11.22,13.77C10.95,13.29 11.11,12.68 11.59,12.4L12.45,11.9C12.93,11.63 13.54,11.79 13.82,12.27L15.74,14.69C17.12,13.59 18,11.9 18,10A6,6 0 0,0 12,4M12,9A1,1 0 0,1 13,10A1,1 0 0,1 12,11A1,1 0 0,1 11,10A1,1 0 0,1 12,9M7,18A1,1 0 0,0 6,19A1,1 0 0,0 7,20A1,1 0 0,0 8,19A1,1 0 0,0 7,18M12.09,13.27L14.58,19.58L17.17,18.08L12.95,12.77L12.09,13.27Z`,We=`M4,1C2.89,1 2,1.89 2,3V7C2,8.11 2.89,9 4,9H1V11H13V9H10C11.11,9 12,8.11 12,7V3C12,1.89 11.11,1 10,1H4M4,3H10V7H4V3M3,13V18L3,20H10V18H5V13H3M14,13C12.89,13 12,13.89 12,15V19C12,20.11 12.89,21 14,21H11V23H23V21H20C21.11,21 22,20.11 22,19V15C22,13.89 21.11,13 20,13H14M14,15H20V19H14V15Z`,Ge=`M21,16H3V4H21M21,2H3C1.89,2 1,2.89 1,4V16A2,2 0 0,0 3,18H10V20H8V22H16V20H14V18H21A2,2 0 0,0 23,16V4C23,2.89 22.1,2 21,2Z`,Ke=`M14,19H18V5H14M6,19H10V5H6V19Z`,qe=`M8,5.14V19.14L19,12.14L8,5.14Z`,Je=`M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13`,Ye=`M12,4C14.1,4 16.1,4.8 17.6,6.3C20.7,9.4 20.7,14.5 17.6,17.6C15.8,19.5 13.3,20.2 10.9,19.9L11.4,17.9C13.1,18.1 14.9,17.5 16.2,16.2C18.5,13.9 18.5,10.1 16.2,7.7C15.1,6.6 13.5,6 12,6V10.6L7,5.6L12,0.6V4M6.3,17.6C3.7,15 3.3,11 5.1,7.9L6.6,9.4C5.5,11.6 5.9,14.4 7.8,16.2C8.3,16.7 8.9,17.1 9.6,17.4L9,19.4C8,19 7.1,18.4 6.3,17.6Z`,Xe=`M4,1H20A1,1 0 0,1 21,2V6A1,1 0 0,1 20,7H4A1,1 0 0,1 3,6V2A1,1 0 0,1 4,1M4,9H20A1,1 0 0,1 21,10V14A1,1 0 0,1 20,15H4A1,1 0 0,1 3,14V10A1,1 0 0,1 4,9M4,17H20A1,1 0 0,1 21,18V22A1,1 0 0,1 20,23H4A1,1 0 0,1 3,22V18A1,1 0 0,1 4,17M9,5H10V3H9V5M9,13H10V11H9V13M9,21H10V19H9V21M5,3V5H7V3H5M5,11V13H7V11H5M5,19V21H7V19H5Z`,Ze=`M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5M11,7H13V13H11M11,15H13V17H11`,Qe=`M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z`,$e=`M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z`,et=`M8 15C8.55 15 9 15.45 9 16C9 16.55 8.55 17 8 17C7.45 17 7 16.55 7 16C7 15.45 7.45 15 8 15M15.07 4.69L16.5 6.1L15.07 7.5L13.66 6.1L15.07 4.69M17.9 7.5L19.31 8.93L17.9 10.34L16.5 8.93L17.9 7.5M8 13C6.34 13 5 14.34 5 16C5 17.66 6.34 19 8 19C9.66 19 11 17.66 11 16C11 14.34 9.66 13 8 13M9.77 4.33L10.5 5.08L14.29 1.29C14.47 1.11 14.72 1 15 1C15.28 1 15.53 1.11 15.71 1.29L22.78 8.36L22.78 8.37C22.92 8.54 23 8.76 23 9C23 9.3 22.87 9.57 22.66 9.76L22.66 9.76L18.93 13.5L19.67 14.23L12.95 20.95C11.68 22.22 9.93 23 8 23C4.13 23 1 19.87 1 16C1 14.07 1.78 12.32 3.05 11.05L9.77 4.33M20.59 9L15 3.41L11.93 6.5L17.5 12.08L20.59 9Z`,tt=`M3,11H11V3H3M3,21H11V13H3M13,21H21V13H13M13,3V11H21V3`,nt=`M9,5V9H21V5M9,19H21V15H9M9,14H21V10H9M4,9H8V5H4M4,19H8V15H4M4,14H8V10H4V14Z`;function J(e,t=20,n=`icon`){return z`
    <svg
      aria-hidden="true"
      focusable="false"
      class="${n}"
      style="width: ${t}px; height: ${t}px;"
      viewBox="0 0 24 24"
    >
      <path d="${e}" fill="currentColor"></path>
    </svg>
  `}var Y=class extends G{static styles=Ie;static editorTag=``;static async getConfigElement(){return document.createElement(this.editorTag)}static properties={hass:{attribute:!1},config:{attribute:!1}};constructor(){super(),this.config={type:``}}willUpdate(e){super.willUpdate(e),e.has(`config`)&&(this.config.embedded?this.setAttribute(`embedded`,``):this.removeAttribute(`embedded`))}setConfig(e){if(!e||typeof e.type!=`string`)throw Error(`Invalid card configuration`);this.config={...e},this.config.embedded?this.setAttribute(`embedded`,``):this.removeAttribute(`embedded`)}getCardSize(){return 4}getWorkloadLabel(e,t,n,r){let i=e.attributes[t],a=typeof i==`string`&&i.trim()?i:void 0,o=r?.[a??n],s=this.hass?.formatEntityName?.(e)??e.attributes.friendly_name,c=a??(typeof s==`string`&&s.trim()?s:n);return{name:typeof o==`string`&&o.trim()?o:c,rawName:c}}getGridOptions(){return{columns:12,min_columns:6}}getUnraidDevices(){return this.hass?.devices?Object.values(this.hass.devices).filter(e=>e.identifiers?.some(([e])=>e===`unraid`)):[]}getActiveDevice(){let e=this.getUnraidDevices();if(e.length!==0){if(this.config.server){let t=e.find(e=>e.id===this.config.server||e.name?.toLowerCase()===this.config.server?.toLowerCase()||e.name_by_user?.toLowerCase()===this.config.server?.toLowerCase());if(t)return t}return e[0]}}getEntity(e,t){if(!this.hass?.states)return;let n=this.getActiveDevice(),r=n?.id;if(this.hass.entities&&r){for(let n of Object.values(this.hass.entities))if(n.device_id===r&&n.translation_key===e&&(!t||n.entity_id.startsWith(`${t}.`))){let e=this.hass.states[n.entity_id];if(e)return e}}return Object.values(this.hass.states).find(r=>{if(t&&!r.entity_id.startsWith(`${t}.`))return!1;if(this.hass?.entities){let e=this.hass.entities[r.entity_id];if(e&&e.platform!==`unraid`)return!1}let i=r.entity_id.split(`.`)[1]||``,a=i.endsWith(`_${e}`)||i===e||e===`uptime`&&(i.endsWith(`_up_since`)||i===`up_since`)||e===`network_interface_ip`&&i.includes(`_network_`)&&(i.endsWith(`_ip`)||i.endsWith(`_ip_address`));if(n?.name){let e=n.name.toLowerCase().replace(/[^a-z0-9]/g,`_`);return a&&i.includes(e)}return a})}getNetworkInterfaces(){if(!this.hass?.states)return[];let e=this.getActiveDevice(),t=e?.name?e.name.toLowerCase().replace(/[^a-z0-9]/g,`_`):void 0,n=new Map;for(let[r,i]of Object.entries(this.hass.states)){let a=this.hass.entities?.[r];if(a?.platform&&a.platform!==`unraid`||e&&a?.device_id&&a.device_id!==e.id||t&&!r.includes(t))continue;let o=r.match(/_network_([a-zA-Z0-9_-]+)_(inbound(?:_throughput)?|outbound(?:_throughput)?|rx(?:_throughput)?|tx(?:_throughput)?|speed|ip|ip_address|link)$/i);if(!o||!o[1]||!o[2])continue;let s=o[1],c=o[2].toLowerCase();n.has(s)||n.set(s,{name:s,displayName:s.toUpperCase()});let l=n.get(s);c.startsWith(`inbound`)||c.startsWith(`rx`)?l.rx=i:c.startsWith(`outbound`)||c.startsWith(`tx`)?l.tx=i:c===`speed`?l.speed=i:c===`ip`||c===`ip_address`?l.ip=i:c===`link`&&(l.link=i)}return Array.from(n.values()).sort((e,t)=>e.name.localeCompare(t.name,void 0,{numeric:!0}))}getBootDiskEntity(){if(!this.hass?.states)return;let e=this.getActiveDevice(),t=e?.name?e.name.toLowerCase().replace(/[^a-z0-9]/g,`_`):void 0;return Object.values(this.hass.states).find(e=>!e.entity_id.startsWith(`sensor.`)||t&&!e.entity_id.includes(t)?!1:(e.entity_id.includes(`_disk_flash_`)||e.entity_id.includes(`_disk_boot_`))&&e.entity_id.endsWith(`_usage`))}getEntities(e,t){if(!this.hass?.states)return[];let n=this.getActiveDevice(),r=n?.id;if(this.hass.entities&&r){let n=[];for(let i of Object.values(this.hass.entities))if(i.device_id===r&&i.translation_key===e&&(!t||i.entity_id.startsWith(`${t}.`))){let e=this.hass.states[i.entity_id];e&&n.push(e)}if(n.length>0)return n}let i=n?.name?n.name.toLowerCase().replace(/[^a-z0-9]/g,`_`):void 0,a=t=>{if(this.hass?.entities){let e=this.hass.entities[t.entity_id];if(e&&e.platform!==`unraid`)return!1}if(e===`disk_usage`)return(t.entity_id.includes(`_disk_`)||t.entity_id.includes(`_cache`)||t.entity_id.includes(`_parity`)||t.entity_id.includes(`_boot`)||t.entity_id.includes(`_flash`))&&/_usage(?:_\d+)?$/.test(t.entity_id)&&!t.entity_id.includes(`_array_usage`)&&!t.entity_id.includes(`_share_`);if(e===`disk_temperature`)return(t.entity_id.includes(`_disk_`)||t.entity_id.includes(`_cache`)||t.entity_id.includes(`_parity`)||t.entity_id.includes(`_boot`))&&/_(?:temperature|temp)(?:_\d+)?$/.test(t.entity_id);if(e===`disk_spin`)return(t.entity_id.includes(`_disk_`)||t.entity_id.includes(`_cache`)||t.entity_id.includes(`_parity`))&&/_spin(?:_\d+)?$/.test(t.entity_id);if(e===`disk_health`)return(t.entity_id.includes(`_disk_`)||t.entity_id.includes(`_cache`)||t.entity_id.includes(`_parity`)||t.entity_id.includes(`_boot`))&&/_health(?:_\d+)?$/.test(t.entity_id);if(e===`share_usage`||e===`share`)return t.entity_id.includes(`_share_`)&&t.entity_id.endsWith(`_usage`);let n=t.entity_id.split(`.`)[1]||``;return n===e||n.endsWith(`_${e}`)||n.includes(`_${e}_`)||n.startsWith(`${e}_`)},o=Object.values(this.hass.states),s=t?o.filter(e=>e.entity_id.startsWith(`${t}.`)):o;return i?s.filter(e=>e.entity_id.includes(i)&&a(e)):s.filter(e=>a(e))}findEntity(e){if(this.hass?.states)return typeof e==`string`?this.hass.states[e]:Object.values(this.hass.states).find(t=>e.test(t.entity_id))}numericStateText(e){if(!e?.state.trim()||!Number.isFinite(Number(e.state)))return;if(this.hass?.formatEntityState)return this.hass.formatEntityState(e);let t=e.attributes.unit_of_measurement;return`${e.state}${typeof t==`string`&&t.trim()?` ${t}`:``}`}rateText(e){if(!e?.state.trim())return;let t=Number(e.state);if(!Number.isFinite(t))return;if(this.hass?.formatEntityState)return this.hass.formatEntityState(t<0?{...e,state:`0`}:e);let n=Math.max(0,t),r=e.attributes.unit_of_measurement,i=typeof r==`string`?r.trim():``;if(!i)return n<.1?`${(n*1e3).toFixed(1)} kB/s`:`${n.toFixed(2)} MB/s`;let a=[`B/s`,`kB/s`,`MB/s`,`GB/s`],o=[`B/s`,`KiB/s`,`MiB/s`,`GiB/s`],s=o.includes(i)&&i!==`B/s`,c=s?o:a,l=c.indexOf(i);if(l<0)return`${n} ${i}`;let u=s?1024:1e3,d=n*u**l,f=0;for(;d>=u&&f<c.length-1;)d/=u,f++;return`${d.toFixed(2)} ${c[f]}`}attributeText(e,t){for(let n of t){let t=e?.attributes[n];if(typeof t==`number`&&Number.isFinite(t))return String(t);if(typeof t==`string`&&t.trim()&&![`unknown`,`unavailable`].includes(t.trim().toLowerCase()))return t}}formatState(e,t=`Unavailable`){return e?this.hass?.formatEntityState?.(e)??{unknown:`Unknown`,unavailable:`Unavailable`}[e.state]??e.state:t}percentValue(e){if(!e?.state.trim())return null;let t=Number(e.state);return Number.isFinite(t)?Math.round(Math.min(100,Math.max(0,t))):null}handleTabKeydown(e){if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||![`ArrowLeft`,`ArrowRight`,`Home`,`End`].includes(e.key))return;let t=[...e.currentTarget.querySelectorAll(`button[role="tab"]`)],n=e.target.closest(`button[role="tab"]`),r=n?t.indexOf(n):-1;if(r<0)return;let i=getComputedStyle(this).direction===`rtl`,a=(e.key===`ArrowRight`?1:-1)*(i?-1:1),o=e.key===`Home`?0:e.key===`End`?t.length-1:(r+a+t.length)%t.length;e.preventDefault(),t[o]?.focus();for(let[e,n]of t.entries())n.tabIndex=e===o?0:-1;t[o]?.scrollIntoView({block:`nearest`,inline:`nearest`})}async toggleEntity(e){if(!this.hass)return;let t=e.split(`.`)[0]||`homeassistant`;await this.hass.callService(t,`toggle`,{entity_id:e})}async pressButton(e){this.hass&&await this.hass.callService(`button`,`press`,{entity_id:e})}openMoreInfo(e){K(this,`hass-more-info`,{entityId:e})}navigate(e,t=!1){e&&(t?window.history.replaceState(null,``,e):window.history.pushState(null,``,e),K(window,`location-changed`,{replace:t}))}renderHeader(e,t,n,r){return this.config.embedded||this.config.hide_header?V:z`
      <div class="header">
        <div class="header-main">
          <div class="header-icon">${J(n,22)}</div>
          <div class="header-titles">
            <h2 class="header-title">${e}</h2>
            <span class="header-subtitle">${t}</span>
          </div>
        </div>
        ${r?z`<div class="header-actions">${r}</div>`:``}
      </div>
    `}},rt={"custom:unraid-server-card":{systemInfo:!0},"custom:unraid-docker-card":{viewMode:!0,filter:!0,updates:!0},"custom:unraid-vm-card":{filter:!0},"custom:unraid-dashboard-card":{systemInfo:!0,viewMode:!0,filter:!0,updates:!0}},it={server:`Unraid server`,title:`Title`,view_mode:`Default view`,default_filter:`Default filter`,show_system_info:`Show system details`},at={server:`Leave empty to use the first Unraid server.`,title:`Leave empty for the default title.`},ot={view_mode:`grid`,default_filter:`all`,show_system_info:!0},st=/^[0-9a-f]{32}$/;function ct(e){return e.updates?[`all`,`running`,`paused`,`stopped`,`updates`]:[`all`,`running`,`stopped`]}var lt={all:`All`,running:`Running`,paused:`Paused`,stopped:`Stopped`,updates:`Updates`};function ut(e){let t=rt[e]??{},n=[{name:`server`,selector:{device:{filter:{integration:`unraid`}}}},{name:`title`,selector:{text:{}}}];return t.viewMode&&n.push({name:`view_mode`,selector:{select:{mode:`dropdown`,options:[{value:`grid`,label:`Grid (icons and status)`},{value:`list`,label:`List (detailed table)`}]}}}),t.filter&&n.push({name:`default_filter`,selector:{select:{mode:`dropdown`,options:ct(t).map(e=>({value:e,label:lt[e]}))}}}),t.systemInfo&&n.push({name:`show_system_info`,selector:{boolean:{}}}),n}function dt(e){let t=rt[e.type]??{},{server:n,title:r,view_mode:i,default_filter:a,show_system_info:o}=e;if(n!==void 0&&(typeof n!=`string`||!st.test(n)))throw Error(`'server' names the server; edit this card in YAML.`);if(r!==void 0&&typeof r!=`string`)throw Error(`'title' must be text.`);if(t.viewMode&&i!==void 0&&![`grid`,`list`].includes(i))throw Error(`'view_mode: ${String(i)}' is not supported here.`);if(t.filter&&a!==void 0&&!ct(t).includes(a))throw Error(`'default_filter: ${String(a)}' is not supported here.`);if(t.systemInfo&&o!==void 0&&typeof o!=`boolean`)throw Error(`'show_system_info' must be true or false.`)}var ft;async function pt(){return customElements.get(`ha-form`)?!0:(ft??=(async()=>{await customElements.get(`hui-button-card`)?.getConfigElement?.()})().catch(()=>void 0).finally(()=>{customElements.get(`ha-form`)||(ft=void 0)}),await ft,!!customElements.get(`ha-form`))}var X=class extends G{static properties={hass:{attribute:!1},_config:{state:!0},_formState:{state:!0}};_shown={};static styles=o`
    .unavailable {
      margin: 0;
      color: var(--secondary-text-color);
    }
  `;constructor(){super(),this._formState=customElements.get(`ha-form`)?`ready`:`loading`}connectedCallback(){super.connectedCallback(),this._formState!==`ready`&&(this._formState=`loading`,pt().then(e=>{this._formState=e?`ready`:`failed`}))}setConfig(e){dt(e),this._config={...e}}_valueChanged(e){if(e.stopPropagation(),!this._config)return;let t={...this._config};for(let[n,r]of Object.entries(e.detail.value))r!==this._shown[n]&&(r===``||r==null?delete t[n]:t[n]=r);this._config=t,K(this,`config-changed`,{config:this._config})}_computeLabel=e=>it[e.name]??e.name;_computeHelper=e=>at[e.name];render(){if(!this._config)return z``;if(this._formState!==`ready`)return z`<p class="unavailable">
        ${this._formState===`loading`?`Loading the editor…`:`The visual editor could not load. Use the code editor, or reopen this card's editor to try again.`}
      </p>`;let e=ut(this._config.type),t={...this._config};for(let{name:n}of e)t[n]===void 0&&n in ot&&(t[n]=ot[n]);return this._shown=t,z`
      <ha-form
        .hass=${this.hass}
        .data=${t}
        .schema=${e}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `}},mt=class extends X{},ht=class extends X{},gt=class extends X{},_t=class extends X{},vt=class extends X{},yt=class extends X{},bt=class extends X{},xt=class extends X{};function St(e,t){if(!customElements.get(e))try{customElements.define(e,t)}catch(n){if(n instanceof Error&&(n.name===`NotSupportedError`||n.message.includes(`already been registered`))){class n extends t{}customElements.define(e,n)}else throw n}}function Z(e){St(e.tag,e.card),St(e.editorTag,e.editor),window.customCards??=[],window.customCards.some(t=>t.type===e.tag)||window.customCards.push({type:e.tag,name:e.name,description:e.description,preview:!0,documentationURL:`https://github.com/tinkerologie/ha-unraid`})}Z({tag:be,editorTag:xe,card:class extends Y{static editorTag=xe;formatUptime(e){if(!e)return`Unknown`;let t=e.trim(),n=0;if(/^\d+(\.\d+)?$/.test(t))n=Math.floor(Number(t));else{let t=new Date(e);if(!isNaN(t.getTime()))n=Math.max(0,Math.floor((Date.now()-t.getTime())/1e3));else return e}let r=Math.floor(n/86400),i=Math.floor(n%86400/3600),a=Math.floor(n%3600/60);return r>0?`${r}d ${i}h`:i>0?`${i}h ${a}m`:`${a}m`}render(){let e=this.getActiveDevice(),t=this.config.title||e?.name_by_user||e?.name||`Unraid Server`,n=this.getEntity(`cpu_usage`),r=this.getEntity(`ram_usage`),i=this.getEntity(`array_usage`),a=this.getEntity(`array_state`),o=this.getEntity(`system_temperature`)||this.getEntity(`temperature_average`),s=this.getEntity(`cpu_power`),c=this.getEntity(`uptime`),l=this.getEntity(`notifications_unread_alert`),u=this.getEntity(`network_interface_ip`),d=this.percentValue(n),f=this.percentValue(r),p=this.percentValue(i),m=a?.state?.toLowerCase()===`started`||a?.state===`Normal`,h=l?.state.trim()?Number(l.state):NaN,g=Number.isFinite(h)&&h>=0?h:null,_=n?.attributes?.cpu_model||(e?.model??`Multi-Core CPU`),v=this.getEntity(`ram_used`),y=v&&Number(v.state)>=0?this.numericStateText(v):void 0,b=this.attributeText(i,[`used`,`capacity_used`]),x=this.attributeText(i,[`total`,`capacity_total`]),S=this.getNetworkInterfaces(),C=S.length>0?S[0]:void 0,w=C?.speed?.state||C?.link?.attributes?.speed_mbps,T=w==null?void 0:Number(w),E=T?T>=1e3?`${T/1e3} Gbps`:`${T} Mbps`:``,D=this.rateText(C?.rx),O=this.rateText(C?.tx),k=D&&O?`↓ ${D} • ↑ ${O}`:E||`Active`,A=this.getBootDiskEntity(),j=A?.attributes,M=j?.used||j?.fs_used,N=j?.total||j?.fs_size,P=j?.device,F=M&&N?`Flash (${M} / ${N})`:P?`Flash (${P})`:`Flash (USB)`,ee=j?.filesystem?`Device: ${P||`USB`} • FS: ${j.filesystem}`:`USB Flash Boot Drive`,I=z`
      <span class="badge ${m?`badge-online`:`badge-standby`}">
        <span class="pulse-dot"></span>
        <span>Array ${this.formatState(a)}</span>
      </span>
      ${g!==null&&g>0?z`
              <span class="badge badge-error">
                ${J(q,13)}
                <span>${g}</span>
              </span>
            `:V}
    `;return z`
      <ha-card>
        ${this.renderHeader(t,`${e?.model||`Unraid OS`} • Up ${this.formatUptime(c?.state)}`,Xe,I)}
        <div class="rings-grid">
          <button
            type="button"
            class="ring-card"
            ?disabled=${!n}
            style="${n?`cursor: pointer;`:``}"
            @click=${()=>n&&this.openMoreInfo(n.entity_id)}
            title="Click to view CPU details"
          >
            <span
              class="ring-gauge"
              style="--pct: ${d??0}; --ring-color: ${d===null?`var(--unraid-border)`:d>80?`var(--unraid-error)`:d>50?`var(--unraid-warning)`:`var(--unraid-online)`}"
            >
              <span class="ring-content">${d===null?`—`:`${d}%`}</span>
            </span>
            <span class="ring-label">CPU Load</span>
            <span class="ring-subtext">
              ${o?.state?`${o.state}°C`:``}${s?.state?` • ${s.state}W`:``}
            </span>
          </button>
          <button
            type="button"
            class="ring-card"
            ?disabled=${!r}
            style="${r?`cursor: pointer;`:``}"
            @click=${()=>r&&this.openMoreInfo(r.entity_id)}
            title="Click to view Memory details"
          >
            <span
              class="ring-gauge"
              style="--pct: ${f??0}; --ring-color: ${f===null?`var(--unraid-border)`:f>85?`var(--unraid-error)`:`var(--unraid-info)`}"
            >
              <span class="ring-content">${f===null?`—`:`${f}%`}</span>
            </span>
            <span class="ring-label">Memory</span>
            <span class="ring-subtext"
              >${y===void 0?f===null?`No data`:`${f}% used`:`${y} used`}</span
            >
          </button>
          <button
            type="button"
            class="ring-card"
            ?disabled=${!i}
            style="${i?`cursor: pointer;`:``}"
            @click=${()=>i&&this.openMoreInfo(i.entity_id)}
            title="Click to view Array storage details"
          >
            <span
              class="ring-gauge"
              style="--pct: ${p??0}; --ring-color: var(--unraid-accent)"
            >
              <span class="ring-content"
                >${p===null?`—`:`${p}%`}</span
              >
            </span>
            <span class="ring-label">Array Storage</span>
            <span class="ring-subtext"
              >${b&&x?`${b} / ${x}`:p===null?`No data`:`${p}% used`}</span
            >
          </button>
        </div>

        ${this.config.show_system_info===!1?V:z`
                <div class="divider"></div>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">Processor</span>
                    <span class="detail-val" title="${_}">${_}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">OS Version</span>
                    <span class="detail-val">${e?.sw_version||`Unraid OS`}</span>
                  </div>
                  <button
                    type="button"
                    class="detail-item"
                    ?disabled=${!c}
                    style="${c?`cursor: pointer;`:``}"
                    @click=${()=>c&&this.openMoreInfo(c.entity_id)}
                    title="Click to view Uptime details"
                  >
                    <span class="detail-label">System Uptime</span>
                    <span class="detail-val"
                      >${this.formatUptime(c?.state)}</span
                    >
                  </button>
                  <button
                    type="button"
                    class="detail-item"
                    ?disabled=${!(C?.rx||u)}
                    style="${C?.rx||u?`cursor: pointer;`:``}"
                    @click=${()=>C?.rx?this.openMoreInfo(C.rx.entity_id):u&&this.openMoreInfo(u.entity_id)}
                    title="Click to view Network details"
                  >
                    <span class="detail-label">Primary Network</span>
                    <span
                      class="detail-val"
                      title="${C?`${C.name} • ${E}`:`Connected`}"
                    >
                      ${C?`${C.name}: `:``}${C?.ip?.state||u?.state||`Connected`}
                    </span>
                  </button>
                  <button
                    type="button"
                    class="detail-item"
                    ?disabled=${!(C?.rx||C?.speed)}
                    style="${C?.rx||C?.speed?`cursor: pointer;`:``}"
                    @click=${()=>C?.rx?this.openMoreInfo(C.rx.entity_id):C?.speed&&this.openMoreInfo(C.speed.entity_id)}
                    title="Click to view Network traffic details"
                  >
                    <span class="detail-label">Network Traffic</span>
                    <span
                      class="detail-val"
                      title="${E?`Link Speed: ${E}`:`Network Speed`}"
                      >${k}</span
                    >
                  </button>
                  <button
                    type="button"
                    class="detail-item"
                    ?disabled=${!A}
                    style="${A?`cursor: pointer;`:``}"
                    @click=${()=>A&&this.openMoreInfo(A.entity_id)}
                    title="Click to view Boot device details"
                  >
                    <span class="detail-label">Boot Device</span>
                    <span class="detail-val" title="${ee}">${F}</span>
                  </button>
                  <button
                    type="button"
                    class="detail-item"
                    ?disabled=${!l}
                    style="${l?`cursor: pointer;`:``}"
                    @click=${()=>l&&this.openMoreInfo(l.entity_id)}
                    title="Click to view Notifications"
                  >
                    <span class="detail-label">System Health</span>
                    <span class="detail-val">
                      ${g===null?l&&[`unknown`,`unavailable`].includes(l.state)?this.formatState(l):`No data`:g===0?`Normal • Healthy`:`${g} Active Alerts`}
                    </span>
                  </button>
                </div>
              `}
      </ha-card>
    `}},editor:mt,name:`Unraid Server Overview Card`,description:`Server metrics, CPU/RAM ring gauges, and hardware health.`});function Ct(e,t){let n=e.trim().replace(/_(usage|temperature|temp|errors|health|spin)(?:_\d+)?$/i,``),r=n.match(/^(?:.*?\s+)?(?:Disk\s+)?([a-zA-Z0-9_-]+)(?:\s+(?:usage|health|temperature|temp|spin|errors))?$/i);if(r&&r[1]){let e=r[1],t=e.match(/^disk[_\s]?(\d+)$/i);if(t)return`Disk ${t[1]}`;if(/^\d+$/.test(e))return`Disk ${e}`;if(e.toLowerCase()===`parity`)return`Parity`;let n=e.match(/^parity[_\s]?(\d+)$/i);return n?`Parity ${n[1]}`:e.toLowerCase()===`cache`?`Cache`:e.toLowerCase().startsWith(`cache_`)?`Cache (${e.slice(6).toUpperCase()})`:e.toLowerCase()===`boot`||e.toLowerCase()===`flash`?`Flash (Boot)`:e.replace(/\b\w/g,e=>e.toUpperCase())}return n||t}function Q(e){let t=(e.split(`.`)[1]||``).replace(/^.*?_disk_/,``).replace(/_(usage|temperature|temp|errors|health|spin)(?:_\d+)?$/i,``).toLowerCase().replace(/_/g,``),n=t.match(/^(?:disk)?(\d+)$/);return n?`disk${n[1]}`:t}Z({tag:Se,editorTag:Ce,card:class extends Y{static editorTag=Ce;getDisks(){let e=this.getEntities(`disk_usage`),t=this.getEntities(`disk_health`,`binary_sensor`).filter(e=>{let t=this.hass?.entities?.[e.entity_id]?.translation_key;if(t===`parity_status`||t===`parity_valid`)return!1;if(t===`disk_health`)return!0;let n=e.entity_id.split(`.`)[1]??``,r=[`device`,`smart_status`,`filesystem`,`spinning`,`standby`].some(t=>{let n=e.attributes[t];return n!=null&&(typeof n!=`string`||!!n.trim())});return n.includes(`_disk_`)||!/(?:^|_)parity_health(?:_\d+)?$/.test(n)||r}),n=this.getEntities(`disk_temperature`),r=this.getEntities(`disk_error_count`),i=this.getEntities(`disk_spin`,`switch`),a=new Map,o=e=>{let t=e.attributes.device;return typeof t==`string`&&t.trim()?t.trim().toLowerCase():void 0},s=new Map,c=new Set;for(let n of[e,t]){let e=new Map;for(let t of n){let n=o(t);if(!n)continue;let r=Q(t.entity_id),i=e.get(n);i!==void 0&&i!==r&&c.add(n),e.set(n,r),s.has(n)||s.set(n,r)}}let l=e=>{let t=o(e);return t&&s.has(t)&&!c.has(t)?`device:${t}`:void 0},u=new Map;for(let n of[...e,...t]){let e=l(n);if(!e)continue;let t=Q(n.entity_id),r=u.get(t)??new Set;r.add(e),u.set(t,r)}let d=e=>{let t=l(e);if(t)return t;let n=Q(e.entity_id),r=o(e),i=u.get(n);return!r&&i?.size===1?i.values().next().value:`token:${n}`},f=new Map;for(let t of e){let e=d(t),n=f.get(e);(!n||this.percentValue(n)===null&&this.percentValue(t)!==null)&&f.set(e,t)}for(let e of f.values()){let t=d(e),n=Ct(e.attributes.friendly_name||Q(e.entity_id),Q(e.entity_id)),r=n.toLowerCase().includes(`parity`),i=n.toLowerCase().includes(`cache`)||n.toLowerCase().includes(`pool`),o=n.toLowerCase().includes(`boot`)||n.toLowerCase().includes(`flash`),s=e.attributes.spin_state===`active`||e.attributes.spinning===!0,c=e.attributes.temperature_celsius??e.attributes.temperature,l=Number(e.attributes.num_errors??0),u=e.attributes.status||`DISK_OK`;a.set(t,{id:t,name:n,isParity:r,isCache:i,isBoot:o,usagePct:this.percentValue(e),temp:c==null?`*`:`${c}°C`,tempNum:typeof c==`number`?c:void 0,errors:l,health:`healthy`,statusText:u,isSpinning:s,freeSpace:this.attributeText(e,[`free`]),totalSpace:this.attributeText(e,[`total`])})}for(let e of t){let t=d(e);if(a.has(t))continue;let n=Q(e.entity_id);if(n.includes(`disabled`)||n.includes(`missing`)||n.includes(`invalid`)||!l(e)&&(u.get(n)?.size??0)>1)continue;let r=Ct(e.attributes.friendly_name||Q(e.entity_id),Q(e.entity_id)),i=r.toLowerCase().includes(`parity`),o=r.toLowerCase().includes(`cache`),s=r.toLowerCase().includes(`boot`),c=e.attributes.spinning===!0||e.attributes.standby!==void 0&&!e.attributes.standby,f=e.attributes.temperature,p=e.attributes.status||`DISK_OK`;a.set(t,{id:t,name:r,isParity:i,isCache:o,isBoot:s,usagePct:null,temp:f==null?`*`:`${f}°C`,tempNum:typeof f==`number`?f:void 0,errors:0,health:e.state===`on`?`error`:`healthy`,statusText:p,isSpinning:c})}for(let e of n){let t=d(e),n=a.get(t);n&&e.state!==`unavailable`&&e.state!==`unknown`&&(n.temp=`${e.state}°C`,n.tempNum=parseFloat(e.state))}for(let e of r){let t=d(e),n=a.get(t);if(n){let t=Number(e.state);isNaN(t)||(n.errors=t)}}for(let e of i){let t=d(e),n=a.get(t);n&&(n.isSpinning=e.state===`on`,n.spinEntityId=e.entity_id)}for(let e of t){let t=d(e),n=a.get(t);n&&(e.attributes.status&&(n.statusText=e.attributes.status),e.attributes.spinning===void 0?e.attributes.standby!==void 0&&(n.isSpinning=!e.attributes.standby):n.isSpinning=!!e.attributes.spinning,e.attributes.temperature!==void 0&&n.temp===`*`&&(n.temp=`${e.attributes.temperature}°C`,n.tempNum=Number(e.attributes.temperature)),e.state===`on`&&(n.health=`error`))}for(let e of a.values()){let t=(e.statusText||``).toUpperCase(),n=t.includes(`ERR`)||t.includes(`WRONG`)||t.includes(`INVALID`)||t.includes(`DSBL`)||t.includes(`FAIL`);e.health=e.health===`error`||n||e.errors>=10?`error`:e.errors>0||e.tempNum!==void 0&&e.tempNum>45?`warning`:`healthy`}return Array.from(a.values()).sort((e,t)=>e.isParity===t.isParity?e.isBoot===t.isBoot?e.isCache===t.isCache?e.name.localeCompare(t.name,void 0,{numeric:!0}):e.isCache?1:-1:e.isBoot?1:-1:e.isParity?-1:1)}isUsable(e){if(!e||!e.state)return!1;let t=e.state.toLowerCase().trim();return t!==`unavailable`&&t!==`unknown`&&t!==`none`&&t!==`--`}getParityViewState(){let e=this.getEntity(`parity_valid`,`binary_sensor`),t=this.getEntity(`parity_check_running`,`binary_sensor`),n=this.getEntity(`parity_status`,`binary_sensor`)??this.getEntity(`parity_status`),r=this.getEntity(`parity_progress`),i=`unknown`;if(this.isUsable(e)){let t=e.state.toLowerCase().trim();t===`off`?i=`valid`:t===`on`&&(i=`invalid`)}else if(this.isUsable(n)){let e=n.state.toLowerCase().trim();if(e===`off`)i=`valid`;else if(e===`on`){let e=String(n.attributes?.status??``).toLowerCase().trim();e!==`running`&&e!==`paused`&&(i=`invalid`)}}let a=`unknown`;if(this.isUsable(t)){let e=t.state.toLowerCase().trim();e===`off`?a=`idle`:e===`on`&&(a=String(t.attributes?.status??``).toLowerCase().trim()===`paused`?`paused`:`running`)}else if(this.isUsable(n)){let e=String(n.attributes?.status??``).toLowerCase().trim();e===`running`?a=`running`:e===`paused`?a=`paused`:n.state.toLowerCase().trim()===`off`&&(a=`idle`)}let o=0;if(this.isUsable(r)){let e=Number(r.state);isNaN(e)||(o=Math.round(e))}return{validity:i,activity:a,progressPct:o}}render(){let e=this.getEntity(`array_usage`),t=this.getEntity(`parity_check`,`switch`),n=this.getEntity(`last_parity_check_date`),r=this.getEntity(`last_parity_check_errors`),i=this.percentValue(e),a=this.attributeText(e,[`used`,`capacity_used`]),o=this.attributeText(e,[`total`,`capacity_total`]),s=this.attributeText(e,[`free`,`capacity_free`]),{validity:c,activity:l,progressPct:u}=this.getParityViewState(),d=l===`running`||l===`paused`,f=`badge-standby`,p=`Parity Status Unknown`,m=Ze;c===`valid`?(f=`badge-online`,p=`Parity Valid`,m=Qe):c===`invalid`&&(f=`badge-warning`,p=`Parity Check Needed`,m=Ze);let h=this.getDisks(),g=z`
      <span class="badge ${f}">
        ${J(m,13)}
        <span>${p}</span>
      </span>
    `,_;_=l===`running`?`Parity Check In Progress (${u}%)`:l===`paused`?`Parity Check Paused (${u}%)`:c===`valid`?`Parity Status: Valid`:c===`invalid`?`Parity Status: Check Needed`:`Parity Status: Unknown`;let v=c===`valid`||d?Le:q,y=c===`valid`||d?`var(--unraid-online)`:`var(--unraid-warning)`,b=this.isUsable(n),x=Number(r?.state),S=this.isUsable(r)&&!isNaN(x)&&x>0,C=``;b?C=`Last check: ${n.state}`:c===`valid`&&(C=`Parity healthy`);let w=S?` • ${r.state} errors`:``,T=!!(C||w);return z`
      <ha-card>
        ${this.renderHeader(this.config.title||`Storage Array & Disks`,`${a??(i===null?`—`:`${i}%`)} used of ${o??`Array`}${s?` (${s} Free)`:``}`,Ue,g)}
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div
            style="display: flex; justify-content: space-between; font-size: var(--ha-font-size-s, 12px); font-weight: var(--ha-font-weight-medium, 500);"
          >
            <span>Array Capacity</span>
            <span>${i===null?`—`:`${i}%`}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${i??0}%;"></div>
          </div>
        </div>
        <div
          class="list-row"
          style="background: color-mix(in srgb, var(--unraid-text) 5%, transparent);"
        >
          <div class="row-left">
            <div style="color: ${y}">${J(v,18)}</div>
            <div style="display: flex; flex-direction: column; min-width: 0;">
              <span
                style="font-weight: var(--ha-font-weight-medium, 500); font-size: var(--ha-font-size-s, 12px);"
              >
                ${_}
              </span>
              ${T?z`
                      <span
                        style="font-size: var(--ha-font-size-s, 12px); color: var(--unraid-subtext);"
                      >
                        ${C}${w}
                      </span>
                    `:V}
            </div>
          </div>
          <div class="row-right">
            ${t?z`
                    <button
                      type="button"
                      class="btn ${d?`btn`:`btn-primary`}"
                      aria-label="${d?`Cancel parity check`:`Check parity now`}"
                      @click=${()=>this.toggleEntity(t.entity_id)}
                    >
                      ${J(d?Ke:qe,20)}
                      <span>${d?`Cancel`:`Check Now`}</span>
                    </button>
                  `:V}
          </div>
        </div>
        <div class="item-list">
          ${h.length>0?h.map(e=>{let t=e.tempNum??parseFloat(e.temp),n=e.isSpinning&&!isNaN(t)&&e.temp!==`*`&&e.temp!==`unavailable`,r=n?t>45?`var(--unraid-error)`:t>36?`var(--unraid-warning)`:`var(--unraid-online)`:`var(--unraid-standby)`,i=n?`${Math.round(t)}°C`:`--`,a=e.health===`healthy`?z`
                          <span
                            class="badge badge-online"
                            style="font-size: var(--ha-font-size-s, 12px); gap: 4px;"
                          >
                            ${J(Le,11)}
                            <span>Healthy</span>
                          </span>
                        `:e.health===`warning`?z`
                            <span
                              class="badge badge-warning"
                              style="font-size: var(--ha-font-size-s, 12px); gap: 4px;"
                            >
                              ${J(q,11)}
                              <span
                                >Warning${e.errors>0?` (${e.errors})`:``}</span
                              >
                            </span>
                          `:z`
                            <span
                              class="badge badge-error"
                              style="font-size: var(--ha-font-size-s, 12px); gap: 4px;"
                            >
                              ${J(q,11)}
                              <span
                                >Error${e.errors>0?` (${e.errors})`:``}</span
                              >
                            </span>
                          `;return z`
                    <div class="list-row">
                      <div class="row-left">
                        ${e.isBoot?z`
                                <span
                                  class="badge badge-online"
                                  style="font-size: var(--ha-font-size-s, 12px); gap: 4px; min-width: 60px; justify-content: center;"
                                  title="USB Flash Boot Drive"
                                >
                                  ${J(et,11)}
                                  <span>Flash</span>
                                </span>
                              `:e.spinEntityId?z`
                                  <button
                                    type="button"
                                    class="badge ${e.isSpinning?`badge-online`:`badge-standby`}"
                                    style="cursor: pointer; border: none;"
                                    title="Spin ${e.isSpinning?`down`:`up`} ${e.name}"
                                    aria-label="Spin ${e.isSpinning?`down`:`up`} ${e.name}"
                                    @click=${()=>this.toggleEntity(e.spinEntityId)}
                                  >
                                    <span
                                      class="status-dot ${e.isSpinning?`online`:`offline`}"
                                    ></span>
                                    <span
                                      >${e.isSpinning?`Active`:`Standby`}</span
                                    >
                                  </button>
                                `:z`
                                  <span
                                    class="badge ${e.isSpinning?`badge-online`:`badge-standby`}"
                                  >
                                    <span
                                      >${e.isSpinning?`Active`:`Standby`}</span
                                    >
                                  </span>
                                `}

                        <span
                          style="font-weight: var(--ha-font-weight-medium, 500); min-width: 75px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                        >
                          ${e.name}
                        </span>
                      </div>

                      <div class="row-right">
                        <span
                          class="badge"
                          style="color: var(--unraid-text); background: color-mix(in srgb, ${e.isBoot?`var(--unraid-subtext)`:r} 12%, transparent); min-width: 44px; justify-content: center;"
                          title="${e.isBoot?`USB Flash Drive`:e.isSpinning?`Temperature: ${i}`:`Disk is in standby`}"
                        >
                          ${e.isBoot?`--`:i}
                        </span>
                        ${a}
                        <div
                          style="display: flex; align-items: center; gap: 6px; width: 85px;"
                        >
                          ${e.isParity?z`
                                  <span
                                    style="font-size: var(--ha-font-size-s, 12px); color: var(--unraid-text); font-weight: 500; font-family: var(--ha-font-family-code, monospace);"
                                  >
                                    Parity
                                  </span>
                                `:z`
                                  <div
                                    class="progress-bar"
                                    style="height: 4px; flex: 1;"
                                  >
                                    <div
                                      class="progress-fill"
                                      style="width: ${e.usagePct??0}%; background: ${e.isBoot?`var(--unraid-warning)`:e.isCache?`var(--unraid-info)`:`var(--unraid-accent)`};"
                                    ></div>
                                  </div>
                                  <span
                                    style="font-size: var(--ha-font-size-s, 12px); font-family: var(--ha-font-family-code, monospace); color: var(--unraid-subtext);"
                                  >
                                    ${e.usagePct===null?`—`:`${e.usagePct}%`}
                                  </span>
                                `}
                        </div>
                      </div>
                    </div>
                  `}):z`<div
                  style="text-align: center; color: var(--unraid-subtext); font-size: var(--ha-font-size-m, 14px); padding: 12px;"
                >
                  No disk devices found
                </div>`}
        </div>
      </ha-card>
    `}},editor:ht,name:`Unraid Storage & Disks Card`,description:`Array capacity, parity checks, and interactive disk tray with spin state controls.`});function wt(e,t){let n=e.trim(),r=n.match(/^(?:.*?\s+)?Share\s+(.+?)(?:\s+usage)?$/i);return r&&r[1]?r[1].trim():(n=n.replace(/\s+usage$/i,``).replace(/_usage$/i,``).replace(/\s+share$/i,``).replace(/_share$/i,``).trim(),n||t)}Z({tag:Ae,editorTag:je,card:class extends Y{static editorTag=je;static properties={...Y.properties,_searchQuery:{state:!0}};constructor(){super(),this._searchQuery=``}getShares(){let e=this.getEntities(`share_usage`),t=[];for(let n of e){let e=(n.entity_id.split(`.`)[1]||``).replace(/^.*?_share_/,``).replace(/_usage$/,``),r=wt(n.attributes.friendly_name||e,e),i=n.attributes.color||``,a=i===`green-on`;t.push({id:e,name:r,entityId:n.entity_id,usagePct:Math.min(100,Math.max(0,Math.round(Number(n.state)||0))),used:n.attributes.used||``,total:n.attributes.total||``,free:n.attributes.free||``,isProtected:a,color:i,allocator:n.attributes.allocator})}return t.sort((e,t)=>e.name.localeCompare(t.name,void 0,{numeric:!0}))}_openMoreInfo(e){K(this,`hass-more-info`,{entityId:e})}render(){let e=this.getShares(),t=this._searchQuery?e.filter(e=>e.name.toLowerCase().includes(this._searchQuery.toLowerCase())):e,n=e.filter(e=>e.isProtected).length,r=e.length-n,i=z`
      <span class="badge ${r===0?`badge-online`:`badge-warning`}">
        ${J(r===0?Qe:Ze,13)}
        <span
          >${n}
          Protected${r>0?` • ${r} Unprotected`:``}</span
        >
      </span>
    `;return z`
      <ha-card>
        ${this.renderHeader(this.config.title||`User Shares`,`${e.length} configured shares`,He,i)}
        ${e.length>4?z`
                <div style="margin-block-end: 4px;">
                  <label for="share-filter">Filter shares</label>
                  <input
                    type="search"
                    id="share-filter"
                    placeholder="Share name"
                    style="
                    width: 100%;
                    padding: 6px 10px;
                    border-radius: 6px;
                    border: 1px solid var(--unraid-control-border);
                    background: color-mix(in srgb, var(--unraid-text) 4%, transparent);
                    color: var(--unraid-text);
                    font-size: var(--ha-font-size-m, 14px);
                    box-sizing: border-box;
                  "
                    .value=${this._searchQuery}
                    @input=${e=>this._searchQuery=e.target.value}
                  />
                </div>
              `:V}
        <div class="sr-only" role="status">
          ${t.length} of ${e.length} shares shown
        </div>
        <div class="item-list">
          ${t.length>0?t.map(e=>{let t=e.usagePct>90?`var(--unraid-error)`:e.usagePct>75?`var(--unraid-warning)`:`var(--unraid-online)`;return z`
                    <button
                      type="button"
                      class="list-row"
                      style="cursor: pointer;"
                      title="Click for details on ${e.name}"
                      @click=${()=>this._openMoreInfo(e.entityId)}
                    >
                      <span class="row-left">
                        <span
                          style="color: ${e.isProtected?`var(--unraid-accent)`:`var(--unraid-warning)`}; display: flex; align-items: center;"
                        >
                          ${J(He,18)}
                        </span>

                        <span
                          style="display: flex; flex-direction: column; min-width: 0;"
                        >
                          <span style="display: flex; align-items: center; gap: 6px;">
                            <span
                              style="font-weight: var(--ha-font-weight-medium, 500); font-size: var(--ha-font-size-m, 14px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                            >
                              ${e.name}
                            </span>
                            <span
                              class="badge ${e.isProtected?`badge-online`:`badge-warning`}"
                              style="font-size: var(--ha-font-size-s, 12px); padding: 1px 6px;"
                              title="${e.isProtected?`Data protected on parity array`:`Data on pool / unprotected storage`}"
                            >
                              ${e.isProtected?`Protected`:`Unprotected`}
                            </span>
                          </span>

                          ${e.used&&e.total?z`<span
                                  style="font-size: var(--ha-font-size-s, 12px); color: var(--unraid-subtext);"
                                  >${e.used} /
                                  ${e.total}${e.free?` • ${e.free} free`:``}</span
                                >`:V}
                        </span>
                      </span>

                      <span class="row-right">
                        <span
                          style="display: flex; align-items: center; gap: 6px; width: 110px;"
                        >
                          <span
                            class="progress-bar"
                            style="height: 6px; flex: 1; display: inline-block;"
                          >
                            <span
                              class="progress-fill"
                              style="width: ${e.usagePct}%; background: ${t}; display: block;"
                            ></span>
                          </span>
                          <span
                            style="font-size: var(--ha-font-size-s, 12px); font-family: var(--ha-font-family-code, monospace); font-weight: var(--ha-font-weight-medium, 500); color: var(--unraid-text); min-width: 32px; text-align: end;"
                          >
                            ${e.usagePct}%
                          </span>
                        </span>
                      </span>
                    </button>
                  `}):z`
                  <div
                    style="text-align: center; color: var(--unraid-subtext); font-size: var(--ha-font-size-m, 14px); padding: 16px;"
                  >
                    ${e.length===0?`No user shares found`:`No shares matching filter`}
                  </div>
                `}
        </div>
      </ha-card>
    `}},editor:gt,name:`Unraid User Shares Card`,description:`User share storage utilization, capacity allocation, and parity protection status.`}),Z({tag:Me,editorTag:Ne,card:class extends Y{static editorTag=Ne;isValidIp(e){return!!e&&![`unavailable`,`unknown`,`none`,`--`].includes(e.toLowerCase().trim())}formatSpeed(e){if(!e)return``;let t=e.toLowerCase().trim();if([`unavailable`,`unknown`,`none`,`--`].includes(t))return``;let n=Number(e);return isNaN(n)?e:n>=1e3?`${n/1e3} Gbps`:`${n} Mbps`}handleMoreInfo(e){e&&K(this,`hass-more-info`,{entityId:e})}render(){let e=this.getActiveDevice(),t=this.config.title||e?.name_by_user||e?.name||`Unraid Server`,n=this.getNetworkInterfaces(),r=this.getEntity(`network_access`),i=r?.attributes,a=i?.LAN_IPv4_ipv4||(r?.state?.startsWith(`http`)?r.state:void 0),o=i?.FQDN_LAN_ipv4,s=n.filter(e=>e.link?.state===`on`||this.isValidIp(e.ip?.state)).length,c=z`
      <span class="badge ${s>0?`badge-online`:`badge-error`}">
        <span class="pulse-dot"></span>
        <span>${s} Connected</span>
      </span>
    `;return z`
      <ha-card>
        ${this.renderHeader(this.config.title||`${t} Network`,`${e?.model||`Unraid`} • ${n.length} Interface${n.length===1?``:`s`}`,We,c)}
        <div class="item-list">
          ${n.length>0?n.map(e=>{let t=e.link?.state===`on`||this.isValidIp(e.ip?.state),n=this.isValidIp(e.ip?.state)?e.ip.state:`--`,r=e.ip?.attributes?.mac_address||e.link?.attributes?.mac_address||``,i=e.link?.attributes?.mtu||e.ip?.attributes?.mtu||void 0,a=e.speed?.state||e.link?.attributes?.speed_mbps,o=this.formatSpeed(a==null?void 0:String(a)),s=this.rateText(e.rx)??`--`,c=this.rateText(e.tx)??`--`,l=e.rx?.attributes?.total_received||``,u=e.tx?.attributes?.total_sent||``,d=e.ip?.entity_id||e.rx?.entity_id||e.link?.entity_id;return z`
                    <button
                      type="button"
                      class="list-row network-row"
                      title="Show details for ${e.displayName}"
                      ?disabled=${!d}
                      style="cursor: pointer; flex-direction: column; align-items: stretch; gap: 8px; padding: 12px 14px;"
                      @click=${()=>this.handleMoreInfo(d)}
                    >
                      <span
                        style="display: flex; align-items: center; justify-content: space-between;"
                      >
                        <span class="row-left" style="gap: 8px;">
                          <span
                            class="badge ${t?`badge-online`:`badge-error`}"
                            style="min-width: 50px; justify-content: center;"
                          >
                            ${J(Be,13)}
                            <span>${e.name}</span>
                          </span>
                          <span
                            style="font-weight: var(--ha-font-weight-medium, 500); font-size: var(--ha-font-size-m, 14px);"
                            dir="ltr"
                          >
                            ${n}
                          </span>
                        </span>

                        <span class="row-right" style="gap: 6px;">
                          ${o?z`
                                  <span
                                    class="badge"
                                    style="color: var(--unraid-text); background: color-mix(in srgb, var(--unraid-info) 12%, transparent); font-weight: var(--ha-font-weight-medium, 500); font-size: var(--ha-font-size-s, 12px);"
                                  >
                                    ${o}
                                  </span>
                                `:V}
                          <span
                            class="badge ${t?`badge-online`:`badge-standby`}"
                            style="font-size: var(--ha-font-size-s, 12px);"
                          >
                            ${t?`Up`:`Down`}
                          </span>
                        </span>
                      </span>
                      <span
                        style="display: flex; align-items: center; justify-content: space-between; font-size: var(--ha-font-size-s, 12px); color: var(--unraid-subtext); border-block-start: 1px solid var(--unraid-border, rgba(255,255,255,0.06)); padding-block-start: 6px;"
                      >
                        <span style="display: flex; align-items: center; gap: 14px;">
                          <span
                            style="display: flex; align-items: center; gap: 4px;"
                            title="${l?`Total Inbound: ${l}`:`Inbound Transfer Rate`}"
                          >
                            <span style="color: var(--unraid-online);"
                              >${J(ze,13)}</span
                            >
                            <span
                              style="font-family: var(--ha-font-family-code, monospace); font-weight: 500;"
                              >${s}</span
                            >
                            ${l?z`<span style="font-size: var(--ha-font-size-s, 12px);">(${l})</span>`:V}
                          </span>

                          <span
                            style="display: flex; align-items: center; gap: 4px;"
                            title="${u?`Total Outbound: ${u}`:`Outbound Transfer Rate`}"
                          >
                            <span style="color: var(--unraid-info);"
                              >${J($e,13)}</span
                            >
                            <span
                              style="font-family: var(--ha-font-family-code, monospace); font-weight: 500;"
                              >${c}</span
                            >
                            ${u?z`<span style="font-size: var(--ha-font-size-s, 12px);">(${u})</span>`:V}
                          </span>
                        </span>

                        <span
                          style="display: flex; align-items: center; gap: 8px; font-size: var(--ha-font-size-s, 12px);"
                        >
                          ${i?z`<span>MTU ${i}</span>`:V}
                          ${r?z`<span style="font-family: var(--ha-font-family-code, monospace);"><bdi dir="ltr">${r}</bdi></span>`:V}
                        </span>
                      </span>
                    </button>
                  `}):z`
                  <div class="empty-state">
                    No network interfaces discovered for this server.
                  </div>
                `}
        </div>

        ${a||o?z`
                <div class="divider"></div>
                <div class="detail-grid">
                  ${a?z`
                          <div class="detail-item">
                            <span class="detail-label">LAN WebGUI</span>
                            <a
                              href="${a}"
                              aria-label="LAN WebGUI (opens in new tab): ${a}"
                              dir="ltr"
                              target="_blank"
                              rel="noreferrer"
                              class="detail-val"
                              style="color: var(--unraid-text); text-decoration: underline;"
                            >
                              ${a}
                            </a>
                          </div>
                        `:V}
                  ${o?z`
                          <div class="detail-item">
                            <span class="detail-label">Remote Access URL</span>
                            <a
                              href="${o}"
                              aria-label="Remote access (opens in new tab): ${o}"
                              dir="ltr"
                              target="_blank"
                              rel="noreferrer"
                              class="detail-val"
                              style="color: var(--unraid-text); text-decoration: underline;"
                            >
                              Connect FQDN
                            </a>
                          </div>
                        `:V}
                </div>
              `:V}
      </ha-card>
    `}},editor:_t,name:`Unraid Network Card`,description:`Network interfaces, link speeds, live throughput, and IP addresses.`});function $(e){let t=e.split(`.`)[1]||``;return t.replace(/^.*?_container_restart_/,``).replace(/^.*?_docker_container_restart_/,``).replace(/^.*?_container_autostart_/,``).replace(/^.*?_docker_container_autostart_/,``).replace(/^.*?_container_update_/,``).replace(/^.*?_docker_container_update_/,``).replace(/^.*?_docker_container_/,``).replace(/^.*?_container_switch_/,``).replace(/^docker_container_/,``).replace(/^container_switch_/,``).replace(/_cpu$/,``).replace(/_memory_usage$/,``).replace(/_memory$/,``).replace(/_docker_container$/,``).replace(/_container_switch$/,``).replace(/^.*?_container_/,``)||t}Z({tag:we,editorTag:Te,card:class extends Y{static editorTag=Te;static properties={...Y.properties,_filter:{state:!0},_viewMode:{state:!0}};constructor(){super(),this._filter=`all`,this._viewMode=`grid`}willUpdate(e){if(super.willUpdate(e),e.has(`config`)&&this.config.view_mode&&e.get(`config`)?.view_mode!==this.config.view_mode&&(this._viewMode=this.config.view_mode),e.has(`config`)&&e.get(`config`)?.default_filter!==this.config.default_filter){let e=this.config.default_filter;this._filter=e&&[`all`,`running`,`paused`,`stopped`,`updates`].includes(e)?e:`all`}}handleToggle(e,t,n){(!t||confirm(`Are you sure you want to stop container "${n}"?`))&&this.toggleEntity(e)}renderPauseControl(e,t){let n=e.isPaused?e.unpause:e.isRunning?e.pause:void 0;if(!n)return V;let r=e.isPaused,i=`${r?`Resume`:`Pause`} ${e.name}`;return z`
      <button
        type="button"
        class=${t===`grid`?`btn-icon`:`btn`}
        title=${i}
        aria-label=${i}
        ?disabled=${!e.isAvailable||n.state===`unavailable`}
        @click=${async t=>{t.stopPropagation(),(r||confirm(`Are you sure you want to pause container "${e.name}"?`))&&await this.pressButton(n.entity_id)}}
      >
        ${J(r?qe:Ke,t===`grid`?20:13)}
        ${t===`list`?z`<span>${r?`Resume`:`Pause`}</span>`:V}
      </button>
    `}getContainers(){let e=this.getEntities(`docker_container_autostart`,`switch`),t=new Set(e.map(e=>e.entity_id)),n=this.getEntities(`docker_container`,`switch`).filter(e=>!t.has(e.entity_id)),r=this.getEntities(`docker_container_restart`,`button`),i=this.getEntities(`docker_container_pause`,`button`),a=this.getEntities(`docker_container_unpause`,`button`),o=this.getEntities(`container_cpu`),s=this.getEntities(`container_memory_usage`),c=this.getEntities(`docker_container_update`,`update`),l=[];for(let t of n){let n=$(t.entity_id),u=this.getWorkloadLabel(t,`container_name`,n,this.config.container_labels),d=t.state===`on`||t.state===`off`,f=t.attributes.status,p=d&&typeof f==`string`&&f.toLowerCase()===`paused`,m=!p&&t.state===`on`,h=!p&&t.state===`off`,g=r.find(e=>$(e.entity_id)===n),_=e.find(e=>$(e.entity_id)===n),v=o.find(e=>$(e.entity_id)===n),y=s.find(e=>$(e.entity_id)===n),b=c.find(e=>$(e.entity_id)===n);l.push({id:n,...u,isRunning:m,isPaused:p,isStopped:h,isAvailable:d,pause:i.find(e=>e.attributes.container_name===t.attributes.container_name&&typeof t.attributes.container_name==`string`),unpause:a.find(e=>e.attributes.container_name===t.attributes.container_name&&typeof t.attributes.container_name==`string`),status:p?`Paused`:m?`Running`:h?`Stopped`:this.formatState(t),switchEntityId:t.entity_id,restartEntityId:g?.entity_id,autostartEntityId:_?.entity_id,cpuPct:v?.state&&Number.isFinite(parseFloat(v.state))?parseFloat(v.state):void 0,cpuText:v&&Number.isFinite(Number(v.state))?this.hass?.formatEntityState?.(v)??`${v.state}%`:void 0,memoryUsage:y&&![`unknown`,`unavailable`].includes(y.state)?this.hass?.formatEntityState?.(y)??`${y.state}${y.attributes.unit_of_measurement?` ${y.attributes.unit_of_measurement}`:``}`:void 0,hasUpdate:b?.state===`on`,updateEntityId:b?.entity_id})}return l.sort((e,t)=>e.isRunning&&!t.isRunning?-1:!e.isRunning&&t.isRunning?1:e.isPaused===t.isPaused?e.name.localeCompare(t.name):e.isPaused?-1:1)}render(){let e=this.getContainers(),t=e.filter(e=>e.isRunning).length,n=e.filter(e=>e.isStopped).length,r=e.filter(e=>e.isPaused).length,i=e.filter(e=>e.hasUpdate).length,a=this.getEntity(`check_container_updates`,`button`),o=e.filter(e=>this._filter===`running`?e.isRunning:this._filter===`stopped`?e.isStopped:this._filter===`paused`?e.isPaused:this._filter!==`updates`||e.hasUpdate),s=z`
      <span class="badge ${t>0?`badge-online`:`badge-standby`}">
        ${t} Running
      </span>
      ${i>0?z`
              <span class="badge badge-warning">
                ${J(q,12)}
                <span>${i} Updates</span>
              </span>
            `:V}
    `;return z`
      <ha-card>
        ${this.renderHeader(this.config.title||`Docker Containers`,`${t} running • ${r} paused • ${n} stopped`,Re,s)}
        <div
          style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;"
        >
          <div class="tab-strip" role="group" aria-label="Container status filter">
            <button
              type="button"
              class="tab-btn ${this._filter===`all`?`active`:``}"
              aria-pressed=${this._filter===`all`}
              @click=${()=>this._filter=`all`}
            >
              All (${e.length})
            </button>
            <button
              type="button"
              class="tab-btn ${this._filter===`running`?`active`:``}"
              aria-pressed=${this._filter===`running`}
              @click=${()=>this._filter=`running`}
            >
              Running (${t})
            </button>
            <button
              type="button"
              class="tab-btn ${this._filter===`paused`?`active`:``}"
              aria-pressed=${this._filter===`paused`}
              @click=${()=>this._filter=`paused`}
            >
              Paused (${r})
            </button>
            <button
              type="button"
              class="tab-btn ${this._filter===`stopped`?`active`:``}"
              aria-pressed=${this._filter===`stopped`}
              @click=${()=>this._filter=`stopped`}
            >
              Stopped (${n})
            </button>
            ${i>0||this._filter===`updates`?z`
                    <button
                      type="button"
                      class="tab-btn ${this._filter===`updates`?`active`:``}"
                      aria-pressed=${this._filter===`updates`}
                      @click=${()=>this._filter=`updates`}
                    >
                      Updates (${i})
                    </button>
                  `:V}
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            ${a?z`
                    <button
                      type="button"
                      class="btn"
                      title="Check for updates"
                      @click=${()=>this.pressButton(a.entity_id)}
                    >
                      Check Updates
                    </button>
                  `:V}
            <button
              type="button"
              class="btn-icon"
              title="Toggle View Mode"
              aria-label="${this._viewMode===`grid`?`Show list view`:`Show grid view`}"
              @click=${()=>this._viewMode=this._viewMode===`grid`?`list`:`grid`}
            >
              ${J(this._viewMode===`grid`?nt:tt,18)}
            </button>
          </div>
        </div>
        ${o.length===0?z`<div class="empty-state" role="status">
                ${e.length===0?`No Docker containers configured`:this._filter===`updates`?`No container updates available`:`No ${this._filter} containers`}
              </div>`:V}
        ${this._viewMode===`grid`?z`
                <div class="container-grid">
                  ${o.map(e=>z`
                      <div class="container-tile">
                        <button
                          type="button"
                          class="tile-main"
                          title="${e.rawName}"
                          aria-label="Show details for ${e.name}, ${e.status}"
                          @click=${()=>this.openMoreInfo(e.switchEntityId)}
                        >
                          <span
                            aria-hidden="true"
                            class="status-dot ${e.isRunning?`online`:e.isPaused?`paused`:`offline`}"
                          ></span>
                          <span class="workload-label">
                            <span class="tile-name" title="${e.rawName}"
                              >${e.name}</span
                            >
                            <span class="workload-status">${e.status}</span>
                          </span>
                        </button>
                        <div style="display: flex; align-items: center; gap: 4px;">
                          ${e.hasUpdate?z`<span style="color: var(--unraid-warning);"
                                  >${J(q,20)}</span
                                >`:V}
                          ${this.renderPauseControl(e,`grid`)}
                          ${e.restartEntityId?z`
                                  <button
                                    type="button"
                                    class="btn-icon"
                                    style="padding: 2px;"
                                    title="Restart ${e.name}"
                                    aria-label="Restart ${e.name}"
                                    ?disabled=${!e.isAvailable||e.isPaused}
                                    @click=${t=>{t.stopPropagation(),this.pressButton(e.restartEntityId)}}
                                  >
                                    ${J(Ye,20)}
                                  </button>
                                `:V}
                          <button
                            type="button"
                            class="btn-icon"
                            style="padding: 4px;"
                            title="${e.isRunning||e.isPaused?`Stop`:`Start`} ${e.name}"
                            aria-label="${e.isRunning||e.isPaused?`Stop`:`Start`} ${e.name}"
                            ?disabled=${!e.isAvailable}
                            @click=${t=>{t.stopPropagation(),this.handleToggle(e.switchEntityId,e.isRunning||e.isPaused,e.name)}}
                          >
                            ${J(Je,20)}
                          </button>
                        </div>
                      </div>
                    `)}
                </div>
              `:z`
                <div class="item-list">
                  ${o.map(e=>z`
                      <div class="list-row">
                        <div class="row-left">
                          <button
                            type="button"
                            class="workload-name-button"
                            title="${e.rawName}"
                            aria-label="Show details for ${e.name}, ${e.status}"
                            @click=${()=>this.openMoreInfo(e.switchEntityId)}
                          >
                            <span
                              aria-hidden="true"
                              class="status-dot ${e.isRunning?`online`:e.isPaused?`paused`:`offline`}"
                            ></span>
                            <span class="workload-label">
                              <span class="tile-name" title="${e.rawName}"
                                >${e.name}</span
                              >
                              <span class="workload-status">${e.status}</span>
                            </span>
                          </button>
                          ${e.cpuPct===void 0?V:z`<span
                                  style="font-size: var(--ha-font-size-s, 12px); color: var(--unraid-subtext);"
                                  >${e.cpuText} CPU</span
                                >`}
                          ${e.memoryUsage?z`<span
                                  style="font-size: var(--ha-font-size-s, 12px); color: var(--unraid-subtext);"
                                  >${e.memoryUsage}</span
                                >`:V}
                        </div>
                        <div class="row-right">
                          ${e.hasUpdate?z`
                                  <span class="badge badge-warning"
                                    >Update Available</span
                                  >
                                `:V}
                          ${this.renderPauseControl(e,`list`)}
                          ${e.restartEntityId?z`
                                  <button
                                    type="button"
                                    class="btn"
                                    style="padding: 3px 8px;"
                                    aria-label="Restart ${e.name}"
                                    ?disabled=${!e.isAvailable||e.isPaused}
                                    @click=${()=>this.pressButton(e.restartEntityId)}
                                  >
                                    ${J(Ye,13)}
                                    <span>Restart</span>
                                  </button>
                                `:V}
                          <button
                            type="button"
                            class="btn ${e.isRunning||e.isPaused?`btn`:`btn-primary`}"
                            style="padding: 3px 8px;"
                            aria-label="${e.isRunning||e.isPaused?`Stop`:`Start`} ${e.name}"
                            ?disabled=${!e.isAvailable}
                            @click=${()=>this.handleToggle(e.switchEntityId,e.isRunning||e.isPaused,e.name)}
                          >
                            ${J(Je,13)}
                            <span>${e.isRunning||e.isPaused?`Stop`:`Start`}</span>
                          </button>
                        </div>
                      </div>
                    `)}
                </div>
              `}
      </ha-card>
    `}},editor:vt,name:`Unraid Docker Containers Card`,description:`Monitor, start, pause, resume, stop, restart, and update Docker containers in grid or list view.`});function Tt(e,t){if(!e||e===`unavailable`||e===`unknown`)return null;let n=e.trim();if(!n)return null;if(/[a-zA-Z]/.test(n))return n.replace(/(\b(?:minute|minutes|hour|hours|sec|second|seconds|min|mins)\b.*)\s+min$/i,`$1`);let r=Number(n);if(Number.isFinite(r)){let e=typeof t?.unit_of_measurement==`string`?t.unit_of_measurement.toLowerCase():``,n=r;n=Math.round(e===`s`||e===`sec`||e===`seconds`?r/60:r);let i=Math.floor(n/60),a=n%60;return i>0?a>0?`${i} hour${i>1?`s`:``} ${a} minute${a>1?`s`:``}`:`${i} hour${i>1?`s`:``}`:`${a} minute${a===1?``:`s`}`}return n}Z({tag:Ee,editorTag:De,card:class extends Y{static editorTag=De;render(){let e=this.getEntity(`ups_status`),t=this.getEntity(`ups_battery`),n=this.getEntity(`ups_load`),r=this.getEntity(`ups_runtime`),i=this.getEntity(`ups_power`),a=this.getEntity(`ups_output_voltage`),o=this.getEntity(`ups_battery_health`),s=!!(e&&e.state!==`unavailable`&&e.state!==`unknown`),c=s&&e?e.state:e?.state||`Unavailable`,l=s&&c.toLowerCase().includes(`online`),u=s&&(c.toLowerCase().includes(`battery`)||c.toLowerCase().includes(`discharge`)),d=!s||c===`Unavailable`||c===`unavailable`,f=this.percentValue(t),p=this.percentValue(n),m=i&&i.state!==`unavailable`&&i.state!==`unknown`&&i?`${i.state} W`:null,h=Tt(r?.state,r?.attributes),g=a&&a.state!==`unavailable`&&a.state!==`unknown`&&a?`${a.state} V`:null,_=o&&o.state!==`unavailable`&&o.state!==`unknown`&&o?o.state:null,v=z`
      <span
        class="badge ${d?`badge-standby`:l?`badge-online`:u?`badge-warning`:`badge-error`}"
      >
        ${d?V:z`<span class="pulse-dot"></span>`}
        <span>${d?`Unavailable`:c}</span>
      </span>
    `;return z`
      <ha-card>
        ${this.renderHeader(this.config.title||`UPS Power & Battery`,e?.attributes?.model||`Uninterruptible Power Supply`,Ve,v)}
        <div class="rings-grid two">
          <button
            type="button"
            class="ring-card"
            ?disabled=${!t}
            style="${t?`cursor: pointer;`:``}"
            @click=${()=>t&&this.openMoreInfo(t.entity_id)}
            title="Click to view Battery details"
          >
            <span
              class="ring-gauge"
              style="--pct: ${f??0}; --ring-color: ${f===null?`var(--unraid-border)`:f<20?`var(--unraid-error)`:f<50?`var(--unraid-warning)`:`var(--unraid-online)`}"
            >
              <span class="ring-content"
                >${f===null?`—`:`${f}%`}</span
              >
            </span>
            <span class="ring-label">Battery Level</span>
            <span class="ring-subtext"
              >${h?`${h} left`:f===null?`No Data`:`Healthy`}</span
            >
          </button>
          <button
            type="button"
            class="ring-card"
            ?disabled=${!n}
            style="${n?`cursor: pointer;`:``}"
            @click=${()=>n&&this.openMoreInfo(n.entity_id)}
            title="Click to view Load details"
          >
            <span
              class="ring-gauge"
              style="--pct: ${p??0}; --ring-color: ${p===null?`var(--unraid-border)`:p>80?`var(--unraid-error)`:p>50?`var(--unraid-warning)`:`var(--unraid-info)`}"
            >
              <span class="ring-content"
                >${p===null?`—`:`${p}%`}</span
              >
            </span>
            <span class="ring-label">UPS Load</span>
            <span class="ring-subtext"
              >${m||(p===null?`No Data`:`${p}% capacity`)}</span
            >
          </button>
        </div>

        <div class="divider"></div>
        <div class="detail-grid">
          <button
            type="button"
            class="detail-item"
            ?disabled=${!r}
            style="${r?`cursor: pointer;`:``}"
            @click=${()=>r&&this.openMoreInfo(r.entity_id)}
            title="Click to view Runtime details"
          >
            <span class="detail-label">Runtime Remaining</span>
            <span class="detail-val">${h||`—`}</span>
          </button>
          <button
            type="button"
            class="detail-item"
            ?disabled=${!i}
            style="${i?`cursor: pointer;`:``}"
            @click=${()=>i&&this.openMoreInfo(i.entity_id)}
            title="Click to view Power details"
          >
            <span class="detail-label">Power Consumption</span>
            <span class="detail-val">${m||`—`}</span>
          </button>
          <button
            type="button"
            class="detail-item"
            ?disabled=${!a}
            style="${a?`cursor: pointer;`:``}"
            @click=${()=>a&&this.openMoreInfo(a.entity_id)}
            title="Click to view Voltage details"
          >
            <span class="detail-label">Output Voltage</span>
            <span class="detail-val">${g||`—`}</span>
          </button>
          <button
            type="button"
            class="detail-item"
            ?disabled=${!o}
            style="${o?`cursor: pointer;`:``}"
            @click=${()=>o&&this.openMoreInfo(o.entity_id)}
            title="Click to view Battery Health details"
          >
            <span class="detail-label">Battery Health</span>
            <span class="detail-val">${_||`—`}</span>
          </button>
        </div>
      </ha-card>
    `}},editor:yt,name:`Unraid Power & UPS Card`,description:`Monitor UPS battery level, power draw in Watts, load %, and estimated runtime.`});function Et(e){let t=e.split(`.`)[1]||``;return t.replace(/^.*?_vm_reboot_/,``).replace(/^vm_reboot_/,``).replace(/^.*?_virtual_machine_status_/,``).replace(/^virtual_machine_status_/,``).replace(/^.*?_virtual_machine_/,``).replace(/^virtual_machine_/,``).replace(/_status$/,``).replace(/_virtual_machine$/,``)||t}Z({tag:Oe,editorTag:ke,card:class extends Y{static editorTag=ke;static properties={...Y.properties,_filter:{state:!0}};constructor(){super(),this._filter=`all`}willUpdate(e){if(super.willUpdate(e),e.has(`config`)&&e.get(`config`)?.default_filter!==this.config.default_filter){let e=this.config.default_filter;this._filter=e===`running`||e===`stopped`?e:`all`}}handleToggle(e,t,n){(!t||confirm(`Are you sure you want to shut down virtual machine "${n}"?`))&&this.toggleEntity(e)}getVms(){let e=this.getEntities(`virtual_machine`,`switch`),t=this.getEntities(`virtual_machine_status`,`sensor`),n=this.getEntities(`vm_reboot`,`button`),r=[];for(let i of e){let e=Et(i.entity_id),a=this.getWorkloadLabel(i,`vm_name`,e,this.config.vm_labels),o=i.state===`on`,s=i.state===`off`,c=t.find(t=>Et(t.entity_id)===e),l=c?this.formatState(c):o?`Running`:s?`Stopped`:this.formatState(i),u=n.find(t=>Et(t.entity_id)===e);r.push({id:e,...a,isRunning:o,isStopped:s,status:l,switchEntityId:i.entity_id,rebootEntityId:u?.entity_id})}return r.sort((e,t)=>e.isRunning&&!t.isRunning?-1:!e.isRunning&&t.isRunning?1:e.name.localeCompare(t.name))}render(){let e=this.getVms(),t=e.filter(e=>e.isRunning).length,n=e.filter(e=>e.isStopped).length,r=e.filter(e=>this._filter===`running`?e.isRunning:this._filter!==`stopped`||e.isStopped),i=z`
      <span class="badge ${t>0?`badge-online`:`badge-standby`}">
        ${t} Running
      </span>
    `;return z`
      <ha-card>
        ${this.renderHeader(this.config.title||`Virtual Machines`,`${t} running of ${e.length} VMs`,Ge,i)}

        <div class="tab-strip" role="group" aria-label="Virtual machine status filter">
          <button
            type="button"
            class="tab-btn ${this._filter===`all`?`active`:``}"
            aria-pressed=${this._filter===`all`}
            @click=${()=>this._filter=`all`}
          >
            All (${e.length})
          </button>
          <button
            type="button"
            class="tab-btn ${this._filter===`running`?`active`:``}"
            aria-pressed=${this._filter===`running`}
            @click=${()=>this._filter=`running`}
          >
            Running (${t})
          </button>
          <button
            type="button"
            class="tab-btn ${this._filter===`stopped`?`active`:``}"
            aria-pressed=${this._filter===`stopped`}
            @click=${()=>this._filter=`stopped`}
          >
            Stopped (${n})
          </button>
        </div>

        <div class="item-list">
          ${r.length>0?r.map(e=>z`
                    <div class="list-row">
                      <div class="row-left">
                        <button
                          type="button"
                          class="workload-name-button"
                          title="${e.rawName}"
                          aria-label="Show details for ${e.name}, ${e.status}"
                          @click=${()=>this.openMoreInfo(e.switchEntityId)}
                        >
                          <span
                            aria-hidden="true"
                            class="status-dot ${e.isRunning?`online`:`offline`}"
                          ></span>
                          <span class="workload-label">
                            <span class="vm-name" title="${e.rawName}">${e.name}</span>
                            <span class="workload-status">${e.status}</span>
                          </span>
                        </button>
                      </div>
                      <div class="row-right">
                        ${e.rebootEntityId?z`
                                <button
                                  type="button"
                                  class="btn"
                                  style="padding: 3px 8px;"
                                  title="Reboot ${e.name}"
                                  aria-label="Reboot ${e.name}"
                                  ?disabled=${!e.isRunning}
                                  @click=${()=>this.pressButton(e.rebootEntityId)}
                                >
                                  ${J(Ye,13)}
                                  <span>Reboot</span>
                                </button>
                              `:V}
                        <button
                          type="button"
                          class="btn ${e.isRunning?`btn`:`btn-primary`}"
                          style="padding: 3px 8px;"
                          aria-label="${e.isRunning?`Stop`:`Start`} ${e.name}"
                          ?disabled=${!e.isRunning&&!e.isStopped}
                          @click=${()=>this.handleToggle(e.switchEntityId,e.isRunning,e.name)}
                        >
                          ${J(Je,13)}
                          <span>${e.isRunning?`Stop`:`Start`}</span>
                        </button>
                      </div>
                    </div>
                  `):z`<div class="empty-state" role="status">
                  ${e.length===0?`No virtual machines configured`:`No ${this._filter} virtual machines`}
                </div>`}
        </div>
      </ha-card>
    `}},editor:bt,name:`Unraid Virtual Machines Card`,description:`Monitor and manage Unraid virtual machines.`});var Dt=[{id:`overview`,label:`Overview`,icon:Xe},{id:`storage`,label:`Storage & Disks`,icon:Ue},{id:`shares`,label:`Shares`,icon:He},{id:`network`,label:`Network`,icon:We},{id:`docker`,label:`Docker`,icon:Re},{id:`ups`,label:`UPS Power`,icon:Ve},{id:`vms`,label:`VMs`,icon:Ge}];Z({tag:Pe,editorTag:Fe,card:class extends Y{static editorTag=Fe;static properties={...Y.properties,_activeTab:{state:!0}};constructor(){super(),this._activeTab=`overview`}renderActivePanel(){let e={...this.config,embedded:!0};switch(this._activeTab){case`overview`:return z`<unraid-server-card
          .hass=${this.hass}
          .config=${{...e,type:`custom:unraid-server-card`}}
        ></unraid-server-card>`;case`storage`:return z`<unraid-storage-card
          .hass=${this.hass}
          .config=${{...e,type:`custom:unraid-storage-card`}}
        ></unraid-storage-card>`;case`shares`:return z`<unraid-shares-card
          .hass=${this.hass}
          .config=${{...e,type:`custom:unraid-shares-card`}}
        ></unraid-shares-card>`;case`network`:return z`<unraid-network-card
          .hass=${this.hass}
          .config=${{...e,type:`custom:unraid-network-card`}}
        ></unraid-network-card>`;case`docker`:return z`<unraid-docker-card
          .hass=${this.hass}
          .config=${{...e,type:`custom:unraid-docker-card`}}
        ></unraid-docker-card>`;case`ups`:return z`<unraid-ups-card
          .hass=${this.hass}
          .config=${{...e,type:`custom:unraid-ups-card`}}
        ></unraid-ups-card>`;case`vms`:return z`<unraid-vm-card
          .hass=${this.hass}
          .config=${{...e,type:`custom:unraid-vm-card`}}
        ></unraid-vm-card>`}}render(){let e=this.getActiveDevice(),t=this.config.title||e?.name_by_user||e?.name||`Unraid Server`;return z`
      <ha-card>
        <div class="header">
          <div class="header-main">
            <div class="header-icon">${J(Xe,22)}</div>
            <div class="header-titles">
              <h2 class="header-title">${t} Dashboard</h2>
              <span class="header-subtitle">Unified Unraid Control Center</span>
            </div>
          </div>
        </div>
        <div
          class="tab-strip"
          role="tablist"
          aria-label="Unraid sections"
          @keydown=${this.handleTabKeydown}
        >
          ${Dt.map(e=>z` <button
                type="button"
                role="tab"
                id="tab-${e.id}"
                class="tab-btn ${this._activeTab===e.id?`active`:``}"
                aria-selected=${this._activeTab===e.id}
                aria-controls="panel-${e.id}"
                .tabIndex=${this._activeTab===e.id?0:-1}
                @click=${t=>{this._activeTab=e.id;for(let e of this.renderRoot.querySelectorAll(`button[role="tab"]`))e.tabIndex=e===t.currentTarget?0:-1;t.currentTarget.scrollIntoView({block:`nearest`,inline:`nearest`})}}
              >
                ${J(e.icon,20)} ${e.label}
              </button>`)}
        </div>
        ${Dt.map(e=>z` <div
              role="tabpanel"
              id="panel-${e.id}"
              aria-labelledby="tab-${e.id}"
              tabindex="0"
              ?hidden=${this._activeTab!==e.id}
            >
              ${this._activeTab===e.id?this.renderActivePanel():V}
            </div>`)}
      </ha-card>
    `}},editor:xt,name:`Unraid Unified Dashboard Card`,description:`All-in-one Unraid master card with tabbed overview, storage, docker, UPS, and VM monitoring.`});
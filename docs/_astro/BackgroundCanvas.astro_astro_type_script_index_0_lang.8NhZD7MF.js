const u=document.querySelector("[data-bg-canvas]");if(u){const e=u.getContext("webgl",{antialias:!1,premultipliedAlpha:!1})||u.getContext("experimental-webgl");if(!e)u.style.display="none";else{const B=`
        attribute vec2 aPos;
        void main() {
          gl_Position = vec4(aPos, 0.0, 1.0);
        }
      `,O=`
        precision highp float;

        uniform vec2 uResolution;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uMouseAct;
        uniform vec3 uC0;
        uniform vec3 uC1;
        uniform vec3 uC2;
        uniform vec3 uAccent;
        uniform vec3 uLight;
        uniform float uPx;
        // Up to 5 concurrent ripples: xy = origin (UV), z = age in seconds (<0 = inactive), w = scale.
        uniform vec4 uRipples[5];
        const float RIPPLE_LIFE = 0.5;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float vnoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float amp = 0.55;
          for (int i = 0; i < 4; i++) {
            v += amp * vnoise(p);
            p *= 2.05;
            amp *= 0.5;
          }
          return v;
        }

        void main() {
          // Quantize to uPx grid (in physical pixels)
          vec2 px = floor(gl_FragCoord.xy / uPx) * uPx + uPx * 0.5;
          vec2 uv = px / uResolution.xy;

          vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
          vec2 muv = uMouse;
          float d = length((uv - muv) * aspect);
          float mouseField = smoothstep(0.5, 0.0, d) * uMouseAct;

          float t = uTime * 0.12;
          float n = fbm(uv * 1.8 + vec2(t, -t * 0.7));
          n = mix(n, fbm(uv * 4.0 + vec2(-t * 0.6, t * 0.4)), 0.45);

          // Slight mouse-driven shimmer to evoke a "loading" feel
          n += mouseField * 0.10 * (vnoise(uv * 22.0 + uTime * 0.6) - 0.5);

          float k = smoothstep(0.18, 0.82, n);
          vec3 col = mix(uC0, uC1, k);
          col = mix(col, uC2, smoothstep(0.50, 1.0, n) * 0.65);

          // Mouse → luminosity shift (toward white in light, toward black in dark)
          col = mix(col, uLight, mouseField * 0.55);

          // --- Ripples (click + ambient random) ---
          float ripple = 0.0;
          for (int i = 0; i < 5; i++) {
            vec4 r = uRipples[i];
            if (r.z >= 0.0 && r.z < RIPPLE_LIFE) {
              float age = r.z / RIPPLE_LIFE;            // 0..1
              float fade = 1.0 - age;                    // fades over the lifetime
              float ease = 1.0 - pow(1.0 - age, 2.0);    // ease-out for radius growth
              float sc = max(r.w, 0.001);
              float radius = ease * 0.32 * sc;
              float dr = length((uv - r.xy) * aspect);

              // Expanding ring (the wave)
              float thickness = (0.03 + age * 0.04) * sc;
              float ring = smoothstep(thickness, 0.0, abs(dr - radius));

              // Central impact flash (decays quickly)
              float impact = smoothstep(0.05 * sc, 0.0, dr) * pow(1.0 - age, 3.0);

              ripple += max(ring, impact) * fade;
            }
          }
          ripple = clamp(ripple, 0.0, 1.0);
          // Ripple uses the inverse luminosity of the mouse field:
          // dark splash on light theme, bright splash on dark theme.
          vec3 rippleColor = vec3(1.0) - uLight;
          col = mix(col, rippleColor, ripple * 0.25);

          gl_FragColor = vec4(col, 1.0);
        }
      `,P=(t,i)=>{const o=e.createShader(t);return e.shaderSource(o,i),e.compileShader(o),e.getShaderParameter(o,e.COMPILE_STATUS)||console.warn("BG shader compile error:",e.getShaderInfoLog(o)),o},r=e.createProgram();e.attachShader(r,P(e.VERTEX_SHADER,B)),e.attachShader(r,P(e.FRAGMENT_SHADER,O)),e.linkProgram(r),e.useProgram(r);const H=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,H),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW);const y=e.getAttribLocation(r,"aPos");e.enableVertexAttribArray(y),e.vertexAttribPointer(y,2,e.FLOAT,!1,0,0);const c={resolution:e.getUniformLocation(r,"uResolution"),time:e.getUniformLocation(r,"uTime"),mouse:e.getUniformLocation(r,"uMouse"),mouseAct:e.getUniformLocation(r,"uMouseAct"),c0:e.getUniformLocation(r,"uC0"),c1:e.getUniformLocation(r,"uC1"),c2:e.getUniformLocation(r,"uC2"),accent:e.getUniformLocation(r,"uAccent"),light:e.getUniformLocation(r,"uLight"),px:e.getUniformLocation(r,"uPx"),ripples:e.getUniformLocation(r,"uRipples")},v=t=>{if(t=t.trim(),t.startsWith("#")){const o=t.slice(1),n=o.length===3?[o[0]+o[0],o[1]+o[1],o[2]+o[2]]:[o.slice(0,2),o.slice(2,4),o.slice(4,6)];return[parseInt(n[0],16)/255,parseInt(n[1],16)/255,parseInt(n[2],16)/255]}const i=t.match(/rgba?\(([^)]+)\)/);if(i){const o=i[1].split(",").map(n=>parseFloat(n.trim()));return[o[0]/255,o[1]/255,o[2]/255]}return[0,0,0]},w=t=>getComputedStyle(document.documentElement).getPropertyValue(t),R=(t,i,o)=>[t[0]*(1-o)+i[0]*o,t[1]*(1-o)+i[1]*o,t[2]*(1-o)+i[2]*o],l={c0:[0,0,0],c1:[0,0,0],c2:[0,0,0],accent:[1,0,0],light:[1,1,1]},E=()=>{const t=v(w("--bg")),i=v(w("--ink")),o=v(w("--accent")),n=document.documentElement.dataset.theme||"light",f=n==="dark"?.16:.22,a=n==="dark"?.34:.42;l.c0=t,l.c1=R(t,i,f),l.c2=R(t,i,a),l.accent=o,l.light=n==="dark"?[0,0,0]:[1,1,1]};E(),new MutationObserver(t=>{for(const i of t)i.attributeName==="data-theme"&&E()}).observe(document.documentElement,{attributes:!0});const V=1;let p=0,h=0;const M=()=>{p=window.innerWidth,h=window.innerHeight,u.width=p,u.height=h,u.style.width=p+"px",u.style.height=h+"px",e.viewport(0,0,p,h)};M(),window.addEventListener("resize",M);let x=.5,A=.5,k=.5,F=.5,L=0,S=0;const W=t=>{k=t.clientX/window.innerWidth,F=1-t.clientY/window.innerHeight,S=performance.now()};window.addEventListener("pointermove",W,{passive:!0});const D=.5,C=5,s=Array.from({length:C},()=>({x:0,y:0,age:-1,scale:1})),d=new Float32Array(C*4),I=(t,i,o)=>{let n=0,f=s[0].age;for(let a=1;a<s.length;a++){if(s[a].age<0){n=a;break}s[a].age>f&&(f=s[a].age,n=a)}s[n].x=t,s[n].y=i,s[n].age=0,s[n].scale=o};window.addEventListener("pointerdown",t=>{const i=.9+Math.random()*.25;I(t.clientX/window.innerWidth,1-t.clientY/window.innerHeight,i)});let U=performance.now()+800+Math.random()*1200;const X=()=>{const t=.06+Math.random()*.88,i=.06+Math.random()*.88,o=.25+Math.random()*1.05;I(t,i,o)},_=performance.now();let T=_,z=0,g=!0;const b=()=>{if(!g)return;z=requestAnimationFrame(b);const t=performance.now(),i=(t-_)/1e3,o=Math.min(.05,(t-T)/1e3);T=t,x+=(k-x)*.08,A+=(F-A)*.08;const n=t-S,f=n<120?1:Math.max(0,1-(n-120)/1400);L+=(f-L)*.08,t>=U&&(X(),U=t+700+Math.random()*2300);for(let a=0;a<s.length;a++){const m=s[a];m.age>=0&&(m.age+=o,m.age>=D&&(m.age=-1)),d[a*4]=m.x,d[a*4+1]=m.y,d[a*4+2]=m.age,d[a*4+3]=m.scale}e.uniform2f(c.resolution,p,h),e.uniform1f(c.time,i),e.uniform2f(c.mouse,x,A),e.uniform1f(c.mouseAct,L),e.uniform3fv(c.c0,l.c0),e.uniform3fv(c.c1,l.c1),e.uniform3fv(c.c2,l.c2),e.uniform3fv(c.accent,l.accent),e.uniform3fv(c.light,l.light),e.uniform1f(c.px,V),e.uniform4fv(c.ripples,d),e.drawArrays(e.TRIANGLE_STRIP,0,4)};b(),document.addEventListener("visibilitychange",()=>{document.hidden?(g=!1,cancelAnimationFrame(z)):g||(g=!0,b())})}}

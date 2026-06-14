const f=document.querySelector("[data-bg-canvas]");if(f){const e=f.getContext("webgl",{antialias:!1,premultipliedAlpha:!1})||f.getContext("experimental-webgl");if(!e)f.style.display="none";else{const z=`
        attribute vec2 aPos;
        void main() {
          gl_Position = vec4(aPos, 0.0, 1.0);
        }
      `,B=`
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

        float hash13(vec3 p3) {
          p3 = fract(p3 * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
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

        float gaussianNoise(vec2 p, float frame) {
          float g = 0.0;
          vec2 q = floor(p);
          g += hash13(vec3(q + vec2(17.0, 43.0), frame + 1.0));
          g += hash13(vec3(q + vec2(71.0, 113.0), frame + 2.0));
          g += hash13(vec3(q + vec2(157.0, 191.0), frame + 3.0));
          g += hash13(vec3(q + vec2(233.0, 281.0), frame + 4.0));
          g += hash13(vec3(q + vec2(337.0, 389.0), frame + 5.0));
          g += hash13(vec3(q + vec2(431.0, 487.0), frame + 6.0));
          return (g / 6.0 - 0.5) * 2.0;
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
          // Multiply the water-drop mask over the generated background texture.
          vec3 dropBlend = mix(vec3(0.36), vec3(0.72), uLight.r);
          col = mix(col, col * dropBlend, ripple * 0.78);

          // Final monochrome gaussian film grain, layered above every effect.
          float grainFrame = floor(uTime * 24.0);
          float grain = gaussianNoise(gl_FragCoord.xy, grainFrame);
          col = clamp(col + vec3(grain * 0.055), 0.0, 1.0);

          gl_FragColor = vec4(col, 1.0);
        }
      `,b=(t,a)=>{const o=e.createShader(t);return e.shaderSource(o,a),e.compileShader(o),e.getShaderParameter(o,e.COMPILE_STATUS)||console.warn("BG shader compile error:",e.getShaderInfoLog(o)),o},r=e.createProgram();e.attachShader(r,b(e.VERTEX_SHADER,z)),e.attachShader(r,b(e.FRAGMENT_SHADER,B)),e.linkProgram(r),e.useProgram(r);const O=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,O),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW);const P=e.getAttribLocation(r,"aPos");e.enableVertexAttribArray(P),e.vertexAttribPointer(P,2,e.FLOAT,!1,0,0);const c={resolution:e.getUniformLocation(r,"uResolution"),time:e.getUniformLocation(r,"uTime"),mouse:e.getUniformLocation(r,"uMouse"),mouseAct:e.getUniformLocation(r,"uMouseAct"),c0:e.getUniformLocation(r,"uC0"),c1:e.getUniformLocation(r,"uC1"),c2:e.getUniformLocation(r,"uC2"),accent:e.getUniformLocation(r,"uAccent"),light:e.getUniformLocation(r,"uLight"),px:e.getUniformLocation(r,"uPx"),ripples:e.getUniformLocation(r,"uRipples")},v=t=>{if(t=t.trim(),t.startsWith("#")){const o=t.slice(1),n=o.length===3?[o[0]+o[0],o[1]+o[1],o[2]+o[2]]:[o.slice(0,2),o.slice(2,4),o.slice(4,6)];return[parseInt(n[0],16)/255,parseInt(n[1],16)/255,parseInt(n[2],16)/255]}const a=t.match(/rgba?\(([^)]+)\)/);if(a){const o=a[1].split(",").map(n=>parseFloat(n.trim()));return[o[0]/255,o[1]/255,o[2]/255]}return[0,0,0]},x=t=>getComputedStyle(document.documentElement).getPropertyValue(t),E=(t,a,o)=>[t[0]*(1-o)+a[0]*o,t[1]*(1-o)+a[1]*o,t[2]*(1-o)+a[2]*o],l={c0:[0,0,0],c1:[0,0,0],c2:[0,0,0],accent:[1,0,0],light:[1,1,1]},R=()=>{const t=v(x("--bg")),a=v(x("--ink")),o=v(x("--accent")),n=document.documentElement.dataset.theme||"light",u=n==="dark"?.26:.32,i=n==="dark"?.58:.64;l.c0=t,l.c1=E(t,a,u),l.c2=E(t,a,i),l.accent=o,l.light=n==="dark"?[0,0,0]:[1,1,1]};R(),new MutationObserver(t=>{for(const a of t)a.attributeName==="data-theme"&&R()}).observe(document.documentElement,{attributes:!0});const H=1;let p=0,g=0;const F=()=>{p=window.innerWidth,g=window.innerHeight,f.width=p,f.height=g,f.style.width=p+"px",f.style.height=g+"px",e.viewport(0,0,p,g)};F(),window.addEventListener("resize",F);let w=.5,y=.5,M=.5,k=.5,A=0,S=0;const N=t=>{M=t.clientX/window.innerWidth,k=1-t.clientY/window.innerHeight,S=performance.now()};window.addEventListener("pointermove",N,{passive:!0});const V=.5,C=5,s=Array.from({length:C},()=>({x:0,y:0,age:-1,scale:1})),h=new Float32Array(C*4),I=(t,a,o)=>{let n=0,u=s[0].age;for(let i=1;i<s.length;i++){if(s[i].age<0){n=i;break}s[i].age>u&&(u=s[i].age,n=i)}s[n].x=t,s[n].y=a,s[n].age=0,s[n].scale=o};window.addEventListener("pointerdown",t=>{const a=.9+Math.random()*.25;I(t.clientX/window.innerWidth,1-t.clientY/window.innerHeight,a)});let _=performance.now()+800+Math.random()*1200;const W=()=>{const t=.06+Math.random()*.88,a=.06+Math.random()*.88,o=.25+Math.random()*1.05;I(t,a,o)},U=performance.now();let T=U,q=0,d=!0;const L=()=>{if(!d)return;q=requestAnimationFrame(L);const t=performance.now(),a=(t-U)/1e3,o=Math.min(.05,(t-T)/1e3);T=t,w+=(M-w)*.08,y+=(k-y)*.08;const n=t-S,u=n<120?1:Math.max(0,1-(n-120)/1400);A+=(u-A)*.08,t>=_&&(W(),_=t+700+Math.random()*2300);for(let i=0;i<s.length;i++){const m=s[i];m.age>=0&&(m.age+=o,m.age>=V&&(m.age=-1)),h[i*4]=m.x,h[i*4+1]=m.y,h[i*4+2]=m.age,h[i*4+3]=m.scale}e.uniform2f(c.resolution,p,g),e.uniform1f(c.time,a),e.uniform2f(c.mouse,w,y),e.uniform1f(c.mouseAct,A),e.uniform3fv(c.c0,l.c0),e.uniform3fv(c.c1,l.c1),e.uniform3fv(c.c2,l.c2),e.uniform3fv(c.accent,l.accent),e.uniform3fv(c.light,l.light),e.uniform1f(c.px,H),e.uniform4fv(c.ripples,h),e.drawArrays(e.TRIANGLE_STRIP,0,4)};L(),document.addEventListener("visibilitychange",()=>{document.hidden?(d=!1,cancelAnimationFrame(q)):d||(d=!0,L())})}}

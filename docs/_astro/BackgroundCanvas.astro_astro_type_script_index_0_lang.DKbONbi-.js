const m=document.querySelector("[data-bg-canvas]");if(m){const e=m.getContext("webgl",{antialias:!1,premultipliedAlpha:!1})||m.getContext("experimental-webgl");if(!e)m.style.display="none";else{const _=`
        attribute vec2 aPos;
        void main() {
          gl_Position = vec4(aPos, 0.0, 1.0);
        }
      `,T=`
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
        // Up to 3 concurrent ripples: xy = origin (UV), z = age in seconds (<0 = inactive).
        uniform vec3 uRipples[3];
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

          float t = uTime * 0.045;
          float n = fbm(uv * 1.8 + vec2(t, -t * 0.7));
          n = mix(n, fbm(uv * 4.0 + vec2(-t * 0.6, t * 0.4)), 0.45);

          // Slight mouse-driven shimmer to evoke a "loading" feel
          n += mouseField * 0.10 * (vnoise(uv * 22.0 + uTime * 0.6) - 0.5);

          float k = smoothstep(0.15, 0.90, n);
          vec3 col = mix(uC0, uC1, k);
          col = mix(col, uC2, smoothstep(0.55, 1.0, n) * 0.40);

          // Mouse → luminosity shift (toward white in light, toward black in dark)
          col = mix(col, uLight, mouseField * 0.55);

          // --- Click ripples ---
          float ripple = 0.0;
          for (int i = 0; i < 3; i++) {
            vec3 r = uRipples[i];
            if (r.z >= 0.0 && r.z < RIPPLE_LIFE) {
              float age = r.z / RIPPLE_LIFE;            // 0..1
              float fade = 1.0 - age;                    // fades over the lifetime
              float ease = 1.0 - pow(1.0 - age, 2.0);    // ease-out for radius growth
              float radius = ease * 0.95;
              float dr = length((uv - r.xy) * aspect);

              // Expanding ring (the wave)
              float thickness = 0.07 + age * 0.10;
              float ring = smoothstep(thickness, 0.0, abs(dr - radius));

              // Central impact flash (decays quickly)
              float impact = smoothstep(0.10, 0.0, dr) * pow(1.0 - age, 3.0);

              ripple += max(ring, impact) * fade;
            }
          }
          ripple = clamp(ripple, 0.0, 1.0);
          col = mix(col, uLight, ripple * 0.85);

          gl_FragColor = vec4(col, 1.0);
        }
      `,P=(o,i)=>{const t=e.createShader(o);return e.shaderSource(t,i),e.compileShader(t),e.getShaderParameter(t,e.COMPILE_STATUS)||console.warn("BG shader compile error:",e.getShaderInfoLog(t)),t},n=e.createProgram();e.attachShader(n,P(e.VERTEX_SHADER,_)),e.attachShader(n,P(e.FRAGMENT_SHADER,T)),e.linkProgram(n),e.useProgram(n);const z=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,z),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW);const b=e.getAttribLocation(n,"aPos");e.enableVertexAttribArray(b),e.vertexAttribPointer(b,2,e.FLOAT,!1,0,0);const c={resolution:e.getUniformLocation(n,"uResolution"),time:e.getUniformLocation(n,"uTime"),mouse:e.getUniformLocation(n,"uMouse"),mouseAct:e.getUniformLocation(n,"uMouseAct"),c0:e.getUniformLocation(n,"uC0"),c1:e.getUniformLocation(n,"uC1"),c2:e.getUniformLocation(n,"uC2"),accent:e.getUniformLocation(n,"uAccent"),light:e.getUniformLocation(n,"uLight"),px:e.getUniformLocation(n,"uPx"),ripples:e.getUniformLocation(n,"uRipples")},v=o=>{if(o=o.trim(),o.startsWith("#")){const t=o.slice(1),a=t.length===3?[t[0]+t[0],t[1]+t[1],t[2]+t[2]]:[t.slice(0,2),t.slice(2,4),t.slice(4,6)];return[parseInt(a[0],16)/255,parseInt(a[1],16)/255,parseInt(a[2],16)/255]}const i=o.match(/rgba?\(([^)]+)\)/);if(i){const t=i[1].split(",").map(a=>parseFloat(a.trim()));return[t[0]/255,t[1]/255,t[2]/255]}return[0,0,0]},x=o=>getComputedStyle(document.documentElement).getPropertyValue(o),E=(o,i,t)=>[o[0]*(1-t)+i[0]*t,o[1]*(1-t)+i[1]*t,o[2]*(1-t)+i[2]*t],l={c0:[0,0,0],c1:[0,0,0],c2:[0,0,0],accent:[1,0,0],light:[1,1,1]},R=()=>{const o=v(x("--bg")),i=v(x("--ink")),t=v(x("--accent")),a=document.documentElement.dataset.theme||"light",f=a==="dark"?.1:.14,s=a==="dark"?.22:.28;l.c0=o,l.c1=E(o,i,f),l.c2=E(o,i,s),l.accent=t,l.light=a==="dark"?[0,0,0]:[1,1,1]};R(),new MutationObserver(o=>{for(const i of o)i.attributeName==="data-theme"&&R()}).observe(document.documentElement,{attributes:!0});const B=10;let p=0,g=0;const F=()=>{p=window.innerWidth,g=window.innerHeight,m.width=p,m.height=g,m.style.width=p+"px",m.style.height=g+"px",e.viewport(0,0,p,g)};F(),window.addEventListener("resize",F);let w=.5,L=.5,k=.5,C=.5,A=0,S=0;const H=o=>{k=o.clientX/window.innerWidth,C=1-o.clientY/window.innerHeight,S=performance.now()};window.addEventListener("pointermove",H,{passive:!0});const O=.5,u=[{x:0,y:0,age:-1},{x:0,y:0,age:-1},{x:0,y:0,age:-1}],d=new Float32Array(9),V=(o,i)=>{const t=o/window.innerWidth,a=1-i/window.innerHeight;let f=0,s=u[0].age;for(let r=1;r<u.length;r++){if(u[r].age<0){f=r;break}u[r].age>s&&(s=u[r].age,f=r)}u[f].x=t,u[f].y=a,u[f].age=0};window.addEventListener("pointerdown",o=>{V(o.clientX,o.clientY)});const I=performance.now();let M=I,U=0,h=!0;const y=()=>{if(!h)return;U=requestAnimationFrame(y);const o=performance.now(),i=(o-I)/1e3,t=Math.min(.05,(o-M)/1e3);M=o,w+=(k-w)*.08,L+=(C-L)*.08;const a=o-S,f=a<120?1:Math.max(0,1-(a-120)/1400);A+=(f-A)*.08;for(let s=0;s<u.length;s++){const r=u[s];r.age>=0&&(r.age+=t,r.age>=O&&(r.age=-1)),d[s*3]=r.x,d[s*3+1]=r.y,d[s*3+2]=r.age}e.uniform2f(c.resolution,p,g),e.uniform1f(c.time,i),e.uniform2f(c.mouse,w,L),e.uniform1f(c.mouseAct,A),e.uniform3fv(c.c0,l.c0),e.uniform3fv(c.c1,l.c1),e.uniform3fv(c.c2,l.c2),e.uniform3fv(c.accent,l.accent),e.uniform3fv(c.light,l.light),e.uniform1f(c.px,B),e.uniform3fv(c.ripples,d),e.drawArrays(e.TRIANGLE_STRIP,0,4)};y(),document.addEventListener("visibilitychange",()=>{document.hidden?(h=!1,cancelAnimationFrame(U)):h||(h=!0,y())})}}

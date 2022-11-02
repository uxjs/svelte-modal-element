
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(document);
var app = (function (exports) {
    'use strict';

    function find_root(element) {
                const parent = element.parentNode;
                return parent ? (parent.head ? parent.head : find_root(parent)) : element;
              }
                function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    let running = false;
    function run_tasks() {
        tasks.forEach(task => {
            if (!task[0](now())) {
                tasks.delete(task);
                task[1]();
            }
        });
        running = tasks.size > 0;
        if (running)
            raf(run_tasks);
    }
    function loop(fn) {
        let task;
        if (!running) {
            running = true;
            raf(run_tasks);
        }
        return {
            promise: new Promise(fulfil => {
                tasks.add(task = [fn, fulfil]);
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                find_root(node).appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement !== 'undefined') {
        SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set() {
                // overridden by instance, if it has props
            }
        };
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }

    function fade(node, { delay = 0, duration = 400 }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src/App.svelte generated by Svelte v3.12.1 */
    const { console: console_1 } = globals;

    const file = "src/App.svelte";

    // (538:0) {#if show}
    function create_if_block(ctx) {
    	var div6, div5, div0, span0, t1, span1, t3, span2, t5, span3, t7, span4, t9, t10, div1, button, t12, div2, input0, t13, div3, input1, t14, div4, input2, t15, slot, div6_transition, t16, div7, current, dispose;

    	var if_block = (ctx.show) && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div5 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "24";
    			t1 = space();
    			span1 = element("span");
    			span1.textContent = ":";
    			t3 = space();
    			span2 = element("span");
    			span2.textContent = "12";
    			t5 = space();
    			span3 = element("span");
    			span3.textContent = ":";
    			t7 = space();
    			span4 = element("span");
    			span4.textContent = "27";
    			t9 = space();
    			if (if_block) if_block.c();
    			t10 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Save";
    			t12 = space();
    			div2 = element("div");
    			input0 = element("input");
    			t13 = space();
    			div3 = element("div");
    			input1 = element("input");
    			t14 = space();
    			div4 = element("div");
    			input2 = element("input");
    			t15 = space();
    			slot = element("slot");
    			t16 = space();
    			div7 = element("div");
    			attr_dev(span0, "id", "duration-digit");
    			add_location(span0, file, 552, 8, 14166);
    			set_style(span1, "color", "#000000");
    			add_location(span1, file, 554, 8, 14264);
    			attr_dev(span2, "id", "show-24-hour");
    			add_location(span2, file, 556, 8, 14311);
    			set_style(span3, "color", "#000000");
    			add_location(span3, file, 560, 8, 14453);
    			attr_dev(span4, "id", "show-minutes");
    			add_location(span4, file, 562, 8, 14500);
    			attr_dev(div0, "class", "digital-container");
    			add_location(div0, file, 550, 6, 14119);
    			attr_dev(button, "class", "save-button");
    			add_location(button, file, 863, 8, 24415);
    			add_location(div1, file, 862, 6, 24401);
    			attr_dev(input0, "id", "durtime");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "name", "shiftdur");
    			input0.value = "24";
    			input0.hidden = true;
    			add_location(input0, file, 867, 12, 24581);
    			add_location(div2, file, 867, 6, 24575);
    			attr_dev(input1, "id", "hourtime");
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "name", "shifthour");
    			input1.value = "08";
    			input1.hidden = true;
    			add_location(input1, file, 868, 12, 24691);
    			add_location(div3, file, 868, 6, 24685);
    			attr_dev(input2, "id", "minutetime");
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "name", "shiftminute");
    			input2.value = "00";
    			input2.hidden = true;
    			add_location(input2, file, 869, 12, 24804);
    			add_location(div4, file, 869, 6, 24798);
    			add_location(slot, file, 873, 6, 24944);
    			attr_dev(div5, "class", "modal-guts");
    			add_location(div5, file, 546, 2, 14035);
    			attr_dev(div6, "class", "modal");
    			set_style(div6, "width", ctx.width);
    			set_style(div6, "height", ctx.height);
    			attr_dev(div6, "id", "modal");
    			add_location(div6, file, 539, 0, 13900);
    			attr_dev(div7, "class", "modal-overlay");
    			attr_dev(div7, "id", "modal-overlay");
    			add_location(div7, file, 896, 2, 25378);

    			dispose = [
    				listen_dev(span0, "click", ctx.durationpanel),
    				listen_dev(span2, "click", ctx.hour24panel),
    				listen_dev(span4, "click", ctx.minutepanel),
    				listen_dev(button, "click", ctx.close),
    				listen_dev(div7, "click", ctx.close)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);
    			append_dev(div5, div0);
    			append_dev(div0, span0);
    			ctx.span0_binding(span0);
    			append_dev(div0, t1);
    			append_dev(div0, span1);
    			append_dev(div0, t3);
    			append_dev(div0, span2);
    			ctx.span2_binding(span2);
    			append_dev(div0, t5);
    			append_dev(div0, span3);
    			append_dev(div0, t7);
    			append_dev(div0, span4);
    			ctx.span4_binding(span4);
    			append_dev(div5, t9);
    			if (if_block) if_block.m(div5, null);
    			append_dev(div5, t10);
    			append_dev(div5, div1);
    			append_dev(div1, button);
    			append_dev(div5, t12);
    			append_dev(div5, div2);
    			append_dev(div2, input0);
    			ctx.input0_binding(input0);
    			append_dev(div5, t13);
    			append_dev(div5, div3);
    			append_dev(div3, input1);
    			ctx.input1_binding(input1);
    			append_dev(div5, t14);
    			append_dev(div5, div4);
    			append_dev(div4, input2);
    			ctx.input2_binding(input2);
    			append_dev(div5, t15);
    			append_dev(div5, slot);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, div7, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.show) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div5, t10);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (!current || changed.width) {
    				set_style(div6, "width", ctx.width);
    			}

    			if (!current || changed.height) {
    				set_style(div6, "height", ctx.height);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (!div6_transition) div6_transition = create_bidirectional_transition(div6, fade, { duration: 350 }, true);
    				div6_transition.run(1);
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (!div6_transition) div6_transition = create_bidirectional_transition(div6, fade, { duration: 350 }, false);
    			div6_transition.run(0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div6);
    			}

    			ctx.span0_binding(null);
    			ctx.span2_binding(null);
    			ctx.span4_binding(null);
    			if (if_block) if_block.d();
    			ctx.input0_binding(null);
    			ctx.input1_binding(null);
    			ctx.input2_binding(null);

    			if (detaching) {
    				if (div6_transition) div6_transition.end();
    				detach_dev(t16);
    				detach_dev(div7);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(538:0) {#if show}", ctx });
    	return block;
    }

    // (568:4) {#if show}
    function create_if_block_1(ctx) {
    	var div20, t0, div19, card0, div0, span0, t1, span1, t2, t3, div1, span2, t4, span3, t5, t6, div2, span4, t7, span5, t8, t9, div3, span6, t10, span7, t11, t12, div4, span8, t13, span9, t14, t15, div5, span10, t16, t17, span11, t18, t19, div12, card1, t20, card2, div6, span12, t21, span13, t22, t23, div7, span14, t24, span15, t25, t26, div8, span16, t27, span17, t28, t29, div9, span18, t30, span19, t31, t32, div10, span20, t33, span21, t34, t35, div11, span22, t36, span23, t37, t38, card3, div13, span24, t39, t40, span25, t41, t42, div14, span26, t43, span27, t44, t45, div15, span28, t46, span29, t47, t48, div16, span30, t49, span31, t50, t51, div17, span32, t52, span33, t53, t54, div18, span34, t55, t56, span35, t57, dispose;

    	var if_block = (ctx.durationCapture) && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			div20 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div19 = element("div");
    			card0 = element("card");
    			div0 = element("div");
    			span0 = element("span");
    			t1 = text("9");
    			span1 = element("span");
    			t2 = text("3");
    			t3 = space();
    			div1 = element("div");
    			span2 = element("span");
    			t4 = text("10");
    			span3 = element("span");
    			t5 = text("4");
    			t6 = space();
    			div2 = element("div");
    			span4 = element("span");
    			t7 = text("11");
    			span5 = element("span");
    			t8 = text("5");
    			t9 = space();
    			div3 = element("div");
    			span6 = element("span");
    			t10 = text("12");
    			span7 = element("span");
    			t11 = text("6");
    			t12 = space();
    			div4 = element("div");
    			span8 = element("span");
    			t13 = text("1");
    			span9 = element("span");
    			t14 = text("7");
    			t15 = space();
    			div5 = element("div");
    			span10 = element("span");
    			t16 = text("2");
    			t17 = space();
    			span11 = element("span");
    			t18 = text("8");
    			t19 = space();
    			div12 = element("div");
    			card1 = element("card");
    			t20 = space();
    			card2 = element("card");
    			div6 = element("div");
    			span12 = element("span");
    			t21 = text("21");
    			span13 = element("span");
    			t22 = text("15");
    			t23 = space();
    			div7 = element("div");
    			span14 = element("span");
    			t24 = text("22");
    			span15 = element("span");
    			t25 = text("16");
    			t26 = space();
    			div8 = element("div");
    			span16 = element("span");
    			t27 = text("23");
    			span17 = element("span");
    			t28 = text("17");
    			t29 = space();
    			div9 = element("div");
    			span18 = element("span");
    			t30 = text("00");
    			span19 = element("span");
    			t31 = text("18");
    			t32 = space();
    			div10 = element("div");
    			span20 = element("span");
    			t33 = text("13");
    			span21 = element("span");
    			t34 = text("19");
    			t35 = space();
    			div11 = element("div");
    			span22 = element("span");
    			t36 = text("14");
    			span23 = element("span");
    			t37 = text("20");
    			t38 = space();
    			card3 = element("card");
    			div13 = element("div");
    			span24 = element("span");
    			t39 = text("45");
    			t40 = space();
    			span25 = element("span");
    			t41 = text("15");
    			t42 = space();
    			div14 = element("div");
    			span26 = element("span");
    			t43 = text("50");
    			span27 = element("span");
    			t44 = text("20");
    			t45 = space();
    			div15 = element("div");
    			span28 = element("span");
    			t46 = text("55");
    			span29 = element("span");
    			t47 = text("25");
    			t48 = space();
    			div16 = element("div");
    			span30 = element("span");
    			t49 = text("00");
    			span31 = element("span");
    			t50 = text("30");
    			t51 = space();
    			div17 = element("div");
    			span32 = element("span");
    			t52 = text("5");
    			span33 = element("span");
    			t53 = text("35");
    			t54 = space();
    			div18 = element("div");
    			span34 = element("span");
    			t55 = text("10");
    			t56 = space();
    			span35 = element("span");
    			t57 = text("40");
    			set_style(span0, "float", "left");
    			attr_dev(span0, "class", ctx.selected_09h);
    			attr_dev(span0, "id", "9h");
    			add_location(span0, file, 588, 14, 14944);
    			set_style(span1, "float", "right");
    			attr_dev(span1, "class", ctx.selected_03h);
    			attr_dev(span1, "id", "3h");
    			add_location(span1, file, 590, 15, 15057);
    			attr_dev(div0, "class", "numbers");
    			add_location(div0, file, 587, 12, 14908);
    			set_style(span2, "float", "left");
    			set_style(span2, "-webkit-transform", "rotateZ(-30deg)");
    			attr_dev(span2, "class", ctx.selected_10h);
    			attr_dev(span2, "id", "10h");
    			add_location(span2, file, 599, 14, 15335);
    			set_style(span3, "float", "right");
    			set_style(span3, "-webkit-transform", "rotateZ(-30deg)");
    			attr_dev(span3, "class", ctx.selected_04h);
    			attr_dev(span3, "id", "4h");
    			add_location(span3, file, 604, 15, 15533);
    			attr_dev(div1, "class", "numbers");
    			set_style(div1, "-webkit-transform", "rotateZ(30deg)");
    			add_location(div1, file, 598, 12, 15257);
    			set_style(span4, "float", "left");
    			set_style(span4, "-webkit-transform", "rotateZ(-60deg)");
    			attr_dev(span4, "class", ctx.selected_11h);
    			attr_dev(span4, "id", "11h");
    			add_location(span4, file, 613, 14, 15846);
    			set_style(span5, "float", "right");
    			set_style(span5, "-webkit-transform", "rotateZ(-60deg)");
    			attr_dev(span5, "class", ctx.selected_05h);
    			attr_dev(span5, "id", "5h");
    			add_location(span5, file, 618, 15, 16044);
    			attr_dev(div2, "class", "numbers");
    			set_style(div2, "-webkit-transform", "rotateZ(60deg)");
    			add_location(div2, file, 612, 12, 15768);
    			set_style(span6, "float", "left");
    			set_style(span6, "-webkit-transform", "rotateZ(-90deg)");
    			attr_dev(span6, "class", ctx.selected_12h);
    			attr_dev(span6, "id", "12h");
    			add_location(span6, file, 627, 14, 16357);
    			set_style(span7, "float", "right");
    			set_style(span7, "-webkit-transform", "rotateZ(-90deg)");
    			attr_dev(span7, "class", ctx.selected_06h);
    			attr_dev(span7, "id", "6h");
    			add_location(span7, file, 632, 15, 16555);
    			attr_dev(div3, "class", "numbers");
    			set_style(div3, "-webkit-transform", "rotateZ(90deg)");
    			add_location(div3, file, 626, 12, 16279);
    			set_style(span8, "float", "left");
    			set_style(span8, "-webkit-transform", "rotateZ(-120deg)");
    			attr_dev(span8, "class", ctx.selected_01h);
    			attr_dev(span8, "id", "1h");
    			add_location(span8, file, 641, 14, 16869);
    			set_style(span9, "float", "right");
    			set_style(span9, "-webkit-transform", "rotateZ(-120deg)");
    			attr_dev(span9, "class", ctx.selected_07h);
    			attr_dev(span9, "id", "7h");
    			add_location(span9, file, 646, 15, 17065);
    			attr_dev(div4, "class", "numbers");
    			set_style(div4, "-webkit-transform", "rotateZ(120deg)");
    			add_location(div4, file, 640, 12, 16790);
    			set_style(span10, "float", "left");
    			set_style(span10, "-webkit-transform", "rotateZ(-150deg)");
    			attr_dev(span10, "class", ctx.selected_02h);
    			attr_dev(span10, "id", "2h");
    			add_location(span10, file, 655, 14, 17380);
    			set_style(span11, "float", "right");
    			set_style(span11, "-webkit-transform", "rotateZ(-150deg)");
    			attr_dev(span11, "class", ctx.selected_08h);
    			attr_dev(span11, "id", "8h");
    			add_location(span11, file, 659, 16, 17562);
    			attr_dev(div5, "class", "numbers");
    			set_style(div5, "-webkit-transform", "rotateZ(150deg)");
    			add_location(div5, file, 654, 12, 17301);
    			attr_dev(card0, "id", "hour12-card");
    			add_location(card0, file, 586, 10, 14849);
    			attr_dev(card1, "id", "duration-card");
    			add_location(card1, file, 669, 12, 17817);
    			set_style(span12, "float", "left");
    			attr_dev(span12, "class", ctx.selected_21h);
    			attr_dev(span12, "id", "21h");
    			add_location(span12, file, 677, 16, 18015);
    			set_style(span13, "float", "right");
    			attr_dev(span13, "class", ctx.selected_15h);
    			attr_dev(span13, "id", "15h");
    			add_location(span13, file, 682, 17, 18188);
    			attr_dev(div6, "class", "numbers");
    			add_location(div6, file, 676, 14, 17977);
    			set_style(span14, "float", "left");
    			set_style(span14, "-webkit-transform", "rotateZ(-30deg)");
    			attr_dev(span14, "class", ctx.selected_22h);
    			attr_dev(span14, "id", "22h");
    			add_location(span14, file, 691, 16, 18485);
    			set_style(span15, "float", "right");
    			set_style(span15, "-webkit-transform", "rotateZ(-30deg)");
    			attr_dev(span15, "class", ctx.selected_16h);
    			attr_dev(span15, "id", "16h");
    			add_location(span15, file, 696, 17, 18693);
    			attr_dev(div7, "class", "numbers");
    			set_style(div7, "-webkit-transform", "rotateZ(30deg)");
    			add_location(div7, file, 690, 14, 18405);
    			set_style(span16, "float", "left");
    			set_style(span16, "-webkit-transform", "rotateZ(-60deg)");
    			attr_dev(span16, "class", ctx.selected_23h);
    			attr_dev(span16, "id", "23h");
    			add_location(span16, file, 705, 16, 19025);
    			set_style(span17, "float", "right");
    			set_style(span17, "-webkit-transform", "rotateZ(-60deg)");
    			attr_dev(span17, "class", ctx.selected_17h);
    			attr_dev(span17, "id", "17h");
    			add_location(span17, file, 710, 17, 19233);
    			attr_dev(div8, "class", "numbers");
    			set_style(div8, "-webkit-transform", "rotateZ(60deg)");
    			add_location(div8, file, 704, 14, 18945);
    			set_style(span18, "float", "left");
    			set_style(span18, "-webkit-transform", "rotateZ(-90deg)");
    			attr_dev(span18, "class", ctx.selected_00h);
    			attr_dev(span18, "id", "00h");
    			add_location(span18, file, 719, 16, 19565);
    			set_style(span19, "float", "right");
    			set_style(span19, "-webkit-transform", "rotateZ(-90deg)");
    			attr_dev(span19, "class", ctx.selected_18h);
    			attr_dev(span19, "id", "18h");
    			add_location(span19, file, 724, 17, 19773);
    			attr_dev(div9, "class", "numbers");
    			set_style(div9, "-webkit-transform", "rotateZ(90deg)");
    			add_location(div9, file, 718, 14, 19485);
    			set_style(span20, "float", "left");
    			set_style(span20, "-webkit-transform", "rotateZ(-120deg)");
    			attr_dev(span20, "class", ctx.selected_13h);
    			attr_dev(span20, "id", "13h");
    			add_location(span20, file, 733, 16, 20106);
    			set_style(span21, "float", "right");
    			set_style(span21, "-webkit-transform", "rotateZ(-120deg)");
    			attr_dev(span21, "class", ctx.selected_19h);
    			attr_dev(span21, "id", "19h");
    			add_location(span21, file, 738, 17, 20315);
    			attr_dev(div10, "class", "numbers");
    			set_style(div10, "-webkit-transform", "rotateZ(120deg)");
    			add_location(div10, file, 732, 14, 20025);
    			set_style(span22, "float", "left");
    			set_style(span22, "-webkit-transform", "rotateZ(-150deg)");
    			attr_dev(span22, "class", ctx.selected_14h);
    			attr_dev(span22, "id", "14h");
    			add_location(span22, file, 747, 16, 20649);
    			set_style(span23, "float", "right");
    			set_style(span23, "-webkit-transform", "rotateZ(-150deg)");
    			attr_dev(span23, "class", ctx.selected_20h);
    			attr_dev(span23, "id", "20h");
    			add_location(span23, file, 752, 17, 20858);
    			attr_dev(div11, "class", "numbers");
    			set_style(div11, "-webkit-transform", "rotateZ(150deg)");
    			add_location(div11, file, 746, 14, 20568);
    			attr_dev(card2, "id", "hour24-card");
    			add_location(card2, file, 674, 12, 17915);
    			attr_dev(div12, "class", "inner-watch");
    			add_location(div12, file, 667, 10, 17778);
    			set_style(span24, "float", "left");
    			attr_dev(span24, "class", ctx.selected_45m);
    			attr_dev(span24, "id", "45m");
    			add_location(span24, file, 764, 14, 21239);
    			set_style(span25, "float", "right");
    			attr_dev(span25, "class", ctx.selected_15m);
    			attr_dev(span25, "id", "15m");
    			add_location(span25, file, 770, 14, 21419);
    			attr_dev(div13, "class", "numbers");
    			add_location(div13, file, 763, 12, 21203);
    			set_style(span26, "float", "left");
    			set_style(span26, "-webkit-transform", "rotateZ(-30deg)");
    			attr_dev(span26, "class", ctx.selected_50m);
    			attr_dev(span26, "id", "50m");
    			add_location(span26, file, 779, 14, 21702);
    			set_style(span27, "float", "right");
    			set_style(span27, "-webkit-transform", "rotateZ(-30deg)");
    			attr_dev(span27, "class", ctx.selected_20m);
    			attr_dev(span27, "id", "20m");
    			add_location(span27, file, 784, 15, 21902);
    			attr_dev(div14, "class", "numbers");
    			set_style(div14, "-webkit-transform", "rotateZ(30deg)");
    			add_location(div14, file, 778, 12, 21624);
    			set_style(span28, "float", "left");
    			set_style(span28, "-webkit-transform", "rotateZ(-60deg)");
    			attr_dev(span28, "class", ctx.selected_55m);
    			attr_dev(span28, "id", "55m");
    			add_location(span28, file, 793, 14, 22220);
    			set_style(span29, "float", "right");
    			set_style(span29, "-webkit-transform", "rotateZ(-60deg)");
    			attr_dev(span29, "class", ctx.selected_25m);
    			attr_dev(span29, "id", "25m");
    			add_location(span29, file, 798, 15, 22420);
    			attr_dev(div15, "class", "numbers");
    			set_style(div15, "-webkit-transform", "rotateZ(60deg)");
    			add_location(div15, file, 792, 12, 22142);
    			set_style(span30, "float", "left");
    			set_style(span30, "-webkit-transform", "rotateZ(-90deg)");
    			attr_dev(span30, "class", ctx.selected_00m);
    			attr_dev(span30, "id", "00m");
    			add_location(span30, file, 807, 14, 22738);
    			set_style(span31, "float", "right");
    			set_style(span31, "-webkit-transform", "rotateZ(-90deg)");
    			attr_dev(span31, "class", ctx.selected_30m);
    			attr_dev(span31, "id", "30m");
    			add_location(span31, file, 812, 15, 22938);
    			attr_dev(div16, "class", "numbers");
    			set_style(div16, "-webkit-transform", "rotateZ(90deg)");
    			add_location(div16, file, 806, 12, 22660);
    			set_style(span32, "float", "left");
    			set_style(span32, "-webkit-transform", "rotateZ(-120deg)");
    			attr_dev(span32, "class", ctx.selected_05m);
    			attr_dev(span32, "id", "5m");
    			add_location(span32, file, 821, 14, 23257);
    			set_style(span33, "float", "right");
    			set_style(span33, "-webkit-transform", "rotateZ(-120deg)");
    			attr_dev(span33, "class", ctx.selected_35m);
    			attr_dev(span33, "id", "35m");
    			add_location(span33, file, 826, 15, 23456);
    			attr_dev(div17, "class", "numbers");
    			set_style(div17, "-webkit-transform", "rotateZ(120deg)");
    			add_location(div17, file, 820, 12, 23178);
    			set_style(span34, "float", "left");
    			set_style(span34, "-webkit-transform", "rotateZ(-150deg)");
    			attr_dev(span34, "class", ctx.selected_10m);
    			attr_dev(span34, "id", "10m");
    			add_location(span34, file, 835, 14, 23776);
    			set_style(span35, "float", "right");
    			set_style(span35, "-webkit-transform", "rotateZ(-150deg)");
    			attr_dev(span35, "class", ctx.selected_40m);
    			attr_dev(span35, "id", "40m");
    			add_location(span35, file, 841, 14, 23992);
    			attr_dev(div18, "class", "numbers");
    			set_style(div18, "-webkit-transform", "rotateZ(150deg)");
    			add_location(div18, file, 834, 12, 23697);
    			attr_dev(card3, "id", "minute-card");
    			add_location(card3, file, 762, 10, 21144);
    			attr_dev(div19, "class", "watch");
    			add_location(div19, file, 584, 6, 14810);
    			attr_dev(div20, "class", "watch-container");
    			add_location(div20, file, 569, 4, 14637);

    			dispose = [
    				listen_dev(span0, "click", ctx.hour_9),
    				listen_dev(span1, "click", ctx.hour_3),
    				listen_dev(span2, "click", ctx.hour_10),
    				listen_dev(span3, "click", ctx.hour_4),
    				listen_dev(span4, "click", ctx.hour_11),
    				listen_dev(span5, "click", ctx.hour_5),
    				listen_dev(span6, "click", ctx.hour_12),
    				listen_dev(span7, "click", ctx.hour_6),
    				listen_dev(span8, "click", ctx.hour_1),
    				listen_dev(span9, "click", ctx.hour_7),
    				listen_dev(span10, "click", ctx.hour_2),
    				listen_dev(span11, "click", ctx.hour_8),
    				listen_dev(span12, "click", ctx.hour_21),
    				listen_dev(span13, "click", ctx.hour_15),
    				listen_dev(span14, "click", ctx.hour_22),
    				listen_dev(span15, "click", ctx.hour_16),
    				listen_dev(span16, "click", ctx.hour_23),
    				listen_dev(span17, "click", ctx.hour_17),
    				listen_dev(span18, "click", ctx.hour_00),
    				listen_dev(span19, "click", ctx.hour_18),
    				listen_dev(span20, "click", ctx.hour_13),
    				listen_dev(span21, "click", ctx.hour_19),
    				listen_dev(span22, "click", ctx.hour_14),
    				listen_dev(span23, "click", ctx.hour_20),
    				listen_dev(span24, "click", ctx.minute_45),
    				listen_dev(span25, "click", ctx.minute_15),
    				listen_dev(span26, "click", ctx.minute_50),
    				listen_dev(span27, "click", ctx.minute_20),
    				listen_dev(span28, "click", ctx.minute_55),
    				listen_dev(span29, "click", ctx.minute_25),
    				listen_dev(span30, "click", ctx.minute_00),
    				listen_dev(span31, "click", ctx.minute_30),
    				listen_dev(span32, "click", ctx.minute_05),
    				listen_dev(span33, "click", ctx.minute_35),
    				listen_dev(span34, "click", ctx.minute_10),
    				listen_dev(span35, "click", ctx.minute_40)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div20, anchor);
    			if (if_block) if_block.m(div20, null);
    			append_dev(div20, t0);
    			append_dev(div20, div19);
    			append_dev(div19, card0);
    			append_dev(card0, div0);
    			append_dev(div0, span0);
    			append_dev(span0, t1);
    			append_dev(div0, span1);
    			append_dev(span1, t2);
    			append_dev(card0, t3);
    			append_dev(card0, div1);
    			append_dev(div1, span2);
    			append_dev(span2, t4);
    			append_dev(div1, span3);
    			append_dev(span3, t5);
    			append_dev(card0, t6);
    			append_dev(card0, div2);
    			append_dev(div2, span4);
    			append_dev(span4, t7);
    			append_dev(div2, span5);
    			append_dev(span5, t8);
    			append_dev(card0, t9);
    			append_dev(card0, div3);
    			append_dev(div3, span6);
    			append_dev(span6, t10);
    			append_dev(div3, span7);
    			append_dev(span7, t11);
    			append_dev(card0, t12);
    			append_dev(card0, div4);
    			append_dev(div4, span8);
    			append_dev(span8, t13);
    			append_dev(div4, span9);
    			append_dev(span9, t14);
    			append_dev(card0, t15);
    			append_dev(card0, div5);
    			append_dev(div5, span10);
    			append_dev(span10, t16);
    			append_dev(div5, t17);
    			append_dev(div5, span11);
    			append_dev(span11, t18);
    			ctx.card0_binding(card0);
    			append_dev(div19, t19);
    			append_dev(div19, div12);
    			append_dev(div12, card1);
    			ctx.card1_binding(card1);
    			append_dev(div12, t20);
    			append_dev(div12, card2);
    			append_dev(card2, div6);
    			append_dev(div6, span12);
    			append_dev(span12, t21);
    			append_dev(div6, span13);
    			append_dev(span13, t22);
    			append_dev(card2, t23);
    			append_dev(card2, div7);
    			append_dev(div7, span14);
    			append_dev(span14, t24);
    			append_dev(div7, span15);
    			append_dev(span15, t25);
    			append_dev(card2, t26);
    			append_dev(card2, div8);
    			append_dev(div8, span16);
    			append_dev(span16, t27);
    			append_dev(div8, span17);
    			append_dev(span17, t28);
    			append_dev(card2, t29);
    			append_dev(card2, div9);
    			append_dev(div9, span18);
    			append_dev(span18, t30);
    			append_dev(div9, span19);
    			append_dev(span19, t31);
    			append_dev(card2, t32);
    			append_dev(card2, div10);
    			append_dev(div10, span20);
    			append_dev(span20, t33);
    			append_dev(div10, span21);
    			append_dev(span21, t34);
    			append_dev(card2, t35);
    			append_dev(card2, div11);
    			append_dev(div11, span22);
    			append_dev(span22, t36);
    			append_dev(div11, span23);
    			append_dev(span23, t37);
    			ctx.card2_binding(card2);
    			append_dev(div19, t38);
    			append_dev(div19, card3);
    			append_dev(card3, div13);
    			append_dev(div13, span24);
    			append_dev(span24, t39);
    			append_dev(div13, t40);
    			append_dev(div13, span25);
    			append_dev(span25, t41);
    			append_dev(card3, t42);
    			append_dev(card3, div14);
    			append_dev(div14, span26);
    			append_dev(span26, t43);
    			append_dev(div14, span27);
    			append_dev(span27, t44);
    			append_dev(card3, t45);
    			append_dev(card3, div15);
    			append_dev(div15, span28);
    			append_dev(span28, t46);
    			append_dev(div15, span29);
    			append_dev(span29, t47);
    			append_dev(card3, t48);
    			append_dev(card3, div16);
    			append_dev(div16, span30);
    			append_dev(span30, t49);
    			append_dev(div16, span31);
    			append_dev(span31, t50);
    			append_dev(card3, t51);
    			append_dev(card3, div17);
    			append_dev(div17, span32);
    			append_dev(span32, t52);
    			append_dev(div17, span33);
    			append_dev(span33, t53);
    			append_dev(card3, t54);
    			append_dev(card3, div18);
    			append_dev(div18, span34);
    			append_dev(span34, t55);
    			append_dev(div18, t56);
    			append_dev(div18, span35);
    			append_dev(span35, t57);
    			ctx.card3_binding(card3);
    		},

    		p: function update(changed, ctx) {
    			if (ctx.durationCapture) {
    				if (!if_block) {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(div20, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (changed.selected_09h) {
    				attr_dev(span0, "class", ctx.selected_09h);
    			}

    			if (changed.selected_03h) {
    				attr_dev(span1, "class", ctx.selected_03h);
    			}

    			if (changed.selected_10h) {
    				attr_dev(span2, "class", ctx.selected_10h);
    			}

    			if (changed.selected_04h) {
    				attr_dev(span3, "class", ctx.selected_04h);
    			}

    			if (changed.selected_11h) {
    				attr_dev(span4, "class", ctx.selected_11h);
    			}

    			if (changed.selected_05h) {
    				attr_dev(span5, "class", ctx.selected_05h);
    			}

    			if (changed.selected_12h) {
    				attr_dev(span6, "class", ctx.selected_12h);
    			}

    			if (changed.selected_06h) {
    				attr_dev(span7, "class", ctx.selected_06h);
    			}

    			if (changed.selected_01h) {
    				attr_dev(span8, "class", ctx.selected_01h);
    			}

    			if (changed.selected_07h) {
    				attr_dev(span9, "class", ctx.selected_07h);
    			}

    			if (changed.selected_02h) {
    				attr_dev(span10, "class", ctx.selected_02h);
    			}

    			if (changed.selected_08h) {
    				attr_dev(span11, "class", ctx.selected_08h);
    			}

    			if (changed.selected_21h) {
    				attr_dev(span12, "class", ctx.selected_21h);
    			}

    			if (changed.selected_15h) {
    				attr_dev(span13, "class", ctx.selected_15h);
    			}

    			if (changed.selected_22h) {
    				attr_dev(span14, "class", ctx.selected_22h);
    			}

    			if (changed.selected_16h) {
    				attr_dev(span15, "class", ctx.selected_16h);
    			}

    			if (changed.selected_23h) {
    				attr_dev(span16, "class", ctx.selected_23h);
    			}

    			if (changed.selected_17h) {
    				attr_dev(span17, "class", ctx.selected_17h);
    			}

    			if (changed.selected_00h) {
    				attr_dev(span18, "class", ctx.selected_00h);
    			}

    			if (changed.selected_18h) {
    				attr_dev(span19, "class", ctx.selected_18h);
    			}

    			if (changed.selected_13h) {
    				attr_dev(span20, "class", ctx.selected_13h);
    			}

    			if (changed.selected_19h) {
    				attr_dev(span21, "class", ctx.selected_19h);
    			}

    			if (changed.selected_14h) {
    				attr_dev(span22, "class", ctx.selected_14h);
    			}

    			if (changed.selected_20h) {
    				attr_dev(span23, "class", ctx.selected_20h);
    			}

    			if (changed.selected_45m) {
    				attr_dev(span24, "class", ctx.selected_45m);
    			}

    			if (changed.selected_15m) {
    				attr_dev(span25, "class", ctx.selected_15m);
    			}

    			if (changed.selected_50m) {
    				attr_dev(span26, "class", ctx.selected_50m);
    			}

    			if (changed.selected_20m) {
    				attr_dev(span27, "class", ctx.selected_20m);
    			}

    			if (changed.selected_55m) {
    				attr_dev(span28, "class", ctx.selected_55m);
    			}

    			if (changed.selected_25m) {
    				attr_dev(span29, "class", ctx.selected_25m);
    			}

    			if (changed.selected_00m) {
    				attr_dev(span30, "class", ctx.selected_00m);
    			}

    			if (changed.selected_30m) {
    				attr_dev(span31, "class", ctx.selected_30m);
    			}

    			if (changed.selected_05m) {
    				attr_dev(span32, "class", ctx.selected_05m);
    			}

    			if (changed.selected_35m) {
    				attr_dev(span33, "class", ctx.selected_35m);
    			}

    			if (changed.selected_10m) {
    				attr_dev(span34, "class", ctx.selected_10m);
    			}

    			if (changed.selected_40m) {
    				attr_dev(span35, "class", ctx.selected_40m);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div20);
    			}

    			if (if_block) if_block.d();
    			ctx.card0_binding(null);
    			ctx.card1_binding(null);
    			ctx.card2_binding(null);
    			ctx.card3_binding(null);
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(568:4) {#if show}", ctx });
    	return block;
    }

    // (572:6) {#if durationCapture}
    function create_if_block_2(ctx) {
    	var div0, t_1, div1;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			div0.textContent = "clicked";
    			t_1 = space();
    			div1 = element("div");
    			add_location(div0, file, 573, 6, 14715);
    			attr_dev(div1, "class", "watch");
    			add_location(div1, file, 574, 6, 14740);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t_1, anchor);
    			insert_dev(target, div1, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div0);
    				detach_dev(t_1);
    				detach_dev(div1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2.name, type: "if", source: "(572:6) {#if durationCapture}", ctx });
    	return block;
    }

    function create_fragment(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.show) && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			this.c = noop;
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.show) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function dispatchCloseEvent(e) {
      // 1. Create the custom event.
      const event = new CustomEvent("close", {
        detail: `modal-element was closed.`,
        bubbles: true,
        cancelable: true,
        composed: true, // makes the event jump shadow DOM boundary
      });

      // 2. Dispatch the custom event.
      this.dispatchEvent(event);
    }

    function instance($$self, $$props, $$invalidate) {
    	let { id = "", show = false, durationCapture = true, width = "600px", height = "400px", hour12card, hour24card, minutecard, durationcard, minutedisplay, hourdisplay, durationdisplay, durTextBox, hourTextBox, minuteTextBox, cmbBoxHour, cmbBoxMinute } = $$props;

      function setDuration(cbdr, cbhr, cbmn) { 
        
        console.log(cbdr.value, cbhr.value, cbmn.value);

        $$invalidate('durTextBox', durTextBox.value = document.getElementById('sduration').value, durTextBox);
        $$invalidate('hourTextBox', hourTextBox.value = document.getElementById('shour').value, hourTextBox);
        $$invalidate('minuteTextBox', minuteTextBox.value = document.getElementById('smin').value, minuteTextBox);
        
        $$invalidate('durationdisplay', durationdisplay.innerHTML = document.getElementById('sduration').value, durationdisplay);
        $$invalidate('hourdisplay', hourdisplay.innerHTML = document.getElementById('shour').value, hourdisplay);
        $$invalidate('minutedisplay', minutedisplay.innerHTML = document.getElementById('smin').value, minutedisplay);

      }


      function initializeTimePicker(){
        hour24panel();
      }

      function close(e) {
     
        //console.log(durTextBox.value, hourTextBox.value, minuteTextBox.value) //debug

        document.getElementById('sduration').value = durTextBox.value;
        document.getElementById('shour').value = hourTextBox.value;
        document.getElementById('smin').value = minuteTextBox.value;


        dispatchCloseEvent.call(this, e);
        $$invalidate('show', show = false);
      }

      let closePath = `M28.228,23.986L47.092,5.122c1.172-1.171,1.172-3.071,0-4.242c-1.172-1.172-3.07-1.172-4.242,0L23.986,19.744L5.121,0.88
          c-1.172-1.172-3.07-1.172-4.242,0c-1.172,1.171-1.172,3.071,0,4.242l18.865,18.864L0.879,42.85c-1.172,1.171-1.172,3.071,0,4.242
          C1.465,47.677,2.233,47.97,3,47.97s1.535-0.293,2.121-0.879l18.865-18.864L42.85,47.091c0.586,0.586,1.354,0.879,2.121,0.879
          s1.535-0.293,2.121-0.879c1.172-1.171,1.172-3.071,0-4.242L28.228,23.986z`;

      // Time-Picker below

      // apply CSS to selected minute
      //
      let selected_00m = "";
      let selected_05m = "";
      let selected_10m = "";
      let selected_15m = "";
      let selected_20m = "";
      let selected_25m = "";
      let selected_30m = "";
      let selected_35m = "";
      let selected_40m = "";
      let selected_45m = "";
      let selected_50m = "";
      let selected_55m = "";

      // apply CSS to selected 12-hour
      //
      let selected_00h = "";
      let selected_01h = "";
      let selected_02h = "";
      let selected_03h = "";
      let selected_04h = "";
      let selected_05h = "";
      let selected_06h = "";
      let selected_07h = "";
      let selected_08h = "";
      let selected_09h = "";
      let selected_10h = "";
      let selected_11h = "";
      let selected_12h = "";

      // apply CSS to selected 24-hour
      //
      let selected_13h = "";
      let selected_14h = "";
      let selected_15h = "";
      let selected_16h = "";
      let selected_17h = "";
      let selected_18h = "";
      let selected_19h = "";
      let selected_20h = "";
      let selected_21h = "";
      let selected_22h = "";
      let selected_23h = "";

      const clearAllSelected = async () => {
        $$invalidate('selected_00m', selected_00m = "");
        $$invalidate('selected_05m', selected_05m = "");
        $$invalidate('selected_10m', selected_10m = "");
        $$invalidate('selected_15m', selected_15m = "");
        $$invalidate('selected_20m', selected_20m = "");
        $$invalidate('selected_25m', selected_25m = "");
        $$invalidate('selected_30m', selected_30m = "");
        $$invalidate('selected_35m', selected_35m = "");
        $$invalidate('selected_40m', selected_40m = "");
        $$invalidate('selected_45m', selected_45m = "");
        $$invalidate('selected_50m', selected_50m = "");
        $$invalidate('selected_55m', selected_55m = "");

        $$invalidate('selected_00h', selected_00h = "");
        $$invalidate('selected_01h', selected_01h = "");
        $$invalidate('selected_02h', selected_02h = "");
        $$invalidate('selected_03h', selected_03h = "");
        $$invalidate('selected_04h', selected_04h = "");
        $$invalidate('selected_05h', selected_05h = "");
        $$invalidate('selected_06h', selected_06h = "");
        $$invalidate('selected_07h', selected_07h = "");
        $$invalidate('selected_08h', selected_08h = "");
        $$invalidate('selected_09h', selected_09h = "");
        $$invalidate('selected_10h', selected_10h = "");
        $$invalidate('selected_11h', selected_11h = "");
        $$invalidate('selected_12h', selected_12h = "");

        $$invalidate('selected_13h', selected_13h = "");
        $$invalidate('selected_14h', selected_14h = "");
        $$invalidate('selected_15h', selected_15h = "");
        $$invalidate('selected_16h', selected_16h = "");
        $$invalidate('selected_17h', selected_17h = "");
        $$invalidate('selected_18h', selected_18h = "");
        $$invalidate('selected_19h', selected_19h = "");
        $$invalidate('selected_20h', selected_20h = "");
        $$invalidate('selected_21h', selected_21h = "");
        $$invalidate('selected_22h', selected_22h = "");
        $$invalidate('selected_23h', selected_23h = "");
      };


      const durationpanel = () => {
        //console.log('asdf')
        
       //$: durationCapture = !durationCapture;

       $$invalidate('durationCapture', durationCapture = true);
        $$invalidate('hour12card', hour12card.hidden = false, hour12card);
        $$invalidate('hour24card', hour24card.hidden = false, hour24card);
        $$invalidate('minutecard', minutecard.hidden = true, minutecard);

        $$invalidate('hour24card', hour24card.style.color = "white", hour24card);
        $$invalidate('minutecard', minutecard.style.color = "#c79395", minutecard);
        $$invalidate('hour12card', hour12card.style.color = "purple", hour12card);

        //Header Display
        $$invalidate('minutedisplay', minutedisplay.style.color = "#e3cc59", minutedisplay);
        $$invalidate('hourdisplay', hourdisplay.style.color = "#e3cc59", hourdisplay);
        $$invalidate('durationdisplay', durationdisplay.style.color = "#9853c9", durationdisplay);

      };


      const hour24panel = () => {
        $$invalidate('durationCapture', durationCapture = false);
        $$invalidate('hour12card', hour12card.hidden = false, hour12card);
        $$invalidate('hour24card', hour24card.hidden = false, hour24card);
        $$invalidate('minutecard', minutecard.hidden = true, minutecard);

        $$invalidate('hour24card', hour24card.style.color = "white", hour24card);
        $$invalidate('minutecard', minutecard.style.color = "#eb4034", minutecard);
        $$invalidate('hour12card', hour12card.style.color = "green", hour12card);

        //Header Display
        $$invalidate('durationdisplay', durationdisplay.style.color = "#e3cc59", durationdisplay);
        $$invalidate('minutedisplay', minutedisplay.style.color = "#e3cc59", minutedisplay);
        $$invalidate('hourdisplay', hourdisplay.style.color = "#9853c9", hourdisplay);

      }; //hour24panel

      const minutepanel = () => {
        $$invalidate('durationCapture', durationCapture = false);
        // show Minutes Panel Only
        $$invalidate('hour12card', hour12card.hidden = true, hour12card);
        $$invalidate('hour24card', hour24card.hidden = true, hour24card);
        $$invalidate('minutecard', minutecard.hidden = false, minutecard);
        $$invalidate('durationdisplay', durationdisplay.style.color = "#e3cc59", durationdisplay);
        $$invalidate('hourdisplay', hourdisplay.style.color = "#e3cc59", hourdisplay);
        $$invalidate('minutedisplay', minutedisplay.style.color = "#9853c9", minutedisplay);
      };



      // ---------------------
      // MINUTE handlers
      // ---------------------
      const minute_00 = async () => {
        let temp = selected_00m === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('minutedisplay', minutedisplay.innerHTML = "00", minutedisplay);
        $$invalidate('minuteTextBox', minuteTextBox.value = "00", minuteTextBox);
        $$invalidate('selected_00m', selected_00m = temp);
      };

      const minute_05 = async () => {
        let temp = selected_05m === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('minutedisplay', minutedisplay.innerHTML = "05", minutedisplay);
        $$invalidate('minuteTextBox', minuteTextBox.value = "05", minuteTextBox);
        $$invalidate('selected_05m', selected_05m = temp);
      };

      const minute_10 = async () => {
        let temp = selected_10m === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('minutedisplay', minutedisplay.innerHTML = "10", minutedisplay);
        $$invalidate('minuteTextBox', minuteTextBox.value = "10", minuteTextBox);
        $$invalidate('selected_10m', selected_10m = temp);
      };

      const minute_15 = async () => {
        let temp = selected_15m === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('minutedisplay', minutedisplay.innerHTML = "15", minutedisplay);
        $$invalidate('minuteTextBox', minuteTextBox.value = "15", minuteTextBox);
        $$invalidate('selected_15m', selected_15m = temp);
      };

      const minute_20 = async () => {
        let temp = selected_20m === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('minutedisplay', minutedisplay.innerHTML = "20", minutedisplay);
        $$invalidate('minuteTextBox', minuteTextBox.value = "20", minuteTextBox);
        $$invalidate('selected_20m', selected_20m = temp);
      };

      const minute_25 = async () => {
        let temp = selected_25m === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('minutedisplay', minutedisplay.innerHTML = "25", minutedisplay);
        $$invalidate('minuteTextBox', minuteTextBox.value = "25", minuteTextBox);
        $$invalidate('selected_25m', selected_25m = temp);
      };

      const minute_30 = async () => {
        let temp = selected_30m === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('minutedisplay', minutedisplay.innerHTML = "30", minutedisplay);
        $$invalidate('minuteTextBox', minuteTextBox.value = "30", minuteTextBox);
        $$invalidate('selected_30m', selected_30m = temp);
      };

      const minute_35 = async () => {
        let temp = selected_35m === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('minutedisplay', minutedisplay.innerHTML = "35", minutedisplay);
        $$invalidate('minuteTextBox', minuteTextBox.value = "35", minuteTextBox);
        $$invalidate('selected_35m', selected_35m = temp);
      };

      const minute_40 = async () => {
        let temp = selected_40m === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('minutedisplay', minutedisplay.innerHTML = "40", minutedisplay);
        $$invalidate('minuteTextBox', minuteTextBox.value = "40", minuteTextBox);
        $$invalidate('selected_40m', selected_40m = temp);
      };

      const minute_45 = async () => {
        let temp = selected_45m === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('minutedisplay', minutedisplay.innerHTML = "45", minutedisplay);
        $$invalidate('minuteTextBox', minuteTextBox.value = "45", minuteTextBox);
        $$invalidate('selected_45m', selected_45m = temp);
      };

      const minute_50 = async () => {
        let temp = selected_50m === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('minutedisplay', minutedisplay.innerHTML = "50", minutedisplay);
        $$invalidate('minuteTextBox', minuteTextBox.value = "50", minuteTextBox);
        $$invalidate('selected_50m', selected_50m = temp);
      };

      const minute_55 = async () => {
        let temp = selected_55m === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('minutedisplay', minutedisplay.innerHTML = "55", minutedisplay);
        $$invalidate('minuteTextBox', minuteTextBox.value = "55", minuteTextBox);
        $$invalidate('selected_55m', selected_55m = temp);
      };

      // ----------------------
      // HOUR handlers (1 - 24)
      // ----------------------

      const hour_00 = async () => {
        let temp = selected_00h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "00", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "00", hourTextBox);
        $$invalidate('selected_00h', selected_00h = temp);
      };

      const hour_1 = async () => {
        let temp = selected_01h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "1", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "1", hourTextBox);
        $$invalidate('selected_01h', selected_01h = temp);
      };

      const hour_2 = async () => {
        let temp = selected_02h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "2", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "2", hourTextBox);
        $$invalidate('selected_02h', selected_02h = temp);
      };

      const hour_3 = async () => {
        let temp = selected_03h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "3", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "3", hourTextBox);
        $$invalidate('selected_03h', selected_03h = temp);
      };

      const hour_4 = async () => {
        let temp = selected_04h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "4", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "4", hourTextBox);
        $$invalidate('selected_04h', selected_04h = temp);
      };

      const hour_5 = async () => {
        let temp = selected_05h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "5", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "5", hourTextBox);
        $$invalidate('selected_05h', selected_05h = temp);
      };

      const hour_6 = async () => {
        let temp = selected_06h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "6", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "6", hourTextBox);
        $$invalidate('selected_06h', selected_06h = temp);
      };

      const hour_7 = async () => {
        let temp = selected_07h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "7", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "7", hourTextBox);
        $$invalidate('selected_07h', selected_07h = temp);
      };

      const hour_8 = async () => {
        let temp = selected_08h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "8", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "8", hourTextBox);
        $$invalidate('selected_08h', selected_08h = temp);
      };

      const hour_9 = async () => {
        let temp = selected_09h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "09", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "09", hourTextBox);
        $$invalidate('selected_09h', selected_09h = temp);
      };

      const hour_10 = async () => {
        let temp = selected_10h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "10", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "10", hourTextBox);
        $$invalidate('selected_10h', selected_10h = temp);
      };

      const hour_11 = async () => {
        let temp = selected_11h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "11", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "11", hourTextBox);
        $$invalidate('selected_11h', selected_11h = temp);
      };

      const hour_12 = async () => {
        let temp = selected_12h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "12", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "12", hourTextBox);
        $$invalidate('selected_12h', selected_12h = temp);
      };

      const hour_13 = async () => {
        let temp = selected_02h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "13", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "13", hourTextBox);
        $$invalidate('selected_13h', selected_13h = temp);
      };

      const hour_14 = async () => {
        let temp = selected_14h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "14", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "14", hourTextBox);
        $$invalidate('selected_14h', selected_14h = temp);
      };

      const hour_15 = async () => {
        let temp = selected_15h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "15", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "15", hourTextBox);
        $$invalidate('selected_15h', selected_15h = temp);
      };

      const hour_16 = async () => {
        let temp = selected_16h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "16", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "16", hourTextBox);
        $$invalidate('selected_16h', selected_16h = temp);
      };

      const hour_17 = async () => {
        let temp = selected_17h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "17", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "17", hourTextBox);
        $$invalidate('selected_17h', selected_17h = temp);
      };

      const hour_18 = async () => {
        let temp = selected_18h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "18", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "18", hourTextBox);
        $$invalidate('selected_18h', selected_18h = temp);
      };

      const hour_19 = async () => {
        let temp = selected_19h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "19", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "19", hourTextBox);
        $$invalidate('selected_19h', selected_19h = temp);
      };

      const hour_20 = async () => {
        let temp = selected_20h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "20", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "20", hourTextBox);
        $$invalidate('selected_20h', selected_20h = temp);
      };

      const hour_21 = async () => {
        let temp = selected_21h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "21", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "21", hourTextBox);
        $$invalidate('selected_21h', selected_21h = temp);
      };

      const hour_22 = async () => {
        let temp = selected_22h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "22", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "22", hourTextBox);
        $$invalidate('selected_22h', selected_22h = temp);
      };

      const hour_23 = async () => {
        let temp = selected_23h === "" ? "circle-me" : "";
        await clearAllSelected();
        $$invalidate('hourdisplay', hourdisplay.innerHTML = "23", hourdisplay);
        $$invalidate('hourTextBox', hourTextBox.value = "23", hourTextBox);
        $$invalidate('selected_23h', selected_23h = temp);
      };

    	const writable_props = ['id', 'show', 'durationCapture', 'width', 'height', 'hour12card', 'hour24card', 'minutecard', 'durationcard', 'minutedisplay', 'hourdisplay', 'durationdisplay', 'durTextBox', 'hourTextBox', 'minuteTextBox', 'cmbBoxHour', 'cmbBoxMinute'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1.warn(`<modal-element> was created with unknown prop '${key}'`);
    	});

    	function span0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('durationdisplay', durationdisplay = $$value);
    		});
    	}

    	function span2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('hourdisplay', hourdisplay = $$value);
    		});
    	}

    	function span4_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('minutedisplay', minutedisplay = $$value);
    		});
    	}

    	function card0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('hour12card', hour12card = $$value);
    		});
    	}

    	function card1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('durationcard', durationcard = $$value);
    		});
    	}

    	function card2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('hour24card', hour24card = $$value);
    		});
    	}

    	function card3_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('minutecard', minutecard = $$value);
    		});
    	}

    	function input0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('durTextBox', durTextBox = $$value);
    		});
    	}

    	function input1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('hourTextBox', hourTextBox = $$value);
    		});
    	}

    	function input2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('minuteTextBox', minuteTextBox = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('show' in $$props) $$invalidate('show', show = $$props.show);
    		if ('durationCapture' in $$props) $$invalidate('durationCapture', durationCapture = $$props.durationCapture);
    		if ('width' in $$props) $$invalidate('width', width = $$props.width);
    		if ('height' in $$props) $$invalidate('height', height = $$props.height);
    		if ('hour12card' in $$props) $$invalidate('hour12card', hour12card = $$props.hour12card);
    		if ('hour24card' in $$props) $$invalidate('hour24card', hour24card = $$props.hour24card);
    		if ('minutecard' in $$props) $$invalidate('minutecard', minutecard = $$props.minutecard);
    		if ('durationcard' in $$props) $$invalidate('durationcard', durationcard = $$props.durationcard);
    		if ('minutedisplay' in $$props) $$invalidate('minutedisplay', minutedisplay = $$props.minutedisplay);
    		if ('hourdisplay' in $$props) $$invalidate('hourdisplay', hourdisplay = $$props.hourdisplay);
    		if ('durationdisplay' in $$props) $$invalidate('durationdisplay', durationdisplay = $$props.durationdisplay);
    		if ('durTextBox' in $$props) $$invalidate('durTextBox', durTextBox = $$props.durTextBox);
    		if ('hourTextBox' in $$props) $$invalidate('hourTextBox', hourTextBox = $$props.hourTextBox);
    		if ('minuteTextBox' in $$props) $$invalidate('minuteTextBox', minuteTextBox = $$props.minuteTextBox);
    		if ('cmbBoxHour' in $$props) $$invalidate('cmbBoxHour', cmbBoxHour = $$props.cmbBoxHour);
    		if ('cmbBoxMinute' in $$props) $$invalidate('cmbBoxMinute', cmbBoxMinute = $$props.cmbBoxMinute);
    	};

    	$$self.$capture_state = () => {
    		return { id, show, durationCapture, width, height, hour12card, hour24card, minutecard, durationcard, minutedisplay, hourdisplay, durationdisplay, durTextBox, hourTextBox, minuteTextBox, cmbBoxHour, cmbBoxMinute, closePath, selected_00m, selected_05m, selected_10m, selected_15m, selected_20m, selected_25m, selected_30m, selected_35m, selected_40m, selected_45m, selected_50m, selected_55m, selected_00h, selected_01h, selected_02h, selected_03h, selected_04h, selected_05h, selected_06h, selected_07h, selected_08h, selected_09h, selected_10h, selected_11h, selected_12h, selected_13h, selected_14h, selected_15h, selected_16h, selected_17h, selected_18h, selected_19h, selected_20h, selected_21h, selected_22h, selected_23h };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('show' in $$props) $$invalidate('show', show = $$props.show);
    		if ('durationCapture' in $$props) $$invalidate('durationCapture', durationCapture = $$props.durationCapture);
    		if ('width' in $$props) $$invalidate('width', width = $$props.width);
    		if ('height' in $$props) $$invalidate('height', height = $$props.height);
    		if ('hour12card' in $$props) $$invalidate('hour12card', hour12card = $$props.hour12card);
    		if ('hour24card' in $$props) $$invalidate('hour24card', hour24card = $$props.hour24card);
    		if ('minutecard' in $$props) $$invalidate('minutecard', minutecard = $$props.minutecard);
    		if ('durationcard' in $$props) $$invalidate('durationcard', durationcard = $$props.durationcard);
    		if ('minutedisplay' in $$props) $$invalidate('minutedisplay', minutedisplay = $$props.minutedisplay);
    		if ('hourdisplay' in $$props) $$invalidate('hourdisplay', hourdisplay = $$props.hourdisplay);
    		if ('durationdisplay' in $$props) $$invalidate('durationdisplay', durationdisplay = $$props.durationdisplay);
    		if ('durTextBox' in $$props) $$invalidate('durTextBox', durTextBox = $$props.durTextBox);
    		if ('hourTextBox' in $$props) $$invalidate('hourTextBox', hourTextBox = $$props.hourTextBox);
    		if ('minuteTextBox' in $$props) $$invalidate('minuteTextBox', minuteTextBox = $$props.minuteTextBox);
    		if ('cmbBoxHour' in $$props) $$invalidate('cmbBoxHour', cmbBoxHour = $$props.cmbBoxHour);
    		if ('cmbBoxMinute' in $$props) $$invalidate('cmbBoxMinute', cmbBoxMinute = $$props.cmbBoxMinute);
    		if ('closePath' in $$props) closePath = $$props.closePath;
    		if ('selected_00m' in $$props) $$invalidate('selected_00m', selected_00m = $$props.selected_00m);
    		if ('selected_05m' in $$props) $$invalidate('selected_05m', selected_05m = $$props.selected_05m);
    		if ('selected_10m' in $$props) $$invalidate('selected_10m', selected_10m = $$props.selected_10m);
    		if ('selected_15m' in $$props) $$invalidate('selected_15m', selected_15m = $$props.selected_15m);
    		if ('selected_20m' in $$props) $$invalidate('selected_20m', selected_20m = $$props.selected_20m);
    		if ('selected_25m' in $$props) $$invalidate('selected_25m', selected_25m = $$props.selected_25m);
    		if ('selected_30m' in $$props) $$invalidate('selected_30m', selected_30m = $$props.selected_30m);
    		if ('selected_35m' in $$props) $$invalidate('selected_35m', selected_35m = $$props.selected_35m);
    		if ('selected_40m' in $$props) $$invalidate('selected_40m', selected_40m = $$props.selected_40m);
    		if ('selected_45m' in $$props) $$invalidate('selected_45m', selected_45m = $$props.selected_45m);
    		if ('selected_50m' in $$props) $$invalidate('selected_50m', selected_50m = $$props.selected_50m);
    		if ('selected_55m' in $$props) $$invalidate('selected_55m', selected_55m = $$props.selected_55m);
    		if ('selected_00h' in $$props) $$invalidate('selected_00h', selected_00h = $$props.selected_00h);
    		if ('selected_01h' in $$props) $$invalidate('selected_01h', selected_01h = $$props.selected_01h);
    		if ('selected_02h' in $$props) $$invalidate('selected_02h', selected_02h = $$props.selected_02h);
    		if ('selected_03h' in $$props) $$invalidate('selected_03h', selected_03h = $$props.selected_03h);
    		if ('selected_04h' in $$props) $$invalidate('selected_04h', selected_04h = $$props.selected_04h);
    		if ('selected_05h' in $$props) $$invalidate('selected_05h', selected_05h = $$props.selected_05h);
    		if ('selected_06h' in $$props) $$invalidate('selected_06h', selected_06h = $$props.selected_06h);
    		if ('selected_07h' in $$props) $$invalidate('selected_07h', selected_07h = $$props.selected_07h);
    		if ('selected_08h' in $$props) $$invalidate('selected_08h', selected_08h = $$props.selected_08h);
    		if ('selected_09h' in $$props) $$invalidate('selected_09h', selected_09h = $$props.selected_09h);
    		if ('selected_10h' in $$props) $$invalidate('selected_10h', selected_10h = $$props.selected_10h);
    		if ('selected_11h' in $$props) $$invalidate('selected_11h', selected_11h = $$props.selected_11h);
    		if ('selected_12h' in $$props) $$invalidate('selected_12h', selected_12h = $$props.selected_12h);
    		if ('selected_13h' in $$props) $$invalidate('selected_13h', selected_13h = $$props.selected_13h);
    		if ('selected_14h' in $$props) $$invalidate('selected_14h', selected_14h = $$props.selected_14h);
    		if ('selected_15h' in $$props) $$invalidate('selected_15h', selected_15h = $$props.selected_15h);
    		if ('selected_16h' in $$props) $$invalidate('selected_16h', selected_16h = $$props.selected_16h);
    		if ('selected_17h' in $$props) $$invalidate('selected_17h', selected_17h = $$props.selected_17h);
    		if ('selected_18h' in $$props) $$invalidate('selected_18h', selected_18h = $$props.selected_18h);
    		if ('selected_19h' in $$props) $$invalidate('selected_19h', selected_19h = $$props.selected_19h);
    		if ('selected_20h' in $$props) $$invalidate('selected_20h', selected_20h = $$props.selected_20h);
    		if ('selected_21h' in $$props) $$invalidate('selected_21h', selected_21h = $$props.selected_21h);
    		if ('selected_22h' in $$props) $$invalidate('selected_22h', selected_22h = $$props.selected_22h);
    		if ('selected_23h' in $$props) $$invalidate('selected_23h', selected_23h = $$props.selected_23h);
    	};

    	return {
    		id,
    		show,
    		durationCapture,
    		width,
    		height,
    		hour12card,
    		hour24card,
    		minutecard,
    		durationcard,
    		minutedisplay,
    		hourdisplay,
    		durationdisplay,
    		durTextBox,
    		hourTextBox,
    		minuteTextBox,
    		cmbBoxHour,
    		cmbBoxMinute,
    		setDuration,
    		initializeTimePicker,
    		close,
    		selected_00m,
    		selected_05m,
    		selected_10m,
    		selected_15m,
    		selected_20m,
    		selected_25m,
    		selected_30m,
    		selected_35m,
    		selected_40m,
    		selected_45m,
    		selected_50m,
    		selected_55m,
    		selected_00h,
    		selected_01h,
    		selected_02h,
    		selected_03h,
    		selected_04h,
    		selected_05h,
    		selected_06h,
    		selected_07h,
    		selected_08h,
    		selected_09h,
    		selected_10h,
    		selected_11h,
    		selected_12h,
    		selected_13h,
    		selected_14h,
    		selected_15h,
    		selected_16h,
    		selected_17h,
    		selected_18h,
    		selected_19h,
    		selected_20h,
    		selected_21h,
    		selected_22h,
    		selected_23h,
    		durationpanel,
    		hour24panel,
    		minutepanel,
    		minute_00,
    		minute_05,
    		minute_10,
    		minute_15,
    		minute_20,
    		minute_25,
    		minute_30,
    		minute_35,
    		minute_40,
    		minute_45,
    		minute_50,
    		minute_55,
    		hour_00,
    		hour_1,
    		hour_2,
    		hour_3,
    		hour_4,
    		hour_5,
    		hour_6,
    		hour_7,
    		hour_8,
    		hour_9,
    		hour_10,
    		hour_11,
    		hour_12,
    		hour_13,
    		hour_14,
    		hour_15,
    		hour_16,
    		hour_17,
    		hour_18,
    		hour_19,
    		hour_20,
    		hour_21,
    		hour_22,
    		hour_23,
    		span0_binding,
    		span2_binding,
    		span4_binding,
    		card0_binding,
    		card1_binding,
    		card2_binding,
    		card3_binding,
    		input0_binding,
    		input1_binding,
    		input2_binding
    	};
    }

    class App extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>.modal{display:flex;max-width:100%;max-height:100%;position:fixed;z-index:100;left:50%;top:50%;transform:translate(-50%, -50%);background:white;box-shadow:0 0 60px 10px rgba(0, 0, 0, 0.1)}.modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;z-index:50;background:rgba(64, 63, 63, 0.6)}.modal-guts{position:absolute;top:0;left:0;width:100%;height:100%;overflow:auto;padding:20px 50px 20px 20px}.modal .close-button{position:absolute;z-index:1;top:15px;right:15px;cursor:pointer}*{box-sizing:border-box;margin:0;padding:0}.save-button{margin:0;position:absolute;-ms-transform:translateY(-50%);transform:translateY(-50%);margin:auto;text-align:center;width:90%;border:2px solid navy;padding:7px}.circle-me{position:relative;width:60px;line-height:60px;border-radius:50%;text-align:center;font-size:32px;background:black;color:#fff;z-index:9999}.digital-container{position:relative;width:350px;height:50px;text-align:center;font-family:"Roboto", sans-serif;font-size:50px;font-weight:bold;padding-bottom:5px}.watch-container{position:relative;width:350px;height:430px}.watch{position:absolute;width:95%;height:79%;border:1px solid rgb(195, 209, 219);background-color:rgb(240, 242, 242);border-radius:50%;left:2%;top:10%}.inner-watch{position:relative;width:68%;height:70%;border-radius:50%;background:rgb(195, 209, 219);border:1px solid rgb(210, 210, 210);left:15%;top:15%}.numbers{position:absolute;display:block;height:10%;width:99%;top:44%;left:0%;padding:12px 16px;z-index:1}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8IS0tIFxuVGhpcyB0ZWxscyB0aGUgU3ZlbHRlIGNvbXBpbGVyIHRoYXQgdGhpcyBmaWxlIGlzIGEgY3VzdG9tIGVsZW1lbnQuIFxuV2UgYWxzbyBoYXZlIHRvIGluY2x1ZGUgdGhlIFwiY3VzdG9tRWxlbWVudDogdHJ1ZVwiIGNvbXBpbGVyIHNldHRpbmcgaW4gcm9sbHVwIGNvbmZpZ3VyYXRpb24uXG4tLT5cbjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJtb2RhbC1lbGVtZW50XCIgLz5cblxuPHNjcmlwdD5cblxuICBpbXBvcnQgeyBmYWRlIH0gZnJvbSBcInN2ZWx0ZS90cmFuc2l0aW9uXCI7XG5cbiAgZXhwb3J0IGxldCBpZCA9IFwiXCI7XG4gIGV4cG9ydCBsZXQgc2hvdyA9IGZhbHNlO1xuICBleHBvcnQgbGV0IGR1cmF0aW9uQ2FwdHVyZSA9IHRydWU7XG4gIGV4cG9ydCBsZXQgd2lkdGggPSBcIjYwMHB4XCI7XG4gIGV4cG9ydCBsZXQgaGVpZ2h0ID0gXCI0MDBweFwiO1xuICBleHBvcnQgbGV0IGhvdXIxMmNhcmQ7XG4gIGV4cG9ydCBsZXQgaG91cjI0Y2FyZDtcbiAgZXhwb3J0IGxldCBtaW51dGVjYXJkO1xuICBleHBvcnQgbGV0IGR1cmF0aW9uY2FyZDtcbiAgZXhwb3J0IGxldCBtaW51dGVkaXNwbGF5O1xuICBleHBvcnQgbGV0IGhvdXJkaXNwbGF5O1xuICBleHBvcnQgbGV0IGR1cmF0aW9uZGlzcGxheTtcbiAgZXhwb3J0IGxldCBkdXJUZXh0Qm94O1xuICBleHBvcnQgbGV0IGhvdXJUZXh0Qm94O1xuICBleHBvcnQgbGV0IG1pbnV0ZVRleHRCb3g7XG4gIGV4cG9ydCBsZXQgY21iQm94SG91cjtcbiAgZXhwb3J0IGxldCBjbWJCb3hNaW51dGU7XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHNldER1cmF0aW9uKGNiZHIsIGNiaHIsIGNibW4pIHsgXG4gICAgXG4gICAgY29uc29sZS5sb2coY2Jkci52YWx1ZSwgY2Joci52YWx1ZSwgY2Jtbi52YWx1ZSk7XG5cbiAgICBkdXJUZXh0Qm94LnZhbHVlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NkdXJhdGlvbicpLnZhbHVlXG4gICAgaG91clRleHRCb3gudmFsdWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hvdXInKS52YWx1ZVxuICAgIG1pbnV0ZVRleHRCb3gudmFsdWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc21pbicpLnZhbHVlXG4gICAgXG4gICAgZHVyYXRpb25kaXNwbGF5LmlubmVySFRNTCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZHVyYXRpb24nKS52YWx1ZVxuICAgIGhvdXJkaXNwbGF5LmlubmVySFRNTCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaG91cicpLnZhbHVlXG4gICAgbWludXRlZGlzcGxheS5pbm5lckhUTUwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc21pbicpLnZhbHVlXG5cbiAgfVxuXG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGluaXRpYWxpemVUaW1lUGlja2VyKCl7XG4gICAgaG91cjI0cGFuZWwoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsb3NlKGUpIHtcbiBcbiAgICAvL2NvbnNvbGUubG9nKGR1clRleHRCb3gudmFsdWUsIGhvdXJUZXh0Qm94LnZhbHVlLCBtaW51dGVUZXh0Qm94LnZhbHVlKSAvL2RlYnVnXG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2R1cmF0aW9uJykudmFsdWUgPSBkdXJUZXh0Qm94LnZhbHVlO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaG91cicpLnZhbHVlID0gaG91clRleHRCb3gudmFsdWU7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NtaW4nKS52YWx1ZSA9IG1pbnV0ZVRleHRCb3gudmFsdWU7XG5cblxuICAgIGRpc3BhdGNoQ2xvc2VFdmVudC5jYWxsKHRoaXMsIGUpO1xuICAgIHNob3cgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRpc3BhdGNoQ2xvc2VFdmVudChlKSB7XG4gICAgLy8gMS4gQ3JlYXRlIHRoZSBjdXN0b20gZXZlbnQuXG4gICAgY29uc3QgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoXCJjbG9zZVwiLCB7XG4gICAgICBkZXRhaWw6IGBtb2RhbC1lbGVtZW50IHdhcyBjbG9zZWQuYCxcbiAgICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgY29tcG9zZWQ6IHRydWUsIC8vIG1ha2VzIHRoZSBldmVudCBqdW1wIHNoYWRvdyBET00gYm91bmRhcnlcbiAgICB9KTtcblxuICAgIC8vIDIuIERpc3BhdGNoIHRoZSBjdXN0b20gZXZlbnQuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgfVxuXG4gIGxldCBjbG9zZVBhdGggPSBgTTI4LjIyOCwyMy45ODZMNDcuMDkyLDUuMTIyYzEuMTcyLTEuMTcxLDEuMTcyLTMuMDcxLDAtNC4yNDJjLTEuMTcyLTEuMTcyLTMuMDctMS4xNzItNC4yNDIsMEwyMy45ODYsMTkuNzQ0TDUuMTIxLDAuODhcbiAgICAgICAgICBjLTEuMTcyLTEuMTcyLTMuMDctMS4xNzItNC4yNDIsMGMtMS4xNzIsMS4xNzEtMS4xNzIsMy4wNzEsMCw0LjI0MmwxOC44NjUsMTguODY0TDAuODc5LDQyLjg1Yy0xLjE3MiwxLjE3MS0xLjE3MiwzLjA3MSwwLDQuMjQyXG4gICAgICAgICAgQzEuNDY1LDQ3LjY3NywyLjIzMyw0Ny45NywzLDQ3Ljk3czEuNTM1LTAuMjkzLDIuMTIxLTAuODc5bDE4Ljg2NS0xOC44NjRMNDIuODUsNDcuMDkxYzAuNTg2LDAuNTg2LDEuMzU0LDAuODc5LDIuMTIxLDAuODc5XG4gICAgICAgICAgczEuNTM1LTAuMjkzLDIuMTIxLTAuODc5YzEuMTcyLTEuMTcxLDEuMTcyLTMuMDcxLDAtNC4yNDJMMjguMjI4LDIzLjk4NnpgO1xuXG4gIC8vIFRpbWUtUGlja2VyIGJlbG93XG5cbiAgLy8gYXBwbHkgQ1NTIHRvIHNlbGVjdGVkIG1pbnV0ZVxuICAvL1xuICBsZXQgc2VsZWN0ZWRfMDBtID0gXCJcIjtcbiAgbGV0IHNlbGVjdGVkXzA1bSA9IFwiXCI7XG4gIGxldCBzZWxlY3RlZF8xMG0gPSBcIlwiO1xuICBsZXQgc2VsZWN0ZWRfMTVtID0gXCJcIjtcbiAgbGV0IHNlbGVjdGVkXzIwbSA9IFwiXCI7XG4gIGxldCBzZWxlY3RlZF8yNW0gPSBcIlwiO1xuICBsZXQgc2VsZWN0ZWRfMzBtID0gXCJcIjtcbiAgbGV0IHNlbGVjdGVkXzM1bSA9IFwiXCI7XG4gIGxldCBzZWxlY3RlZF80MG0gPSBcIlwiO1xuICBsZXQgc2VsZWN0ZWRfNDVtID0gXCJcIjtcbiAgbGV0IHNlbGVjdGVkXzUwbSA9IFwiXCI7XG4gIGxldCBzZWxlY3RlZF81NW0gPSBcIlwiO1xuXG4gIC8vIGFwcGx5IENTUyB0byBzZWxlY3RlZCAxMi1ob3VyXG4gIC8vXG4gIGxldCBzZWxlY3RlZF8wMGggPSBcIlwiO1xuICBsZXQgc2VsZWN0ZWRfMDFoID0gXCJcIjtcbiAgbGV0IHNlbGVjdGVkXzAyaCA9IFwiXCI7XG4gIGxldCBzZWxlY3RlZF8wM2ggPSBcIlwiO1xuICBsZXQgc2VsZWN0ZWRfMDRoID0gXCJcIjtcbiAgbGV0IHNlbGVjdGVkXzA1aCA9IFwiXCI7XG4gIGxldCBzZWxlY3RlZF8wNmggPSBcIlwiO1xuICBsZXQgc2VsZWN0ZWRfMDdoID0gXCJcIjtcbiAgbGV0IHNlbGVjdGVkXzA4aCA9IFwiXCI7XG4gIGxldCBzZWxlY3RlZF8wOWggPSBcIlwiO1xuICBsZXQgc2VsZWN0ZWRfMTBoID0gXCJcIjtcbiAgbGV0IHNlbGVjdGVkXzExaCA9IFwiXCI7XG4gIGxldCBzZWxlY3RlZF8xMmggPSBcIlwiO1xuXG4gIC8vIGFwcGx5IENTUyB0byBzZWxlY3RlZCAyNC1ob3VyXG4gIC8vXG4gIGxldCBzZWxlY3RlZF8xM2ggPSBcIlwiO1xuICBsZXQgc2VsZWN0ZWRfMTRoID0gXCJcIjtcbiAgbGV0IHNlbGVjdGVkXzE1aCA9IFwiXCI7XG4gIGxldCBzZWxlY3RlZF8xNmggPSBcIlwiO1xuICBsZXQgc2VsZWN0ZWRfMTdoID0gXCJcIjtcbiAgbGV0IHNlbGVjdGVkXzE4aCA9IFwiXCI7XG4gIGxldCBzZWxlY3RlZF8xOWggPSBcIlwiO1xuICBsZXQgc2VsZWN0ZWRfMjBoID0gXCJcIjtcbiAgbGV0IHNlbGVjdGVkXzIxaCA9IFwiXCI7XG4gIGxldCBzZWxlY3RlZF8yMmggPSBcIlwiO1xuICBsZXQgc2VsZWN0ZWRfMjNoID0gXCJcIjtcblxuICBjb25zdCBjbGVhckFsbFNlbGVjdGVkID0gYXN5bmMgKCkgPT4ge1xuICAgIHNlbGVjdGVkXzAwbSA9IFwiXCI7XG4gICAgc2VsZWN0ZWRfMDVtID0gXCJcIjtcbiAgICBzZWxlY3RlZF8xMG0gPSBcIlwiO1xuICAgIHNlbGVjdGVkXzE1bSA9IFwiXCI7XG4gICAgc2VsZWN0ZWRfMjBtID0gXCJcIjtcbiAgICBzZWxlY3RlZF8yNW0gPSBcIlwiO1xuICAgIHNlbGVjdGVkXzMwbSA9IFwiXCI7XG4gICAgc2VsZWN0ZWRfMzVtID0gXCJcIjtcbiAgICBzZWxlY3RlZF80MG0gPSBcIlwiO1xuICAgIHNlbGVjdGVkXzQ1bSA9IFwiXCI7XG4gICAgc2VsZWN0ZWRfNTBtID0gXCJcIjtcbiAgICBzZWxlY3RlZF81NW0gPSBcIlwiO1xuXG4gICAgc2VsZWN0ZWRfMDBoID0gXCJcIjtcbiAgICBzZWxlY3RlZF8wMWggPSBcIlwiO1xuICAgIHNlbGVjdGVkXzAyaCA9IFwiXCI7XG4gICAgc2VsZWN0ZWRfMDNoID0gXCJcIjtcbiAgICBzZWxlY3RlZF8wNGggPSBcIlwiO1xuICAgIHNlbGVjdGVkXzA1aCA9IFwiXCI7XG4gICAgc2VsZWN0ZWRfMDZoID0gXCJcIjtcbiAgICBzZWxlY3RlZF8wN2ggPSBcIlwiO1xuICAgIHNlbGVjdGVkXzA4aCA9IFwiXCI7XG4gICAgc2VsZWN0ZWRfMDloID0gXCJcIjtcbiAgICBzZWxlY3RlZF8xMGggPSBcIlwiO1xuICAgIHNlbGVjdGVkXzExaCA9IFwiXCI7XG4gICAgc2VsZWN0ZWRfMTJoID0gXCJcIjtcblxuICAgIHNlbGVjdGVkXzEzaCA9IFwiXCI7XG4gICAgc2VsZWN0ZWRfMTRoID0gXCJcIjtcbiAgICBzZWxlY3RlZF8xNWggPSBcIlwiO1xuICAgIHNlbGVjdGVkXzE2aCA9IFwiXCI7XG4gICAgc2VsZWN0ZWRfMTdoID0gXCJcIjtcbiAgICBzZWxlY3RlZF8xOGggPSBcIlwiO1xuICAgIHNlbGVjdGVkXzE5aCA9IFwiXCI7XG4gICAgc2VsZWN0ZWRfMjBoID0gXCJcIjtcbiAgICBzZWxlY3RlZF8yMWggPSBcIlwiO1xuICAgIHNlbGVjdGVkXzIyaCA9IFwiXCI7XG4gICAgc2VsZWN0ZWRfMjNoID0gXCJcIjtcbiAgfTtcblxuXG4gIGNvbnN0IGR1cmF0aW9ucGFuZWwgPSAoKSA9PiB7XG4gICAgLy9jb25zb2xlLmxvZygnYXNkZicpXG4gICAgXG4gICAvLyQ6IGR1cmF0aW9uQ2FwdHVyZSA9ICFkdXJhdGlvbkNhcHR1cmU7XG5cbiAgIGR1cmF0aW9uQ2FwdHVyZSA9IHRydWU7XG4gICAgaG91cjEyY2FyZC5oaWRkZW4gPSBmYWxzZTtcbiAgICBob3VyMjRjYXJkLmhpZGRlbiA9IGZhbHNlO1xuICAgIG1pbnV0ZWNhcmQuaGlkZGVuID0gdHJ1ZTtcblxuICAgIGhvdXIyNGNhcmQuc3R5bGUuY29sb3IgPSBcIndoaXRlXCI7XG4gICAgbWludXRlY2FyZC5zdHlsZS5jb2xvciA9IFwiI2M3OTM5NVwiO1xuICAgIGhvdXIxMmNhcmQuc3R5bGUuY29sb3IgPSBcInB1cnBsZVwiO1xuXG4gICAgLy9IZWFkZXIgRGlzcGxheVxuICAgIG1pbnV0ZWRpc3BsYXkuc3R5bGUuY29sb3IgPSBcIiNlM2NjNTlcIjtcbiAgICBob3VyZGlzcGxheS5zdHlsZS5jb2xvciA9IFwiI2UzY2M1OVwiO1xuICAgIGR1cmF0aW9uZGlzcGxheS5zdHlsZS5jb2xvciA9IFwiIzk4NTNjOVwiO1xuXG4gIH07XG5cblxuICBjb25zdCBob3VyMjRwYW5lbCA9ICgpID0+IHtcbiAgICBkdXJhdGlvbkNhcHR1cmUgPSBmYWxzZTtcbiAgICBob3VyMTJjYXJkLmhpZGRlbiA9IGZhbHNlO1xuICAgIGhvdXIyNGNhcmQuaGlkZGVuID0gZmFsc2U7XG4gICAgbWludXRlY2FyZC5oaWRkZW4gPSB0cnVlO1xuXG4gICAgaG91cjI0Y2FyZC5zdHlsZS5jb2xvciA9IFwid2hpdGVcIjtcbiAgICBtaW51dGVjYXJkLnN0eWxlLmNvbG9yID0gXCIjZWI0MDM0XCI7XG4gICAgaG91cjEyY2FyZC5zdHlsZS5jb2xvciA9IFwiZ3JlZW5cIjtcblxuICAgIC8vSGVhZGVyIERpc3BsYXlcbiAgICBkdXJhdGlvbmRpc3BsYXkuc3R5bGUuY29sb3IgPSBcIiNlM2NjNTlcIjtcbiAgICBtaW51dGVkaXNwbGF5LnN0eWxlLmNvbG9yID0gXCIjZTNjYzU5XCI7XG4gICAgaG91cmRpc3BsYXkuc3R5bGUuY29sb3IgPSBcIiM5ODUzYzlcIjtcblxuICB9OyAvL2hvdXIyNHBhbmVsXG5cbiAgY29uc3QgbWludXRlcGFuZWwgPSAoKSA9PiB7XG4gICAgZHVyYXRpb25DYXB0dXJlID0gZmFsc2U7XG4gICAgLy8gc2hvdyBNaW51dGVzIFBhbmVsIE9ubHlcbiAgICBob3VyMTJjYXJkLmhpZGRlbiA9IHRydWU7XG4gICAgaG91cjI0Y2FyZC5oaWRkZW4gPSB0cnVlO1xuICAgIG1pbnV0ZWNhcmQuaGlkZGVuID0gZmFsc2U7XG4gICAgZHVyYXRpb25kaXNwbGF5LnN0eWxlLmNvbG9yID0gXCIjZTNjYzU5XCI7XG4gICAgaG91cmRpc3BsYXkuc3R5bGUuY29sb3IgPSBcIiNlM2NjNTlcIjtcbiAgICBtaW51dGVkaXNwbGF5LnN0eWxlLmNvbG9yID0gXCIjOTg1M2M5XCI7XG4gIH07XG5cblxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIERVUkFUSU9OIGhhbmRsZXJzICgxIC0gMjQpXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgY29uc3QgZHVyYXRpb25fMDAgPSBhc3luYyAoKSA9PiB7XG4gICAgbGV0IHRlbXAgPSBzZWxlY3RlZF8wMGggPT09IFwiXCIgPyBcImNpcmNsZS1tZVwiIDogXCJcIjtcbiAgICBhd2FpdCBjbGVhckFsbFNlbGVjdGVkKCk7XG4gICAgZHVyYXRpb25kaXNwbGF5LmlubmVySFRNTCA9IFwiMDBcIjtcbiAgICBkdXJUZXh0Qm94LnZhbHVlID0gXCIwMFwiO1xuICAgIHNlbGVjdGVkXzAwaCA9IHRlbXA7XG4gIH07XG5cblxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBNSU5VVEUgaGFuZGxlcnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGNvbnN0IG1pbnV0ZV8wMCA9IGFzeW5jICgpID0+IHtcbiAgICBsZXQgdGVtcCA9IHNlbGVjdGVkXzAwbSA9PT0gXCJcIiA/IFwiY2lyY2xlLW1lXCIgOiBcIlwiO1xuICAgIGF3YWl0IGNsZWFyQWxsU2VsZWN0ZWQoKTtcbiAgICBtaW51dGVkaXNwbGF5LmlubmVySFRNTCA9IFwiMDBcIjtcbiAgICBtaW51dGVUZXh0Qm94LnZhbHVlID0gXCIwMFwiO1xuICAgIHNlbGVjdGVkXzAwbSA9IHRlbXA7XG4gIH07XG5cbiAgY29uc3QgbWludXRlXzA1ID0gYXN5bmMgKCkgPT4ge1xuICAgIGxldCB0ZW1wID0gc2VsZWN0ZWRfMDVtID09PSBcIlwiID8gXCJjaXJjbGUtbWVcIiA6IFwiXCI7XG4gICAgYXdhaXQgY2xlYXJBbGxTZWxlY3RlZCgpO1xuICAgIG1pbnV0ZWRpc3BsYXkuaW5uZXJIVE1MID0gXCIwNVwiO1xuICAgIG1pbnV0ZVRleHRCb3gudmFsdWUgPSBcIjA1XCI7XG4gICAgc2VsZWN0ZWRfMDVtID0gdGVtcDtcbiAgfTtcblxuICBjb25zdCBtaW51dGVfMTAgPSBhc3luYyAoKSA9PiB7XG4gICAgbGV0IHRlbXAgPSBzZWxlY3RlZF8xMG0gPT09IFwiXCIgPyBcImNpcmNsZS1tZVwiIDogXCJcIjtcbiAgICBhd2FpdCBjbGVhckFsbFNlbGVjdGVkKCk7XG4gICAgbWludXRlZGlzcGxheS5pbm5lckhUTUwgPSBcIjEwXCI7XG4gICAgbWludXRlVGV4dEJveC52YWx1ZSA9IFwiMTBcIjtcbiAgICBzZWxlY3RlZF8xMG0gPSB0ZW1wO1xuICB9O1xuXG4gIGNvbnN0IG1pbnV0ZV8xNSA9IGFzeW5jICgpID0+IHtcbiAgICBsZXQgdGVtcCA9IHNlbGVjdGVkXzE1bSA9PT0gXCJcIiA/IFwiY2lyY2xlLW1lXCIgOiBcIlwiO1xuICAgIGF3YWl0IGNsZWFyQWxsU2VsZWN0ZWQoKTtcbiAgICBtaW51dGVkaXNwbGF5LmlubmVySFRNTCA9IFwiMTVcIjtcbiAgICBtaW51dGVUZXh0Qm94LnZhbHVlID0gXCIxNVwiO1xuICAgIHNlbGVjdGVkXzE1bSA9IHRlbXA7XG4gIH07XG5cbiAgY29uc3QgbWludXRlXzIwID0gYXN5bmMgKCkgPT4ge1xuICAgIGxldCB0ZW1wID0gc2VsZWN0ZWRfMjBtID09PSBcIlwiID8gXCJjaXJjbGUtbWVcIiA6IFwiXCI7XG4gICAgYXdhaXQgY2xlYXJBbGxTZWxlY3RlZCgpO1xuICAgIG1pbnV0ZWRpc3BsYXkuaW5uZXJIVE1MID0gXCIyMFwiO1xuICAgIG1pbnV0ZVRleHRCb3gudmFsdWUgPSBcIjIwXCI7XG4gICAgc2VsZWN0ZWRfMjBtID0gdGVtcDtcbiAgfTtcblxuICBjb25zdCBtaW51dGVfMjUgPSBhc3luYyAoKSA9PiB7XG4gICAgbGV0IHRlbXAgPSBzZWxlY3RlZF8yNW0gPT09IFwiXCIgPyBcImNpcmNsZS1tZVwiIDogXCJcIjtcbiAgICBhd2FpdCBjbGVhckFsbFNlbGVjdGVkKCk7XG4gICAgbWludXRlZGlzcGxheS5pbm5lckhUTUwgPSBcIjI1XCI7XG4gICAgbWludXRlVGV4dEJveC52YWx1ZSA9IFwiMjVcIjtcbiAgICBzZWxlY3RlZF8yNW0gPSB0ZW1wO1xuICB9O1xuXG4gIGNvbnN0IG1pbnV0ZV8zMCA9IGFzeW5jICgpID0+IHtcbiAgICBsZXQgdGVtcCA9IHNlbGVjdGVkXzMwbSA9PT0gXCJcIiA/IFwiY2lyY2xlLW1lXCIgOiBcIlwiO1xuICAgIGF3YWl0IGNsZWFyQWxsU2VsZWN0ZWQoKTtcbiAgICBtaW51dGVkaXNwbGF5LmlubmVySFRNTCA9IFwiMzBcIjtcbiAgICBtaW51dGVUZXh0Qm94LnZhbHVlID0gXCIzMFwiO1xuICAgIHNlbGVjdGVkXzMwbSA9IHRlbXA7XG4gIH07XG5cbiAgY29uc3QgbWludXRlXzM1ID0gYXN5bmMgKCkgPT4ge1xuICAgIGxldCB0ZW1wID0gc2VsZWN0ZWRfMzVtID09PSBcIlwiID8gXCJjaXJjbGUtbWVcIiA6IFwiXCI7XG4gICAgYXdhaXQgY2xlYXJBbGxTZWxlY3RlZCgpO1xuICAgIG1pbnV0ZWRpc3BsYXkuaW5uZXJIVE1MID0gXCIzNVwiO1xuICAgIG1pbnV0ZVRleHRCb3gudmFsdWUgPSBcIjM1XCI7XG4gICAgc2VsZWN0ZWRfMzVtID0gdGVtcDtcbiAgfTtcblxuICBjb25zdCBtaW51dGVfNDAgPSBhc3luYyAoKSA9PiB7XG4gICAgbGV0IHRlbXAgPSBzZWxlY3RlZF80MG0gPT09IFwiXCIgPyBcImNpcmNsZS1tZVwiIDogXCJcIjtcbiAgICBhd2FpdCBjbGVhckFsbFNlbGVjdGVkKCk7XG4gICAgbWludXRlZGlzcGxheS5pbm5lckhUTUwgPSBcIjQwXCI7XG4gICAgbWludXRlVGV4dEJveC52YWx1ZSA9IFwiNDBcIjtcbiAgICBzZWxlY3RlZF80MG0gPSB0ZW1wO1xuICB9O1xuXG4gIGNvbnN0IG1pbnV0ZV80NSA9IGFzeW5jICgpID0+IHtcbiAgICBsZXQgdGVtcCA9IHNlbGVjdGVkXzQ1bSA9PT0gXCJcIiA/IFwiY2lyY2xlLW1lXCIgOiBcIlwiO1xuICAgIGF3YWl0IGNsZWFyQWxsU2VsZWN0ZWQoKTtcbiAgICBtaW51dGVkaXNwbGF5LmlubmVySFRNTCA9IFwiNDVcIjtcbiAgICBtaW51dGVUZXh0Qm94LnZhbHVlID0gXCI0NVwiO1xuICAgIHNlbGVjdGVkXzQ1bSA9IHRlbXA7XG4gIH07XG5cbiAgY29uc3QgbWludXRlXzUwID0gYXN5bmMgKCkgPT4ge1xuICAgIGxldCB0ZW1wID0gc2VsZWN0ZWRfNTBtID09PSBcIlwiID8gXCJjaXJjbGUtbWVcIiA6IFwiXCI7XG4gICAgYXdhaXQgY2xlYXJBbGxTZWxlY3RlZCgpO1xuICAgIG1pbnV0ZWRpc3BsYXkuaW5uZXJIVE1MID0gXCI1MFwiO1xuICAgIG1pbnV0ZVRleHRCb3gudmFsdWUgPSBcIjUwXCI7XG4gICAgc2VsZWN0ZWRfNTBtID0gdGVtcDtcbiAgfTtcblxuICBjb25zdCBtaW51dGVfNTUgPSBhc3luYyAoKSA9PiB7XG4gICAgbGV0IHRlbXAgPSBzZWxlY3RlZF81NW0gPT09IFwiXCIgPyBcImNpcmNsZS1tZVwiIDogXCJcIjtcbiAgICBhd2FpdCBjbGVhckFsbFNlbGVjdGVkKCk7XG4gICAgbWludXRlZGlzcGxheS5pbm5lckhUTUwgPSBcIjU1XCI7XG4gICAgbWludXRlVGV4dEJveC52YWx1ZSA9IFwiNTVcIjtcbiAgICBzZWxlY3RlZF81NW0gPSB0ZW1wO1xuICB9O1xuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gSE9VUiBoYW5kbGVycyAoMSAtIDI0KVxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgY29uc3QgaG91cl8wMCA9IGFzeW5jICgpID0+IHtcbiAgICBsZXQgdGVtcCA9IHNlbGVjdGVkXzAwaCA9PT0gXCJcIiA/IFwiY2lyY2xlLW1lXCIgOiBcIlwiO1xuICAgIGF3YWl0IGNsZWFyQWxsU2VsZWN0ZWQoKTtcbiAgICBob3VyZGlzcGxheS5pbm5lckhUTUwgPSBcIjAwXCI7XG4gICAgaG91clRleHRCb3gudmFsdWUgPSBcIjAwXCI7XG4gICAgc2VsZWN0ZWRfMDBoID0gdGVtcDtcbiAgfTtcblxuICBjb25zdCBob3VyXzEgPSBhc3luYyAoKSA9PiB7XG4gICAgbGV0IHRlbXAgPSBzZWxlY3RlZF8wMWggPT09IFwiXCIgPyBcImNpcmNsZS1tZVwiIDogXCJcIjtcbiAgICBhd2FpdCBjbGVhckFsbFNlbGVjdGVkKCk7XG4gICAgaG91cmRpc3BsYXkuaW5uZXJIVE1MID0gXCIxXCI7XG4gICAgaG91clRleHRCb3gudmFsdWUgPSBcIjFcIjtcbiAgICBzZWxlY3RlZF8wMWggPSB0ZW1wO1xuICB9O1xuXG4gIGNvbnN0IGhvdXJfMiA9IGFzeW5jICgpID0+IHtcbiAgICBsZXQgdGVtcCA9IHNlbGVjdGVkXzAyaCA9PT0gXCJcIiA/IFwiY2lyY2xlLW1lXCIgOiBcIlwiO1xuICAgIGF3YWl0IGNsZWFyQWxsU2VsZWN0ZWQoKTtcbiAgICBob3VyZGlzcGxheS5pbm5lckhUTUwgPSBcIjJcIjtcbiAgICBob3VyVGV4dEJveC52YWx1ZSA9IFwiMlwiO1xuICAgIHNlbGVjdGVkXzAyaCA9IHRlbXA7XG4gIH07XG5cbiAgY29uc3QgaG91cl8zID0gYXN5bmMgKCkgPT4ge1xuICAgIGxldCB0ZW1wID0gc2VsZWN0ZWRfMDNoID09PSBcIlwiID8gXCJjaXJjbGUtbWVcIiA6IFwiXCI7XG4gICAgYXdhaXQgY2xlYXJBbGxTZWxlY3RlZCgpO1xuICAgIGhvdXJkaXNwbGF5LmlubmVySFRNTCA9IFwiM1wiO1xuICAgIGhvdXJUZXh0Qm94LnZhbHVlID0gXCIzXCI7XG4gICAgc2VsZWN0ZWRfMDNoID0gdGVtcDtcbiAgfTtcblxuICBjb25zdCBob3VyXzQgPSBhc3luYyAoKSA9PiB7XG4gICAgbGV0IHRlbXAgPSBzZWxlY3RlZF8wNGggPT09IFwiXCIgPyBcImNpcmNsZS1tZVwiIDogXCJcIjtcbiAgICBhd2FpdCBjbGVhckFsbFNlbGVjdGVkKCk7XG4gICAgaG91cmRpc3BsYXkuaW5uZXJIVE1MID0gXCI0XCI7XG4gICAgaG91clRleHRCb3gudmFsdWUgPSBcIjRcIjtcbiAgICBzZWxlY3RlZF8wNGggPSB0ZW1wO1xuICB9O1xuXG4gIGNvbnN0IGhvdXJfNSA9IGFzeW5jICgpID0+IHtcbiAgICBsZXQgdGVtcCA9IHNlbGVjdGVkXzA1aCA9PT0gXCJcIiA/IFwiY2lyY2xlLW1lXCIgOiBcIlwiO1xuICAgIGF3YWl0IGNsZWFyQWxsU2VsZWN0ZWQoKTtcbiAgICBob3VyZGlzcGxheS5pbm5lckhUTUwgPSBcIjVcIjtcbiAgICBob3VyVGV4dEJveC52YWx1ZSA9IFwiNVwiO1xuICAgIHNlbGVjdGVkXzA1aCA9IHRlbXA7XG4gIH07XG5cbiAgY29uc3QgaG91cl82ID0gYXN5bmMgKCkgPT4ge1xuICAgIGxldCB0ZW1wID0gc2VsZWN0ZWRfMDZoID09PSBcIlwiID8gXCJjaXJjbGUtbWVcIiA6IFwiXCI7XG4gICAgYXdhaXQgY2xlYXJBbGxTZWxlY3RlZCgpO1xuICAgIGhvdXJkaXNwbGF5LmlubmVySFRNTCA9IFwiNlwiO1xuICAgIGhvdXJUZXh0Qm94LnZhbHVlID0gXCI2XCI7XG4gICAgc2VsZWN0ZWRfMDZoID0gdGVtcDtcbiAgfTtcblxuICBjb25zdCBob3VyXzcgPSBhc3luYyAoKSA9PiB7XG4gICAgbGV0IHRlbXAgPSBzZWxlY3RlZF8wN2ggPT09IFwiXCIgPyBcImNpcmNsZS1tZVwiIDogXCJcIjtcbiAgICBhd2FpdCBjbGVhckFsbFNlbGVjdGVkKCk7XG4gICAgaG91cmRpc3BsYXkuaW5uZXJIVE1MID0gXCI3XCI7XG4gICAgaG91clRleHRCb3gudmFsdWUgPSBcIjdcIjtcbiAgICBzZWxlY3RlZF8wN2ggPSB0ZW1wO1xuICB9O1xuXG4gIGNvbnN0IGhvdXJfOCA9IGFzeW5jICgpID0+IHtcbiAgICBsZXQgdGVtcCA9IHNlbGVjdGVkXzA4aCA9PT0gXCJcIiA/IFwiY2lyY2xlLW1lXCIgOiBcIlwiO1xuICAgIGF3YWl0IGNsZWFyQWxsU2VsZWN0ZWQoKTtcbiAgICBob3VyZGlzcGxheS5pbm5lckhUTUwgPSBcIjhcIjtcbiAgICBob3VyVGV4dEJveC52YWx1ZSA9IFwiOFwiO1xuICAgIHNlbGVjdGVkXzA4aCA9IHRlbXA7XG4gIH07XG5cbiAgY29uc3QgaG91cl85ID0gYXN5bmMgKCkgPT4ge1xuICAgIGxldCB0ZW1wID0gc2VsZWN0ZWRfMDloID09PSBcIlwiID8gXCJjaXJjbGUtbWVcIiA6IFwiXCI7XG4gICAgYXdhaXQgY2xlYXJBbGxTZWxlY3RlZCgpO1xuICAgIGhvdXJkaXNwbGF5LmlubmVySFRNTCA9IFwiMDlcIjtcbiAgICBob3VyVGV4dEJveC52YWx1ZSA9IFwiMDlcIjtcbiAgICBzZWxlY3RlZF8wOWggPSB0ZW1wO1xuICB9O1xuXG4gIGNvbnN0IGhvdXJfMTAgPSBhc3luYyAoKSA9PiB7XG4gICAgbGV0IHRlbXAgPSBzZWxlY3RlZF8xMGggPT09IFwiXCIgPyBcImNpcmNsZS1tZVwiIDogXCJcIjtcbiAgICBhd2FpdCBjbGVhckFsbFNlbGVjdGVkKCk7XG4gICAgaG91cmRpc3BsYXkuaW5uZXJIVE1MID0gXCIxMFwiO1xuICAgIGhvdXJUZXh0Qm94LnZhbHVlID0gXCIxMFwiO1xuICAgIHNlbGVjdGVkXzEwaCA9IHRlbXA7XG4gIH07XG5cbiAgY29uc3QgaG91cl8xMSA9IGFzeW5jICgpID0+IHtcbiAgICBsZXQgdGVtcCA9IHNlbGVjdGVkXzExaCA9PT0gXCJcIiA/IFwiY2lyY2xlLW1lXCIgOiBcIlwiO1xuICAgIGF3YWl0IGNsZWFyQWxsU2VsZWN0ZWQoKTtcbiAgICBob3VyZGlzcGxheS5pbm5lckhUTUwgPSBcIjExXCI7XG4gICAgaG91clRleHRCb3gudmFsdWUgPSBcIjExXCI7XG4gICAgc2VsZWN0ZWRfMTFoID0gdGVtcDtcbiAgfTtcblxuICBjb25zdCBob3VyXzEyID0gYXN5bmMgKCkgPT4ge1xuICAgIGxldCB0ZW1wID0gc2VsZWN0ZWRfMTJoID09PSBcIlwiID8gXCJjaXJjbGUtbWVcIiA6IFwiXCI7XG4gICAgYXdhaXQgY2xlYXJBbGxTZWxlY3RlZCgpO1xuICAgIGhvdXJkaXNwbGF5LmlubmVySFRNTCA9IFwiMTJcIjtcbiAgICBob3VyVGV4dEJveC52YWx1ZSA9IFwiMTJcIjtcbiAgICBzZWxlY3RlZF8xMmggPSB0ZW1wO1xuICB9O1xuXG4gIGNvbnN0IGhvdXJfMTMgPSBhc3luYyAoKSA9PiB7XG4gICAgbGV0IHRlbXAgPSBzZWxlY3RlZF8wMmggPT09IFwiXCIgPyBcImNpcmNsZS1tZVwiIDogXCJcIjtcbiAgICBhd2FpdCBjbGVhckFsbFNlbGVjdGVkKCk7XG4gICAgaG91cmRpc3BsYXkuaW5uZXJIVE1MID0gXCIxM1wiO1xuICAgIGhvdXJUZXh0Qm94LnZhbHVlID0gXCIxM1wiO1xuICAgIHNlbGVjdGVkXzEzaCA9IHRlbXA7XG4gIH07XG5cbiAgY29uc3QgaG91cl8xNCA9IGFzeW5jICgpID0+IHtcbiAgICBsZXQgdGVtcCA9IHNlbGVjdGVkXzE0aCA9PT0gXCJcIiA/IFwiY2lyY2xlLW1lXCIgOiBcIlwiO1xuICAgIGF3YWl0IGNsZWFyQWxsU2VsZWN0ZWQoKTtcbiAgICBob3VyZGlzcGxheS5pbm5lckhUTUwgPSBcIjE0XCI7XG4gICAgaG91clRleHRCb3gudmFsdWUgPSBcIjE0XCI7XG4gICAgc2VsZWN0ZWRfMTRoID0gdGVtcDtcbiAgfTtcblxuICBjb25zdCBob3VyXzE1ID0gYXN5bmMgKCkgPT4ge1xuICAgIGxldCB0ZW1wID0gc2VsZWN0ZWRfMTVoID09PSBcIlwiID8gXCJjaXJjbGUtbWVcIiA6IFwiXCI7XG4gICAgYXdhaXQgY2xlYXJBbGxTZWxlY3RlZCgpO1xuICAgIGhvdXJkaXNwbGF5LmlubmVySFRNTCA9IFwiMTVcIjtcbiAgICBob3VyVGV4dEJveC52YWx1ZSA9IFwiMTVcIjtcbiAgICBzZWxlY3RlZF8xNWggPSB0ZW1wO1xuICB9O1xuXG4gIGNvbnN0IGhvdXJfMTYgPSBhc3luYyAoKSA9PiB7XG4gICAgbGV0IHRlbXAgPSBzZWxlY3RlZF8xNmggPT09IFwiXCIgPyBcImNpcmNsZS1tZVwiIDogXCJcIjtcbiAgICBhd2FpdCBjbGVhckFsbFNlbGVjdGVkKCk7XG4gICAgaG91cmRpc3BsYXkuaW5uZXJIVE1MID0gXCIxNlwiO1xuICAgIGhvdXJUZXh0Qm94LnZhbHVlID0gXCIxNlwiO1xuICAgIHNlbGVjdGVkXzE2aCA9IHRlbXA7XG4gIH07XG5cbiAgY29uc3QgaG91cl8xNyA9IGFzeW5jICgpID0+IHtcbiAgICBsZXQgdGVtcCA9IHNlbGVjdGVkXzE3aCA9PT0gXCJcIiA/IFwiY2lyY2xlLW1lXCIgOiBcIlwiO1xuICAgIGF3YWl0IGNsZWFyQWxsU2VsZWN0ZWQoKTtcbiAgICBob3VyZGlzcGxheS5pbm5lckhUTUwgPSBcIjE3XCI7XG4gICAgaG91clRleHRCb3gudmFsdWUgPSBcIjE3XCI7XG4gICAgc2VsZWN0ZWRfMTdoID0gdGVtcDtcbiAgfTtcblxuICBjb25zdCBob3VyXzE4ID0gYXN5bmMgKCkgPT4ge1xuICAgIGxldCB0ZW1wID0gc2VsZWN0ZWRfMThoID09PSBcIlwiID8gXCJjaXJjbGUtbWVcIiA6IFwiXCI7XG4gICAgYXdhaXQgY2xlYXJBbGxTZWxlY3RlZCgpO1xuICAgIGhvdXJkaXNwbGF5LmlubmVySFRNTCA9IFwiMThcIjtcbiAgICBob3VyVGV4dEJveC52YWx1ZSA9IFwiMThcIjtcbiAgICBzZWxlY3RlZF8xOGggPSB0ZW1wO1xuICB9O1xuXG4gIGNvbnN0IGhvdXJfMTkgPSBhc3luYyAoKSA9PiB7XG4gICAgbGV0IHRlbXAgPSBzZWxlY3RlZF8xOWggPT09IFwiXCIgPyBcImNpcmNsZS1tZVwiIDogXCJcIjtcbiAgICBhd2FpdCBjbGVhckFsbFNlbGVjdGVkKCk7XG4gICAgaG91cmRpc3BsYXkuaW5uZXJIVE1MID0gXCIxOVwiO1xuICAgIGhvdXJUZXh0Qm94LnZhbHVlID0gXCIxOVwiO1xuICAgIHNlbGVjdGVkXzE5aCA9IHRlbXA7XG4gIH07XG5cbiAgY29uc3QgaG91cl8yMCA9IGFzeW5jICgpID0+IHtcbiAgICBsZXQgdGVtcCA9IHNlbGVjdGVkXzIwaCA9PT0gXCJcIiA/IFwiY2lyY2xlLW1lXCIgOiBcIlwiO1xuICAgIGF3YWl0IGNsZWFyQWxsU2VsZWN0ZWQoKTtcbiAgICBob3VyZGlzcGxheS5pbm5lckhUTUwgPSBcIjIwXCI7XG4gICAgaG91clRleHRCb3gudmFsdWUgPSBcIjIwXCI7XG4gICAgc2VsZWN0ZWRfMjBoID0gdGVtcDtcbiAgfTtcblxuICBjb25zdCBob3VyXzIxID0gYXN5bmMgKCkgPT4ge1xuICAgIGxldCB0ZW1wID0gc2VsZWN0ZWRfMjFoID09PSBcIlwiID8gXCJjaXJjbGUtbWVcIiA6IFwiXCI7XG4gICAgYXdhaXQgY2xlYXJBbGxTZWxlY3RlZCgpO1xuICAgIGhvdXJkaXNwbGF5LmlubmVySFRNTCA9IFwiMjFcIjtcbiAgICBob3VyVGV4dEJveC52YWx1ZSA9IFwiMjFcIjtcbiAgICBzZWxlY3RlZF8yMWggPSB0ZW1wO1xuICB9O1xuXG4gIGNvbnN0IGhvdXJfMjIgPSBhc3luYyAoKSA9PiB7XG4gICAgbGV0IHRlbXAgPSBzZWxlY3RlZF8yMmggPT09IFwiXCIgPyBcImNpcmNsZS1tZVwiIDogXCJcIjtcbiAgICBhd2FpdCBjbGVhckFsbFNlbGVjdGVkKCk7XG4gICAgaG91cmRpc3BsYXkuaW5uZXJIVE1MID0gXCIyMlwiO1xuICAgIGhvdXJUZXh0Qm94LnZhbHVlID0gXCIyMlwiO1xuICAgIHNlbGVjdGVkXzIyaCA9IHRlbXA7XG4gIH07XG5cbiAgY29uc3QgaG91cl8yMyA9IGFzeW5jICgpID0+IHtcbiAgICBsZXQgdGVtcCA9IHNlbGVjdGVkXzIzaCA9PT0gXCJcIiA/IFwiY2lyY2xlLW1lXCIgOiBcIlwiO1xuICAgIGF3YWl0IGNsZWFyQWxsU2VsZWN0ZWQoKTtcbiAgICBob3VyZGlzcGxheS5pbm5lckhUTUwgPSBcIjIzXCI7XG4gICAgaG91clRleHRCb3gudmFsdWUgPSBcIjIzXCI7XG4gICAgc2VsZWN0ZWRfMjNoID0gdGVtcDtcbiAgfTtcblxuXG5cblxuXG5cblxuXG48L3NjcmlwdD5cblxueyNpZiBzaG93fVxuXG48ZGl2XG4gICAgdHJhbnNpdGlvbjpmYWRlPXt7IGR1cmF0aW9uOiAzNTAgfX1cbiAgICBjbGFzcz1cIm1vZGFsXCJcbiAgICBzdHlsZT1cIndpZHRoOiB7d2lkdGh9OyBoZWlnaHQ6IHtoZWlnaHR9XCJcbiAgICBpZD1cIm1vZGFsXCIgXG4gID5cbiAgICBcbiAgPGRpdiBjbGFzcz1cIm1vZGFsLWd1dHNcIj5cbiAgICAgIDwhLS0gYmVnLW9mLXdjIC0tPlxuXG4gICAgICA8IS0tIGhvdXIgaGVhZGVyIC0tPlxuICAgICAgPGRpdiBjbGFzcz1cImRpZ2l0YWwtY29udGFpbmVyXCI+XG4gICAgICBcbiAgICAgICAgPHNwYW4gb246Y2xpY2s9e2R1cmF0aW9ucGFuZWx9IGJpbmQ6dGhpcz17ZHVyYXRpb25kaXNwbGF5fSBpZD1cImR1cmF0aW9uLWRpZ2l0XCI+MjQ8L3NwYW4+XG5cbiAgICAgICAgPHNwYW4gc3R5bGU9XCJjb2xvcjojMDAwMDAwO1wiPjo8L3NwYW4+XG5cbiAgICAgICAgPHNwYW4gb246Y2xpY2s9e2hvdXIyNHBhbmVsfSBiaW5kOnRoaXM9e2hvdXJkaXNwbGF5fSBpZD1cInNob3ctMjQtaG91clwiXG4gICAgICAgICAgPjEyPC9zcGFuXG4gICAgICAgID5cbiAgICAgICAgPCEtLSBtaW51dGVzIGhlYWRkZXIgLS0+XG4gICAgICAgIDxzcGFuIHN0eWxlPVwiY29sb3I6IzAwMDAwMDtcIj46PC9zcGFuPlxuXG4gICAgICAgIDxzcGFuIG9uOmNsaWNrPXttaW51dGVwYW5lbH0gYmluZDp0aGlzPXttaW51dGVkaXNwbGF5fSBpZD1cInNob3ctbWludXRlc1wiXG4gICAgICAgICAgPjI3PC9zcGFuXG4gICAgICAgID5cbiAgICAgIDwvZGl2PlxuXG4gICAgeyNpZiBzaG93fVxuXG4gICAgPGRpdiBjbGFzcz1cIndhdGNoLWNvbnRhaW5lclwiPlxuICAgICAgXG4gICAgICB7I2lmIGR1cmF0aW9uQ2FwdHVyZX1cbiAgICAgIFxuICAgICAgPGRpdj5jbGlja2VkPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwid2F0Y2hcIj5cblxuXG4gICAgICA8L2Rpdj5cbiAgICAgIFxuICAgICAgXG4gICAgICB7L2lmfVxuXG5cblxuICAgICAgPGRpdiBjbGFzcz1cIndhdGNoXCI+XG4gICAgICAgIFxuICAgICAgICAgIDxjYXJkIGJpbmQ6dGhpcz17aG91cjEyY2FyZH0gaWQ9XCJob3VyMTItY2FyZFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm51bWJlcnNcIj5cbiAgICAgICAgICAgICAgPHNwYW4gb246Y2xpY2s9e2hvdXJfOX0gc3R5bGU9XCJmbG9hdDpsZWZ0O1wiIGNsYXNzPXtzZWxlY3RlZF8wOWh9IGlkPVwiOWhcIlxuICAgICAgICAgICAgICAgID45PC9zcGFuXG4gICAgICAgICAgICAgID48c3BhblxuICAgICAgICAgICAgICAgIG9uOmNsaWNrPXtob3VyXzN9XG4gICAgICAgICAgICAgICAgc3R5bGU9XCJmbG9hdDpyaWdodDtcIlxuICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8wM2h9XG4gICAgICAgICAgICAgICAgaWQ9XCIzaFwiPjM8L3NwYW5cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJudW1iZXJzXCIgc3R5bGU9XCItd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKDMwZGVnKTtcIj5cbiAgICAgICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgICAgICBvbjpjbGljaz17aG91cl8xMH1cbiAgICAgICAgICAgICAgICBzdHlsZT1cImZsb2F0OmxlZnQ7IC13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooLTMwZGVnKTtcIlxuICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8xMGh9XG4gICAgICAgICAgICAgICAgaWQ9XCIxMGhcIj4xMDwvc3BhblxuICAgICAgICAgICAgICA+PHNwYW5cbiAgICAgICAgICAgICAgICBvbjpjbGljaz17aG91cl80fVxuICAgICAgICAgICAgICAgIHN0eWxlPVwiZmxvYXQ6cmlnaHQ7IC13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooLTMwZGVnKTtcIlxuICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8wNGh9XG4gICAgICAgICAgICAgICAgaWQ9XCI0aFwiPjQ8L3NwYW5cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJudW1iZXJzXCIgc3R5bGU9XCItd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKDYwZGVnKTtcIj5cbiAgICAgICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgICAgICBvbjpjbGljaz17aG91cl8xMX1cbiAgICAgICAgICAgICAgICBzdHlsZT1cImZsb2F0OmxlZnQ7IC13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooLTYwZGVnKTtcIlxuICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8xMWh9XG4gICAgICAgICAgICAgICAgaWQ9XCIxMWhcIj4xMTwvc3BhblxuICAgICAgICAgICAgICA+PHNwYW5cbiAgICAgICAgICAgICAgICBvbjpjbGljaz17aG91cl81fVxuICAgICAgICAgICAgICAgIHN0eWxlPVwiZmxvYXQ6cmlnaHQ7IC13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooLTYwZGVnKTtcIlxuICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8wNWh9XG4gICAgICAgICAgICAgICAgaWQ9XCI1aFwiPjU8L3NwYW5cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJudW1iZXJzXCIgc3R5bGU9XCItd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKDkwZGVnKTtcIj5cbiAgICAgICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgICAgICBvbjpjbGljaz17aG91cl8xMn1cbiAgICAgICAgICAgICAgICBzdHlsZT1cImZsb2F0OmxlZnQ7IC13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooLTkwZGVnKTtcIlxuICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8xMmh9XG4gICAgICAgICAgICAgICAgaWQ9XCIxMmhcIj4xMjwvc3BhblxuICAgICAgICAgICAgICA+PHNwYW5cbiAgICAgICAgICAgICAgICBvbjpjbGljaz17aG91cl82fVxuICAgICAgICAgICAgICAgIHN0eWxlPVwiZmxvYXQ6cmlnaHQ7IC13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooLTkwZGVnKTtcIlxuICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8wNmh9XG4gICAgICAgICAgICAgICAgaWQ9XCI2aFwiPjY8L3NwYW5cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJudW1iZXJzXCIgc3R5bGU9XCItd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKDEyMGRlZyk7XCI+XG4gICAgICAgICAgICAgIDxzcGFuXG4gICAgICAgICAgICAgICAgb246Y2xpY2s9e2hvdXJfMX1cbiAgICAgICAgICAgICAgICBzdHlsZT1cImZsb2F0OmxlZnQ7IC13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooLTEyMGRlZyk7XCJcbiAgICAgICAgICAgICAgICBjbGFzcz17c2VsZWN0ZWRfMDFofVxuICAgICAgICAgICAgICAgIGlkPVwiMWhcIj4xPC9zcGFuXG4gICAgICAgICAgICAgID48c3BhblxuICAgICAgICAgICAgICAgIG9uOmNsaWNrPXtob3VyXzd9XG4gICAgICAgICAgICAgICAgc3R5bGU9XCJmbG9hdDpyaWdodDsgLXdlYmtpdC10cmFuc2Zvcm06cm90YXRlWigtMTIwZGVnKTtcIlxuICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8wN2h9XG4gICAgICAgICAgICAgICAgaWQ9XCI3aFwiPjc8L3NwYW5cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJudW1iZXJzXCIgc3R5bGU9XCItd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKDE1MGRlZyk7XCI+XG4gICAgICAgICAgICAgIDxzcGFuIG9uOmNsaWNrPXtob3VyXzJ9XG4gICAgICAgICAgICAgICAgc3R5bGU9XCJmbG9hdDpsZWZ0OyAtd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKC0xNTBkZWcpO1wiXG4gICAgICAgICAgICAgICAgY2xhc3M9e3NlbGVjdGVkXzAyaH1cbiAgICAgICAgICAgICAgICBpZD1cIjJoXCI+Mjwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c3BhbiBvbjpjbGljaz17aG91cl84fVxuICAgICAgICAgICAgICAgIHN0eWxlPVwiZmxvYXQ6cmlnaHQ7IC13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooLTE1MGRlZyk7XCJcbiAgICAgICAgICAgICAgICBjbGFzcz17c2VsZWN0ZWRfMDhofVxuICAgICAgICAgICAgICAgIGlkPVwiOGhcIj44PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9jYXJkPlxuXG5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiaW5uZXItd2F0Y2hcIj5cblxuICAgICAgICAgICAgPGNhcmQgYmluZDp0aGlzPXtkdXJhdGlvbmNhcmR9IGlkPVwiZHVyYXRpb24tY2FyZFwiPlxuICAgICAgICAgICAgXG4gICAgICAgICAgICA8L2NhcmQ+XG5cblxuICAgICAgICAgICAgPGNhcmQgYmluZDp0aGlzPXtob3VyMjRjYXJkfSBpZD1cImhvdXIyNC1jYXJkXCI+XG5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm51bWJlcnNcIj5cbiAgICAgICAgICAgICAgICA8c3BhblxuICAgICAgICAgICAgICAgICAgb246Y2xpY2s9e2hvdXJfMjF9XG4gICAgICAgICAgICAgICAgICBzdHlsZT1cImZsb2F0OmxlZnQ7XCJcbiAgICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8yMWh9XG4gICAgICAgICAgICAgICAgICBpZD1cIjIxaFwiPjIxPC9zcGFuXG4gICAgICAgICAgICAgICAgPjxzcGFuXG4gICAgICAgICAgICAgICAgICBvbjpjbGljaz17aG91cl8xNX1cbiAgICAgICAgICAgICAgICAgIHN0eWxlPVwiZmxvYXQ6cmlnaHQ7XCJcbiAgICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8xNWh9XG4gICAgICAgICAgICAgICAgICBpZD1cIjE1aFwiPjE1PC9zcGFuXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgIFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibnVtYmVyc1wiIHN0eWxlPVwiLXdlYmtpdC10cmFuc2Zvcm06cm90YXRlWigzMGRlZyk7XCI+XG4gICAgICAgICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgICAgICAgIG9uOmNsaWNrPXtob3VyXzIyfVxuICAgICAgICAgICAgICAgICAgc3R5bGU9XCJmbG9hdDpsZWZ0OyAtd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKC0zMGRlZyk7XCJcbiAgICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8yMmh9XG4gICAgICAgICAgICAgICAgICBpZD1cIjIyaFwiPjIyPC9zcGFuXG4gICAgICAgICAgICAgICAgPjxzcGFuXG4gICAgICAgICAgICAgICAgICBvbjpjbGljaz17aG91cl8xNn1cbiAgICAgICAgICAgICAgICAgIHN0eWxlPVwiZmxvYXQ6cmlnaHQ7IC13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooLTMwZGVnKTtcIlxuICAgICAgICAgICAgICAgICAgY2xhc3M9e3NlbGVjdGVkXzE2aH1cbiAgICAgICAgICAgICAgICAgIGlkPVwiMTZoXCI+MTY8L3NwYW5cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJudW1iZXJzXCIgc3R5bGU9XCItd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKDYwZGVnKTtcIj5cbiAgICAgICAgICAgICAgICA8c3BhblxuICAgICAgICAgICAgICAgICAgb246Y2xpY2s9e2hvdXJfMjN9XG4gICAgICAgICAgICAgICAgICBzdHlsZT1cImZsb2F0OmxlZnQ7IC13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooLTYwZGVnKTtcIlxuICAgICAgICAgICAgICAgICAgY2xhc3M9e3NlbGVjdGVkXzIzaH1cbiAgICAgICAgICAgICAgICAgIGlkPVwiMjNoXCI+MjM8L3NwYW5cbiAgICAgICAgICAgICAgICA+PHNwYW5cbiAgICAgICAgICAgICAgICAgIG9uOmNsaWNrPXtob3VyXzE3fVxuICAgICAgICAgICAgICAgICAgc3R5bGU9XCJmbG9hdDpyaWdodDsgLXdlYmtpdC10cmFuc2Zvcm06cm90YXRlWigtNjBkZWcpO1wiXG4gICAgICAgICAgICAgICAgICBjbGFzcz17c2VsZWN0ZWRfMTdofVxuICAgICAgICAgICAgICAgICAgaWQ9XCIxN2hcIj4xNzwvc3BhblxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICBcbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm51bWJlcnNcIiBzdHlsZT1cIi13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooOTBkZWcpO1wiPlxuICAgICAgICAgICAgICAgIDxzcGFuXG4gICAgICAgICAgICAgICAgICBvbjpjbGljaz17aG91cl8wMH1cbiAgICAgICAgICAgICAgICAgIHN0eWxlPVwiZmxvYXQ6bGVmdDsgLXdlYmtpdC10cmFuc2Zvcm06cm90YXRlWigtOTBkZWcpO1wiXG4gICAgICAgICAgICAgICAgICBjbGFzcz17c2VsZWN0ZWRfMDBofVxuICAgICAgICAgICAgICAgICAgaWQ9XCIwMGhcIj4wMDwvc3BhblxuICAgICAgICAgICAgICAgID48c3BhblxuICAgICAgICAgICAgICAgICAgb246Y2xpY2s9e2hvdXJfMTh9XG4gICAgICAgICAgICAgICAgICBzdHlsZT1cImZsb2F0OnJpZ2h0OyAtd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKC05MGRlZyk7XCJcbiAgICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8xOGh9XG4gICAgICAgICAgICAgICAgICBpZD1cIjE4aFwiPjE4PC9zcGFuXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgIFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibnVtYmVyc1wiIHN0eWxlPVwiLXdlYmtpdC10cmFuc2Zvcm06cm90YXRlWigxMjBkZWcpO1wiPlxuICAgICAgICAgICAgICAgIDxzcGFuXG4gICAgICAgICAgICAgICAgICBvbjpjbGljaz17aG91cl8xM31cbiAgICAgICAgICAgICAgICAgIHN0eWxlPVwiZmxvYXQ6bGVmdDsgLXdlYmtpdC10cmFuc2Zvcm06cm90YXRlWigtMTIwZGVnKTtcIlxuICAgICAgICAgICAgICAgICAgY2xhc3M9e3NlbGVjdGVkXzEzaH1cbiAgICAgICAgICAgICAgICAgIGlkPVwiMTNoXCI+MTM8L3NwYW5cbiAgICAgICAgICAgICAgICA+PHNwYW5cbiAgICAgICAgICAgICAgICAgIG9uOmNsaWNrPXtob3VyXzE5fVxuICAgICAgICAgICAgICAgICAgc3R5bGU9XCJmbG9hdDpyaWdodDsgLXdlYmtpdC10cmFuc2Zvcm06cm90YXRlWigtMTIwZGVnKTtcIlxuICAgICAgICAgICAgICAgICAgY2xhc3M9e3NlbGVjdGVkXzE5aH1cbiAgICAgICAgICAgICAgICAgIGlkPVwiMTloXCI+MTk8L3NwYW5cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJudW1iZXJzXCIgc3R5bGU9XCItd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKDE1MGRlZyk7XCI+XG4gICAgICAgICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgICAgICAgIG9uOmNsaWNrPXtob3VyXzE0fVxuICAgICAgICAgICAgICAgICAgc3R5bGU9XCJmbG9hdDpsZWZ0OyAtd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKC0xNTBkZWcpO1wiXG4gICAgICAgICAgICAgICAgICBjbGFzcz17c2VsZWN0ZWRfMTRofVxuICAgICAgICAgICAgICAgICAgaWQ9XCIxNGhcIj4xNDwvc3BhblxuICAgICAgICAgICAgICAgID48c3BhblxuICAgICAgICAgICAgICAgICAgb246Y2xpY2s9e2hvdXJfMjB9XG4gICAgICAgICAgICAgICAgICBzdHlsZT1cImZsb2F0OnJpZ2h0OyAtd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKC0xNTBkZWcpO1wiXG4gICAgICAgICAgICAgICAgICBjbGFzcz17c2VsZWN0ZWRfMjBofVxuICAgICAgICAgICAgICAgICAgaWQ9XCIyMGhcIj4yMDwvc3BhblxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2NhcmQ+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICBcbiAgICAgICAgICA8Y2FyZCBiaW5kOnRoaXM9e21pbnV0ZWNhcmR9IGlkPVwibWludXRlLWNhcmRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJudW1iZXJzXCI+XG4gICAgICAgICAgICAgIDxzcGFuXG4gICAgICAgICAgICAgICAgb246Y2xpY2s9e21pbnV0ZV80NX1cbiAgICAgICAgICAgICAgICBzdHlsZT1cImZsb2F0OmxlZnQ7XCJcbiAgICAgICAgICAgICAgICBjbGFzcz17c2VsZWN0ZWRfNDVtfVxuICAgICAgICAgICAgICAgIGlkPVwiNDVtXCI+NDVcbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICA8c3BhblxuICAgICAgICAgICAgICAgIG9uOmNsaWNrPXttaW51dGVfMTV9XG4gICAgICAgICAgICAgICAgc3R5bGU9XCJmbG9hdDpyaWdodDtcIlxuICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8xNW19XG4gICAgICAgICAgICAgICAgaWQ9XCIxNW1cIj4xNVxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgIFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm51bWJlcnNcIiBzdHlsZT1cIi13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooMzBkZWcpO1wiPlxuICAgICAgICAgICAgICA8c3BhblxuICAgICAgICAgICAgICAgIG9uOmNsaWNrPXttaW51dGVfNTB9XG4gICAgICAgICAgICAgICAgc3R5bGU9XCJmbG9hdDpsZWZ0OyAtd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKC0zMGRlZyk7XCJcbiAgICAgICAgICAgICAgICBjbGFzcz17c2VsZWN0ZWRfNTBtfVxuICAgICAgICAgICAgICAgIGlkPVwiNTBtXCI+NTA8L3NwYW5cbiAgICAgICAgICAgICAgPjxzcGFuXG4gICAgICAgICAgICAgICAgb246Y2xpY2s9e21pbnV0ZV8yMH1cbiAgICAgICAgICAgICAgICBzdHlsZT1cImZsb2F0OnJpZ2h0OyAtd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKC0zMGRlZyk7XCJcbiAgICAgICAgICAgICAgICBjbGFzcz17c2VsZWN0ZWRfMjBtfVxuICAgICAgICAgICAgICAgIGlkPVwiMjBtXCI+MjA8L3NwYW5cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJudW1iZXJzXCIgc3R5bGU9XCItd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKDYwZGVnKTtcIj5cbiAgICAgICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgICAgICBvbjpjbGljaz17bWludXRlXzU1fVxuICAgICAgICAgICAgICAgIHN0eWxlPVwiZmxvYXQ6bGVmdDsgLXdlYmtpdC10cmFuc2Zvcm06cm90YXRlWigtNjBkZWcpO1wiXG4gICAgICAgICAgICAgICAgY2xhc3M9e3NlbGVjdGVkXzU1bX1cbiAgICAgICAgICAgICAgICBpZD1cIjU1bVwiPjU1PC9zcGFuXG4gICAgICAgICAgICAgID48c3BhblxuICAgICAgICAgICAgICAgIG9uOmNsaWNrPXttaW51dGVfMjV9XG4gICAgICAgICAgICAgICAgc3R5bGU9XCJmbG9hdDpyaWdodDsgLXdlYmtpdC10cmFuc2Zvcm06cm90YXRlWigtNjBkZWcpO1wiXG4gICAgICAgICAgICAgICAgY2xhc3M9e3NlbGVjdGVkXzI1bX1cbiAgICAgICAgICAgICAgICBpZD1cIjI1bVwiPjI1PC9zcGFuXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwibnVtYmVyc1wiIHN0eWxlPVwiLXdlYmtpdC10cmFuc2Zvcm06cm90YXRlWig5MGRlZyk7XCI+XG4gICAgICAgICAgICAgIDxzcGFuXG4gICAgICAgICAgICAgICAgb246Y2xpY2s9e21pbnV0ZV8wMH1cbiAgICAgICAgICAgICAgICBzdHlsZT1cImZsb2F0OmxlZnQ7IC13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooLTkwZGVnKTtcIlxuICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8wMG19XG4gICAgICAgICAgICAgICAgaWQ9XCIwMG1cIj4wMDwvc3BhblxuICAgICAgICAgICAgICA+PHNwYW5cbiAgICAgICAgICAgICAgICBvbjpjbGljaz17bWludXRlXzMwfVxuICAgICAgICAgICAgICAgIHN0eWxlPVwiZmxvYXQ6cmlnaHQ7IC13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooLTkwZGVnKTtcIlxuICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8zMG19XG4gICAgICAgICAgICAgICAgaWQ9XCIzMG1cIj4zMDwvc3BhblxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgIFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm51bWJlcnNcIiBzdHlsZT1cIi13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooMTIwZGVnKTtcIj5cbiAgICAgICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgICAgICBvbjpjbGljaz17bWludXRlXzA1fVxuICAgICAgICAgICAgICAgIHN0eWxlPVwiZmxvYXQ6bGVmdDsgLXdlYmtpdC10cmFuc2Zvcm06cm90YXRlWigtMTIwZGVnKTtcIlxuICAgICAgICAgICAgICAgIGNsYXNzPXtzZWxlY3RlZF8wNW19XG4gICAgICAgICAgICAgICAgaWQ9XCI1bVwiPjU8L3NwYW5cbiAgICAgICAgICAgICAgPjxzcGFuXG4gICAgICAgICAgICAgICAgb246Y2xpY2s9e21pbnV0ZV8zNX1cbiAgICAgICAgICAgICAgICBzdHlsZT1cImZsb2F0OnJpZ2h0OyAtd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKC0xMjBkZWcpO1wiXG4gICAgICAgICAgICAgICAgY2xhc3M9e3NlbGVjdGVkXzM1bX1cbiAgICAgICAgICAgICAgICBpZD1cIjM1bVwiPjM1PC9zcGFuXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwibnVtYmVyc1wiIHN0eWxlPVwiLXdlYmtpdC10cmFuc2Zvcm06cm90YXRlWigxNTBkZWcpO1wiPlxuICAgICAgICAgICAgICA8c3BhblxuICAgICAgICAgICAgICAgIG9uOmNsaWNrPXttaW51dGVfMTB9XG4gICAgICAgICAgICAgICAgc3R5bGU9XCJmbG9hdDpsZWZ0OyAtd2Via2l0LXRyYW5zZm9ybTpyb3RhdGVaKC0xNTBkZWcpO1wiXG4gICAgICAgICAgICAgICAgY2xhc3M9e3NlbGVjdGVkXzEwbX1cbiAgICAgICAgICAgICAgICBpZD1cIjEwbVwiPjEwXG4gICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgICAgICBvbjpjbGljaz17bWludXRlXzQwfVxuICAgICAgICAgICAgICAgIHN0eWxlPVwiZmxvYXQ6cmlnaHQ7IC13ZWJraXQtdHJhbnNmb3JtOnJvdGF0ZVooLTE1MGRlZyk7XCJcbiAgICAgICAgICAgICAgICBjbGFzcz17c2VsZWN0ZWRfNDBtfVxuICAgICAgICAgICAgICAgIGlkPVwiNDBtXCI+NDBcbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICBcbiAgICAgICAgICA8L2NhcmQ+XG4gICAgICAgICAgXG4gICAgICAgIDwvZGl2PlxuICAgICAgICBcbiAgICAgICAgPCEtLSA8YnV0dG9uIGNsYXNzPVwic2F2ZS1idXR0b25cIiBvbjpjbGljaz17Y2xvc2V9PlNhdjJlPC9idXR0b24+IC0tPlxuICAgICAgICBcbiAgICAgIDwvZGl2PlxuICAgICBcblxuXG4gICAgICB7L2lmfVxuXG5cbiAgICAgIDxkaXY+XG4gICAgICAgIDxidXR0b24gY2xhc3M9XCJzYXZlLWJ1dHRvblwiIG9uOmNsaWNrPXtjbG9zZX0+U2F2ZTwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDwhLS0gbm9yaTogdGhlc2Ugc2hvdWxkIGJlIGhpZGRlbiBvciBjb21wbGV0ZWx5IGdvbmUgYWZ0ZXIgZGV2ZWxvcG1lbnQgLS0+XG4gICAgICA8ZGl2PiA8aW5wdXQgYmluZDp0aGlzPXtkdXJUZXh0Qm94fSBpZD0nZHVydGltZScgdHlwZT0ndGV4dCcgbmFtZT0nc2hpZnRkdXInIHZhbHVlPVwiMjRcIiBoaWRkZW4vPiA8L2Rpdj5cbiAgICAgIDxkaXY+IDxpbnB1dCBiaW5kOnRoaXM9e2hvdXJUZXh0Qm94fSBpZD0naG91cnRpbWUnIHR5cGU9J3RleHQnIG5hbWU9J3NoaWZ0aG91cicgdmFsdWU9XCIwOFwiIGhpZGRlbi8+IDwvZGl2PlxuICAgICAgPGRpdj4gPGlucHV0IGJpbmQ6dGhpcz17bWludXRlVGV4dEJveH0gaWQ9J21pbnV0ZXRpbWUnIHR5cGU9J3RleHQnIG5hbWU9J3NoaWZ0bWludXRlJyB2YWx1ZT1cIjAwXCIgaGlkZGVuLz4gPC9kaXY+XG5cbiAgICAgIDwhLS0gZW5kLW9mLXdjIC0tPlxuXG4gICAgICA8c2xvdCAvPlxuICAgIDwvZGl2PlxuXG4gICAgPCEtLSAvLyBYIGNsb3NlIGJ1dHRvblxuICAgICAgPHNwYW4gY2xhc3M9XCJjbG9zZS1idXR0b25cIiBvbjpjbGljaz17Y2xvc2V9IHJvbGU9XCJidXR0b25cIj5cbiAgICAgIDxzbG90IG5hbWU9XCJjbG9zZVwiPlxuICAgICAgICA8c3ZnXG4gICAgICAgICAgaGVpZ2h0PVwiMTJweFwiXG4gICAgICAgICAgd2lkdGg9XCIxMnB4XCJcbiAgICAgICAgICB2aWV3Qm94PVwiMCAwIDQ3Ljk3MSA0Ny45NzFcIlxuICAgICAgICAgIHN0eWxlPVwiZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA0Ny45NzEgNDcuOTcxO1wiXG4gICAgICAgID5cbiAgICAgICAgICA8Zz5cbiAgICAgICAgICAgIDxwYXRoIGQ9e2Nsb3NlUGF0aH0gLz5cbiAgICAgICAgICA8L2c+XG4gICAgICAgIDwvc3ZnPlxuICAgICAgPC9zbG90PlxuICAgIDwvc3Bhbj4gXG4gICAgLS0+XG5cblxuICA8L2Rpdj5cblxuICA8ZGl2IGNsYXNzPVwibW9kYWwtb3ZlcmxheVwiIGlkPVwibW9kYWwtb3ZlcmxheVwiIG9uOmNsaWNrPXtjbG9zZX0gLz5cblxuXG57L2lmfVxuXG48c3R5bGU+XG4gIC5tb2RhbCB7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBtYXgtd2lkdGg6IDEwMCU7XG4gICAgbWF4LWhlaWdodDogMTAwJTtcbiAgICBwb3NpdGlvbjogZml4ZWQ7XG4gICAgei1pbmRleDogMTAwO1xuICAgIGxlZnQ6IDUwJTtcbiAgICB0b3A6IDUwJTtcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZSgtNTAlLCAtNTAlKTtcbiAgICBiYWNrZ3JvdW5kOiB3aGl0ZTtcbiAgICBib3gtc2hhZG93OiAwIDAgNjBweCAxMHB4IHJnYmEoMCwgMCwgMCwgMC4xKTtcbiAgfVxuICAubW9kYWwtb3ZlcmxheSB7XG4gICAgcG9zaXRpb246IGZpeGVkO1xuICAgIHRvcDogMDtcbiAgICBsZWZ0OiAwO1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIGhlaWdodDogMTAwJTtcbiAgICB6LWluZGV4OiA1MDtcbiAgICBiYWNrZ3JvdW5kOiByZ2JhKDY0LCA2MywgNjMsIDAuNik7XG4gIH1cbiAgLm1vZGFsLWd1dHMge1xuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICB0b3A6IDA7XG4gICAgbGVmdDogMDtcbiAgICB3aWR0aDogMTAwJTtcbiAgICBoZWlnaHQ6IDEwMCU7XG4gICAgb3ZlcmZsb3c6IGF1dG87XG4gICAgcGFkZGluZzogMjBweCA1MHB4IDIwcHggMjBweDtcbiAgfVxuXG4gIC5tb2RhbCAuY2xvc2UtYnV0dG9uIHtcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgei1pbmRleDogMTtcbiAgICB0b3A6IDE1cHg7XG4gICAgcmlnaHQ6IDE1cHg7XG4gICAgY3Vyc29yOiBwb2ludGVyO1xuICB9XG5cbiAgKiB7XG4gICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgICBtYXJnaW46IDA7XG4gICAgcGFkZGluZzogMDtcbiAgfVxuXG4gIC8qIFRpbWVQaWNrZXIgYmVsb3cgKi9cblxuICAuc2F2ZS1idXR0b24ge1xuXG4gICAgbWFyZ2luOiAwO1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIC1tcy10cmFuc2Zvcm06IHRyYW5zbGF0ZVkoLTUwJSk7XG4gIHRyYW5zZm9ybTogdHJhbnNsYXRlWSgtNTAlKTtcblxuICAgIG1hcmdpbjogYXV0bztcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgd2lkdGg6IDkwJTtcbiAgICBib3JkZXI6IDJweCBzb2xpZCBuYXZ5O1xuICAgIHBhZGRpbmc6IDdweDtcbiAgICBcbiAgfVxuICAuY2lyY2xlLW1lIHtcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgd2lkdGg6IDYwcHg7XG4gICAgbGluZS1oZWlnaHQ6IDYwcHg7XG4gICAgYm9yZGVyLXJhZGl1czogNTAlO1xuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICBmb250LXNpemU6IDMycHg7XG4gICAgLyogICBib3JkZXI6IDNweCBzb2xpZCAjZmZmOyAqL1xuICAgIGJhY2tncm91bmQ6IGJsYWNrO1xuICAgIGNvbG9yOiAjZmZmO1xuICAgIHotaW5kZXg6IDk5OTk7XG4gIH1cblxuICAuZGlnaXRhbC1jb250YWluZXIge1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICB3aWR0aDogMzUwcHg7XG4gICAgaGVpZ2h0OiA1MHB4O1xuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICBmb250LWZhbWlseTogXCJSb2JvdG9cIiwgc2Fucy1zZXJpZjtcbiAgICBmb250LXNpemU6IDUwcHg7XG4gICAgZm9udC13ZWlnaHQ6IGJvbGQ7XG4gICAgcGFkZGluZy1ib3R0b206IDVweDtcbiAgICAvKiBib3JkZXI6IDFweCBzb2xpZCBibGFjazsgKi9cbiAgICAvKiBiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMjM5LCAyMjQsIDg4KTsgKi9cbiAgfVxuICBib2R5IHtcbiAgICBmb250LWZhbWlseTogXCJSb2JvdG9cIjtcbiAgICBmb250LXNpemU6IDAuOSByZW07XG4gIH1cblxuICAud2F0Y2gtY29udGFpbmVyIHtcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgd2lkdGg6IDM1MHB4O1xuICAgIGhlaWdodDogNDMwcHg7XG4gICAgLyogICBib3JkZXI6IDFweCBzb2xpZCBibGFjazsgKi9cbiAgfVxuICAud2F0Y2gge1xuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICB3aWR0aDogOTUlO1xuICAgIGhlaWdodDogNzklO1xuICAgIGJvcmRlcjogMXB4IHNvbGlkIHJnYigxOTUsIDIwOSwgMjE5KTtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMjQwLCAyNDIsIDI0Mik7XG4gICAgYm9yZGVyLXJhZGl1czogNTAlO1xuICAgIGxlZnQ6IDIlO1xuICAgIHRvcDogMTAlO1xuICB9XG4gIC5pbm5lci13YXRjaCB7XG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIHdpZHRoOiA2OCU7XG4gICAgaGVpZ2h0OiA3MCU7XG4gICAgYm9yZGVyLXJhZGl1czogNTAlO1xuICAgIGJhY2tncm91bmQ6IHJnYigxOTUsIDIwOSwgMjE5KTtcbiAgICBib3JkZXI6IDFweCBzb2xpZCByZ2IoMjEwLCAyMTAsIDIxMCk7XG4gICAgbGVmdDogMTUlO1xuICAgIHRvcDogMTUlO1xuICB9XG4gIC5udW1iZXJzIHtcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgZGlzcGxheTogYmxvY2s7XG4gICAgaGVpZ2h0OiAxMCU7IC8qIDYgKi9cbiAgICB3aWR0aDogOTklO1xuICAgIHRvcDogNDQlO1xuICAgIGxlZnQ6IDAlO1xuICAgIHBhZGRpbmc6IDEycHggMTZweDtcbiAgICB6LWluZGV4OiAxO1xuICB9XG5cbjwvc3R5bGU+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBczRCRSxNQUFNLEFBQUMsQ0FBQyxBQUNOLE9BQU8sQ0FBRSxJQUFJLENBQ2IsU0FBUyxDQUFFLElBQUksQ0FDZixVQUFVLENBQUUsSUFBSSxDQUNoQixRQUFRLENBQUUsS0FBSyxDQUNmLE9BQU8sQ0FBRSxHQUFHLENBQ1osSUFBSSxDQUFFLEdBQUcsQ0FDVCxHQUFHLENBQUUsR0FBRyxDQUNSLFNBQVMsQ0FBRSxVQUFVLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUNoQyxVQUFVLENBQUUsS0FBSyxDQUNqQixVQUFVLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEFBQzlDLENBQUMsQUFDRCxjQUFjLEFBQUMsQ0FBQyxBQUNkLFFBQVEsQ0FBRSxLQUFLLENBQ2YsR0FBRyxDQUFFLENBQUMsQ0FDTixJQUFJLENBQUUsQ0FBQyxDQUNQLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLElBQUksQ0FDWixPQUFPLENBQUUsRUFBRSxDQUNYLFVBQVUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxBQUNuQyxDQUFDLEFBQ0QsV0FBVyxBQUFDLENBQUMsQUFDWCxRQUFRLENBQUUsUUFBUSxDQUNsQixHQUFHLENBQUUsQ0FBQyxDQUNOLElBQUksQ0FBRSxDQUFDLENBQ1AsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsSUFBSSxDQUNaLFFBQVEsQ0FBRSxJQUFJLENBQ2QsT0FBTyxDQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQUFDOUIsQ0FBQyxBQUVELE1BQU0sQ0FBQyxhQUFhLEFBQUMsQ0FBQyxBQUNwQixRQUFRLENBQUUsUUFBUSxDQUNsQixPQUFPLENBQUUsQ0FBQyxDQUNWLEdBQUcsQ0FBRSxJQUFJLENBQ1QsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsT0FBTyxBQUNqQixDQUFDLEFBRUQsQ0FBQyxBQUFDLENBQUMsQUFDRCxVQUFVLENBQUUsVUFBVSxDQUN0QixNQUFNLENBQUUsQ0FBQyxDQUNULE9BQU8sQ0FBRSxDQUFDLEFBQ1osQ0FBQyxBQUlELFlBQVksQUFBQyxDQUFDLEFBRVosTUFBTSxDQUFFLENBQUMsQ0FDWCxRQUFRLENBQUUsUUFBUSxDQUNsQixhQUFhLENBQUUsV0FBVyxJQUFJLENBQUMsQ0FDL0IsU0FBUyxDQUFFLFdBQVcsSUFBSSxDQUFDLENBRXpCLE1BQU0sQ0FBRSxJQUFJLENBQ1osVUFBVSxDQUFFLE1BQU0sQ0FDbEIsS0FBSyxDQUFFLEdBQUcsQ0FDVixNQUFNLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQ3RCLE9BQU8sQ0FBRSxHQUFHLEFBRWQsQ0FBQyxBQUNELFVBQVUsQUFBQyxDQUFDLEFBQ1YsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsS0FBSyxDQUFFLElBQUksQ0FDWCxXQUFXLENBQUUsSUFBSSxDQUNqQixhQUFhLENBQUUsR0FBRyxDQUNsQixVQUFVLENBQUUsTUFBTSxDQUNsQixTQUFTLENBQUUsSUFBSSxDQUVmLFVBQVUsQ0FBRSxLQUFLLENBQ2pCLEtBQUssQ0FBRSxJQUFJLENBQ1gsT0FBTyxDQUFFLElBQUksQUFDZixDQUFDLEFBRUQsa0JBQWtCLEFBQUMsQ0FBQyxBQUNsQixRQUFRLENBQUUsUUFBUSxDQUNsQixLQUFLLENBQUUsS0FBSyxDQUNaLE1BQU0sQ0FBRSxJQUFJLENBQ1osVUFBVSxDQUFFLE1BQU0sQ0FDbEIsV0FBVyxDQUFFLFFBQVEsQ0FBQyxDQUFDLFVBQVUsQ0FDakMsU0FBUyxDQUFFLElBQUksQ0FDZixXQUFXLENBQUUsSUFBSSxDQUNqQixjQUFjLENBQUUsR0FBRyxBQUdyQixDQUFDLEFBTUQsZ0JBQWdCLEFBQUMsQ0FBQyxBQUNoQixRQUFRLENBQUUsUUFBUSxDQUNsQixLQUFLLENBQUUsS0FBSyxDQUNaLE1BQU0sQ0FBRSxLQUFLLEFBRWYsQ0FBQyxBQUNELE1BQU0sQUFBQyxDQUFDLEFBQ04sUUFBUSxDQUFFLFFBQVEsQ0FDbEIsS0FBSyxDQUFFLEdBQUcsQ0FDVixNQUFNLENBQUUsR0FBRyxDQUNYLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQ3BDLGdCQUFnQixDQUFFLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQ3BDLGFBQWEsQ0FBRSxHQUFHLENBQ2xCLElBQUksQ0FBRSxFQUFFLENBQ1IsR0FBRyxDQUFFLEdBQUcsQUFDVixDQUFDLEFBQ0QsWUFBWSxBQUFDLENBQUMsQUFDWixRQUFRLENBQUUsUUFBUSxDQUNsQixLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxHQUFHLENBQ1gsYUFBYSxDQUFFLEdBQUcsQ0FDbEIsVUFBVSxDQUFFLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQzlCLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQ3BDLElBQUksQ0FBRSxHQUFHLENBQ1QsR0FBRyxDQUFFLEdBQUcsQUFDVixDQUFDLEFBQ0QsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsUUFBUSxDQUNsQixPQUFPLENBQUUsS0FBSyxDQUNkLE1BQU0sQ0FBRSxHQUFHLENBQ1gsS0FBSyxDQUFFLEdBQUcsQ0FDVixHQUFHLENBQUUsR0FBRyxDQUNSLElBQUksQ0FBRSxFQUFFLENBQ1IsT0FBTyxDQUFFLElBQUksQ0FBQyxJQUFJLENBQ2xCLE9BQU8sQ0FBRSxDQUFDLEFBQ1osQ0FBQyJ9 */</style>`;

    		init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, ["id", "show", "durationCapture", "width", "height", "hour12card", "hour24card", "minutecard", "durationcard", "minutedisplay", "hourdisplay", "durationdisplay", "durTextBox", "hourTextBox", "minuteTextBox", "cmbBoxHour", "cmbBoxMinute", "setDuration", "initializeTimePicker"]);

    		const { ctx } = this.$$;
    		const props = this.attributes;
    		if (ctx.hour12card === undefined && !('hour12card' in props)) {
    			console_1.warn("<modal-element> was created without expected prop 'hour12card'");
    		}
    		if (ctx.hour24card === undefined && !('hour24card' in props)) {
    			console_1.warn("<modal-element> was created without expected prop 'hour24card'");
    		}
    		if (ctx.minutecard === undefined && !('minutecard' in props)) {
    			console_1.warn("<modal-element> was created without expected prop 'minutecard'");
    		}
    		if (ctx.durationcard === undefined && !('durationcard' in props)) {
    			console_1.warn("<modal-element> was created without expected prop 'durationcard'");
    		}
    		if (ctx.minutedisplay === undefined && !('minutedisplay' in props)) {
    			console_1.warn("<modal-element> was created without expected prop 'minutedisplay'");
    		}
    		if (ctx.hourdisplay === undefined && !('hourdisplay' in props)) {
    			console_1.warn("<modal-element> was created without expected prop 'hourdisplay'");
    		}
    		if (ctx.durationdisplay === undefined && !('durationdisplay' in props)) {
    			console_1.warn("<modal-element> was created without expected prop 'durationdisplay'");
    		}
    		if (ctx.durTextBox === undefined && !('durTextBox' in props)) {
    			console_1.warn("<modal-element> was created without expected prop 'durTextBox'");
    		}
    		if (ctx.hourTextBox === undefined && !('hourTextBox' in props)) {
    			console_1.warn("<modal-element> was created without expected prop 'hourTextBox'");
    		}
    		if (ctx.minuteTextBox === undefined && !('minuteTextBox' in props)) {
    			console_1.warn("<modal-element> was created without expected prop 'minuteTextBox'");
    		}
    		if (ctx.cmbBoxHour === undefined && !('cmbBoxHour' in props)) {
    			console_1.warn("<modal-element> was created without expected prop 'cmbBoxHour'");
    		}
    		if (ctx.cmbBoxMinute === undefined && !('cmbBoxMinute' in props)) {
    			console_1.warn("<modal-element> was created without expected prop 'cmbBoxMinute'");
    		}
    		if (ctx.setDuration === undefined && !('setDuration' in props)) {
    			console_1.warn("<modal-element> was created without expected prop 'setDuration'");
    		}
    		if (ctx.initializeTimePicker === undefined && !('initializeTimePicker' in props)) {
    			console_1.warn("<modal-element> was created without expected prop 'initializeTimePicker'");
    		}

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["id","show","durationCapture","width","height","hour12card","hour24card","minutecard","durationcard","minutedisplay","hourdisplay","durationdisplay","durTextBox","hourTextBox","minuteTextBox","cmbBoxHour","cmbBoxMinute","setDuration","initializeTimePicker"];
    	}

    	get id() {
    		return this.$$.ctx.id;
    	}

    	set id(id) {
    		this.$set({ id });
    		flush();
    	}

    	get show() {
    		return this.$$.ctx.show;
    	}

    	set show(show) {
    		this.$set({ show });
    		flush();
    	}

    	get durationCapture() {
    		return this.$$.ctx.durationCapture;
    	}

    	set durationCapture(durationCapture) {
    		this.$set({ durationCapture });
    		flush();
    	}

    	get width() {
    		return this.$$.ctx.width;
    	}

    	set width(width) {
    		this.$set({ width });
    		flush();
    	}

    	get height() {
    		return this.$$.ctx.height;
    	}

    	set height(height) {
    		this.$set({ height });
    		flush();
    	}

    	get hour12card() {
    		return this.$$.ctx.hour12card;
    	}

    	set hour12card(hour12card) {
    		this.$set({ hour12card });
    		flush();
    	}

    	get hour24card() {
    		return this.$$.ctx.hour24card;
    	}

    	set hour24card(hour24card) {
    		this.$set({ hour24card });
    		flush();
    	}

    	get minutecard() {
    		return this.$$.ctx.minutecard;
    	}

    	set minutecard(minutecard) {
    		this.$set({ minutecard });
    		flush();
    	}

    	get durationcard() {
    		return this.$$.ctx.durationcard;
    	}

    	set durationcard(durationcard) {
    		this.$set({ durationcard });
    		flush();
    	}

    	get minutedisplay() {
    		return this.$$.ctx.minutedisplay;
    	}

    	set minutedisplay(minutedisplay) {
    		this.$set({ minutedisplay });
    		flush();
    	}

    	get hourdisplay() {
    		return this.$$.ctx.hourdisplay;
    	}

    	set hourdisplay(hourdisplay) {
    		this.$set({ hourdisplay });
    		flush();
    	}

    	get durationdisplay() {
    		return this.$$.ctx.durationdisplay;
    	}

    	set durationdisplay(durationdisplay) {
    		this.$set({ durationdisplay });
    		flush();
    	}

    	get durTextBox() {
    		return this.$$.ctx.durTextBox;
    	}

    	set durTextBox(durTextBox) {
    		this.$set({ durTextBox });
    		flush();
    	}

    	get hourTextBox() {
    		return this.$$.ctx.hourTextBox;
    	}

    	set hourTextBox(hourTextBox) {
    		this.$set({ hourTextBox });
    		flush();
    	}

    	get minuteTextBox() {
    		return this.$$.ctx.minuteTextBox;
    	}

    	set minuteTextBox(minuteTextBox) {
    		this.$set({ minuteTextBox });
    		flush();
    	}

    	get cmbBoxHour() {
    		return this.$$.ctx.cmbBoxHour;
    	}

    	set cmbBoxHour(cmbBoxHour) {
    		this.$set({ cmbBoxHour });
    		flush();
    	}

    	get cmbBoxMinute() {
    		return this.$$.ctx.cmbBoxMinute;
    	}

    	set cmbBoxMinute(cmbBoxMinute) {
    		this.$set({ cmbBoxMinute });
    		flush();
    	}

    	get setDuration() {
    		return this.$$.ctx.setDuration;
    	}

    	set setDuration(value) {
    		throw new Error("<modal-element>: Cannot set read-only property 'setDuration'");
    	}

    	get initializeTimePicker() {
    		return this.$$.ctx.initializeTimePicker;
    	}

    	set initializeTimePicker(value) {
    		throw new Error("<modal-element>: Cannot set read-only property 'initializeTimePicker'");
    	}
    }

    customElements.define("modal-element", App);

    exports.App = App;

    return exports;

}({}));
//# sourceMappingURL=modal.js.map

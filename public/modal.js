
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(document);
var app = (function (exports) {
    'use strict';

    function noop() { }
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
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
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
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
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

    /* src/App.svelte generated by Svelte v3.12.1 */

    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	var div1, div0, slot0, t0, span, slot1, svg, g, path, t1, div2, dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			slot0 = element("slot");
    			t0 = space();
    			span = element("span");
    			slot1 = element("slot");
    			svg = svg_element("svg");
    			g = svg_element("g");
    			path = svg_element("path");
    			t1 = space();
    			div2 = element("div");
    			this.c = noop;
    			add_location(slot0, file, 95, 4, 2215);
    			attr_dev(div0, "class", "modal-guts");
    			add_location(div0, file, 93, 2, 2185);
    			attr_dev(path, "d", ctx.closePath);
    			add_location(path, file, 106, 10, 2489);
    			add_location(g, file, 105, 8, 2475);
    			attr_dev(svg, "height", "12px");
    			attr_dev(svg, "width", "12px");
    			attr_dev(svg, "viewBox", "0 0 47.971 47.971");
    			set_style(svg, "enable-background", "new 0 0 47.971 47.971");
    			add_location(svg, file, 100, 6, 2325);
    			attr_dev(slot1, "name", "close");
    			add_location(slot1, file, 99, 4, 2299);
    			attr_dev(span, "class", "close-button");
    			attr_dev(span, "role", "button");
    			add_location(span, file, 98, 2, 2236);
    			attr_dev(div1, "class", "modal");
    			set_style(div1, "width", ctx.width);
    			set_style(div1, "height", ctx.height);
    			attr_dev(div1, "id", "modal");
    			toggle_class(div1, "closed", !ctx.show);
    			add_location(div1, file, 87, 0, 2081);
    			attr_dev(div2, "class", "modal-overlay");
    			attr_dev(div2, "id", "modal-overlay");
    			toggle_class(div2, "closed", !ctx.show);
    			add_location(div2, file, 113, 0, 2568);

    			dispose = [
    				listen_dev(span, "click", ctx.close),
    				listen_dev(div2, "click", ctx.close)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, slot0);
    			append_dev(div1, t0);
    			append_dev(div1, span);
    			append_dev(span, slot1);
    			append_dev(slot1, svg);
    			append_dev(svg, g);
    			append_dev(g, path);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.width) {
    				set_style(div1, "width", ctx.width);
    			}

    			if (changed.height) {
    				set_style(div1, "height", ctx.height);
    			}

    			if (changed.show) {
    				toggle_class(div1, "closed", !ctx.show);
    				toggle_class(div2, "closed", !ctx.show);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div1);
    				detach_dev(t1);
    				detach_dev(div2);
    			}

    			run_all(dispose);
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
        composed: true // makes the event jump shadow DOM boundary
      });

      // 2. Dispatch the custom event.
      this.dispatchEvent(event);
    }

    function instance($$self, $$props, $$invalidate) {
    	let { id = "", show = false, width = "600px", height = "400px" } = $$props;

      function close(e) {
        dispatchCloseEvent.call(this, e);
        $$invalidate('show', show = false);
      }

      let closePath = `M28.228,23.986L47.092,5.122c1.172-1.171,1.172-3.071,0-4.242c-1.172-1.172-3.07-1.172-4.242,0L23.986,19.744L5.121,0.88
          c-1.172-1.172-3.07-1.172-4.242,0c-1.172,1.171-1.172,3.071,0,4.242l18.865,18.864L0.879,42.85c-1.172,1.171-1.172,3.071,0,4.242
          C1.465,47.677,2.233,47.97,3,47.97s1.535-0.293,2.121-0.879l18.865-18.864L42.85,47.091c0.586,0.586,1.354,0.879,2.121,0.879
          s1.535-0.293,2.121-0.879c1.172-1.171,1.172-3.071,0-4.242L28.228,23.986z`;

    	const writable_props = ['id', 'show', 'width', 'height'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<modal-element> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('show' in $$props) $$invalidate('show', show = $$props.show);
    		if ('width' in $$props) $$invalidate('width', width = $$props.width);
    		if ('height' in $$props) $$invalidate('height', height = $$props.height);
    	};

    	$$self.$capture_state = () => {
    		return { id, show, width, height, closePath };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('show' in $$props) $$invalidate('show', show = $$props.show);
    		if ('width' in $$props) $$invalidate('width', width = $$props.width);
    		if ('height' in $$props) $$invalidate('height', height = $$props.height);
    		if ('closePath' in $$props) $$invalidate('closePath', closePath = $$props.closePath);
    	};

    	return {
    		id,
    		show,
    		width,
    		height,
    		close,
    		closePath
    	};
    }

    class App extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>.modal{display:flex;max-width:100%;max-height:100%;position:fixed;z-index:100;left:50%;top:50%;transform:translate(-50%, -50%);background:white;box-shadow:0 0 60px 10px rgba(0, 0, 0, 0.1)}.closed{display:none}.modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;z-index:50;background:rgba(64, 63, 63, 0.6)}.modal-guts{position:absolute;top:0;left:0;width:100%;height:100%;overflow:auto;padding:20px 50px 20px 20px}.modal .close-button{position:absolute;z-index:1;top:15px;right:15px;cursor:pointer}*{box-sizing:border-box;margin:0;padding:0}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0PlxuICBleHBvcnQgbGV0IGlkID0gXCJcIjtcbiAgZXhwb3J0IGxldCBzaG93ID0gZmFsc2U7XG4gIGV4cG9ydCBsZXQgd2lkdGggPSBcIjYwMHB4XCI7XG4gIGV4cG9ydCBsZXQgaGVpZ2h0ID0gXCI0MDBweFwiO1xuXG4gIGZ1bmN0aW9uIGNsb3NlKGUpIHtcbiAgICBkaXNwYXRjaENsb3NlRXZlbnQuY2FsbCh0aGlzLCBlKTtcbiAgICBzaG93ID0gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBkaXNwYXRjaENsb3NlRXZlbnQoZSkge1xuICAgIC8vIDEuIENyZWF0ZSB0aGUgY3VzdG9tIGV2ZW50LlxuICAgIGNvbnN0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KFwiY2xvc2VcIiwge1xuICAgICAgZGV0YWlsOiBgbW9kYWwtZWxlbWVudCB3YXMgY2xvc2VkLmAsXG4gICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgIGNvbXBvc2VkOiB0cnVlIC8vIG1ha2VzIHRoZSBldmVudCBqdW1wIHNoYWRvdyBET00gYm91bmRhcnlcbiAgICB9KTtcblxuICAgIC8vIDIuIERpc3BhdGNoIHRoZSBjdXN0b20gZXZlbnQuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgfVxuXG4gIGxldCBjbG9zZVBhdGggPSBgTTI4LjIyOCwyMy45ODZMNDcuMDkyLDUuMTIyYzEuMTcyLTEuMTcxLDEuMTcyLTMuMDcxLDAtNC4yNDJjLTEuMTcyLTEuMTcyLTMuMDctMS4xNzItNC4yNDIsMEwyMy45ODYsMTkuNzQ0TDUuMTIxLDAuODhcbiAgICAgICAgICBjLTEuMTcyLTEuMTcyLTMuMDctMS4xNzItNC4yNDIsMGMtMS4xNzIsMS4xNzEtMS4xNzIsMy4wNzEsMCw0LjI0MmwxOC44NjUsMTguODY0TDAuODc5LDQyLjg1Yy0xLjE3MiwxLjE3MS0xLjE3MiwzLjA3MSwwLDQuMjQyXG4gICAgICAgICAgQzEuNDY1LDQ3LjY3NywyLjIzMyw0Ny45NywzLDQ3Ljk3czEuNTM1LTAuMjkzLDIuMTIxLTAuODc5bDE4Ljg2NS0xOC44NjRMNDIuODUsNDcuMDkxYzAuNTg2LDAuNTg2LDEuMzU0LDAuODc5LDIuMTIxLDAuODc5XG4gICAgICAgICAgczEuNTM1LTAuMjkzLDIuMTIxLTAuODc5YzEuMTcyLTEuMTcxLDEuMTcyLTMuMDcxLDAtNC4yNDJMMjguMjI4LDIzLjk4NnpgO1xuPC9zY3JpcHQ+XG5cbjxzdHlsZT5cbiAgLm1vZGFsIHtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIG1heC13aWR0aDogMTAwJTtcbiAgICBtYXgtaGVpZ2h0OiAxMDAlO1xuICAgIHBvc2l0aW9uOiBmaXhlZDtcbiAgICB6LWluZGV4OiAxMDA7XG4gICAgbGVmdDogNTAlO1xuICAgIHRvcDogNTAlO1xuICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlKC01MCUsIC01MCUpO1xuICAgIGJhY2tncm91bmQ6IHdoaXRlO1xuICAgIGJveC1zaGFkb3c6IDAgMCA2MHB4IDEwcHggcmdiYSgwLCAwLCAwLCAwLjEpO1xuICB9XG4gIC5jbG9zZWQge1xuICAgIGRpc3BsYXk6IG5vbmU7XG4gIH1cblxuICAubW9kYWwtb3ZlcmxheSB7XG4gICAgcG9zaXRpb246IGZpeGVkO1xuICAgIHRvcDogMDtcbiAgICBsZWZ0OiAwO1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIGhlaWdodDogMTAwJTtcbiAgICB6LWluZGV4OiA1MDtcblxuICAgIGJhY2tncm91bmQ6IHJnYmEoNjQsIDYzLCA2MywgMC42KTtcbiAgfVxuICAubW9kYWwtZ3V0cyB7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIHRvcDogMDtcbiAgICBsZWZ0OiAwO1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIGhlaWdodDogMTAwJTtcbiAgICBvdmVyZmxvdzogYXV0bztcbiAgICBwYWRkaW5nOiAyMHB4IDUwcHggMjBweCAyMHB4O1xuICB9XG5cbiAgLm1vZGFsIC5jbG9zZS1idXR0b24ge1xuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICB6LWluZGV4OiAxO1xuICAgIHRvcDogMTVweDtcbiAgICByaWdodDogMTVweDtcbiAgICBjdXJzb3I6IHBvaW50ZXI7XG4gIH1cblxuICAqIHtcbiAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICAgIG1hcmdpbjogMDtcbiAgICBwYWRkaW5nOiAwO1xuICB9XG48L3N0eWxlPlxuXG48IS0tIFxuVGhpcyB0ZWxscyB0aGUgU3ZlbHRlIGNvbXBpbGVyIHRoYXQgdGhpcyBmaWxlIGlzIGEgY3VzdG9tIGVsZW1lbnQuIFxuV2UgYWxzbyBoYXZlIHRvIGluY2x1ZGUgdGhlIFwiY3VzdG9tRWxlbWVudDogdHJ1ZVwiIGNvbXBpbGVyIHNldHRpbmcgaW4gcm9sbHVwIGNvbmZpZ3VyYXRpb24uXG4tLT5cbjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJtb2RhbC1lbGVtZW50XCIgLz5cbjxkaXZcbiAgY2xhc3M9XCJtb2RhbFwiXG4gIGNsYXNzOmNsb3NlZD17IXNob3d9XG4gIHN0eWxlPVwid2lkdGg6IHt3aWR0aH07IGhlaWdodDoge2hlaWdodH1cIlxuICBpZD1cIm1vZGFsXCI+XG5cbiAgPGRpdiBjbGFzcz1cIm1vZGFsLWd1dHNcIj5cblxuICAgIDxzbG90IC8+XG4gIDwvZGl2PlxuXG4gIDxzcGFuIGNsYXNzPVwiY2xvc2UtYnV0dG9uXCIgb246Y2xpY2s9e2Nsb3NlfSByb2xlPVwiYnV0dG9uXCI+XG4gICAgPHNsb3QgbmFtZT1cImNsb3NlXCI+XG4gICAgICA8c3ZnXG4gICAgICAgIGhlaWdodD1cIjEycHhcIlxuICAgICAgICB3aWR0aD1cIjEycHhcIlxuICAgICAgICB2aWV3Qm94PVwiMCAwIDQ3Ljk3MSA0Ny45NzFcIlxuICAgICAgICBzdHlsZT1cImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDcuOTcxIDQ3Ljk3MTtcIj5cbiAgICAgICAgPGc+XG4gICAgICAgICAgPHBhdGggZD17Y2xvc2VQYXRofSAvPlxuICAgICAgICA8L2c+XG4gICAgICA8L3N2Zz5cbiAgICA8L3Nsb3Q+XG4gIDwvc3Bhbj5cbjwvZGl2PlxuXG48ZGl2XG4gIGNsYXNzPVwibW9kYWwtb3ZlcmxheVwiXG4gIGlkPVwibW9kYWwtb3ZlcmxheVwiXG4gIGNsYXNzOmNsb3NlZD17IXNob3d9XG4gIG9uOmNsaWNrPXtjbG9zZX0gLz5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUErQkUsTUFBTSxBQUFDLENBQUMsQUFDTixPQUFPLENBQUUsSUFBSSxDQUNiLFNBQVMsQ0FBRSxJQUFJLENBQ2YsVUFBVSxDQUFFLElBQUksQ0FDaEIsUUFBUSxDQUFFLEtBQUssQ0FDZixPQUFPLENBQUUsR0FBRyxDQUNaLElBQUksQ0FBRSxHQUFHLENBQ1QsR0FBRyxDQUFFLEdBQUcsQ0FDUixTQUFTLENBQUUsVUFBVSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDaEMsVUFBVSxDQUFFLEtBQUssQ0FDakIsVUFBVSxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxBQUM5QyxDQUFDLEFBQ0QsT0FBTyxBQUFDLENBQUMsQUFDUCxPQUFPLENBQUUsSUFBSSxBQUNmLENBQUMsQUFFRCxjQUFjLEFBQUMsQ0FBQyxBQUNkLFFBQVEsQ0FBRSxLQUFLLENBQ2YsR0FBRyxDQUFFLENBQUMsQ0FDTixJQUFJLENBQUUsQ0FBQyxDQUNQLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLElBQUksQ0FDWixPQUFPLENBQUUsRUFBRSxDQUVYLFVBQVUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxBQUNuQyxDQUFDLEFBQ0QsV0FBVyxBQUFDLENBQUMsQUFDWCxRQUFRLENBQUUsUUFBUSxDQUNsQixHQUFHLENBQUUsQ0FBQyxDQUNOLElBQUksQ0FBRSxDQUFDLENBQ1AsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsSUFBSSxDQUNaLFFBQVEsQ0FBRSxJQUFJLENBQ2QsT0FBTyxDQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQUFDOUIsQ0FBQyxBQUVELE1BQU0sQ0FBQyxhQUFhLEFBQUMsQ0FBQyxBQUNwQixRQUFRLENBQUUsUUFBUSxDQUNsQixPQUFPLENBQUUsQ0FBQyxDQUNWLEdBQUcsQ0FBRSxJQUFJLENBQ1QsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsT0FBTyxBQUNqQixDQUFDLEFBRUQsQ0FBQyxBQUFDLENBQUMsQUFDRCxVQUFVLENBQUUsVUFBVSxDQUN0QixNQUFNLENBQUUsQ0FBQyxDQUNULE9BQU8sQ0FBRSxDQUFDLEFBQ1osQ0FBQyJ9 */</style>`;

    		init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, ["id", "show", "width", "height"]);

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
    		return ["id","show","width","height"];
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
    }

    customElements.define("modal-element", App);

    exports.App = App;

    return exports;

}({}));
//# sourceMappingURL=modal.js.map

import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  Fragment,
  h,
  hydrate,
  options,
} from "preact";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";

interface MockAttr {
  readonly name: string;
  readonly value: string;
}

class MockNode {
  parentNode: MockElement | null = null;
  readonly nodeType: number;

  constructor(nodeType: number) {
    this.nodeType = nodeType;
  }

  get nextSibling(): MockNode | null {
    if (!this.parentNode) {
      return null;
    }
    const siblings = this.parentNode.childNodes;
    const idx = siblings.indexOf(this);
    if (idx === -1 || idx + 1 >= siblings.length) {
      return null;
    }
    return siblings[idx + 1];
  }
}

class MockText extends MockNode {
  data: string;

  constructor(data: string) {
    super(3);
    this.data = data;
  }
}

class MockElement extends MockNode {
  readonly localName: string;
  readonly namespaceURI: string;
  readonly childNodes: MockNode[] = [];
  readonly attrMap = new Map<string, string>();
  readonly style: {
    cssText: string;
    setProperty(name: string, value: string): void;
  };
  value = "";

  constructor(tagName: string, namespaceURI = "http://www.w3.org/1999/xhtml") {
    super(1);
    this.localName = tagName;
    this.namespaceURI = namespaceURI;
    const styleProps = new Map<string, string>();
    this.style = {
      cssText: "",
      setProperty(name: string, value: string): void {
        styleProps.set(name, value);
      },
    };
  }

  get firstChild(): MockNode | null {
    return this.childNodes[0] ?? null;
  }

  get attributes(): readonly MockAttr[] {
    return Array.from(this.attrMap.entries(), ([name, value]) => ({
      name,
      value,
    }));
  }

  get className(): string {
    return this.attrMap.get("class") ?? "";
  }

  set className(next: string) {
    if (next) {
      this.attrMap.set("class", next);
    }
    else {
      this.attrMap.delete("class");
    }
  }

  get disabled(): boolean {
    return this.attrMap.has("disabled");
  }

  set disabled(next: boolean) {
    if (next) {
      this.attrMap.set("disabled", "");
    }
    else {
      this.attrMap.delete("disabled");
    }
  }

  setAttribute(name: string, value: string): void {
    if (name === "value") {
      this.value = value;
    }
    this.attrMap.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attrMap.delete(name);
  }

  getAttribute(name: string): string | null {
    return this.attrMap.get(name) ?? null;
  }

  appendChild<T extends MockNode>(child: T): T {
    return this.insertBefore(child, null);
  }

  insertBefore<T extends MockNode>(child: T, refChild: MockNode | null): T {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    child.parentNode = this;
    if (!refChild) {
      this.childNodes.push(child);
      return child;
    }
    const idx = this.childNodes.indexOf(refChild);
    if (idx === -1) {
      this.childNodes.push(child);
    }
    else {
      this.childNodes.splice(idx, 0, child);
    }
    return child;
  }

  removeChild<T extends MockNode>(child: T): T {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  addEventListener(): void {
    // Event registration is not exercised in hydration structure checks.
  }

  removeEventListener(): void {
    // Event deregistration is not exercised in hydration structure checks.
  }
}

function buildSsrFrameDom(): {
  readonly container: MockElement;
  readonly frame: MockElement;
  readonly stage: MockElement;
  readonly placeholder: MockElement;
  readonly footer: MockElement;
  readonly input: MockElement;
  readonly actionBtn: MockElement;
} {
  const container = new MockElement("astro-island");
  const frame = container.appendChild(new MockElement("div"));
  frame.setAttribute("class", "frame");

  const stage = frame.appendChild(new MockElement("div"));
  stage.setAttribute("class", "stage");

  const placeholder = stage.appendChild(new MockElement("div"));
  placeholder.setAttribute("class", "placeholder");
  placeholder.appendChild(new MockText("Enter recipient and valid IBAN."));

  const footer = frame.appendChild(new MockElement("div"));
  footer.setAttribute("class", "footer");
  footer.appendChild(new MockText("Scan in banking app"));

  const input = container.appendChild(new MockElement("input"));
  input.setAttribute("type", "text");
  input.setAttribute("value", "");

  const actionBtn = container.appendChild(new MockElement("button"));
  actionBtn.setAttribute("type", "button");
  actionBtn.setAttribute("disabled", "");
  actionBtn.appendChild(new MockText("Download"));

  return {
    container,
    frame,
    stage,
    placeholder,
    footer,
    input,
    actionBtn,
  };
}

describe("useHydrated", () => {
  it("keeps initial hydrate() aligned with SSR DOM and diffs persisted client state on mount", async () => {
    const dom = buildSsrFrameDom();
    const rafQueue: (() => void)[] = [];
    const previousRaf = options.requestAnimationFrame;
    const previousDocDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      writable: true,
      value: {
        createElementNS: (ns: string, tag: string) => new MockElement(tag, ns),
        createTextNode: (text: string) => new MockText(text),
      },
    });
    options.requestAnimationFrame = (cb) => {
      rafQueue.push(cb);
    };

    try {
      const persistedReady = true;
      const persistedName = "Musterfirma GmbH";

      const TestIsland = () => {
        const hydrated = useHydrated();
        const isReady = hydrated && persistedReady;
        const recipient = hydrated ? persistedName : "";

        return h(Fragment, null, [
          h("div", { className: "frame" }, [
            h("div", { className: "stage" }, [
              isReady
                ? h("button", {
                  type: "button",
                  className: "trigger",
                }, [h("canvas", { className: "qr" })])
                : h("div", { className: "placeholder" }, "Enter recipient and valid IBAN."),
            ]),
            h("div", { className: "footer" }, "Scan in banking app"),
          ]),
          h("input", {
            type: "text",
            value: recipient,
          }),
          h("button", {
            type: "button",
            disabled: !isReady,
          }, "Download"),
        ]);
      };

      hydrate(h(TestIsland, null), dom.container as unknown as Element);

      // Before effects flush, hydrated === false so initial hydrate() pairs 1:1 with SSR DOM.
      assert.equal(dom.stage.childNodes[0], dom.placeholder);
      assert.equal(dom.placeholder.className, "placeholder");
      assert.equal(dom.footer.className, "footer");
      assert.equal(dom.input.value, "");
      assert.equal(dom.actionBtn.disabled, true);
      assert.equal(rafQueue.length > 0, true);

      // Flush useEffect callbacks so hydrated flips to true and triggers normal client diffing.
      while (rafQueue.length > 0) {
        const cb = rafQueue.shift();
        cb?.();
      }
      await new Promise((resolve) => setTimeout(resolve, 0));

      assert.equal(dom.frame.childNodes.length, 2);
      assert.equal(dom.frame.childNodes[0], dom.stage);
      assert.equal(dom.frame.childNodes[1], dom.footer);
      assert.equal(dom.footer.className, "footer");

      assert.equal(dom.stage.childNodes.length, 1);
      const stageChild = dom.stage.childNodes[0] as MockElement;
      assert.equal(stageChild.localName, "button");
      assert.equal(stageChild.className, "trigger");
      assert.equal(stageChild.childNodes.length, 1);
      assert.equal((stageChild.childNodes[0] as MockElement).localName, "canvas");

      assert.equal(dom.input.value, persistedName);
      assert.equal(dom.actionBtn.disabled, false);
    }
    finally {
      options.requestAnimationFrame = previousRaf;
      if (previousDocDescriptor) {
        Object.defineProperty(globalThis, "document", previousDocDescriptor);
      }
      else {
        Reflect.deleteProperty(globalThis, "document");
      }
    }
  });
});

import kernel from "./kernel.js";

type Point = [number, number];

type Handle = { set: (value: number) => void; destroy: () => void };

export type Figure = {
  name: string;
  means: string;
  rules: number[];
  range: [number, number, number];
  tour: (Point | null)[] | null;
  mount: (
    host: { stage: HTMLElement; svg: SVGSVGElement; read: { textContent: string | null } },
    value: number,
  ) => Handle;
};

/** The slice of the kernel the host uses; figures reach the rest through the `HL` global. */
type Kernel = {
  inject: (root: Document) => void;
  mk: (tag: string, attrs: Record<string, string>, parent: Element) => SVGSVGElement;
  tour: (stage: HTMLElement, stops: (Point | null)[]) => { stop: () => void };
  LAP: (Point | null)[];
};

declare global {
  var HL: unknown;
  var hairline: (figure: Figure) => void;
}

const HL = kernel as Kernel;
const registry = new Map<string, Figure>();

// Figures are written for the skill's bench: they read `HL` and call `hairline(...)` as globals.
globalThis.HL = kernel;
globalThis.hairline = (figure) => {
  registry.set(figure.name, figure);
};

export async function loadFigure(slug: string): Promise<Figure> {
  await import(`./figures/${slug}.js`);
  const figure = registry.get(slug);
  if (!figure) throw new Error(`Hairline figure "${slug}" did not register.`);
  return figure;
}

/** Does what the skill's bench.html does: mounts the figure, wires its read-out and plays its tour. */
export function mountFigure(stage: HTMLElement, readout: HTMLElement, figure: Figure) {
  HL.inject(document);
  const svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);
  const read = {
    get textContent() {
      return readout.textContent;
    },
    set textContent(value: string | null) {
      readout.textContent = value ?? "";
    },
  };

  const handle = figure.mount({ stage, svg, read }, figure.range[1]);
  if (!readout.textContent) readout.textContent = "rest";
  const playing = HL.tour(stage, figure.tour ?? HL.LAP);

  return () => {
    playing.stop();
    handle.destroy();
    svg.remove();
    readout.textContent = "";
  };
}

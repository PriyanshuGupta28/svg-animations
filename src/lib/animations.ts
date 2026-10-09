export const topics = [
  { slug: "ui-ux", label: "UI/UX Design" },
  { slug: "web-dev", label: "Web Dev" },
  { slug: "frontend", label: "Frontend" },
  { slug: "backend", label: "Backend" },
  { slug: "full-stack", label: "Full Stack" },
  { slug: "motion-graphics", label: "Motion Graphics" },
  { slug: "video-editing", label: "Video Editing" },
  { slug: "sound-design", label: "Sound Design" },
  { slug: "seo", label: "SEO" },
  { slug: "content-creation", label: "Content Creation" },
  { slug: "social-media", label: "Social Media" },
  { slug: "esports", label: "Esports" },
  { slug: "podcasts", label: "Podcasts" },
] as const;

export type TopicSlug = (typeof topics)[number]["slug"];

export type Animation = {
  slug: string;
  title: string;
  topic: TopicSlug;
};

/** Each slug is a figure in `src/hairline/figures/<slug>.js`. */
export const animations: Animation[] = [
  { slug: "switchboard", title: "Switchboard", topic: "ui-ux" },
  { slug: "fandeck", title: "Fandeck", topic: "ui-ux" },
  { slug: "wireframe", title: "Wireframe", topic: "ui-ux" },
  { slug: "keyboard", title: "Keyboard", topic: "web-dev" },
  { slug: "serverrack", title: "Server Rack", topic: "web-dev" },
  { slug: "locks", title: "Locks", topic: "web-dev" },
  { slug: "devices", title: "Breakpoints", topic: "frontend" },
  { slug: "layers", title: "Layers", topic: "frontend" },
  { slug: "pixels", title: "Pixels", topic: "frontend" },
  { slug: "queue", title: "Message Queue", topic: "backend" },
  { slug: "shards", title: "Shards", topic: "backend" },
  { slug: "plinko", title: "Load Balancer", topic: "backend" },
  { slug: "tiers", title: "Tiered Stack", topic: "full-stack" },
  { slug: "elevator", title: "Elevator", topic: "full-stack" },
  { slug: "toolbox", title: "Toolbox", topic: "full-stack" },
  { slug: "flipbook", title: "Flipbook", topic: "motion-graphics" },
  { slug: "zoetrope", title: "Zoetrope", topic: "motion-graphics" },
  { slug: "easerail", title: "Ease Rail", topic: "motion-graphics" },
  { slug: "timeline", title: "Timeline", topic: "video-editing" },
  { slug: "reels", title: "Film Reels", topic: "video-editing" },
  { slug: "splice", title: "Splice", topic: "video-editing" },
  { slug: "mixer", title: "Mixing Desk", topic: "sound-design" },
  { slug: "knobs", title: "Knob Panel", topic: "sound-design" },
  { slug: "speakerwall", title: "Speaker Wall", topic: "sound-design" },
  { slug: "loupe", title: "Loupe", topic: "seo" },
  { slug: "podium", title: "Rankings", topic: "seo" },
  { slug: "catalog", title: "Card Catalog", topic: "seo" },
  { slug: "dolly", title: "Dolly", topic: "content-creation" },
  { slug: "clapper", title: "Clapper", topic: "content-creation" },
  { slug: "ringlight", title: "Ring Light", topic: "content-creation" },
  { slug: "crowd", title: "Crowd", topic: "social-media" },
  { slug: "feed", title: "Feed", topic: "social-media" },
  { slug: "dominoes", title: "Dominoes", topic: "social-media" },
  { slug: "jerseys", title: "Jerseys", topic: "esports" },
  { slug: "trophy", title: "Trophy", topic: "esports" },
  { slug: "lineup", title: "Lineup", topic: "esports" },
  { slug: "boomarm", title: "Boom Arm", topic: "podcasts" },
  { slug: "roundtable", title: "Round Table", topic: "podcasts" },
  { slug: "tapes", title: "Tapes", topic: "podcasts" },
];

export const isTopicSlug = (value: unknown): value is TopicSlug =>
  topics.some((topic) => topic.slug === value);

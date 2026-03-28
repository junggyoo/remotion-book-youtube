import { describe, it, expect } from "vitest";
import { recipeRegistry } from "../familyRecipes";

// ─── closing-synthesis ─────────────────────────────────────────────────────

describe("closing-synthesis recipe", () => {
  const recipe = recipeRegistry["closing-synthesis"]!;

  it("is registered with correct defaults", () => {
    expect(recipe).toBeDefined();
    expect(recipe.family).toBe("closing-synthesis");
    expect(recipe.defaultLayout).toBe("center-focus");
    expect(recipe.defaultChoreography).toBe("reveal-sequence");
  });

  it("returns [] if no recapStatement", () => {
    expect(recipe.resolve({}, { sceneId: "cs-00" })).toHaveLength(0);
    expect(
      recipe.resolve({ ctaText: "Subscribe!" }, { sceneId: "cs-01" }),
    ).toHaveLength(0);
  });

  it("maps recapStatement to headline", () => {
    const result = recipe.resolve(
      { recapStatement: "Key takeaway" },
      { sceneId: "cs-02" },
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "cs-02-headline",
      type: "headline",
      props: { text: "Key takeaway", role: "headline" },
    });
  });

  it("maps ctaText to label with accent variant", () => {
    const result = recipe.resolve(
      { recapStatement: "Summary", ctaText: "Try it now" },
      { sceneId: "cs-03" },
    );
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({
      id: "cs-03-cta",
      type: "label",
      props: { text: "Try it now", variant: "accent", role: "cta" },
    });
  });
});

// ─── structural-bridge ─────────────────────────────────────────────────────

describe("structural-bridge recipe", () => {
  const recipe = recipeRegistry["structural-bridge"]!;

  it("is registered with correct defaults", () => {
    expect(recipe).toBeDefined();
    expect(recipe.family).toBe("structural-bridge");
    expect(recipe.defaultLayout).toBe("center-focus");
    expect(recipe.defaultChoreography).toBe("reveal-sequence");
  });

  it("returns [] if no chapterTitle", () => {
    expect(recipe.resolve({}, { sceneId: "sb-00" })).toHaveLength(0);
    expect(
      recipe.resolve({ chapterNumber: 2 }, { sceneId: "sb-01" }),
    ).toHaveLength(0);
  });

  it("always includes divider first", () => {
    const result = recipe.resolve(
      { chapterTitle: "Chapter One" },
      { sceneId: "sb-02" },
    );
    expect(result[0]).toMatchObject({
      type: "divider",
      props: { role: "divider" },
    });
  });

  it("maps chapterNumber → number-display before headline", () => {
    const result = recipe.resolve(
      { chapterTitle: "Chapter One", chapterNumber: 1 },
      { sceneId: "sb-03" },
    );
    // divider, number-display, headline
    expect(result).toHaveLength(3);
    expect(result[1]).toMatchObject({
      id: "sb-03-number",
      type: "number-display",
      props: { text: "1", role: "number" },
    });
    expect(result[2]).toMatchObject({
      id: "sb-03-headline",
      type: "headline",
      props: { text: "Chapter One" },
    });
  });

  it("maps chapterSubtitle to body-text", () => {
    const result = recipe.resolve(
      { chapterTitle: "Act II", chapterSubtitle: "The turning point" },
      { sceneId: "sb-04" },
    );
    const last = result[result.length - 1];
    expect(last).toMatchObject({
      id: "sb-04-subtitle",
      type: "body-text",
      props: { text: "The turning point", role: "subtitle" },
    });
  });
});

// ─── opening-hook ──────────────────────────────────────────────────────────

describe("opening-hook recipe", () => {
  const recipe = recipeRegistry["opening-hook"]!;

  it("is registered with correct defaults", () => {
    expect(recipe).toBeDefined();
    expect(recipe.family).toBe("opening-hook");
    expect(recipe.defaultLayout).toBe("center-focus");
    expect(recipe.defaultChoreography).toBe("reveal-sequence");
  });

  it("returns [] if neither title nor mainText", () => {
    expect(recipe.resolve({}, { sceneId: "oh-00" })).toHaveLength(0);
  });

  it("cover mode: maps title → headline", () => {
    const result = recipe.resolve(
      { title: "Atomic Habits" },
      { sceneId: "oh-01" },
    );
    expect(result[0]).toMatchObject({
      id: "oh-01-headline",
      type: "headline",
      props: { text: "Atomic Habits", role: "headline" },
    });
  });

  it("cover mode: maps author → caption, subtitle → body-text, coverImageUrl → image", () => {
    const result = recipe.resolve(
      {
        title: "Book",
        author: "Author Name",
        subtitle: "A subtitle",
        coverImageUrl: "covers/book.png",
      },
      { sceneId: "oh-02" },
    );
    expect(result).toHaveLength(4);
    expect(result[1]).toMatchObject({
      type: "caption",
      props: { text: "Author Name" },
    });
    expect(result[2]).toMatchObject({
      type: "body-text",
      props: { text: "A subtitle" },
    });
    expect(result[3]).toMatchObject({
      type: "image",
      props: { src: "covers/book.png" },
    });
  });

  it("highlight mode: maps mainText → headline", () => {
    const result = recipe.resolve(
      { mainText: "Hook line!" },
      { sceneId: "oh-03" },
    );
    expect(result[0]).toMatchObject({
      id: "oh-03-headline",
      type: "headline",
      props: { text: "Hook line!", role: "headline" },
    });
  });

  it("highlight mode: maps subText → body-text", () => {
    const result = recipe.resolve(
      { mainText: "Hook", subText: "Sub detail" },
      { sceneId: "oh-04" },
    );
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({
      type: "body-text",
      props: { text: "Sub detail", role: "support" },
    });
  });

  it("title takes priority over mainText when both present", () => {
    const result = recipe.resolve(
      { title: "Cover Title", mainText: "Hook Text" },
      { sceneId: "oh-05" },
    );
    expect(result[0].props.text).toBe("Cover Title");
  });
});

// ─── reflective-anchor ─────────────────────────────────────────────────────

describe("reflective-anchor recipe", () => {
  const recipe = recipeRegistry["reflective-anchor"]!;

  it("is registered with correct defaults", () => {
    expect(recipe).toBeDefined();
    expect(recipe.family).toBe("reflective-anchor");
    expect(recipe.defaultLayout).toBe("center-focus");
    expect(recipe.defaultChoreography).toBe("reveal-sequence");
  });

  it("returns [] if neither quoteText nor both leftQuote+rightQuote", () => {
    expect(recipe.resolve({}, { sceneId: "ra-00" })).toHaveLength(0);
    expect(
      recipe.resolve({ leftQuote: "Left only" }, { sceneId: "ra-01" }),
    ).toHaveLength(0);
    expect(
      recipe.resolve({ rightQuote: "Right only" }, { sceneId: "ra-02" }),
    ).toHaveLength(0);
  });

  it("single mode: maps quoteText → quote-text", () => {
    const result = recipe.resolve(
      { quoteText: "Be the change" },
      { sceneId: "ra-03" },
    );
    expect(result[0]).toMatchObject({
      id: "ra-03-quote",
      type: "quote-text",
      props: { text: "Be the change", role: "quote" },
    });
  });

  it("single mode: maps attribution → caption", () => {
    const result = recipe.resolve(
      { quoteText: "Be the change", attribution: "Gandhi" },
      { sceneId: "ra-04" },
    );
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({
      id: "ra-04-caption",
      type: "caption",
      props: { text: "Gandhi", role: "attribution" },
    });
  });

  it("split mode: produces left-quote, divider, right-quote", () => {
    const result = recipe.resolve(
      { leftQuote: "Before", rightQuote: "After" },
      { sceneId: "ra-05" },
    );
    const types = result.map((e) => e.type);
    expect(types).toContain("quote-text");
    expect(types).toContain("divider");
    const divider = result.find((e) => e.type === "divider");
    expect(divider?.props.orientation).toBe("vertical");
    const leftQ = result.find((e) => e.props.role === "left-quote");
    const rightQ = result.find((e) => e.props.role === "right-quote");
    expect(leftQ?.props.text).toBe("Before");
    expect(rightQ?.props.text).toBe("After");
  });

  it("split mode: quoteText takes priority over leftQuote+rightQuote", () => {
    const result = recipe.resolve(
      { quoteText: "Single", leftQuote: "L", rightQuote: "R" },
      { sceneId: "ra-06" },
    );
    // Single mode should be used
    expect(result[0].props.role).toBe("quote");
    expect(result.find((e) => e.props.role === "left-quote")).toBeUndefined();
  });
});

// ─── mechanism-explanation ─────────────────────────────────────────────────

describe("mechanism-explanation recipe", () => {
  const recipe = recipeRegistry["mechanism-explanation"]!;

  it("is registered with correct defaults", () => {
    expect(recipe).toBeDefined();
    expect(recipe.family).toBe("mechanism-explanation");
    expect(recipe.defaultLayout).toBe("radial");
    expect(recipe.defaultChoreography).toBe("stagger-clockwise");
  });

  it("returns [] if no label AND no items", () => {
    expect(recipe.resolve({}, { sceneId: "me-00" })).toHaveLength(0);
  });

  it("frameworkLabel takes priority over headline", () => {
    const result = recipe.resolve(
      { frameworkLabel: "Framework", headline: "Fallback" },
      { sceneId: "me-01" },
    );
    expect(result[0].props.text).toBe("Framework");
  });

  it("falls back to headline when no frameworkLabel", () => {
    const result = recipe.resolve(
      { headline: "Mechanism" },
      { sceneId: "me-02" },
    );
    expect(result[0].props.text).toBe("Mechanism");
  });

  it("maps items to body-text with title:description text", () => {
    const result = recipe.resolve(
      {
        frameworkLabel: "Loop",
        items: [
          { title: "Cue", description: "The trigger" },
          { title: "Routine", description: "The behavior" },
        ],
      },
      { sceneId: "me-03" },
    );
    expect(result).toHaveLength(3); // headline + 2 items
    expect(result[1]).toMatchObject({
      id: "me-03-item-0",
      type: "body-text",
      props: { text: "Cue: The trigger", index: 0, role: "item" },
    });
    expect(result[2]).toMatchObject({
      id: "me-03-item-1",
      type: "body-text",
      props: { text: "Routine: The behavior", index: 1, role: "item" },
    });
  });

  it("works with items only and no label", () => {
    const result = recipe.resolve(
      { items: [{ title: "A", description: "B" }] },
      { sceneId: "me-04" },
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("body-text");
  });
});

// ─── tension-comparison ────────────────────────────────────────────────────

describe("tension-comparison recipe", () => {
  const recipe = recipeRegistry["tension-comparison"]!;

  it("is registered with correct defaults", () => {
    expect(recipe).toBeDefined();
    expect(recipe.family).toBe("tension-comparison");
    expect(recipe.defaultLayout).toBe("split-compare");
    expect(recipe.defaultChoreography).toBe("split-reveal");
  });

  it("returns [] if no leftLabel AND no rightLabel", () => {
    expect(recipe.resolve({}, { sceneId: "tc-00" })).toHaveLength(0);
    expect(
      recipe.resolve({ leftContent: "content" }, { sceneId: "tc-01" }),
    ).toHaveLength(0);
  });

  it("maps leftLabel without variant (default)", () => {
    const result = recipe.resolve(
      { leftLabel: "Old Way" },
      { sceneId: "tc-02" },
    );
    const label = result.find((e) => e.props.role === "left-label");
    expect(label).toMatchObject({
      id: "tc-02-left-label",
      type: "label",
      props: { text: "Old Way", role: "left-label" },
    });
    expect(label?.props.variant).toBeUndefined();
  });

  it("maps rightLabel with accent variant", () => {
    const result = recipe.resolve(
      { rightLabel: "New Way" },
      { sceneId: "tc-03" },
    );
    const label = result.find((e) => e.props.role === "right-label");
    expect(label).toMatchObject({
      type: "label",
      props: { text: "New Way", variant: "accent", role: "right-label" },
    });
  });

  it("maps all four fields in correct order", () => {
    const result = recipe.resolve(
      {
        leftLabel: "A",
        leftContent: "A desc",
        rightLabel: "B",
        rightContent: "B desc",
      },
      { sceneId: "tc-04" },
    );
    expect(result).toHaveLength(4);
    expect(result[0].props.role).toBe("left-label");
    expect(result[1].props.role).toBe("left-content");
    expect(result[2].props.role).toBe("right-label");
    expect(result[3].props.role).toBe("right-content");
  });
});

// ─── evidence-stack ────────────────────────────────────────────────────────

describe("evidence-stack recipe", () => {
  const recipe = recipeRegistry["evidence-stack"]!;

  it("is registered with correct defaults", () => {
    expect(recipe).toBeDefined();
    expect(recipe.family).toBe("evidence-stack");
    expect(recipe.defaultLayout).toBe("grid-expand");
    expect(recipe.defaultChoreography).toBe("stagger-clockwise");
  });

  it("returns [] if neither data path nor list path has data", () => {
    expect(recipe.resolve({}, { sceneId: "es-00" })).toHaveLength(0);
    expect(
      recipe.resolve({ dataLabel: "Stats" }, { sceneId: "es-01" }),
    ).toHaveLength(0);
    expect(
      recipe.resolve({ listLabel: "Items" }, { sceneId: "es-02" }),
    ).toHaveLength(0);
  });

  it("data mode: maps dataLabel → headline + data items as label: value", () => {
    const result = recipe.resolve(
      {
        dataLabel: "Statistics",
        data: [
          { label: "Growth", value: "37x" },
          { label: "Users", value: 1000 },
        ],
      },
      { sceneId: "es-03" },
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      type: "headline",
      props: { text: "Statistics" },
    });
    expect(result[1]).toMatchObject({
      id: "es-03-data-0",
      type: "body-text",
      props: { text: "Growth: 37x", index: 0, role: "data-item" },
    });
    expect(result[2]).toMatchObject({
      id: "es-03-data-1",
      type: "body-text",
      props: { text: "Users: 1000", index: 1, role: "data-item" },
    });
  });

  it("list mode: maps listLabel → headline + items", () => {
    const result = recipe.resolve(
      {
        listLabel: "Key Points",
        items: [{ text: "Point A" }, { text: "Point B" }],
      },
      { sceneId: "es-04" },
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      type: "headline",
      props: { text: "Key Points" },
    });
    expect(result[1]).toMatchObject({
      id: "es-04-list-0",
      type: "body-text",
      props: { text: "Point A", index: 0, role: "list-item" },
    });
  });

  it("data mode takes priority when both paths have data", () => {
    const result = recipe.resolve(
      {
        dataLabel: "Data",
        data: [{ label: "X", value: 1 }],
        listLabel: "List",
        items: [{ text: "item" }],
      },
      { sceneId: "es-05" },
    );
    expect(result[0].props.text).toBe("Data");
    expect(result[1].props.role).toBe("data-item");
  });
});

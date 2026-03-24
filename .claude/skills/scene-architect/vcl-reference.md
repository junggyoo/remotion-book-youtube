# VCL (Visual Composition Language) Reference

## Primitives (Registered in primitiveRegistry.ts)

### Text Primitives

| Type             | Adapter              | Key Props                                   |
| ---------------- | -------------------- | ------------------------------------------- |
| `headline`       | headlineAdapter      | text, weight, align, color                  |
| `body-text`      | bodyTextAdapter      | text, tokenRef, weight, color, align        |
| `label`          | labelAdapter         | text/label, variant (default/accent/signal) |
| `caption`        | captionAdapter       | text, align, color                          |
| `number-display` | numberDisplayAdapter | value, variant                              |
| `quote-text`     | quoteTextAdapter     | text, attribution, useSerif                 |

### Visual Primitives

| Type              | Adapter               | Key Props                         |
| ----------------- | --------------------- | --------------------------------- |
| `icon`            | iconAdapter           | iconId/src, size                  |
| `divider`         | dividerAdapter        | orientation (horizontal/vertical) |
| `texture-overlay` | textureOverlayAdapter | (none — uses theme.surfaceMuted)  |
| `color-block`     | colorBlockAdapter     | colorKey (theme key)              |
| `shape`           | shapeAdapter          | shape (circle/rect)               |
| `image`           | imageAdapter          | src                               |

### Structural Primitives

| Type              | Adapter        | Key Props                                                |
| ----------------- | -------------- | -------------------------------------------------------- |
| `timeline-node`   | TimelineNode   | label, description, highlighted, index                   |
| `cycle-connector` | CycleConnector | connects.{fromId,toId}, centerX, centerY, radius, dotted |
| `flow-step`       | FlowStep       | stepNumber, title, detail                                |
| `card-stack`      | CardStack      | offsetPx, direction                                      |
| `layer-stack`     | LayerStack     | (children)                                               |

## Layouts (7 implemented in layoutRegistry)

| Layout          | Function    | Compatible Choreographies          |
| --------------- | ----------- | ---------------------------------- |
| `center-focus`  | centerFocus | reveal-sequence                    |
| `split-two`     | splitTwo    | reveal-sequence, split-reveal      |
| `split-compare` | splitTwo    | reveal-sequence, split-reveal      |
| `radial`        | radial      | stagger-clockwise, reveal-sequence |
| `timeline-h`    | timelineH   | reveal-sequence, path-trace        |
| `grid-n`        | gridN       | reveal-sequence, stagger-clockwise |
| `grid-expand`   | gridN       | reveal-sequence, stagger-clockwise |

## Choreographies (3 implemented)

| Choreography        | Description                          |
| ------------------- | ------------------------------------ |
| `reveal-sequence`   | Elements appear one by one in order  |
| `stagger-clockwise` | Elements appear with angular stagger |
| `path-trace`        | Elements reveal along a path         |

## Motion Presets (5 available)

| Preset     | Type        | Duration | Use Case             |
| ---------- | ----------- | -------- | -------------------- |
| `gentle`   | interpolate | 90-180f  | ambient, texture     |
| `smooth`   | spring      | 24-45f   | body reveal, pan     |
| `snappy`   | spring      | 12-24f   | keyword, counter     |
| `heavy`    | spring      | 30-54f   | chapter, headline    |
| `dramatic` | hybrid      | 45-75f   | chapter shift, intro |

## Capability → Layout Mapping (17 entries)

| Capability            | Layout       | Confidence |
| --------------------- | ------------ | ---------- |
| cyclic-flow           | radial       | 1.0        |
| radial-layout         | radial       | 1.0        |
| timeline-h            | timeline-h   | 1.0        |
| before-after-pair     | split-two    | 1.0        |
| motif-wheel           | radial       | 0.9        |
| split-reveal          | split-two    | 0.9        |
| emphasis-composition  | center-focus | 0.8        |
| dramatic-choreography | center-focus | 0.8        |
| timeline-v            | timeline-h   | 0.8        |
| layered-stack         | grid-expand  | 0.7        |
| motif-spiral          | radial       | 0.7        |
| motif-orbit           | radial       | 0.6        |
| motif-web             | grid-n       | 0.6        |
| signature-composition | center-focus | 0.6        |
| custom-layout         | center-focus | 0.5        |
| motif-rhizome         | grid-n       | 0.5        |
| custom-composition    | center-focus | 0.5        |

## Element Builder Reference

### buildRadialElements(centerLabel, items)

- Center: `label` (accent variant)
- Orbit: `label` per item + optional `body-text` + `icon`
- Connectors: `cycle-connector` between consecutive nodes (cyclic)

### buildTimelineElements(steps, title?)

- Title: `headline` (optional)
- Nodes: `timeline-node` per step
- Connectors: `flow-step` between consecutive nodes

### buildSplitElements(left, right)

- Labels: `label` per side (default/accent)
- Bodies: `body-text` per side
- Divider: `divider` (vertical)

### buildEmphasisElements(headline, supportText?)

- Background: `color-block`
- Headline: `headline` (bold, center)
- Support: `body-text` (optional, muted)

### buildGridElements(items, gridLabel?)

- Label: `label` (optional, accent)
- Items: `body-text` (title + optional description per item)

# Prototype Instructions

## Stair rail jumps and public React deployment, 2026-10-13

Allow jumps onto and outward from every ascending stair rail, including the
sloped flights. Consume grounded jump input before changing the support beneath
the visitor. Airborne terrace support must follow actual masonry boundaries,
not the extra clearance used for walking beside stairs. Preserve continuous
falls, dry guidance, swimming and the restored sharp rendering.
Publish the React production build from dist/client through GitHub Pages Actions
when main is pushed. Keep the optional Sites packaging intact. Frame, business
card and UI refinements are deferred until after this deployment.

## Preserve visual quality while optimizing, 2026-10-13

The user rejected the blurry result of the previous performance pass. Restore
sharp native desktop rendering, source-resolution surface textures and artwork,
and antialiasing. Never reduce the main drawing buffer in response to a slow
frame. Optimize shaders, cached shadows, reflection frequency and asset encoding
while preserving the approved atmosphere, architecture, content and movement.
Run tools/restore_runtime_quality.py after rebuilding runtime derivatives.

## Usable runtime performance, 2026-10-12

The user reports extremely slow loading and unusable movement at localhost:4173.
Prioritize smooth navigation and aim for initial readiness within one minute.
Use lightweight runtime derivatives, bounded render resolution and affordable
lighting/reflections while retaining the approved space, mood, original content,
project placement and E/click interactions. Verify real loading and movement;
do not infer frame rates from a background-throttled browser animation loop.

## Orange Card at the left wall's rear end, 2026-10-12

The user corrected the project choice: restore EATGO (project-03) to its original
rear-wall position [1.42,2.06,-6.90]. Move E1 Orange Card (project-06) to the left
wall near the rear corner shown in the latest attachment, at [-2.20,2.06,-5.90],
facing into the room. Match the opposite wall's frame size, height and corner
clearance. Keep the single entrance-side bookcase, all other work and growing
archive pages. This supersedes the previous EATGO move and full empty-wall rule.

## Keep one entrance-side bookcase, 2026-10-11

Restore the single leftmost bookcase bay when looking at the right atelier's
left wall from inside the room: the original entrance-side bay at [-2.13,-1.3].
Keep its books, but leave the removed pots, ivy and planting bed absent to avoid
overlap. The other three bays stay empty for future artworks. Use the shared
rightAtelier.leftEntryBookcase placement for native geometry and collision;
rebake its shadows. This supersedes the full removal below.

## Reserve the right atelier's left wall, 2026-10-11

Remove the tall ground-floor shelves, their books and top pots, the overlapping
rooted ivy, its floor bed and the front floor planter from the left wall of the
right atelier. Leave this wall empty for one or two future artworks. Retain its
oak finish and wall/ceiling fixtures, the existing six artworks, rear desk and
the opposite wall's relocated cabinet/plant grouping. Remove corresponding
collision volumes and baked plant shadows as well as the visible geometry.

## Right atelier exhibition breathing room, 2026-10-11

Keep the ground right room's side-wall frames inset from the rear corner and
evenly spaced as one group toward the left/rear. Move its low bookcase, both
floor pots, rooted ivy and planting bed together toward the right/front end,
leaving all artwork clear. Use rightAtelier in garden-layout.json for shared
native furniture, runtime trees, baked shadows and collision positions.
Preserve the readable frame size, growing exhibition pages and E/click flow.

## Desk content and E interactions, 2026-10-11

The newest request supersedes profile wall frames, the stair contact plaque and
the split indoor/outdoor project layout. Put the profile in a real hinged book
on the left ground studio desk. Nearby E or clicking focuses the camera, opens
the book, and reveals every original profile section. All project frames belong
to the right ground atelier, at readable fixed sizes; paginate the physical
exhibition automatically for seven, eight or more projects and derive totals
from the content data. Contact is a printed business card on the upper writing
desk, lifted toward the viewer when interacted with. Preserve all original data
and links. Use E consistently for nearby scene content, retaining click/touch
and accessible direct shortcuts. One bottom messenger box presents the exact
instruction "E 버튼을 눌러서 상호작용 하세요". Smooth camera/object/detail transitions
must reverse to the original standing pose on close, cancel and reset, with
reduced-motion support. Require proximity, same-floor access and line of sight.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Approved portfolio requirements

The active project is the afternoon atelier and pool terrace. Use public/references/01-atelier.png and 02-pool-terrace.png as visual targets. Preserve every profile field and every description, metadata field, image and link in public/portfolio-content.json. Six unique projects: three indoor, three outdoor. One shared open passage; no door activation, room-loading gate, teleport or floor arrows. Profile/Portfolio/Contact direct menus share completion with scene clicks. Portfolio menu completes all six; restart clears all cues/progress. Use actual 3D geometry, not reference photographs as room backgrounds.

## User feedback, 2026-10-06

The user accepted the current overall composition as close to the approved images and requested more antique character: weathered timber, aged mineral plaster and richer light/shade. Close the visible gaps beside the shared entrance and behind the timber gallery. Replace low terrace parapets with tall courtyard walls so users cannot see the disconnected city/sky below the horizon. A walled open-air courtyard is the explicit update to the outdoor source; keep the afternoon sky above it, pool, gallery, bench and free shared passage.

## Selected second-floor concept, 2026-10-06

The user selected public/references/03-two-storey-atelier.png and requested faithful implementation of its entire mood and architecture. Add the upper oak library/reading terrace, raise the front ground-floor clear ceiling to approximately 3.6m, and use one right-wall L-shaped limestone stair with an intermediate landing. Both flights and the arrival must be continuously walkable in either direction, including manual WASD/touch movement; no teleport or activation gate. Apply warm bronze wall sconces and real trailing/climbing foliage to every wall zone on both levels, retaining clear artwork faces and walkways. Upper perimeter walls must hide the disconnected outside horizon from upstairs eye height too. Preserve the original content and shared completion/reset behavior, including any repeated Profile frame upstairs. Use src/navigation/space-layout.json as the shared geometry/navigation dimensions and src/scene/wall-decor.json as the shared runtime/bake decoration positions.

## Reference corrections explicitly requested, 2026-10-06

The previous two-storey result was rejected: its long diagonal front stair,
protruding arrival tongue and two masonry portal supports changed the approved
facade. The selected 03-two-storey-atelier image is the source of truth. Keep
the balcony front straight and the broad front-facing stair at the far right,
with its short upper turn meeting the right balcony edge. No extra central
door-like posts. Use glossy limestone, pronounced sunlit patches/reflections,
rooted branching ivy on walls and cornice, and low planted beds at wall bases.
Disconnected repeated leaf stamps are not an acceptable replacement for ivy.
These corrections supersede earlier stair dimension choices. Garden geometry,
navigation and baked/runtime vegetation must share garden-layout.json.

Keep the canopyTrees placements in garden-layout.json shared by runtime and
baking; their overhanging leaves must cast genuine sunlight shadows. Preserve
the blue pool body beneath timber reflections. The lower-flight route stays
at x=4.5 around the upper-front railing/newel; do not shorten it through the
rail. Verify actual mesh body probes as well as the navigation tests whenever
the stair geometry or route changes. Do not claim pixel identity with the
generated reference; compare the actual native 3D view and record differences.

## Detail revision requested, 2026-10-06

The latest four attachments supersede the previous stair-turn dimensions. Use
the fourth attached full view as the visual target and 03-two-storey-atelier.png
as its larger reference. Build a single uninterrupted stair flight, one central
upper-ceiling pendant, an angled outside timber facade with the inner artwork
wall remaining square, and a continuous low planted band around courtyard
walls. Match the slightly darker golden-evening mood and increase the perceived
width/height. Keep physical navigation and the new single-stair footprint shared
with Blender. A worldScale shared by all scene geometry/lights and camera floor
positions enlarges the space; human eye height remains 1.53 real meters. The
old x=4.5 turning-landing guidance and two-flight rail are obsolete. Preserve
all content, shared completion and free both-way movement.

## Landing and two-room correction, 2026-10-06

The newest user clarification supersedes the single uninterrupted-flight choice.
Use 05-landing-two-rooms.png and the larger 03 reference: one connected stair
with an intermediate landing and gentle upper turn, exactly two ground-floor
spaces. Remove the apparent far-left third pocket, make the left studio
physically enterable, and widen the pool/stair dry passage and front crosswalk.
Use a limestone-tiled base with trailing ivy below the balcony rail. Add real
side-wall and step illumination. Match both floors' oak furniture and warm
interior mood. Add varied rooted ivy continuing over several courtyard copings.
Shared stair flights/landing, room bounds, light manifests and actual loaded
mesh probes must remain aligned with navigation. Preserve every content item.

## Latest stair/tile/evening correction, 2026-10-06

The newest seven images supersede the two-flight stair dimensions. Use three directional stages: gently diagonal lower start, straight middle, and opposite diagonal upper flight, with one level intermediate landing. Shared mitered edges must connect all tread slabs, cheeks and rail segments without voids. Make upper floor and stair treads actual tiles of the same limestone as the ground outdoor floor. Close the upper outer east wall behind the arrival, retaining free library entry. Unify plaster base colors; use gently dim golden late-afternoon light with visible warm fixtures. Apply a slight shared affine skew to the entire world and physical movement. Continue planted beds alongside the complete stair. Inspect full-width actual mesh floor coverage, upper east shell and rail bends as well as navigation tests. Preserve all complete original content and shared completion/reset behavior.

## Floor reflection validation, 2026-10-07

The shared skewed-world pool mask injects logical bounds into GLSL. Always emit float literals for those bounds, including an integer-valued edge such as zero. Browser shader compilation and a fresh actual floor-reflection capture must pass; a successful Vite build alone cannot verify WebGL shaders.

## Closed east stair wall and swimming, 2026-10-07

The newest three attachments supersede the open upper east alcove: fill that pocket with solid plaster, retain only the front library/stair passage. Match the outer east perimeter to the entire right stair edge using eastWall; close the ground facade/stair wedge with lowerCornerClosure. Keep actual mesh probes and collision aligned. Shift runs on land, Space jumps; pool has a real 2.55-logical-meter basin. Visitors can enter, sink below the surface, hold/tap Space to rise and move toward a bank to climb out. Include touch equivalents, underwater rendering, physically continuous exit and reset/pause handling. Preserve original complete content and all shared progression.

## Flat walls and slat interiors, 2026-10-07

The latest six attachments supersede the previous exposed interior plaster and
protruding rectangular east returns. Use 11-warm-wall-color.png as the common
warm light wall target, including the previously dark upper/right wall. Preserve
natural shadows and warm fixtures while lifting overly dark plaster. Use real
vertical oak boards with gaps and recessed backing on every indoor wall on both
levels, matching 12-oak-slat-interior.png. Keep all artwork unobstructed. Make the
upper east solid and lower front return one continuous flat L-section extrusion;
extend the first east perimeter plane back to the house, clip the upper deck to
its inner boundary, and align the lower corner wedge with the same front plane.
Keep upper passage, full-width steps, pool physics, and original content intact.

## Bright rooms, turquoise pool and 33-degree stair, 2026-10-08

The latest image 16-bright-turquoise-33-degree.png and larger 03 reference control this revision. Remove the pool ladder entirely, retaining physical swimming/rise/exit. Use turquoise water with warm timber reflections. Lift scanned oak to honey oak and illuminate both ground rooms and the upper library generously with actual warm linear ceiling fixtures, shelf lights and the existing pendant. Preserve golden late-afternoon exterior sun, leaf silhouettes, glossy tile reflections and readable fixture pools. Narrow stairs to 2.50 physical meters; their ascending directions must be exactly +33, 0 and -33 degrees in world space, compensating shared scale and shear. Solve shared miter stations for treads, landing, rails, continuous east shell, stair side wall, planted borders, routes and sconces together. The external wall must follow these same planes with a continuous rear return, not local cover-up pieces. Preserve all original content and existing progression. Verify actual wall/floor/body rays and compare real rendered views with the reference; do not claim photographic pixel identity.


## Full-height interiors, lower library illumination and rail physics, 2026-10-08

The latest five detail screenshots supersede previous trim/brightness choices. Align the upper east wall and stair-side courtyard coping heights. Finish the stair arrival flush, including the balcony/stair cap connection. Indoor slats fill down to the floor, with no bare right studio return or projecting tops; a continuous darker oak cornice follows the exact ceiling profile. The left ground studio and upper library use the same continuous oak ceiling and transverse beam section as the main ground atelier. Reduce upstairs fixture/baked lighting moderately to retain readable furniture and images. Add held Ctrl crouching plus touch equivalent; raised physical jumps can land on native oak balcony/stair rail tops, and stepping off falls under gravity without teleporting. Keep automatic routes dry. Swimming begins only inside the rendered visible water rectangle, excluding all solid coping bands; use the shared poolWaterInset for water geometry and navigation. Preserve all content and progression, and validate rail landing/falls/crouch/coping edges in meaningful physics tests as well as actual mesh and browser evidence.

## Mounted fixtures, rising stair garden and monochrome furniture, 2026-10-08

Connect the left studio's suspended bronze lamp to its ceiling with a visible cord and rose. Every ceiling glow needs an actual fixture. Mount linear lights directly under timber beams in both ground rooms, the covered ground veranda and the upper library. The veranda has a continuous oak soffit and warm linear mood lights. Remove ivy intruding onto the ground facade/stair return and finish that return with matching full-height oak slats. Extend the stair cheek and cap continuously to the filled upper wall. A single limestone planted trough follows all stair directions and rises with the stairs; plants grow vertically from its soil rather than tilting with the trough. Share rising-bed sections with foliage and airborne collision. Replace indoor table/chair timber with ivory porcelain, white leather/lacquer and graphite metal. Upstairs, add real slim oak ceiling slats with recessed gaps, preserving the reduced upper illumination. Keep all original content, physical routes, rail jumps, pool movement and completion behavior intact. Verify current native mesh, rendered rooms, stair planting and fixture mounting before reporting completion.

## Flush stair arrival and right-wall planting correction, 2026-10-08

The latest five detail images (27–31) supersede the previous planter side and cap connection. Remove the raised crossing wall/cap at the upper entrance and keep the balcony stone band below the actual upper walking floor. Join the exposed lower return and stair cheek on their shared plane, with continuous oak slats over the masonry and no projecting nib at the ground junction. Move the stair planted trough from the railing side to the outer/right wall shown in image 31. It must share the ground east bed's complete soil edge and rise continuously through all three stair directions to the upper entrance. Shift the east shell outward together with embedded lights to retain the full clear stair width. Keep plants vertical. Place real glazed pots and plants beside the exposed stair wall; its bronze fixtures must sit in front of the oak finish, rather than buried behind the old planter base. Reduce pool plan width moderately, from 4.60 to 4.30 logical meters, retaining shared rendered-water/copings/swimming bounds. Preserve all other approved lighting, ceilings, furniture, content and physics. Validate the native curb height, connected stair finish, visible lamp bodies and rising soil as well as the physical routes and actual rendered stair-side view.

The ground east rim and rising stair rim must use the same shared cross-section at their joint. Carry each stone cheek down to the ground beneath the cap overhang, so its underside and direction changes never leave exposed triangular holes. Verify the vertical rim faces with native rays as well as the soil surface and a close actual-browser view of the ground connection.

## Modern white ceilings, stone columns and afternoon music, 2026-10-08

The latest three attachments (32–34) supersede the exposed timber ceilings, beam-mounted lighting and structural timber columns. Remove only the large ivory potted tree directly in front of the stair, at [2.08, 8.70]; keep wall-side pots and the connected rising garden. Use continuous warm-white satin ceilings in both ground rooms, the veranda and the upper library, with genuine recessed linear mood-light channels and flush downlights. Keep the indoor wall oak slats and stair/balcony rails. Replace architectural load-bearing/canopy/pergola columns and shared entry jambs with subtly veined polished ivory stone, with refined edges. Keep shared stair/water/upper entry geometry and progression unchanged. Add an original, quiet, slow afternoon piano BGM, controlled by an accessible toggle and loaded only when played; pause when the page is hidden. Move the photographic sky very slowly with reduced-motion support, retaining the fixed afternoon illumination. The accidental strike-through in the user's message came from paired double tildes; all text within it is part of the user's request.

## Softer ground-floor lights and reflective black exterior trim, 2026-10-08

The latest three attachments (35-37) supersede the white exterior roof/wall coping finish. Keep the white ceilings and stone columns, but reduce ground-floor Atelier/Studio/Veranda ceiling strip intensity and bake power by 18%, with a modest 10% reduction to ground fill/flush spots. Ground opal diffusers use 1.55 emission; Library diffusers/lights stay unchanged. Use a narrow, continuously mitered reflective graphite-black band around the whole upper roof perimeter and the existing top coping of every outer courtyard wall and upper closure. The warm plaster walls, white soffits, foliage, original content, music and physical routes remain. Keep the material gloss and baked/native/runtime source aligned; validate the actual exterior view and console shaders.

## Sunset, varied wall planting and monochrome glass, 2026-10-09

The latest four images (38-41) supersede the remaining pale outer fascia/capitals and tall above-wall silhouettes. Continue reflective black around every external fascia, wall upper face and roof-adjacent capital, including the formerly pale upper closure edge; retain ivory columns and white ceiling interiors. Exterior ivy must climb the real wall, hug its coping and bend down the back side, with heights interpreted as rises from their root. Indoor upper plants stop below their ceiling. Canopy trees must not protrude over the wall. Use different fan, column, cascade, wild and dense silhouettes, multiple leaf profiles/shades and denser connected branches to reduce blank areas while preserving artwork and routes. Replace whole-panorama sky rotation with a live sunset atmosphere and two independently moving/evolving cloud layers; keep reduced-motion support and warm readable architecture. Give HUD, controls and content panels a black/white frosted-glass finish with real backdrop blur, reflected white rims and clear text/focus states. Preserve all original portfolio content, BGM, physical movement, pool and progress.

## Marble upper entrance and over-wall ivy, 2026-10-11

The latest two detail attachments (42–43) supersede the visible dark timber crown at the 2F stair/library entrance. End the lower west stair-return timber below the upper floor, removing the coplanar oak crossing strip; the existing continuous marble tile surface must remain flush and visible across the opening. Keep lower stair-wall timber and railings. Add actual connected ivy to the previously bare upper closure front wall, rooted behind its black coping, wrapping over the top and cascading down in unequal lengths and leaf profiles. Keep the sconces readable, the entry clear and the existing perimeter growth. Share placements with native geometry and baked shadows. Verify the entrance using all-material downward rays as well as the actual browser view; a stone-only height check misses a coplanar timber strip.

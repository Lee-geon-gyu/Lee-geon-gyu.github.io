# Prototype Instructions

## Original website projects and center-line tablet wake, 2026-10-15

Restore project details from their exact originalHtml and the original project
CSS at 60c47cd:css/style.css. Each of the six original *_bg.png backgrounds is
restored byte-for-byte from that commit, with the original 10px backdrop blur,
50% black shade, transparent white logos, intro badge, copy, metadata, pill
links and floating mockups. Scope these styles to the project reader, retain
full viewport sizing, real carousel progress, focus/close behavior and compact
intro/info/artwork panes when space is limited. Keep other monochrome UI.
Profile boxes use the same white as the tablet display, retaining only their
subtle borders. Refresh the matching physical screen capture after this edit.
Both the actual desk tablet and its expanded display wake with a horizontal
center line, briefly hold the full-width line, then reveal upward/downward.
Keep reversible power-off/cancellation/reset, phone fit, reduced motion, and
the contact card's transparent backdrop. This supersedes the redesigned white
project reader, dark logo tiles, gray profile boxes and simple opacity wake.

## Matching physical tablet and contact card, 2026-10-15

The left studio desk now holds a thin landscape graphite tablet, initially
powered off. E/click lifts it toward the visitor and smoothly powers its screen
before revealing the existing full profile UI. Close, Escape during approach,
and reset must turn it off and restore the exact prop/camera/body pose. Keep
same-floor, unobstructed proximity checks and reduced-motion support. Update
visible book references to tablet. The upper desk's contact card shares the
black Contact detail design, content, font and proportions. Its dialog backdrop
is transparent, preserving the original 3D space behind the black card.
DeskObjects.js uses lightweight captured DetailView faces in public/assets/desk,
with UV crops from their 1280x720 screenshots. Refresh these captures when the
corresponding detail design/content changes; retain all original profile and
contact content and live links in DetailView. No runtime DOM rasterization,
per-frame React updates, native house rebuild or lighting changes are needed.
This supersedes the physical hinged profile book, old white printed card, and
the Contact dialog's full black backdrop. Other fullscreen UI remains approved.

## Fixed exploration heading and viewport-sized details, 2026-10-15

Anchor the transparent tracker by its heading position, without translating by
the changing panel height. Minus/plus toggles only the grid-folded list beneath
it, keeping the title/button fixed and 14px horizontal panel padding. Preserve
the faint heading gradient, real progress and completion marks.
Use the locally hosted Atelier Sans variable font, a renamed Pretendard subset,
for Korean and Latin UI/display copy. Keep its OFL and source notice. Rebuild
public/fonts/AtelierSans-Variable.woff2 with tools/subset_ui_font.py and the
official upstream WOFF2 whenever adding content characters; retain sans-serif
system fallbacks, font-display swap and no remote font requests at runtime.
DetailView.jsx preserves original profile section HTML, artwork assets,
descriptions, metadata and every external link. The profile is a nearly full
viewport tablet with its five original sections; smaller screens use circular
section tabs rather than pushing content below the screen. Artwork fills the
viewport with one original project at a time, previous/next controls and mobile
intro/information/design panes. Keep the introduction available on short
screens too. Mark projects when actually opened, and retain dialog focus,
Escape/close behavior and the original physical prop presentation. The contact
card keeps its 760px scale, with a clean black face and white/gray details.
Do not change 3D geometry, lighting, movement or native assets for these UI edits.
This supersedes serif/Cinzel UI fonts, book-shaped profile details and scrolling
project/profile pages.

## Circular monochrome portfolio controls, 2026-10-15

Use circular icon buttons with small captions below for guidance, reset, BGM,
destinations, contextual E actions, touch movement/actions, pagination, dialog
close, swimming exit and load retry. All controls use neutral black/white,
subtle borders and existing serif/Cinzel typography; retain accessible names,
focus, press/disabled states and all original actions. Use the existing bundled
Cinzel font for display text; do not add remote fonts or per-frame React work.
The right-middle tracker is titled "둘러보기" instead of "퀘스트". Its panel
and content rows are completely transparent, without blur or completion sweeps.
Only the heading has a very faint black gradient at its bottom. All three
incomplete marks use the same circle with three dots; completion switches to
a black check in a white circle. Retain real counts, collapse/expand and the
short completion-icon animation, clearing pending scans when it ends.
On phones, place touch actions in one horizontal row and keep circles/captions
clear of the tracker, contextual E action and bottom navigation. This supersedes
the brown/ivory rectangular controls and forest/gold quest panel. Preserve all
portfolio content, geometry, lighting, cursor, loading motion and navigation.

## Stable right-room ceiling under nearby fixtures, 2026-10-15

The right ground atelier's satin ceiling and fitted cornice retain their warm
baked finish when entering the room. Camera-ranked point/area lights must not
double the irradiance already baked into those surfaces. ceilingLighting.js
masks only their local point/area contribution in the ground atelier footprint,
using the inverse shared affine world transform. Include the slightly pitched
rear ceiling above upperFloor, while excluding the veranda, studio and upper
library. Preserve directional sun, projected foliage, environment, baked bounce,
emissive fittings, timber and furniture lighting. Retain the existing four-point
and two-area pools, geometry, materials and rendering passes; no extra lights,
timers, shadow maps or native rebuild are needed for this shader correction.

## Shared ceiling appearance and fitted atelier cornice, 2026-10-15

Both stories use White_Satin_Ceiling with real baked bounce, without the upper
ceiling's former hard minimum diffuse fill. Check the actual OUTDOOR starting
view as well as the upstairs close-up; retain the .58 upper furniture gain and
unlit contact card. The right ground atelier has one continuous closed recessed
shell, including the existing linear and spot apertures and rear pitch break.
Its five timber wall runs retain their placements and slats, with one fitted
U-shaped cornice using shared miter sections at entry bends and rear corners.
Follow the exact ceiling pitch at z=-3.4, bury the top 8mm in the soffit, and
remove separate overlapping cornice bars and touching ceiling patch boxes.
Retain the planted roof edges, flush west roof, black courtyard coping,
classical columns, dimmer studio, fixture energy and collision heights. Rebuild
architecture, baked light and sharp runtime derivative only; no new materials,
light groups, effects or reflection passes. This supersedes the upper ceiling
diffuse-fill exception and the right atelier's patch-box ceiling/molding ends.

## Flush roof, black closure coping and planted ceiling edges, 2026-10-15

Restore only Upper_Closure_Aligned_Coping to the existing graphite exterior
finish, continuous with the adjoining courtyard caps. Keep the broad library
roof fascia ivory. Clip the roof shell and fascia exactly to the west exterior
wall's inner plane, including the former 6mm rim overhang. upperRoof in the
shared space layout controls this footprint, frame and shallow ceiling ribs;
navigation uses those actual underside heights and the shared light channels.
Match the ground ceiling reference with a white perimeter frame and shallow
longitudinal/transverse panels. Split rib joins and recessed-light crossings
to avoid coplanar overlaps. Use three evenly spaced library linear fixtures
with the former two fixtures' combined power/intensity, retaining existing
live light groups, pendant, reduced furniture radiance and softer studio.
Add connected trailing ivy rooted in slim soil channels along the roof front
and exposed stair-side return. Append it after existing native garden leaves,
sharing original photographic UVs, four leaf materials and one stem material;
preserve the original garden placements and existing sampling budget. Keep tips above the
upper eye line, the lower balcony planting and all six classical columns.
Batch the small roof cornice into one cullable group per existing material,
rather than duplicating its five draws in every garden cell; retain spatial
culling for the surrounding wall and ground planting.
Rebuild native architecture/garden, baked lighting and sharp derivatives. Keep
the garden under its existing 500k triangle limit, without new animated effects,
light groups or reflection passes. This supersedes the pale upper closure cap,
western roof overhang and plain two-line upper ceiling.

## Classical stone column moldings and softer studio light, 2026-10-15

All six facade columns have matching classical round head/foot moldings:
layered plinth, rolled torus and concave neck swept as closed hollow profiles.
Use the shaft's existing Ivory_Polished_Column material for every molding,
including its marble texture, tint and gloss. Bases and heads are .14m tall;
retain the approved centers, shaft diameters, .03m maximum border, buried wall
contact and conservative collision footprints. Keep twelve complete profiles
on the three columns per story, with no detached flat plates or dark bands.
The left ground studio uses studioFixtureGain .82 for its native/baked/live
ceiling strips, fill and pendant light. Its opal diffusers have a separate
shared Studio_Ceiling_Opal material at the same reduced emission; the removed
mineral collar material keeps the total architecture material groups unchanged.
Retain other rooms' lighting, original sharp textures, all content, the ivory
roof trim and continuous upper ceiling. Rebuild architecture and indirect light
without adding lights, reflection passes or animated effects. This supersedes
the plain mineral collar profiles and their contrasting color.

Use the same continuous closed recessed shell for the studio ceiling as the
upper library, following its existing slight rear pitch. The dimmer lighting
must not reveal patch-box lightmap seams across the studio soffit.

## Continuous upper ceiling and matching ivory roof trim, 2026-10-15

Match the upper ceiling to the ground floor's continuous warm-white satin
finish. Its genuine recessed linear channels remain; build one closed shell
with welded surfaces instead of touching patch boxes, avoiding separate baked
lightmap islands across the visible finish. Preserve the ceiling height,
thickness, fixtures, collision and upper furniture lighting.
Replace only the house roof fascia, adjoining upper closure coping, front
coping and narrow balcony soffit with the existing warm limestone material,
matching the bright balcony stone band in the latest reference. Keep courtyard
perimeter caps, rails and furniture metal unchanged. Share the existing facade
fill/material draw with the roof trim, retaining source textures and UVs.
Rebuild native architecture, indirect light and sharp runtime assets; no extra
live lights, textures, reflections or render passes.

## Reliable local preview, 2026-10-15

Use npm run preview for the local build at http://localhost:4173/. The preview
configuration explicitly binds localhost on port 4173 with strictPort, and
the script uses Vite's native config loader so it does not need a generated
node_modules/.vite-temp config file. Preserve the existing dist/client root.
Confirm the index, entry bundle and runtime model return HTTP 200; startup
output alone is insufficient when a previously restricted server times out.
Restart only an agent-owned stale preview process, retaining user processes.

## Round ivory columns, mineral collars and a usable library sofa, 2026-10-14

All six structural facade shafts are smooth 24-sided circular columns at
their approved centers and diameters. Their heads and hollow foot collars
are round, warm mineral ivory (Column_Mineral_Base), subtly darker than the
plaster wall, replacing the graphite square profiles. Retain aligned right
supports, the western wall contact, door jambs, roof fascia and rail geometry.
Use one shared collar material and existing textures; keep original sharp
runtime assets and the conservative navigation footprints. Rebuild native
geometry and indirect lighting for the round sections.
The upper white soffit uses the same warm ivory fill as the reference ground
facade. Exclude only that ceiling from the .58 upper radiance mask; retain
the furniture/card correction and all ground lighting, with no extra lights
or rendering passes and a distinct ceiling shader cache key.
The library sofa is jumpable at its actual cushion top (upper + .530m), with
real arm/back support heights and continuous gravity when leaving it. Keep
the outer-footprint support until the whole body clears the upholstery so
the apron cannot trap a descending visitor. sofa.js shares native dimensions,
support bounds, interaction proxy and seating poses. Allow E/click seating
from the clear front floor approach or after landing on the cushion; E,
Space, Escape and the stand control return safely to that upper-floor
approach. Preserve free look, pause/reset/guidance and the existing bench;
seating must not open content or mark a quest. This supersedes earlier square
black column profiles, the darker upper ceiling and the noninteractive sofa.

## Wrapping upper west collars and vertically aligned right supports, 2026-10-14

The upper west column's same-width dark plates left little visible surround.
Replace only its head/foot plates with hollow collars, .03m proud and .09m
high, clipping only their buried west edge at the existing wall plane.
Use shared upperColumnBase dimensions for their visible foot clearance.
Keep the west shaft's wall contact, height and position unchanged.
Place the right upper column at the exact x/z center of the approved right
ground support (stairFacadeTrim), including its existing .26m inset. Share
that position with navigation and actual-mesh diagnostics; the affine world
shear then preserves vertical alignment. Retain the right upper shaft size
and its original black profiles, central supports, roof, rails, oak, plants,
lighting and cursor. Rebuild native geometry, indirect light and architecture
runtime assets with sharp source textures and existing material draws.
This supersedes the upper-left same-width plates and the old independently
calculated upper-right position; keep all approved ground geometry unchanged.

## Reference mint cursor and clean right column edge, 2026-10-14

Use a hollow translucent neon mint cursor, matching the latest reference's
thin 1.65px ring. Remove the ivory/champagne accent and center dot; a restrained
cached mint under-stroke supplies neon presence without filters or blink.
Retain native 48px frames, one [24,24] hotspot, immediate loading coverage and
continuous spring hover/press/idle motion with the existing 25Hz limit.
The right lower column retains its .21m shaft, location and black collars.
Reduce only its broad .016m shaft bevel to a .003m edge break so the illuminated
vertical facet no longer reads as a separate line. Rebuild and bake native
architecture and restore sharp runtime textures with existing material draws.
This supersedes the pearl/champagne cursor appearance and right shaft bevel.

## Equal ground-column proportions and clear dark collars, 2026-10-14

The right ground support must match the central .21 x .21m stone shaft,
rather than reading as a thin .14 x .11m finish strip. Bring it forward to
inset .26m, following the timber-return wall so its black capital clears the
balcony band by about .02m. Replace the former hidden right ground support
with this single visible column; do not leave intersecting duplicates.
All three ground capitals are .27m square, including the wall-attached west
column. Ground foot collars have the same .03m border and .09m height, with
the stone shaft inside their open core; bury only the western wall-side edge.
Butt the west bed outer rim to the wider collar, accounting for its .025m
stone overhang, and share all column footprints with
navigation and actual-mesh diagnostics. Preserve upper columns, rails,
fixtures, planting placement, sharp textures and existing lighting. Rebuild
native geometry/baked light and sharp runtime assets with existing material
draws. This supersedes the narrow right pilaster and .014m collar border.


The square planter beside the western ground column physically hid its foot
collar. Move that planter and its centered tree together .25m back into the
studio, retaining their x, dimensions, height and relative planting alignment.
This necessary reveal supersedes preserving that one planter's z placement;
keep every other plant placement unchanged. Verify the actual exposed lower
black collar against all scene materials, not a black-only ray probe.



## Inset stair pilaster and wrapping ground-column feet, 2026-10-14

Set the slim right ivory pilaster .32m inside the balcony front, at the same
depth as the ground columns. Follow the existing timber-return wall plane,
keep its narrow proportions and extend it to the real veranda ceiling with
a matching small black head. Add a hollow graphite collar around its foot.
Replace the three ground-column flat foot plates with actual hollow collars,
.09m tall and .014m proud on exposed faces. Keep the stone shaft inside each
collar; leave the wall-attached western collar flush to the wall, without
coplanar stone/black outer faces. Share lowerColumnBase dimensions with the
pilaster footprint. Keep upper columns, planting, lighting, textures, rails
and all approved movement unchanged. Rebuild/bake native and runtime assets,
sharing existing material draws and retaining sharp source textures.
This supersedes the flush-front location and missing base below.


## Subtle ivory stair-facade pilaster, 2026-10-14

Add only a shallow .14m ivory stone vertical finish to the exposed lower-right
timber corner beneath the upper column. Share its footprint via stairFacadeTrim
in space-layout.json, keep it flush with the oak corner and end it at the black
balcony soffit. Retain the original structural columns, rails, fixtures, foliage
and approved lighting. Merge into the existing column material draw, rebake the
native geometry/lightmap and restore sharp runtime textures. Keep navigation
clear and avoid added lights, reflections or animation work.


## Readable library, safe raised surfaces and refined cursor, 2026-10-14

The user reports washed-out upper furniture/contact card and remaining jumping
traps. Reduce only upper-story architecture radiance (height-masked .58 gain)
and upper live fixture energy; retain ground lighting, facade-band fill, sharp
textures and every original content field. Render the printed contact face as
unlit paper so its real text stays readable. Keep the original native models.
The terrace bench is a jumpable support at shared seatTop .6475, retaining
E/click seating. Walk off it and accessible courtyard beds continuously under
gravity; retain full-footprint support until the body clears an edge. Block
jump entry into the narrow stair garden and enclosed right indoor bed because
neither has a body-width exit. Check actual stair masonry/cheeks against the
whole body, and allow overlap recovery only toward decreasing penetration.
When a landing straddles the larger walking margin, retain escape movement
until normal walking clearance is restored. Guide off raised supports safely.
The cursor may be redesigned: pearl ivory with a restrained champagne accent
and precision center, a subtle resting breath, and continuous spring-driven
hover/press morphs without jumps, sparkle or glow. Use cached 48px native SVG
frames at one fixed [24,24] hotspot; never reintroduce a DOM follower. Bound
shape updates to 25Hz and write only changed frames; stop outside the focused
page, during dialogs, for touch and for reduced motion. Keep instant OS pointer
tracking and all prior loading coverage. This supersedes earlier cursor-shape
and no-idle-motion choices while preserving the performance constraint.

## Tactile cursor without sparkle, 2026-10-14

The user no longer wants the glowing/blinking effect and asks for livelier
mouse feedback. Keep the clearly visible hollow ivory 3px native ring and its
thin dark contour from the first loading paint. Remove every glow frame,
blur/filter and repeating cursor animation. On usable props/buttons, use a
single .22s size response (26px rise, 29px overshoot, settling at 27px), then
rest. Pressing the primary mouse button compresses the same ring to a slightly
tilted ellipse until release; clear it on cancel, leave, blur, resize, Tab and
pause/dialog transitions. Keep all images at 48px with hotspot/center [24,24],
the same outline thickness, no DOM follower, pointermove listener, coordinates,
JS loop/timer or WebGL work. Reduced motion skips the arrival overshoot. Preserve
eligibility, native tracking speed, loading/details/help and input fallbacks.
This replaces the glowing/pulsing cursor requirement below.

## One clearly visible native cursor, 2026-10-14

The user rejected the separate DOM glow because it visibly follows a different
cursor. Remove that overlay entirely. Use only the native cursor in every state,
from the first loading paint: a hollow 24px ivory-white ring with a 3px stroke
and a thin dark contour for visibility on pale stone. Usable props/buttons
switch the actual cursor to pre-rendered soft/mid/bright glow SVGs. All four
images must share 48px bounds, center [24,24], circle radius 10.5 and identical
outline geometry/hotspot. Pulse native cursor images with a discrete 1.6s CSS
custom-property animation only while interactive; reduced motion keeps the
bright frame. No following element, coordinate writes, pointer-move listener,
JS timer/rAF loop or added WebGL work. Keep actual activation eligibility,
loading/detail/help cursor coverage, drag/leave/pause cleanup, touch, editable
text and forced-color fallbacks. This supersedes the DOM overlay and 1.6px
outline described below.

## Immediate cursor from loading and pulsing glow, 2026-10-14

Show the hollow ivory-white cursor from the first loading-screen paint, without
waiting for scene readiness or a pointer event. Use a native inline SVG cursor
in the initial CSS so the browser tracks the mouse independently of WebGL and
main-thread frames; keep its 22px outer diameter, with a slightly thicker 1.6px
outline. The DOM cursor now supplies only a small glow overlay on usable scene
props and buttons. Position that overlay directly on input, writing only when
active/changed, with no rAF delay, React pointer state or idle JS loop. Pulse
only its opacity gently over 1.45s while interactive; clear it on leave, drag,
blur, resize, pause and dialogs. Reduced motion keeps a steady glow. Native ring
persists through loading, errors, details and help; preserve touch, editable
text cursors and forced-color fallback. This supersedes the ready-only cursor,
coalesced pointer updates and native loading/detail/help arrow choices below.

## Translucent ring cursor, 2026-10-14

Replace grab/grabbing in the ready desktop world with a hollow, translucent
ivory-white 22px cursor ring. Glow its outline over usable books, frames, cards
and the bench, sharing the actual activation distance, floor, visibility and
movement checks. HUD buttons may use the same glow. Keep drag looking and E/
click behavior unchanged. Use a single pointer-events:none DOM ring with
coalesced transform writes, the existing throttled scene pick and no idle loop,
WebGL pass or per-pointer React state. Clear glow during dragging/presentation,
pause, leave and blur; retain native cursors in loading/details/help and on
touch, with reduced-motion and keyboard focus support.

## Loading shortcut removed, 2026-10-14

Remove the bottom-right "콘텐츠 바로 보기" disclosure and its content shortcut
buttons from the loading screen entirely. Keep the centered lee liquid gauge,
percentage, background blur/zoom, stationary entry and the error retry button.
This supersedes all earlier loading/error direct-content shortcut requirements.

## Stationary entry and stronger liquid loading, 2026-10-14

The user rejected automatic movement after loading. Remove the arrival tour
entirely; the loaded camera must remain at OUTDOOR until direct input or a
destination button is used. Keep zoom only on the static loading-house layer,
slightly stronger (1.14 over 18s), with a small cached image blur (1.6px). Make
the existing ivory lee fill visibly slosh: two broader traveling wave edges
and gentle vertical/tilt movement inside the logo mask. No added WebGL pass
or per-frame React state; stop all motion when loading is removed and respect
reduced motion. Center the left studio tree at its planter soil cross-section:
roomTrees x=-4.8433, z=1.982037, preserving original height/base/rotation. Share
that placement with lighting; do not move its pot or collision footprint.

## House preview and liquid lee loading, 2026-10-14

Replace the loading textbox/sky with this actual house, approached slowly.
Center the new calligraphic lowercase lee mark; its faint silhouette fills from
bottom to top with a subtle liquid wave and a numeric loading percentage.
Use real completed-resource/setup milestones, monotonic per attempt, reaching
100 only after the first compiled scene frame. Hold the complete logo briefly
then dissolve into the existing scene. A small compressed capture of the real
house supplies the early view while assets load. Approach motion belongs only
to this loading preview; the actual scene starts stationary at OUTDOOR. Never delay readiness to fake progress, duplicate the
WebGL renderer, add wave shaders/extra reflections, lower sharp quality or use
a generated house as the playable scene. Keep error/retry and direct content
access, reduced motion, 12px minimum text, abort cleanup and all earlier work.


## Reference quest tracker and refined controls, 2026-10-14

Match the supplied classic game quest reference: a thin olive/gold title bar,
dark translucent forest-green body, gold 12px quest titles, white 12px objective
lines with counts below each title, and round question/ellipsis quest badges.
Use only the actual three portfolio quests; do not invent levels or extra copy.
Place the tracker at the vertical center of the right edge on desktop and mobile.
Keep collapse, dynamic project totals, filled completion check and the single
left-to-right completion scan. Retain at least 12px text and short-screen touch
clearance. Other controls use restrained ivory/espresso/champagne finishes and
local Georgia/Batang serif typography, with clear hover/focus/pressed states.
Apply shared styling in ui/world-chrome.css after the legacy global stylesheet.
No extra fonts, images, idle animations, backdrop blurs or WebGL changes.


## Clear lower column heads and seamless sky, 2026-10-14

Move lower external columns .32m behind the balcony front line so both the shaft
and its slim black upper capital clear the projecting stone band. Keep their
original widths and wall attachment. End the ground west interior oak at the
moved column rear face; expose the existing single exterior wall and extend the
closed west bed to its front face, moving the adjacent planter with it. Add one
flat, narrow graphite soffit under the stone band, replacing the buried rod;
keep the broad warm-white ceiling. Preserve all upstairs and rail details.
Correct panorama longitude derivatives with explicit gradients and repeat
wrapping. Blend the photograph only within .012 of its longitude join (one
extra read only there), and fade the singular zenith to clear sky. Use four
cloud octaves per layer instead of five, reducing hash work by 20%. Keep one
sky draw, unchanged reflections and the original sharp render buffer.
Rebake matching native lighting and restore sharp runtime assets.


## Ceiling/body collision and library lounge, 2026-10-14

Block upward jumps at actual soffits including the upper roof overhang, without
blocking the open courtyard or exposed stair jumps. Airborne walls/furniture use
the walking body footprint so landing cannot trap visitors inside clearance.
Keep the original rail shape. Add slim matching black column bases on both
floors; inset lower columns .14m to fit the angled veranda soffit, moving their
west bed end and adjacent planter together. Replace both empty left library
side bookcases with one long ivory upholstered sofa, clear of the rear books.
Shift the complete writing desk, chair, rug, accessories and contact card .90m
right; share placements with navigation. Preserve tree/leaves and sharp assets.
Use slightly livelier existing water normals and add one decorative center drain
without increasing reflection resolution, passes or shader texture sampling.
Rebuild native geometry, matching baked lighting and sharp runtime derivatives.


## Usable terrace bench and consistent facade finish, 2026-10-13

The existing rear oak bench is usable with E/click. Approach on a clear dry
path, sit smoothly, allow free looking, and stand safely in front using E,
Space, Escape, movement, touch or a destination guide. Help pauses the seated
state; reset clears it. Seating never opens content or completes a quest.
Keep the actual bench geometry unchanged and share its bounds/poses in
bench-layout.json. The balcony stone band already shares one material;
uneven illumination makes its left side darker. Match the warm bright right
side with a local minimum diffuse fill only on that band, preserving stone
textures, UVs, shadows/specular detail and all other surfaces and rail shapes.

## Original newels and near-black brown stems, 2026-10-13

The user rejected enlarged/re-shaped stair posts. Restore the original .085m
wide, 1.06m tall oak newels with .008m bevels and the original round rod
handrails. Add only fitted geometry in the empty rail/post connection pockets;
do not enlarge the posts or redesign the railing. Ivy stems should be a very
dark, near-black brown (shared stemColor [.035,.021,.014]); preserve the green
leaves, photographs, other planting changes and all approved movement/UI.
This supersedes the continuous sweep/full-height newel requirement below.

## Finished stair rails and upper library planting, 2026-10-13

Keep the original railing silhouette and fill only the join pockets, as
corrected above. Preserve rail jumping. Butt the upper left
side bookcase to the finished oak wall, with matching collision clearance.
Remove the two upper library wall ivy roots; keep the right pot and tree and
add photographed leaves attached to its branches. Preserve other leaf shapes
and source texture quality. Make woody ivy stems brown, ground the eastern
canopy tree in the rising bed and remove the oversized rear canopy wood while
retaining its overhead leaves. Use shared garden placements for live geometry
and the light bake; keep all earlier UI, architecture and movement approvals.

## Pool corners, moved pots and flush west facade, 2026-10-13

The latest six attachments request a detail pass. Replace intersecting pool
coping bars with a continuous mitered ring, preserving the visible water edge.
Move the red loose pot beside the left end of the rear bench, clear of the bed;
move the square studio tree planter beside the western facade column, clear of
the passage. Use shared loosePots/roomTreePlanters for runtime, native geometry,
baking and collisions. Join the west walls on both floors into the courtyard
wall plane, butt both western columns to it and remove the upper return nib.
Use one full-height west wall without coplanar overlapping wall pieces.
Extend the ground west bed to the column and give its union one closed mitered
rim; keep roots inside the soil. Preserve all approved UI, ceiling thickness,
sharp assets, content, movement and rail jumps. Rebuild native/runtime geometry,
matching garden and baked lighting; validate actual mesh corners and clearances.

## On-demand game controls, 2026-10-13

The user removed the ambient bottom messenger and permanent keyboard legend.
Keep one top-left control-guide button, closed initially. Open a compact game
help panel with keycaps, clear action rows, dark glass and restrained gold
accents. Pause movement while it is open; support Escape, a close button and
focus restoration. Preserve a small contextual E interaction button, growing
exhibition pagination, swimming controls and all current navigation/quests.
Keep text at least 12px and ensure mobile controls do not overlap. This
supersedes the older instruction requiring a bottom messenger box.

## Compact quest HUD and running guides, 2026-10-13

Remove the three top shortcuts from the ready scene, retaining loading/error
access to the original content. Bottom destination buttons run continuously
along the shortest safe dry route and can retarget while moving. Carry the
travel budget across waypoints without idle frames; the work guide ends near
the frames, not at the entrance. Match a compact game quest tracker, with a
filled check and one left-to-right completion scan. Queue it until details and
camera presentations close. Reset clears queued scans. Shrink the HUD while
keeping all text at least 12px, including mobile and detail labels. Preserve the
thick upper ceiling, sharp rendering, original content and rail jumps.

## Upper ceiling thickness, 2026-10-13

Match the upper library roof's thickness to the substantial ground veranda
ceiling shown in the user's cropped reference. Use upperRoofThickness=.30
logical meters (about .34 physical meters). Increase upward, preserving the
approved underside elevation, interior headroom, recessed lights and pendant.
Extend the existing continuous black fascia to cover the complete thicker
roof section. Rebuild native geometry, matching baked lightmap and the sharp
runtime architecture together; preserve the original content and movement.

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

// Run this on a productionCrate music category page with all rows shown
// WARNING: all rows must be actually VISIBLE onscreen (not hidden by scroll)
//          which means you may need to ZOOM OUT

(() => {
    const links = Array.from(
        document.querySelectorAll('.music-bar'))
        .map(e => e.querySelector('div a.tw-w-max'))
        .map(e => e.href);
    const slugs = links.map(link => {
        const parts = link.split(/\//);
        return parts[parts.length - 1];
    }).sort();

    let textToPrint = "\n";
    for (const slug of slugs) textToPrint = textToPrint + slug + "\n";
    console.log(String(slugs.length) + " entries", "\n", textToPrint, "\n");
})();

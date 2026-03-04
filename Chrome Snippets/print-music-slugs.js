// Run this on a productionCrate music category page with all rows shown

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
    console.log("\n", textToPrint, "\n");
})();

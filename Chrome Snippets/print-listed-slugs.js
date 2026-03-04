// Run this on a ProductionCrate music category page with all rows shown
// WARNING: all rows must be actually VISIBLE onscreen (not hidden by scroll)
//          which means you may need to ZOOM OUT
//
// Before running this snippet, define a global variable named 'listed'
// in the console using backticks for multiline text, like this:
//
// let listed = `
// slug-one
// slug-two
// slug-three
// `

(() => {
    if (typeof listed !== "string") {
        console.error(
            "listed is not defined. Paste your multiline list first using backticks."
        );
        return;
    }

    const wanted = new Set(
        listed
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean)
    );

    const links = Array.from(document.querySelectorAll(".music-bar"))
        .map(e => e.querySelector("div a.tw-w-max"))
        .filter(Boolean)
        .map(e => e.href);

    const slugs = links.map(link => {
        const parts = link.split("/").filter(Boolean);
        return parts[parts.length - 1];
    });

    const outputLines = [];
    let skippedSinceLastMatch = 0;
    let matchedCount = 0;

    for (const slug of slugs) {
       if (wanted.has(slug)) {
            if (skippedSinceLastMatch > 0) {
                outputLines.push(`[skip ${skippedSinceLastMatch}]`);
            }
            outputLines.push(slug);
            skippedSinceLastMatch = 0;
            matchedCount += 1;
        } else {
            skippedSinceLastMatch += 1;
        }
    }

    let textToPrint = "\n";
    if (outputLines.length > 0) {
        textToPrint += outputLines.join("\n") + "\n";
    }

    console.log(
        `${slugs.length} entries on page\n` +
        `${matchedCount} matched your list\n` +
        `${slugs.length - matchedCount} total suppressed (not in your list)\n`,
        textToPrint
    );
})();

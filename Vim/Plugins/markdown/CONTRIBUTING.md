These contributing guidelines were accepted rather late in the history of this plugin, after much code had already been written.

If you find any existing behavior which does not conform to these guidelines, please correct it and send a pull request.

# General Rules

Every non local identifier must start with `g:vim_markdown_`.

# Documentation

Every new feature must be documented under in the [README.md](README.md). Documentation must be written in [GFM](https://help.github.com/articles/github-flavored-markdown) since Github itself is the primary to HTML converter used. In particular, remember that GFM adds line breaks at single newlines, so just forget about the 70 characters wide rule.

# Markdown Flavors

There are many flavors of markdown, each one with an unique feature set. This plugin uses the following strategy to deal with all those flavors:

- Features from the [original markdown](http://daringfireball.net/projects/markdown/syntax) are turned on by default. They may not even have an option that turns them off.

- Features from other markdown flavors *must* have an option that turns them on or off. If the feature is common enough across multiple versions of markdown, it may be turned on by default. This shall be decided by the community when the merge request is done.

- If possible, cite the exact point in the documentation of the flavor where a feature is specified. If the feature is not documented, you may also reference the source code itself of the implementation. This way, people who do not know that flavor can check if your implementation is correct.

- Do not use the name of a flavor for a feature that is used across multiple flavors. Instead, create a separate flavor option, that automatically sets each feature.

    For example, fenced code blocks (putting code between pairs of three backticks) is not part of the original markdown, but is supported by [GFM](https://help.github.com/articles/github-flavored-markdown#fenced-code-blocks) and [Jekyll](http://jekyllrb.com/docs/configuration/).

    Therefore, instead of creating an option `g:vim_markdown_gfm_fenced_code_block`, and an option `g:vim_markdown_jekyll_fenced_code_block`, create a single option `g:vim_markdown_fenced_code_block`.

    Next, if there are many more than one Jekyll feature options, create a `g:vim_markdown_jekyll` option that turns them all on at once.

# Tests

All new features must have tests. We don't require unit tests: tests that require users to open markdown code in Vim and check things manually are accepted, but you should point clearly to where the tests are.

Wherever possible, use test cases from the [karlcow'w Markdown Test Suite](https://github.com/karlcow/markdown-testsuite), and link to the relevant test files on your merge request.

If a test does not exist there yet, make a pull request to them, and link to that pull request on the pull request you make here.

If the test you want to do is not appropriate for the Markdown Test Suite, create it only under the `test/` directory here.

If we start disagreeing too often on what is appropriate or not, we will fork off that repository.

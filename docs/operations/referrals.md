# Application referral links

`https://ciaranlyons.com/postscript` and its trailing-slash form immediately return HTTP 302 to `https://stealmysms.com/?ref=postscript`. `public/_redirects` is copied to the Pages artifact by Astro. Publish changes through the normal source PR and production workflow; no Redirect Rule or intermediate page is needed.

The destination is maintained in the separate private `clyons/steal-my-sms` repository. Its referral banner and Google Analytics settings are documented there in `docs/operations/analytics.md`. Publish and verify the destination before adding a referral here.

Use a campaign label, never a person's name or email, in referral URLs. A referral visit establishes that the link was opened; it does not identify the reader, and automated link scanners and analytics blockers can affect counts. Engagement time measures foreground activity rather than proof that someone read the content.

Verify both paths with `curl -I https://ciaranlyons.com/postscript` and `curl -I https://ciaranlyons.com/postscript/`; each must return the destination and `302`. Open the actual referral URL in a browser to verify the destination framing and event collection.

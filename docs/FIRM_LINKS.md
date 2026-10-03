# Firm destinations and partner attribution

The main directory contains 61 program profiles. Their visit buttons use `/go/[firm]`, which selects the configured partner affiliate URL when supplied, otherwise the firm's official website. Research-directory domains are explicitly rejected. Comparison and partner offer buttons use the same route. No referral code is invented or copied from another directory.

`lib/partner-links.json` contains the owner-supplied affiliate URLs. AquaFunded CFD and Futures use the supplied brand link; they retain separate entries for any future program-specific links. Texaris uses code CBS; Rhodium FX uses ZABERMAZ; the other supplied codes use ZABERFX. Forex Funded Traders still has no supplied affiliate URL and falls back to its official site. Displaying a code does not guarantee acceptance or commission; merchant reporting determines attribution. Tradeify's supplied tracking.tradeifyfx.co link is applied only to Tradeify FX, not its separate Futures or Crypto programs.

Upscale is an independent Crypto-program listing with its official URL and no invented affiliate link or code. Blueberry Funded and Rhodium FX have been promoted from the wider index into the main CFD partner group. Funded Futures Family and My Funded Futures are in the Futures partner group; their original dated ratings are preserved.

Broker partners Tradin and XM are stored separately in `lib/brokers.json`, displayed at `/brokers`, and redirected through `/go/broker/[broker]` using the exact supplied URLs. No broker promo codes or regulation claims are invented. Their logos were retrieved from the providers' official web assets. Broker accounts are not mixed into prop-firm comparisons.

The wider research index retains its candidacy labels and market categories. Firm domains were identified from saved directory profile references, checked directly where reachable, and supplemented with official sites. HTTP reachability does not establish a firm's safety or current commercial status. No directory's affiliate query parameters are carried across. Official domain migrations observed during checks include SwissFunded → Core Funded, InstantFunding.io → InstantFunding.com and LivexCapital.in → LivxCapital.com.

The main directory's missing sites were resolved using firm-domain references and official pages, including AquaFunded, Blue Guardian Futures, E8 Futures, For Traders Crypto, WenCrypto, Leveraged, Audacity Capital and FundedElite. All original rating source URLs remain in the research data for provenance; visitors see source attribution and an internal methodology link rather than an outbound rating-directory button.

Three wider-index candidates still have no confirmed official destination: 18th Street Trading, FNC Funding and HUMBPROP. Their cards offer an internal verification request instead of a guessed or directory URL. Other candidates' website addresses do not imply that their operation, reputation or payouts have been verified.

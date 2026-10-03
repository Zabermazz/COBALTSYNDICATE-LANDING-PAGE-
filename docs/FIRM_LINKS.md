# Firm destinations and partner attribution

The main directory contains 58 program profiles. Their visit buttons use `/go/[firm]`, which selects the configured partner affiliate URL when supplied, otherwise the firm's official website. Research-directory domains are explicitly rejected. Comparison and partner offer buttons use the same route. No referral code is invented or copied from another directory.

Edit `lib/partner-links.json` with the exact affiliate URLs supplied by the owner. AquaFunded CFD and Futures have separate entries so distinct affiliate programs can be configured independently. Their current `affiliateURL:null` values mean **affiliate attribution is not yet configured**. Keep `ZABERFX` as the previously supplied code until the owner confirms a different spelling. Displaying a code does not guarantee that a merchant accepts it or pays commission.

The wider research index retains its candidacy labels and market categories. Firm domains were identified from saved directory profile references, checked directly where reachable, and supplemented with official sites. HTTP reachability does not establish a firm's safety or current commercial status. No directory's affiliate query parameters are carried across. Official domain migrations observed during checks include SwissFunded → Core Funded, InstantFunding.io → InstantFunding.com and LivexCapital.in → LivxCapital.com.

The main directory's missing sites were resolved using firm-domain references and official pages, including AquaFunded, Blue Guardian Futures, E8 Futures, For Traders Crypto, WenCrypto, Leveraged, Audacity Capital and FundedElite. All original rating source URLs remain in the research data for provenance; visitors see source attribution and an internal methodology link rather than an outbound rating-directory button.

Three wider-index candidates still have no confirmed official destination: 18th Street Trading, FNC Funding and HUMBPROP. Their cards offer an internal verification request instead of a guessed or directory URL. Other candidates' website addresses do not imply that their operation, reputation or payouts have been verified.

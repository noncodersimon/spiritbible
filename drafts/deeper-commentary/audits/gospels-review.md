# Independent review: Gospels and Acts expansion

Reviewer: letters agent. Reviewed `gospels.json` with 26 proposed notes and five connections on 6 November 2026. This review did not edit another group's data.

## Findings requiring coordination

1. **DEEP-MAT-003 / Matthew 18:15 repeats the new letters restoration connection.** Both use CCC 1829 and explain correction as recovery of a brother rather than humiliation, while retaining safeguarding boundaries. Recommended resolution: remove the standalone Matthew note, add Matthew 18:15 as the fourth endpoint of `deep-restoring-a-brother`, and retain its distinct private-first contribution in that shared explanation. This also avoids overdeveloping a theme already well treated by the existing 2 Timothy 4:2 physician/patience note. The Gospel author agreed. The letters agent has added Matthew 18:15 and rewritten the shared explanation to include both private-first recovery and an explicit crime-reporting/protection qualification; the Gospel author has removed the standalone note.
2. **The latter half of DEEP-JHN-004 / John 16:13 repeats the new discernment connection.** Complete revelation versus growing understanding is a valuable distinct insight, but the added account of private revelations/CCC 67 repeats `deep-testing-spiritual-experience`. Recommended resolution: retain the local John note and focus it on development of understanding, using verified CCC 94 if helpful for prayer, study and lived experience. Resolved: the revised note now uses CCC 66 and 94, accurately describing contemplation/study, spiritual experience and apostolic preaching. I independently read CCC 94 and checked the revised prose; private-revelation repetition is removed.

These are editorial consolidation findings, not doctrinal errors. No source or theological blocker was found in the other items.

## Source review

Every proposed note's source excerpt was found in its actual cached page. The six primary patristic applications were read with the surrounding argument:

- Chrysostom *Matthew* 15.5 does contrast meekness with rash/boastful destruction of one's goods. The draft's refusal to turn the beatitude into a wealth guarantee is a responsible qualification.
- Chrysostom *Matthew* 59.4 explicitly rejects physical mutilation and applies the image to harmful close attachments. The draft identifies the parallel Gospel exposition and does not turn difficult relationships into disposable obstacles.
- Chrysostom *Matthew* 80.2 explicitly urges receiving, encouraging and developing an imperfect good, while preferring care for the poor when guidance can still be given before expenditure. The draft's distinction is accurate.
- Augustine *John* 26.4–6 explicitly explains drawing through love and delight rather than compulsion.
- Augustine *John* 33.6–8 joins condemnation of sin to mercy for the person and treats both presumption and despair. The application is faithful to that argument.
- Augustine *John* 121.3 rejects a prohibition on women touching Jesus and gives spiritual touching as belief in the Son's equality with the Father. The draft clearly labels the account a spiritual application, avoiding a claim to exclusive historical explanation. It complements, rather than displaces, root's emphasis on Christ's enduring humanity.

Catechism passages used for every remaining note were checked in context. Particularly important checks were CCC 600–601 (saving plan includes human freedom), 468 (human suffering belongs to the divine person without suffering being attributed to divine nature), 472–474 (real human knowledge and the Son's unique relation to the Father), 1257 (sacramental responsibility alongside God's freedom), 1288 (laying on of hands as the origin of Confirmation), and 839–840 (Israel's enduring calling). The notes preserve those distinctions.

The five connections are supported by their sources. The finger/Spirit link is unusually direct: CCC 700 itself connects divine finger, written tablets and Spirit-written hearts. The Confirmation link accurately reports the Catechism's sacramental reading without projecting later ceremonial detail into Acts. The gifts-beyond-our-circle link shares a broad topic with letters' discernment link, but its core question is jealousy over who may bear gifts; it remains a distinct connection worth retaining.

## Biblical and overlap review

All new anchor verses and adjoining verses were read from the current WEB dataset; every connection endpoint range was also read. In Acts 20:28 the repository actually reads the assembly of the Lord and God purchased with his own blood, so the person/nature clarification is anchored to the wording readers encounter. Luke 14:26 actually uses disregard in this edition; the connection correctly avoids introducing a different translation's hate as though it were the displayed text.

Compared the new work with nearby existing notes and all 78 existing connection titles/topics. Existing Luke 24:32 is about understanding warming the heart; the new 24:26 note specifically addresses the necessity of the Passion and free human agency, so both can stand. Existing Romans 11 discusses Israel positively, but the Acts 13:46 application is valuable at the local passage most likely to be misread. Existing 1 Timothy 5:8/family provision and the new Gospel family-allegiance connection also have different questions: practical dependent care versus religious claims used to excuse neglect. New letters James 4:15 and Gospel Acts 27:31 share providence, but the former concerns humility in planning and the latter the necessity of human means within a promised outcome.

No general faith/works, Eucharistic, Marian or resurrection link duplicates an existing connection. The two consolidation findings above are the meaningful cross-group overlaps identified.

## Mechanical verification

- All 26 proposed notes passed `commentary-draft.cjs --check-partial` independently.
- All five connections passed `validateStudy` alongside all current connections and introductions.
- New phrase spans were checked against existing editorial anchors: no collisions.
- Every connection evidence excerpt matched normalised source text, and every recorded SHA-256 matched the actual cached raw HTML bytes.
- Length and allowed-source checks passed through the repository validators.

Final disposition: both recommendations are resolved in the current files. The Gospel file now has 25 notes and five connections; all 25 final notes pass the validator. The revised John 16:13 sources and wording were independently rechecked. Suitable for incorporation as a reviewable draft, with no unresolved blocking finding.

# Region size audit

Measured on the page viewBox (320×460). At the default fit on a 390×844 phone the picture is 390px wide, so one viewBox unit is 1.22 CSS pixels.

A region is too small when its area is under 0.15% of the page (221 square units) or its inscribed diameter is under 12 viewBox units (about 15px, enough for a two-digit number). Those regions were merged into the most similar touching neighbor. Very large leftovers were divided again, but only into pieces that still clear the floor.

| Picture | Category | Regions before | Smallest area before | Smallest diameter before | Regions after | Smallest area after | Smallest diameter after |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Cat Nap | animals | 185 | 0.04% | 3.1px | 162 | 0.17% | 15.5px |
| Garden Fox | animals | 185 | 0.03% | 6.3px | 162 | 0.18% | 15.5px |
| Beach Huts | beach | 182 | 0.03% | 3.1px | 164 | 0.18% | 15.5px |
| Lighthouse Cove | beach | 185 | 0.08% | 8.5px | 173 | 0.16% | 15.1px |
| Palm Sunset | beach | 185 | 0.10% | 4.7px | 173 | 0.18% | 15.5px |
| Tide Pool | beach | 185 | 0.03% | 6.2px | 160 | 0.17% | 16.0px |
| Garden Robin | birds | 185 | 0.02% | 4.1px | 111 | 0.17% | 15.4px |
| Still Swan | birds | 185 | 0.08% | 8.9px | 177 | 0.18% | 16.4px |
| Blue Wing | butterflies | 185 | 0.05% | 6.3px | 116 | 0.17% | 15.6px |
| Monarch | butterflies | 185 | 0.03% | 5.6px | 121 | 0.18% | 16.4px |
| Canal Bridge | city | 185 | 0.03% | 5.4px | 165 | 0.18% | 15.5px |
| Dusk Skyline | city | 190 | 0.03% | 5.4px | 92 | 0.30% | 17.0px |
| Rainy Lights | city | 185 | 0.08% | 5.4px | 172 | 0.18% | 17.1px |
| Street Café | city | 185 | 0.04% | 5.4px | 140 | 0.19% | 14.7px |
| Open Rose | flowers | 185 | 0.03% | 6.3px | 132 | 0.17% | 15.5px |
| Sunflower | flowers | 185 | 0.04% | 7.5px | 161 | 0.17% | 15.4px |
| Berry Tart | food | 185 | 0.04% | 4.7px | 142 | 0.17% | 14.7px |
| Lemon Tea | food | 185 | 0.04% | 5.4px | 114 | 0.17% | 15.4px |
| Doodle Collage | fun-designs | 170 | 0.03% | 6.5px | 102 | 0.19% | 16.3px |
| Hearts and Stars | fun-designs | 170 | 0.24% | 18.9px | 170 | 0.27% | 20.0px |
| Kaleidoscope | fun-designs | 170 | 0.03% | 5.3px | 125 | 0.25% | 16.9px |
| Quilt Blocks | fun-designs | 168 | 0.13% | 7.0px | 115 | 0.23% | 17.1px |
| Retro Swirls | fun-designs | 170 | 0.06% | 8.6px | 82 | 0.24% | 17.8px |
| Stained Glass | fun-designs | 170 | 0.05% | 3.1px | 150 | 0.19% | 15.2px |
| Drop Earrings | jewelry | 170 | 0.01% | 3.9px | 83 | 0.23% | 15.5px |
| Gem Brooch | jewelry | 170 | 0.06% | 9.6px | 144 | 0.17% | 16.3px |
| Gem Ring | jewelry | 170 | 0.04% | 7.8px | 132 | 0.18% | 16.0px |
| Jewelry Box | jewelry | 170 | 0.06% | 11.6px | 159 | 0.17% | 15.5px |
| Pearl Strand | jewelry | 170 | 0.03% | 4.6px | 145 | 0.16% | 15.4px |
| Pendant Necklace | jewelry | 170 | 0.04% | 7.8px | 127 | 0.18% | 15.5px |
| Coast Path | landscapes | 185 | 0.05% | 6.9px | 176 | 0.17% | 17.1px |
| Lake Evening | landscapes | 185 | 0.07% | 7.8px | 175 | 0.17% | 17.1px |
| Petal Mandala | mandalas | 185 | 0.06% | 7.5px | 164 | 0.21% | 15.1px |
| Star Mandala | mandalas | 185 | 0.04% | 7.8px | 148 | 0.18% | 17.1px |
| At the Harp | music | 200 | 0.04% | 2.3px | 94 | 0.17% | 14.7px |
| At the Piano | music | 223 | 0.08% | 4.7px | 120 | 0.19% | 16.3px |
| Flute Player | music | 195 | 0.04% | 2.3px | 96 | 0.20% | 16.3px |
| Maple and Shamisen | music | 190 | 0.02% | 3.0px | 98 | 0.24% | 16.7px |
| Still Guitar | music | 249 | 0.04% | 4.5px | 116 | 0.18% | 15.6px |
| The Arts: Music | music | 205 | 0.06% | 2.3px | 111 | 0.21% | 15.5px |
| Violin and Score | music | 223 | 0.02% | 2.3px | 87 | 0.19% | 16.3px |
| With a Koto | music | 196 | 0.05% | 3.9px | 95 | 0.21% | 15.8px |
| Balloon Valley | peaceful | 185 | 0.13% | 13.2px | 175 | 0.19% | 15.6px |
| Forest Falls | peaceful | 185 | 0.10% | 5.4px | 176 | 0.18% | 17.1px |
| Lavender Rows | peaceful | 185 | 0.06% | 6.2px | 158 | 0.17% | 15.5px |
| Reading Nook | peaceful | 185 | 0.04% | 4.9px | 171 | 0.18% | 15.6px |
| Snow Cabin | peaceful | 185 | 0.04% | 4.7px | 163 | 0.17% | 15.5px |
| Zen Garden | peaceful | 185 | 0.06% | 6.3px | 139 | 0.17% | 15.5px |
| Cherry Blossoms | pink | 170 | 0.03% | 5.6px | 106 | 0.24% | 16.2px |
| Flamingo | pink | 170 | 0.02% | 3.1px | 140 | 0.23% | 17.7px |
| Peony | pink | 170 | 0.06% | 6.3px | 162 | 0.18% | 14.7px |
| Pink Bedroom | pink | 170 | 0.15% | 7.8px | 156 | 0.19% | 14.7px |
| Pink Cupcakes | pink | 169 | 0.03% | 3.8px | 129 | 0.17% | 14.7px |
| Vanity Table | pink | 170 | 0.06% | 7.8px | 157 | 0.17% | 15.5px |
| Night Windows | places | 185 | 0.03% | 7.8px | 85 | 0.38% | 15.5px |
| Rose Cottage | places | 185 | 0.03% | 3.1px | 155 | 0.19% | 15.5px |
| Clear Morning | relaxing-landscapes | 234 | 0.02% | 3.9px | 89 | 0.35% | 15.5px |
| Inume Pass | relaxing-landscapes | 175 | 0.02% | 3.8px | 95 | 0.26% | 14.7px |
| Lake at Hakone | relaxing-landscapes | 179 | 0.02% | 3.1px | 94 | 0.20% | 15.5px |
| Mishima Pass | relaxing-landscapes | 246 | 0.03% | 4.1px | 105 | 0.20% | 16.3px |
| Sea at Satta | relaxing-landscapes | 212 | 0.03% | 1.6px | 90 | 0.20% | 15.5px |
| Sunset Hill | relaxing-landscapes | 195 | 0.03% | 2.3px | 90 | 0.19% | 15.5px |
| Village at Kusatsu | relaxing-landscapes | 244 | 0.05% | 3.1px | 114 | 0.17% | 15.9px |
| Wind over the Fields | relaxing-landscapes | 216 | 0.05% | 4.5px | 108 | 0.18% | 16.3px |

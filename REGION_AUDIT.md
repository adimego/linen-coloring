# Region size audit

Measured on the page viewBox (320×460). At the default fit on a 390×844 phone the picture is 390px wide, so one viewBox unit is 1.22 CSS pixels.

A region is too small when its area is under 0.15% of the page (221 square units) or its inscribed diameter is under 12 viewBox units (about 15px, enough for a two-digit number). Those regions were merged into the most similar touching neighbor. Very large leftovers were divided again, but only into pieces that still clear the floor.

| Picture | Category | Regions before | Smallest area before | Smallest diameter before | Regions after | Smallest area after | Smallest diameter after |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Cat Nap | animals | 170 | 0.12% | 7.0px | 158 | 0.17% | 15.5px |
| Garden Fox | animals | 185 | 0.03% | 6.3px | 162 | 0.18% | 15.5px |
| Beach Huts | beach | 182 | 0.03% | 3.1px | 164 | 0.18% | 15.5px |
| Lighthouse Cove | beach | 185 | 0.08% | 8.5px | 173 | 0.16% | 15.1px |
| Palm Sunset | beach | 185 | 0.10% | 4.7px | 173 | 0.18% | 15.5px |
| Tide Pool | beach | 185 | 0.03% | 6.2px | 160 | 0.17% | 16.0px |
| Garden Robin | birds | 170 | 0.04% | 5.2px | 140 | 0.22% | 17.1px |
| Still Swan | birds | 170 | 0.03% | 5.4px | 154 | 0.17% | 15.5px |
| Blue Wing | butterflies | 185 | 0.05% | 6.3px | 116 | 0.17% | 15.6px |
| Monarch | butterflies | 185 | 0.03% | 5.6px | 121 | 0.18% | 16.4px |
| Canal Bridge | city | 170 | 0.10% | 3.8px | 149 | 0.19% | 16.3px |
| Dusk Skyline | city | 170 | 0.03% | 4.7px | 168 | 0.21% | 17.1px |
| Rainy Lights | city | 170 | 0.06% | 3.1px | 112 | 0.27% | 15.5px |
| Street Café | city | 170 | 0.05% | 3.1px | 141 | 0.22% | 15.5px |
| Open Rose | flowers | 170 | 0.03% | 6.3px | 151 | 0.21% | 16.3px |
| Sunflower | flowers | 170 | 0.03% | 5.6px | 132 | 0.23% | 17.1px |
| Berry Tart | food | 185 | 0.04% | 4.7px | 142 | 0.17% | 14.7px |
| Lemon Tea | food | 170 | 0.03% | 3.8px | 145 | 0.17% | 15.5px |
| Doodle Collage | fun-designs | 170 | 0.07% | 9.3px | 163 | 0.17% | 16.2px |
| Hearts and Stars | fun-designs | 170 | 0.24% | 18.9px | 170 | 0.27% | 20.0px |
| Kaleidoscope | fun-designs | 170 | 0.03% | 5.3px | 125 | 0.25% | 16.9px |
| Quilt Blocks | fun-designs | 168 | 0.13% | 7.0px | 115 | 0.23% | 17.1px |
| Retro Swirls | fun-designs | 170 | 0.06% | 8.6px | 82 | 0.24% | 17.8px |
| Stained Glass | fun-designs | 170 | 0.05% | 3.1px | 150 | 0.19% | 15.2px |
| Drop Earrings | jewelry | 170 | 0.07% | 10.8px | 150 | 0.17% | 14.7px |
| Gem Brooch | jewelry | 170 | 0.06% | 9.6px | 144 | 0.17% | 16.3px |
| Gem Ring | jewelry | 170 | 0.06% | 8.5px | 147 | 0.19% | 15.9px |
| Jewelry Box | jewelry | 170 | 0.08% | 7.8px | 156 | 0.17% | 16.6px |
| Pearl Strand | jewelry | 170 | 0.03% | 6.2px | 133 | 0.18% | 15.5px |
| Pendant Necklace | jewelry | 170 | 0.03% | 6.3px | 146 | 0.19% | 16.3px |
| Coast Path | landscapes | 170 | 0.11% | 11.6px | 162 | 0.20% | 15.4px |
| Lake Evening | landscapes | 170 | 0.13% | 7.0px | 163 | 0.19% | 15.6px |
| Petal Mandala | mandalas | 185 | 0.06% | 7.5px | 164 | 0.21% | 15.1px |
| Star Mandala | mandalas | 185 | 0.04% | 7.8px | 148 | 0.18% | 17.1px |
| At the Harp | music | 200 | 0.04% | 2.3px | 94 | 0.17% | 14.7px |
| At the Piano | music | 223 | 0.08% | 4.7px | 120 | 0.19% | 16.3px |
| Flute Player | music | 170 | 0.08% | 10.1px | 155 | 0.20% | 15.5px |
| Maple and Shamisen | music | 170 | 0.03% | 4.7px | 158 | 0.17% | 15.5px |
| Still Guitar | music | 249 | 0.04% | 4.5px | 116 | 0.18% | 15.6px |
| The Arts: Music | music | 205 | 0.06% | 2.3px | 111 | 0.21% | 15.5px |
| Violin and Score | music | 223 | 0.02% | 2.3px | 87 | 0.19% | 16.3px |
| With a Koto | music | 170 | 0.08% | 5.3px | 142 | 0.18% | 16.3px |
| Balloon Valley | peaceful | 170 | 0.12% | 6.3px | 155 | 0.17% | 17.0px |
| Forest Falls | peaceful | 185 | 0.10% | 5.4px | 176 | 0.18% | 17.1px |
| Lavender Rows | peaceful | 185 | 0.06% | 6.2px | 158 | 0.17% | 15.5px |
| Reading Nook | peaceful | 170 | 0.05% | 5.4px | 150 | 0.18% | 15.5px |
| Snow Cabin | peaceful | 170 | 0.03% | 4.2px | 149 | 0.17% | 15.5px |
| Zen Garden | peaceful | 170 | 0.14% | 10.8px | 165 | 0.18% | 16.3px |
| Cherry Blossoms | pink | 170 | 0.04% | 4.6px | 108 | 0.30% | 16.7px |
| Flamingo | pink | 170 | 0.03% | 3.9px | 141 | 0.23% | 16.6px |
| Peony | pink | 170 | 0.06% | 6.3px | 162 | 0.18% | 14.7px |
| Pink Bedroom | pink | 170 | 0.07% | 5.4px | 157 | 0.23% | 15.5px |
| Pink Cupcakes | pink | 170 | 0.10% | 6.2px | 141 | 0.18% | 17.1px |
| Vanity Table | pink | 170 | 0.06% | 5.4px | 154 | 0.19% | 14.7px |
| Night Windows | places | 170 | 0.03% | 6.2px | 163 | 0.20% | 16.3px |
| Rose Cottage | places | 185 | 0.03% | 3.1px | 155 | 0.19% | 15.5px |
| Clear Morning | relaxing-landscapes | 234 | 0.02% | 3.9px | 89 | 0.35% | 15.5px |
| Inume Pass | relaxing-landscapes | 175 | 0.02% | 3.8px | 95 | 0.26% | 14.7px |
| Lake at Hakone | relaxing-landscapes | 179 | 0.02% | 3.1px | 94 | 0.20% | 15.5px |
| Mishima Pass | relaxing-landscapes | 246 | 0.03% | 4.1px | 105 | 0.20% | 16.3px |
| Sea at Satta | relaxing-landscapes | 212 | 0.03% | 1.6px | 90 | 0.20% | 15.5px |
| Sunset Hill | relaxing-landscapes | 170 | 0.03% | 3.1px | 145 | 0.19% | 14.7px |
| Village at Kusatsu | relaxing-landscapes | 170 | 0.05% | 7.8px | 161 | 0.18% | 14.7px |
| Wind over the Fields | relaxing-landscapes | 216 | 0.05% | 4.5px | 108 | 0.18% | 16.3px |
| Besler Tulips | tulips | 246 | 0.04% | 1.6px | 85 | 0.30% | 15.5px |
| Garden Path | tulips | 170 | 0.03% | 7.1px | 113 | 0.19% | 14.7px |
| Single Tulip | tulips | 170 | 0.04% | 7.8px | 162 | 0.19% | 16.3px |
| Sweet Tulip | tulips | 170 | 0.02% | 3.8px | 93 | 0.20% | 17.1px |
| Tulip Bouquet | tulips | 170 | 0.08% | 7.0px | 155 | 0.20% | 16.3px |
| Tulip Field | tulips | 170 | 0.03% | 6.1px | 163 | 0.18% | 17.1px |
| Tulip Mandala | tulips | 170 | 0.03% | 5.8px | 132 | 0.18% | 15.5px |
| Watering Can | tulips | 170 | 0.05% | 3.1px | 142 | 0.18% | 14.7px |

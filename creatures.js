export function portrait(pet, enemy = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 84;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', pet.pattern + ' ' + pet.family);
  const ctx = canvas.getContext('2d');
  const hue = enemy ? pet.hue : pet.hue % 360;
  const glow = 'hsl(' + hue + ' 83% 76%)';
  const mid = 'hsl(' + hue + ' 41% 48%)';
  const dark = 'hsl(' + hue + ' 29% 27%)';
  const shade = 'hsl(' + hue + ' 42% 14%)';
  const light = 'hsl(' + hue + ' 58% 66%)';
  const variant = pet.familyIndex;
  const artScale = .89 + (pet.size - 10) * .023;
  function rect(color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }
  function poly(color, pts) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    for (const p of pts.slice(1)) ctx.lineTo(...p);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#06191175';
  ctx.beginPath();
  ctx.ellipse(59, 70, 35, 7, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.translate(Math.floor((1 - artScale) * 55), Math.floor((1 - artScale) * 67));
  ctx.scale(artScale, artScale);

  if (variant === 2 || variant === 5) {
    poly(shade, [[32,52],[20,35],[22,22],[39,31],[57,48],[52,62],[34,62]]);
    poly(mid, [[33,49],[24,37],[26,27],[39,35],[52,49],[45,55]]);
    poly(light, [[26,29],[39,35],[43,42],[31,37]]);
    poly(dark, [[47,48],[39,26],[44,16],[54,27],[62,49],[54,56]]);
  } else {
    poly(shade, [[42,59],[34,66],[23,63],[15,55],[12,45],[19,46],[24,52],[34,50],[45,53]]);
    poly(mid, [[18,47],[25,54],[37,53],[41,58],[34,63],[25,60],[20,56]]);
    poly(light, [[16,47],[24,53],[27,55],[23,58],[19,54]]);
  }

  poly(shade, [[29,52],[36,44],[57,43],[68,36],[85,40],[94,51],[92,63],[85,65],[83,71],
    [72,71],[70,62],[57,62],[53,70],[41,70],[40,63],[32,62]]);
  poly(dark, [[32,52],[39,47],[58,47],[72,39],[84,43],[90,51],[87,61],[77,62],[76,68],
    [72,67],[74,57],[54,59],[50,66],[44,66],[45,58],[35,58]]);
  poly(mid, [[34,52],[47,46],[61,47],[71,42],[80,42],[81,51],[71,57],[56,55],[50,59],[45,57],[38,57]]);
  poly(light, [[39,49],[49,45],[59,46],[66,47],[59,51],[47,50],[44,54]]);
  if (variant === 1 || variant === 4) {
    poly(dark, [[63,42],[59,31],[68,24],[91,24],[97,31],[95,48],[90,54],[72,54]]);
    poly(mid, [[64,38],[67,29],[87,26],[94,32],[91,44],[82,49],[70,48]]);
    poly(light, [[66,36],[68,29],[78,28],[77,40],[70,40]]);
    poly(shade, [[63,33],[64,22],[70,19],[77,29],[75,34]]);
    poly(shade, [[83,32],[87,20],[93,23],[94,32]]);
  } else {
    poly(shade, [[65,45],[66,29],[65,16],[71,17],[79,28],[83,27],[87,16],[94,15],
      [95,33],[100,41],[106,43],[104,48],[94,53],[78,54]]);
    poly(mid, [[70,41],[69,22],[77,32],[86,30],[90,20],[92,37],[98,43],[103,44],
      [100,48],[92,49],[78,51]]);
    poly(light, [[70,28],[75,34],[81,34],[83,40],[79,46],[73,44]]);
    poly(light, [[87,43],[94,42],[99,45],[98,49],[87,50],[83,48]]);
    if (variant === 3) poly(glow, [[91,25],[94,17],[96,16],[96,25],[92,34],[87,37]]);
  }
  rect(shade, 91, 35, 5, 5);
  rect(glow, 92, 35, 3, 3);
  rect('#fff7dc', 92, 35, 1, 1);
  rect(shade, 99, 43, 4, 3);
  const pattern = pet.seed % 6 + 2;
  for (let i = 0; i < pattern; i++) {
    const x = 38 + (pet.seed + i * 19) % 26;
    const y = 49 + (pet.seed + i * 3) % 6;
    rect(i % 2 ? dark : glow, x, y, (i % 3) + 1, 1 + (i % 2));
  }
  if (pet.rarity !== 'Wild' || enemy) {
    rect(glow, 106, 26, 2, 5);
    rect(glow, 104, 28, 6, 1);
    rect(glow, 28, 34, 2, 2);
    rect(light, 45, 20, 2, 2);
  }
  return canvas;
}

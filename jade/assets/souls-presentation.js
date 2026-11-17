import { MONSTERS, attackBox } from './combat-actions.js';
import { drawForestEnemy, installForestArt } from './forest-art.js?v=11.0.1';
import { drawAshenHero } from './hero-art.js';
import { weaponMuzzle } from './hero-animation.js';

export function installSoulsPresentation(Renderer, engine) {
  const p = Renderer.prototype;
  p.resize = function () {
    const width = this.canvas.getBoundingClientRect().width;
    this.renderScale = Math.min(3, Math.max(2, Math.ceil(width * Math.min(2, devicePixelRatio || 1) / 960)));
    this.canvas.width = 960 * this.renderScale; this.canvas.height = 540 * this.renderScale;
    this.ctx.imageSmoothingEnabled = false;
  };
  const hero = p.hero;
  p.hero = function (h, time, scale = 1, awakened = false) {
    const generated=drawAshenHero(this.ctx,h,time,scale,awakened);
    if(!generated)hero.call(this, h, time, scale, awakened);
    if (h.action?.weapon === 'ember' && h.action.phase === 'startup') {
      const ctx = this.ctx, charge = Math.min(1, h.action.age / .48);
      const muzzle=weaponMuzzle(h,'ember');
      ctx.save(); ctx.translate(Math.round(muzzle.x), Math.round(muzzle.y));
      ctx.fillStyle = '#ffd299'; ctx.globalAlpha = .65;
      for (let j = 0; j < 6; j++) {
        const angle = time * 7 + j * Math.PI / 3, radius = 15 - charge * 10;
        ctx.fillRect(Math.round(Math.cos(angle) * radius), Math.round(Math.sin(angle) * radius), 2 + Math.floor(charge * 2), 2);
      }
      ctx.fillRect(-3, -3, 6, 6); ctx.restore();
    }
    if (generated && h.blocking || !h.blocking && !(h.parryRiposte > 0)) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(h.x + h.w / 2), Math.round(h.y + h.h / 2));
    ctx.scale(h.facing || 1, 1);
    const perfect = h.blocking && h.guardAge <= .16;
    ctx.fillStyle = perfect ? '#ffe9ad' : '#a7e8ee';
    ctx.globalAlpha = .8;
    if (h.blocking) {
      ctx.fillRect(24, -22, 3, 6); ctx.fillRect(27, -16, 3, 25); ctx.fillRect(24, 9, 3, 7);
      ctx.fillStyle = perfect ? '#ffe9ad22' : '#a7e8ee22'; ctx.fillRect(18, -18, 9, 30);
    } else {
      ctx.fillRect(-2, -43, 4, 12); ctx.fillRect(-6, -39, 12, 4);
    }
    ctx.restore();
  };
  const enemy = p.enemy;
  const projectile = p.projectile;
  p.projectile = function (shot, time) {
    if (shot.owner === 'hero') {
      const ctx = this.ctx; ctx.save();
      ctx.fillStyle = shot.kind === 'disc' ? '#b7a6ff' : '#ffbf82';
      const direction = Math.sign(shot.vx) || 1;
      for (let j = 1; j <= 3; j++) {
        ctx.globalAlpha = .38 / j;
        ctx.fillRect(Math.round(shot.x + shot.w / 2 - direction * j * 9), Math.round(shot.y + shot.h / 2 - 2), shot.empowered ? 8 : 4, shot.empowered ? 4 : 2);
      }
      ctx.restore();
    }
    projectile.call(this, shot, time);
  };
  p.enemy = function (target, time) {
    if (!drawForestEnemy(this.ctx, target, time)) enemy.call(this, target, time);
    const ctx = this.ctx, spec = MONSTERS[target.role], ai = target.ai;
    const artHeight = target.skin === 'trunk' ? 84 : target.skin === 'rock' ? 72 : target.skin === 'bat' ? 72 : target.elite ? 94 : target.role === 'shield' ? 80 : target.h;
    const top = target.y + target.h - artHeight;
    if (!spec) return;
    ctx.save();
    const center = Math.round(target.x + target.w / 2);
    if (ai?.phase === 'windup') {
      const progress = Math.min(1, ai.age / ai.duration);
      ctx.fillStyle = target.elite && ai.sequence === 1 ? '#ffd28b' : '#ff9f89';
      ctx.globalAlpha = .12 + progress * .14;
      if (!['ranged', 'trunk', 'bat'].includes(target.role)) { const box = attackBox(target, spec.range, target.elite ? 72 : 48, ai.facing); ctx.fillRect(box.x, box.y, box.w, box.h); }
      else {
        ctx.strokeStyle = '#ffb495'; ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.beginPath();
        ctx.moveTo(center, target.y + 16); ctx.lineTo(ai.aimX, ai.aimY); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1; ctx.fillRect(center - 2, top - 36, 4, 10); ctx.fillRect(center - 2, top - 23, 4, 3);
    }
    if (ai?.phase === 'active' && !['ranged', 'trunk', 'bat'].includes(target.role)) {
      ctx.save(); ctx.translate(center, target.y + target.h / 2); ctx.scale(ai.facing, 1);
      ctx.strokeStyle = target.elite ? '#ffe0a0' : '#ffbda1'; ctx.lineWidth = target.elite ? 5 : 3;
      ctx.beginPath(); ctx.arc(0, 0, spec.range - 8, -.75, .75); ctx.stroke(); ctx.restore();
    }
    ctx.font = '9px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#10232d';
    ctx.fillStyle = target.elite ? '#ffe0a0' : '#d3e2d4';
    ctx.strokeText(spec.name, center, top - 10); ctx.fillText(spec.name, center, top - 10);
    if (target.hp < target.maxHp || target.elite || ai?.phase === 'stagger') {
      ctx.fillStyle = '#112630'; ctx.fillRect(center - 22, top - 7, 44, 5);
      ctx.fillStyle = target.elite ? '#d5ab71' : '#d09583'; ctx.fillRect(center - 21, top - 6, 42 * Math.max(0, target.hp / target.maxHp), 2);
      ctx.fillStyle = '#8ab7b3'; ctx.fillRect(center - 21, top - 2, 42 * Math.max(0, target.poise / target.poiseMax), 1);
    }
    ctx.fillStyle = '#ffb47a';
    for (let j = 0; j < (target.burnMarks || 0); j++) ctx.fillRect(center - 7 + j * 6, top - 20, 4, 4);
    ctx.restore();
  };
  const decoration = p.decoration;
  p.decoration = function (item) {
    if (item.kind !== 'trial-sign' && item.kind !== 'trial-chest') return decoration.call(this, item);
    const ctx = this.ctx; ctx.save();
    if (item.kind === 'trial-sign') {
      ctx.fillStyle = '#7d674e'; ctx.fillRect(item.x - 2, item.y - 43, 4, 43);
      ctx.fillStyle = '#102b32e8'; ctx.fillRect(item.x - 8, item.y - 66, 196, 38);
      ctx.fillStyle = '#d9c69a'; ctx.font = 'bold 11px "Microsoft YaHei", sans-serif'; ctx.fillText(item.title, item.x, item.y - 50);
      ctx.fillStyle = '#99b5aa'; ctx.font = '8px "Microsoft YaHei", sans-serif'; ctx.fillText(item.text, item.x, item.y - 36);
    } else {
      const open = engine.state.trial?.chest.opened;
      ctx.fillStyle = '#152d36'; ctx.fillRect(item.x - 2, item.y - 29, 38, 29);
      ctx.fillStyle = '#8b664b'; ctx.fillRect(item.x, item.y - 26, 34, 24);
      ctx.fillStyle = '#e8c286'; ctx.fillRect(item.x, item.y - 17, 34, 3); ctx.fillRect(item.x + 14, item.y - 20, 6, 9);
      if (open) { ctx.fillStyle = '#192d32'; ctx.fillRect(item.x + 3, item.y - 24, 28, 8); }
      else {
        this.glow(item.x + 17, item.y - 14, 44, '#ffe0a0', .15);
        ctx.fillStyle = '#ffdfa0'; ctx.font = '10px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('藏珍宝匣', item.x + 17, item.y - 40);
      }
    }
    ctx.restore();
  };
  installForestArt(Renderer, engine);
}

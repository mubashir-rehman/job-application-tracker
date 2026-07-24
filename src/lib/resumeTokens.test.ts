import { describe, it, expect } from 'vitest';
import tokens from '../../skills/resume-render/tokens.json';

const HEX6 = /^[0-9a-fA-F]{6}$/;

describe('resume-render design tokens', () => {
  it('has all required top-level keys', () => {
    for (const k of ['fonts', 'page', 'colors', 'sectionHeader', 'bullets', 'pagination', 'spacing', 'overflowLevers']) {
      expect(tokens).toHaveProperty(k);
    }
  });

  it('colors are 6-digit hex', () => {
    expect(tokens.colors.sectionHeader).toMatch(HEX6);
    expect(tokens.colors.link).toMatch(HEX6);
    expect(tokens.colors.body).toMatch(HEX6);
  });

  it('page geometry is US Letter, 0.75in margins, 10080-twip content width', () => {
    expect(tokens.page.widthTwips).toBe(12240);
    expect(tokens.page.heightTwips).toBe(15840);
    expect(tokens.page.marginInches).toBe(0.75);
    expect(tokens.page.contentWidthTwips).toBe(10080);
    expect(tokens.sectionHeader.tabRightTwips).toBe(10080);
  });

  it('spacing keys are present and numeric', () => {
    for (const k of ['bulletAfter', 'bulletLine', 'sectionBefore', 'jobBefore']) {
      expect(typeof (tokens.spacing as Record<string, number>)[k]).toBe('number');
    }
  });

  it('overflowLevers is an ordered array with the expected ids and step shape', () => {
    const ids = tokens.overflowLevers.map((l) => l.id);
    expect(ids).toEqual(['bulletAfter', 'bulletLine', 'sectionBefore', 'jobBefore', 'removeSpacers']);
    for (const lever of tokens.overflowLevers) {
      expect(lever).toHaveProperty('id');
      expect(lever).toHaveProperty('target');
      expect(lever).toHaveProperty('property');
      expect(Array.isArray(lever.steps)).toBe(true);
      expect(lever.steps.length).toBeGreaterThan(0);
    }
  });

  it('numeric levers start at the live default spacing and are non-increasing', () => {
    const numericLevers = tokens.overflowLevers.filter((l) => l.steps.every((s) => typeof s === 'number'));
    for (const lever of numericLevers) {
      const steps = lever.steps as number[];
      const key = lever.id as keyof typeof tokens.spacing;
      expect(steps[0]).toBe(tokens.spacing[key]); // step 0 is the shipped default
      for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeLessThanOrEqual(steps[i - 1]);
    }
  });
});

import { colors, fonts, space, sizes } from '../theme';

describe('theme tokens', () => {
  it('has the approved palette', () => {
    expect(colors.hero).toBe('#c16b27');
    expect(colors.peach).toBe('#fcc79b');
    expect(colors.gold).toBe('#cab356');
    expect(colors.sage).toBe('#b7c2a9');
    expect(colors.bg).toBe('#1A110B');
    expect(colors.surface).toBe('#261A12');
    expect(colors.surface2).toBe('#352619');
    expect(colors.text).toBe('#FBEFE3');
    expect(colors.sub).toBe('#B39A86');
    expect(colors.ink).toBe('#20120A');
    expect(colors.ringFill).toBe('#120B07');
    expect(colors.rust).toBe('#c16b27');
    expect(colors.danger).toBe('#B5524A');
  });

  it('has fonts, spacing and sizes', () => {
    expect(fonts.display).toBe('Harmera');
    expect(fonts.heading).toBe('Rubik_700Bold');
    expect(fonts.name).toBe('Rubik_500Medium');
    expect(fonts.body).toBe('Geist_400Regular');
    expect(fonts.bodyBold).toBe('Geist_600SemiBold');
    expect(space.gutter).toBe(16);
    expect(sizes.card).toBe(56);
    expect(sizes.loginHero).toBe(232);
  });
});

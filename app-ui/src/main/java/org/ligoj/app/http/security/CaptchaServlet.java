/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import java.awt.Color;
import java.awt.Font;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import cn.apiclub.captcha.Captcha;
import cn.apiclub.captcha.backgrounds.GradiatedBackgroundProducer;
import cn.apiclub.captcha.gimpy.FishEyeGimpyRenderer;
import cn.apiclub.captcha.noise.StraightLineNoiseProducer;
import cn.apiclub.captcha.servlet.CaptchaServletUtil;
import cn.apiclub.captcha.text.renderer.ColoredEdgesWordRenderer;

/**
 * Servlet generating CAPTCHA image.
 */
public class CaptchaServlet extends HttpServlet {

	/**
	 * SID
	 */
	private static final long serialVersionUID = 1L;
	private static final List<Color> COLORS = new ArrayList<>(2);
	private static final List<Font> FONTS = new ArrayList<>(3);

	static {
		COLORS.add(Color.BLACK);
		COLORS.add(Color.BLUE);
		COLORS.add(Color.ORANGE);
		COLORS.add(Color.GREEN);

		FONTS.add(new Font("Geneva", Font.ITALIC, 48));
		FONTS.add(new Font("Courier", Font.BOLD, 47));
		FONTS.add(new Font("Arial", Font.BOLD, 46));
	}

	@Override
	public void doGet(final HttpServletRequest req, final HttpServletResponse resp) throws ServletException, IOException {

		final ColoredEdgesWordRenderer wordRenderer = new ColoredEdgesWordRenderer(COLORS, FONTS, 2F);
		final Captcha captcha = new Captcha.Builder(250, 50).gimp(new FishEyeGimpyRenderer()).addText(wordRenderer)
				.addBackground(new GradiatedBackgroundProducer()).addNoise().addNoise(new StraightLineNoiseProducer(Color.BLUE, 2)).build();

		// Store the expected answer
		req.getSession().setAttribute(Captcha.NAME, captcha);

		// Write the image to output
		CaptchaServletUtil.writeImage(resp, captcha.getImage());
	}
}

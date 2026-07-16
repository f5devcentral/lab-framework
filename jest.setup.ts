// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

import { enableFetchMocks } from 'jest-fetch-mock';
enableFetchMocks();

jest.mock("next/image", () => ({
	__esModule: true,
	default: (props: {
		src?: string;
		alt?: string;
		[key: string]: unknown;
	}) => {
		const React = require("react");
		const { src, alt, ...rest } = props;

		return React.createElement("img", {
			...rest,
			alt: alt ?? "",
			src: typeof src === "string" ? src : "",
		});
	},
}));

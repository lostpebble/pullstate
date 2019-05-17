/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require("react");

const CompLibrary = require("../../core/CompLibrary.js");

const MarkdownBlock = CompLibrary.MarkdownBlock; /* Used to read markdown */
const Container = CompLibrary.Container;
const GridBlock = CompLibrary.GridBlock;

class HomeSplash extends React.Component {
  render() {
    const { siteConfig, language = "" } = this.props;
    const { baseUrl, docsUrl } = siteConfig;
    const docsPart = `${docsUrl ? `${docsUrl}/` : ""}`;
    const langPart = `${language ? `${language}/` : ""}`;
    const docUrl = doc => `${baseUrl}${docsPart}${langPart}${doc}`;

    const SplashContainer = props => (
      <div className="homeContainer">
        <div className="homeSplashFade">
          <div className="wrapper homeWrapper">{props.children}</div>
        </div>
      </div>
    );

    const Logo = props => (
      <div>
        <img src={props.img_src} alt="Project Logo" />
      </div>
    );

    const ProjectTitle = () => (
      <h2 className="projectTitle">
        {siteConfig.title}
        <small>{siteConfig.tagline}</small>
      </h2>
    );

    const PromoSection = props => (
      <div className="section promoSection">
        <div className="promoRow">
          <div className="pluginRowBlock">{props.children}</div>
        </div>
      </div>
    );

    const Button = props => (
      <div className="pluginWrapper buttonWrapper">
        <a className="button" href={props.href} target={props.target}>
          {props.children}
        </a>
      </div>
    );

    return (
      <SplashContainer>
        <img width={350} src={`${baseUrl}img/logo-newest.png`} alt="Project Logo" />
        <div
          className="inner"
          style={{
            display: "flex",
            marginTop: "1em",
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}>
          {/*<ProjectTitle siteConfig={siteConfig} />*/}
          <div>
            <div style={{ maxWidth: "35em", padding: "1em 2em", opacity: 0.8 }}>
              Ridiculously simple state stores with performant retrieval anywhere in your React tree using
              React hooks
            </div>
            <div style={{ maxWidth: "35em", padding: "3em 2em", opacity: 1 }}>
              <div style={{ fontSize: "1.95em", color: "#9f59f2" }}>
                <em>
                  <strong>Version 1.0.0 released!</strong>
                </em>
              </div>
              <div style={{ fontSize: "1em" }}>
                API settled, and <a href={docUrl("quick-example.html")}>new documentation site</a> live
              </div>
            </div>
            <div style={{ maxWidth: "35em", padding: "3em 2em", opacity: 0.8 }}>
              <em>
                <strong>Now featuring async state handling too!</strong>
              </em>
            </div>
            <Button href={docUrl("quick-example.html")}>Jump into a quick example</Button>
            <div style={{ maxWidth: "35em", padding: "2em 2em", opacity: 0.8 }} />
          </div>
        </div>
      </SplashContainer>
    );
  }
}

class Index extends React.Component {
  render() {
    const { config: siteConfig, language = "" } = this.props;

    return <HomeSplash siteConfig={siteConfig} language={language} />;
  }
}

module.exports = Index;

#!/bin/bash
set -euo pipefail

#
# A (too) old version of Maven may be installed by default on Travis.
# This method is preferred over Travis apt installer because
# JDK is kept in cache.
#
function installMaven {
  echo "Setup Maven"
  mkdir -p ~/maven
  pushd ~/maven > /dev/null
  if [ ! -d "apache-maven-3.8.5" ]; then
    echo "Download Maven 3.8.5"
    curl -sSL http://apache.mirrors.ovh.net/ftp.apache.org/dist/maven/maven-3/3.8.5/binaries/apache-maven-3.8.5-bin.tar.gz | tar zx -C ~/maven
  fi
  popd > /dev/null
  export M2_HOME=~/maven/apache-maven-3.8.5
  export PATH=$M2_HOME/bin:$PATH
  echo '<settings><profiles><profile><id>spring-milestone</id><repositories>' > $M2_HOME/conf/settings.xml
  echo '<repository><id>spring-milestone</id><url>https://repo.spring.io/milestone/</url></repository>' >> $M2_HOME/conf/settings.xml
  echo '<repository><id>oss-sonatype</id><url>https://oss.sonatype.org/service/local/repositories/releases/content/</url></repository>' >> $M2_HOME/conf/settings.xml
  echo '</repositories><pluginRepositories>' >> $M2_HOME/conf/settings.xml
  echo '<pluginRepository><id>spring-milestone-p</id><url>https://repo.spring.io/milestone/</url></pluginRepository>' >> $M2_HOME/conf/settings.xml
  echo '</pluginRepositories></profile></profiles><activeProfiles><activeProfile>spring-milestone</activeProfile></activeProfiles></settings>' >> $M2_HOME/conf/settings.xml
}

#
# Replaces the version defined in sources, usually x.y-SNAPSHOT,
# by a version identifying the build.
# The build version is composed of 4 fields, including the semantic version and
# the build number provided by Travis.
#
# Exported variables:
# - INITIAL_VERSION: version as defined in pom.xml
# - BUILD_VERSION: version including the build number
# - PROJECT_VERSION: target Maven version. The name of this variable is important because
#   it's used by QA when extracting version from Artifactory build info.
#
# Example of SNAPSHOT
# INITIAL_VERSION=6.3-SNAPSHOT
# BUILD_VERSION=6.3.0.12345
# PROJECT_VERSION=6.3.0.12345
#
# Example of RC
# INITIAL_VERSION=6.3-RC1
# BUILD_VERSION=6.3.0.12345
# PROJECT_VERSION=6.3-RC1
#
# Example of GA
# INITIAL_VERSION=6.3
# BUILD_VERSION=6.3.0.12345
# PROJECT_VERSION=6.3
#
function fixBuildVersion {
  echo "Create a clean build version ..."
  export INITIAL_VERSION=$(mvn -q -Dexec.executable="echo" -Dexec.args="\${project.version}" --non-recursive org.codehaus.mojo:exec-maven-plugin:1.3.1:exec)
  echo "INITIAL_VERSION : $INITIAL_VERSION"

  # remove suffix -SNAPSHOT or -RC
  without_suffix=$(echo $INITIAL_VERSION | sed "s/-.*//g")

  IFS=$'.'
  fields_count=$(echo $without_suffix | wc -w)
  unset IFS
  if [ $fields_count -lt 3 ]; then
    export BUILD_VERSION="$without_suffix.0.$TRAVIS_BUILD_NUMBER"
  else
    export BUILD_VERSION="$without_suffix.$TRAVIS_BUILD_NUMBER"
  fi

  if [[ "${INITIAL_VERSION}" == *"-SNAPSHOT" ]]; then
    # SNAPSHOT
    export PROJECT_VERSION=$BUILD_VERSION
    grep --include={*.properties,pom.xml} -rnl './' -e "$INITIAL_VERSION" | xargs -i@ sed -i "s/$INITIAL_VERSION/$PROJECT_VERSION/g" @
  else
    # not a SNAPSHOT: milestone, RC or GA
    export PROJECT_VERSION=$INITIAL_VERSION
  fi

  echo "Build Version  : $BUILD_VERSION"
  echo "Project Version: $PROJECT_VERSION"
}

case "$TARGET" in

BUILD)

  installMaven
  fixBuildVersion

  # Minimal Maven settings
  export MAVEN_OPTS="-Xmx1G -Xms128m"
  export DISPLAY=:0.0
  MAVEN_ARGS="-Dmaven.test.redirectTestOutputToFile=false -Djava.net.preferIPv4Stack=true -Dsurefire.useFile=false -B -e -V -DbuildVersion=$BUILD_VERSION -Dskip-sonarsource-repo=true"

  if [ "$TRAVIS_BRANCH" == "master" ] && [ "$TRAVIS_PULL_REQUEST" == "false" ]; then
    echo 'Build and analyze master'

    # Fetch all commit history so that SonarQube has exact blame information
    # for issue auto-assignment
    # This command can fail with "fatal: --unshallow on a complete repository does not make sense"
    # if there are not enough commits in the Git repository (even if Travis executed git clone --depth 50).
    # For this reason errors are ignored with "|| true"
    git fetch --unshallow || true

    mvn clean package jacoco:report sonar:sonar \
          $MAVEN_ARGS \
          -Pjacoco -Djacoco.includes="org.ligoj.app.*:org.ligoj.boot.*" \
          -Dsonar.javascript.exclusions="node_modules,dist" \
          -Dsonar.host.url=$SONAR_HOST_URL \
          -Dsonar.organization=ligoj-github \
          -Dsonar.login=$SONAR_TOKEN \
          -Dsonar.projectVersion=$PROJECT_VERSION \
          -Dsonar.github.repository=$TRAVIS_REPO_SLUG \
          -Dsonar.github.oauth=$GITHUB_TOKEN \
          -Dmaven.javadoc.skip=true \
          -Dmaven.ut.reuseForks=true -Dmaven.it.reuseForks=false \
          -Djava.awt.headless=true

  elif [ "$TRAVIS_PULL_REQUEST" != "false" ] && [ -n "${GITHUB_TOKEN:-}" ]; then
    echo 'Build and analyze internal pull request'

    mvn org.jacoco:jacoco-maven-plugin:prepare-agent verify sonar:sonar \
        $MAVEN_ARGS \
          -Pjacoco -Djacoco.includes="org.ligoj.app.*:org.ligoj.boot.*" \
          -Dsonar.javascript.exclusions="node_modules,dist" \
          -Dsonar.host.url=$SONAR_HOST_URL \
          -Dsonar.organization=ligoj-github \
          -Dsonar.login=$SONAR_TOKEN \
          -Dsonar.projectVersion=$PROJECT_VERSION \
          -Dsonar.github.repository=$TRAVIS_REPO_SLUG \
          -Dsonar.github.oauth=$GITHUB_TOKEN \
          -Dmaven.javadoc.skip=true \
          -Dmaven.ut.reuseForks=true -Dmaven.it.reuseForks=false \
          -Djava.awt.headless=true \
        -Dsource.skip=true \
        -Dsonar.analysis.mode=preview \
        -Dsonar.github.pullRequest=$TRAVIS_PULL_REQUEST

  else
    echo 'Build feature branch or external pull request'

    mvn install $MAVEN_ARGS -Dsource.skip=true
  fi

  ;;

*)
  echo "Unexpected TARGET value: $TARGET"
  exit 1
  ;;

esac